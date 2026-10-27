'use strict';
const express=require('express');
const {alias}=require('./communication-policy');
const {fund,settle}=require('./wallet');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {safeImage,slugify,renderDocument}=require('./seo');
const {TERMS_VERSION,TERMS,text,fail,integer,amounts,shippingAddress,fingerprint,period,aggregate}=require('./marketplace-core');
const {reportWorkbook}=require('./marketplace-report');
const {productPage,marketPage,termsPage,homeSection}=require('./marketplace-pages');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function id(value){if(!UUID.test(value||''))fail('Mã không hợp lệ.',404);return value;}
async function ensureMarketplaceSchema(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS market_seller_settings (
  seller_id TEXT PRIMARY KEY REFERENCES users(id),bank_name TEXT NOT NULL DEFAULT '',account_name TEXT NOT NULL DEFAULT '',account_number TEXT NOT NULL DEFAULT '',allow_transfer BOOLEAN NOT NULL DEFAULT FALSE,allow_cod BOOLEAN NOT NULL DEFAULT TRUE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS market_products (
  id UUID PRIMARY KEY,seller_id TEXT NOT NULL REFERENCES users(id),slug TEXT UNIQUE NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,condition TEXT NOT NULL,
  price BIGINT NOT NULL CHECK(price>0 AND price<=1000000000),shipping_fee BIGINT NOT NULL CHECK(shipping_fee>=0),stock INTEGER NOT NULL CHECK(stock>=0),images JSONB NOT NULL DEFAULT '[]',status TEXT NOT NULL CHECK(status IN ('draft','active','hidden')),version INTEGER NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE INDEX IF NOT EXISTS market_products_public ON market_products(status,created_at DESC);
 CREATE TABLE IF NOT EXISTS market_orders (
  id UUID PRIMARY KEY,request_key UUID NOT NULL,buyer_id TEXT NOT NULL REFERENCES users(id),seller_id TEXT NOT NULL REFERENCES users(id),product_id UUID NOT NULL REFERENCES market_products(id),request_hash TEXT NOT NULL,
  product_snapshot JSONB NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),recipient JSONB NOT NULL,bank_snapshot JSONB NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('transfer','cod','wallet')),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','shipped','delivered','completed','cancelled','refund_pending','refunded')),
  payment_status TEXT NOT NULL DEFAULT 'pending',goods_amount BIGINT NOT NULL,shipping_amount BIGINT NOT NULL,total_amount BIGINT NOT NULL,commission_rate INTEGER NOT NULL,platform_fee BIGINT NOT NULL,artist_net BIGINT NOT NULL,
  tracking_number TEXT NOT NULL DEFAULT '',terms_version TEXT NOT NULL,terms_snapshot JSONB NOT NULL,terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),dispute_open BOOLEAN NOT NULL DEFAULT FALSE,
  stock_released BOOLEAN NOT NULL DEFAULT FALSE,fee_collected_amount BIGINT NOT NULL DEFAULT 0,fee_returned_amount BIGINT NOT NULL DEFAULT 0,completed_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(buyer_id,request_key));
 CREATE INDEX IF NOT EXISTS market_orders_buyer ON market_orders(buyer_id,created_at DESC);
 CREATE INDEX IF NOT EXISTS market_orders_seller ON market_orders(seller_id,created_at DESC);
 CREATE INDEX IF NOT EXISTS market_orders_date ON market_orders(created_at);
 CREATE TABLE IF NOT EXISTS market_order_events (
  id UUID PRIMARY KEY,order_id UUID NOT NULL REFERENCES market_orders(id),actor_id TEXT NOT NULL,actor_role TEXT NOT NULL,action TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',evidence JSONB NOT NULL DEFAULT '[]',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE INDEX IF NOT EXISTS market_events_order ON market_order_events(order_id,created_at);
 ALTER TABLE market_orders DROP CONSTRAINT IF EXISTS market_orders_payment_method_check;
 ALTER TABLE market_orders ADD CONSTRAINT market_orders_payment_method_check CHECK(payment_method IN ('transfer','cod','wallet'));
 `);
}
function settingsInput(b){const s={bank_name:text(b.bank_name,120),account_name:text(b.account_name,150),account_number:text(b.account_number,40),allow_transfer:b.allow_transfer===true,allow_cod:b.allow_cod===true};if(s.allow_transfer&&(!s.bank_name||!s.account_name||!/^\d{6,30}$/.test(s.account_number)))fail('Điền đầy đủ ngân hàng, chủ tài khoản và số tài khoản để nhận chuyển khoản.');if(!s.allow_transfer&&!s.allow_cod)fail('Chọn ít nhất một phương thức thanh toán.');return s;}
function marketImage(value){try{const image=safeImage(value);if(!image)fail('Ảnh không được để trống.');return image;}catch(e){fail(e.message);}}
function marketEvidence(value){
 try{
  if(typeof value!=='string'||!value)fail('Bằng chứng không hợp lệ.');
  if(value.startsWith('data:image/'))return marketImage(value);
  const m=value.match(/^data:video\/(mp4|webm);base64,([A-Za-z0-9+/]+=*)$/);
  if(!m)fail('Bằng chứng hỗ trợ ảnh JPEG/PNG/WebP hoặc video MP4/WebM.');
  const bytes=Buffer.from(m[2],'base64');
  if(bytes.length>4*1024*1024)fail('Mỗi video bằng chứng tối đa 4 MB.');
  const mp4=m[1]==='mp4'&&bytes.length>12&&bytes.toString('ascii',4,8)==='ftyp';
  const webm=m[1]==='webm'&&bytes.length>4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
  if(!mp4&&!webm)fail('Video bằng chứng không hợp lệ.');
  return value;
 }catch(e){fail(e.message);}
}
function productInput(b){
 const p={title:text(b.title,160),description:text(b.description,6000),category:text(b.category,60),condition:text(b.condition,120),price:integer(b.price,1,1e9,'Giá'),shipping_fee:integer(b.shipping_fee,0,1e7,'Phí vận chuyển'),stock:integer(b.stock,0,100000,'Tồn kho'),images:[],status:['draft','active','hidden'].includes(b.status)?b.status:'draft'};
 
 if(p.title.length<4||p.description.length<30||!p.category||!p.condition)fail('Điền tên, mô tả ít nhất 30 ký tự, loại sản phẩm và tình trạng.');
 if(!Array.isArray(b.images)||b.images.length<1||b.images.length>6)fail('Cần từ 1 đến 6 ảnh sản phẩm.');
 p.images=b.images.map(v=>{if(typeof v==='string'&&v.startsWith('/media/market/'))return v;return marketImage(v);});
 return p;
}
function publicProduct(p){return {id:p.id,slug:p.slug,title:p.title,description:p.description,category:p.category,condition:p.condition,price:Number(p.price),shipping_fee:Number(p.shipping_fee),stock:p.stock,version:p.version,status:p.status,seller_name:p.seller_name,seller_city:p.seller_city||'',seller_id:p.seller_id,images:p.images.map((src,i)=>src.startsWith('data:')?`/media/market/${p.id}/${i}?v=${p.version}`:src),preview:p.restore_preview===true,updated_at:p.updated_at};}
function sanitizeOrder(o,viewer,admin=false){const copy={...o};if(!admin&&viewer?.id!==o.buyer_id){copy.buyer_id=alias(o.id);copy.buyer_name=alias(o.id);copy.recipient={name:alias(o.id),phone:'Do nền tảng quản lý',address:'DioraLink điều phối giao hàng'};}delete copy.request_hash;delete copy.request_key;if(o.status==='pending')copy.bank_snapshot={};return copy;}
async function transaction(pool,fn){const client=await pool.connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
async function event(client,o,actor,action,note='',evidence=[]){await client.query('INSERT INTO market_order_events(id,order_id,actor_id,actor_role,action,note,evidence) VALUES($1,$2,$3,$4,$5,$6,$7)',[crypto.randomUUID(),o.id,actor.id,actor.role,action,note,JSON.stringify(evidence)]);}
async function releaseStock(c,o){if(!o.stock_released){await c.query('UPDATE market_products SET stock=stock+$1,updated_at=NOW() WHERE id=$2',[o.quantity,o.product_id]);o.stock_released=true;}}
async function changeOrder(c,o,actor,action,b={}){
 const isAdmin=actor.role==='admin',seller=actor.id===o.seller_id&&actor.role==='artisan',buyer=!isAdmin&&actor.id===o.buyer_id;
 if(!isAdmin&&!seller&&!buyer)fail('Bạn không có quyền xem đơn này.',404);
 const note=text(b.note,3000),ref=text(b.reference,200);
 
 if(o.payment_method==='wallet'&&['report_payment','confirm_payment','cod_received','collect_fee','return_fee','refund_sent','confirm_refund','admin_confirm_refund'].includes(action))fail('Giao dịch ví được đối soát tự động.',409);
 const evidence=Array.isArray(b.evidence)?b.evidence.slice(0,3).map(marketEvidence):[];
 const need=(ok,msg='Thao tác không phù hợp với trạng thái hoặc quyền của bạn.')=>{if(!ok)fail(msg,409);};
 if(o.dispute_open&&!['comment','resolve_continue','refund','refund_sent','confirm_refund','admin_confirm_refund','cancel_unpaid'].includes(action))fail('Đơn đang có tranh chấp. Vui lòng xử lý trong mục hỗ trợ.',409);
 switch(action){
  case 'accept':need(seller&&o.status==='pending');o.status='accepted';break;
  case 'cancel':need((buyer&&o.status==='pending')||(seller&&['pending','accepted'].includes(o.status)&&['pending','awaiting_cod'].includes(o.payment_status)));need(note.length>=5,'Vui lòng ghi lý do hủy.');o.status='cancelled';await releaseStock(c,o);break;
  case 'report_payment':need(buyer&&o.status==='accepted'&&o.payment_method==='transfer'&&['pending','reported'].includes(o.payment_status));need(ref.length>=3||evidence.length>0,'Cần mã giao dịch hoặc chứng từ chuyển khoản.');o.payment_status='reported';break;
  case 'confirm_payment':need(seller&&o.status==='accepted'&&o.payment_method==='transfer'&&['pending','reported'].includes(o.payment_status));need(ref.length>=3,'Ghi mã giao dịch đã kiểm tra trong tài khoản ngân hàng.');o.payment_status='received';break;
  case 'ship':need(isAdmin&&o.status==='accepted');need(o.payment_method==='cod'||['received','wallet_held'].includes(o.payment_status),'Phải xác nhận nhận tiền trước khi giao đơn chuyển khoản.');need(/^[a-zA-Z0-9-]{6,50}$/.test(b.tracking_number||''),'Nhập mã vận đơn SPX gồm 6–50 ký tự chữ/số/dấu gạch.');o.tracking_number=b.tracking_number.toUpperCase();o.status='shipped';break;
  case 'receive':need(buyer&&o.status==='shipped');o.status=o.payment_method!=='cod'?'completed':'delivered';if(o.status==='completed')o.completed_at=new Date();break;
  case 'cod_received':need(seller&&o.status==='delivered'&&o.payment_method==='cod');need(ref.length>=3,'Ghi mã đối soát tiền COD từ SPX.');o.payment_status='cod_received';o.status='completed';o.completed_at=new Date();break;
  case 'dispute':need((buyer||seller)&&!['cancelled','refunded','refund_pending'].includes(o.status));need(note.length>=20,'Mô tả tranh chấp tối thiểu 20 ký tự.');need(evidence.length>0,'Vui lòng đính kèm ít nhất một ảnh hoặc video bằng chứng.');o.dispute_open=true;break;
  case 'comment':need(note.length>=2||evidence.length>0,'Nhập nội dung hoặc chứng cứ.');break;
  case 'resolve_continue':need(isAdmin&&o.dispute_open&&o.status!=='refund_pending');need(note.length>=20,'Ghi căn cứ xử lý ít nhất 20 ký tự.');o.dispute_open=false;break;
  case 'cancel_unpaid':need(isAdmin&&o.dispute_open&&['pending','accepted'].includes(o.status)&&['pending','awaiting_cod'].includes(o.payment_status));need(note.length>=20,'Ghi căn cứ xử lý ít nhất 20 ký tự.');o.status='cancelled';o.dispute_open=false;await releaseStock(c,o);break;
  case 'refund':need(isAdmin&&o.dispute_open&&['received','cod_received','wallet_held'].includes(o.payment_status)&&!['refund_pending','refunded','cancelled'].includes(o.status));need(note.length>=20,'Ghi phương án hoàn và căn cứ xử lý ít nhất 20 ký tự.');o.status='refund_pending';o.payment_status='refund_pending';break;
  case 'refund_sent':need(seller&&o.status==='refund_pending'&&o.payment_status==='refund_pending');need(ref.length>=3&&evidence.length>0,'Cần mã giao dịch và ảnh chứng từ hoàn tiền.');o.payment_status='refund_sent';break;
  case 'confirm_refund':need(buyer&&o.status==='refund_pending'&&o.payment_status==='refund_sent');o.status='refunded';o.payment_status='refunded';o.dispute_open=false;break;
  case 'admin_confirm_refund':need(isAdmin&&o.status==='refund_pending'&&o.payment_status==='refund_sent');need(note.length>=20&&ref.length>=3,'Ghi căn cứ kiểm chứng và mã giao dịch hoàn tiền.');o.status='refunded';o.payment_status='refunded';o.dispute_open=false;break;
  case 'restock':need(isAdmin&&o.status==='refunded'&&!o.stock_released);need(note.length>=10,'Ghi căn cứ đã nhận hàng trả trước khi hoàn tồn kho.');await releaseStock(c,o);break;
  case 'collect_fee':need(isAdmin&&o.status==='completed'&&!o.dispute_open&&Number(o.fee_collected_amount)===0);need(ref.length>=3,'Ghi chứng từ nộp phí của nghệ nhân.');o.fee_collected_amount=Number(o.platform_fee);break;
  case 'return_fee':need(isAdmin&&['refunded','cancelled'].includes(o.status)&&Number(o.fee_collected_amount)>Number(o.fee_returned_amount));need(ref.length>=3,'Ghi chứng từ hoàn lại phí cho nghệ nhân.');o.fee_returned_amount=o.fee_collected_amount;break;
  default:fail('Thao tác không được hỗ trợ.');
 }
 if(o.payment_method==='wallet'){
  if(action==='cancel'||action==='cancel_unpaid'||action==='refund'){await settle(c,'market:'+o.id,true);o.payment_status='refunded';if(action==='refund'){o.status='refunded';o.dispute_open=false;await releaseStock(c,o);}}
  if(action==='receive'){await settle(c,'market:'+o.id);o.payment_status='received';o.fee_collected_amount=Number(o.platform_fee);}
 }
 await c.query(`UPDATE market_orders SET status=$2,payment_status=$3,tracking_number=$4,dispute_open=$5,stock_released=$6,completed_at=$7,fee_collected_amount=$8,fee_returned_amount=$9,updated_at=NOW() WHERE id=$1`,[o.id,o.status,o.payment_status,o.tracking_number,o.dispute_open,o.stock_released,o.completed_at,o.fee_collected_amount,o.fee_returned_amount]);
 await event(c,o,actor,action,[note,ref?'Mã chứng từ: '+ref:''].filter(Boolean).join('\n'),evidence);
 return o;
}
function createMarketplace({pool,indexFile,requireAuth,requireAdmin}){
 const router=express.Router(),template=fs.readFileSync(indexFile,'utf8');
 const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 const artisan=async(req,res,next)=>{if(req.user.role!=='artisan')return res.status(403).json({message:'Chỉ tài khoản nghệ nhân được đăng bán.'});try{const lock=(await pool.query('SELECT access_verified FROM legacy_restore_control WHERE old_user_id=$1',[req.user.id])).rows[0];if(lock&&!lock.access_verified)return res.status(403).json({message:'Tài khoản khôi phục cần xác minh trước khi quản lý gian hàng.'});next();}catch(error){next(error);}};
 const auth=[requireAuth];
 const publicSelect="SELECT p.*,COALESCE(a.profile->>'name',CASE WHEN lc.old_user_id IS NOT NULL AND lc.access_verified=FALSE THEN archived.profile->>'name' END,u.name) AS seller_name,u.city AS seller_city,(p.status='draft' AND lc.old_user_id IS NOT NULL AND lc.access_verified=FALSE AND restored.old_status='active') AS restore_preview FROM market_products p JOIN users u ON u.id=p.seller_id LEFT JOIN public_artisan_profiles a ON a.user_id=p.seller_id AND a.published=TRUE LEFT JOIN public_artisan_profiles archived ON archived.user_id=p.seller_id AND archived.published=FALSE LEFT JOIN legacy_restored_product_status restored ON restored.product_id=p.id LEFT JOIN legacy_restore_control lc ON lc.old_user_id=p.seller_id";
 const visibleWhere="(p.status='active' OR (p.status='draft' AND restored.old_status='active' AND lc.old_user_id IS NOT NULL AND lc.access_verified=FALSE))";
 // Convert inline images to their existing public URLs in PostgreSQL, before transfer.
 // Keep raw product reads for checkout snapshots and seller editing.
 const productFields='id,seller_id,slug,title,description,category,condition,price,shipping_fee,stock,status,version,created_at,updated_at'.split(',').map(k=>'p.'+k).join(',');
 const publicImages=`COALESCE((SELECT jsonb_agg(CASE WHEN image.value LIKE 'data:%'
   THEN '/media/market/'||p.id::text||'/'||(image.ordinality-1)::text||'?v='||p.version::text
   ELSE image.value END ORDER BY image.ordinality)
   FROM jsonb_array_elements_text(p.images) WITH ORDINALITY AS image(value,ordinality)), '[]'::jsonb) AS images`;
 const lightPublicSelect=publicSelect.replace('p.*',productFields+','+publicImages);
 const getProducts=async(limit=24,offset=0,search='',category='',sort='new')=>{
  const params=[`%${search.replace(/[\\%_]/g,'\\$&')}%`,category,limit,offset];
  const order=sort==='price_asc'?'p.price ASC,p.created_at DESC':sort==='price_desc'?'p.price DESC,p.created_at DESC':'p.created_at DESC';
  return (await pool.query(`${lightPublicSelect} WHERE ${visibleWhere} AND (p.title ILIKE $1 OR p.description ILIKE $1 OR COALESCE(a.profile->>'name',u.name) ILIKE $1) AND ($2='' OR p.category=$2) ORDER BY ${order} LIMIT $3 OFFSET $4`,params)).rows.map(publicProduct);
 };
 const getProduct=async(pid)=>(await pool.query(publicSelect+' WHERE p.id=$1',[pid])).rows[0];
 const summaryFields='id,buyer_id,seller_id,product_id,quantity,payment_method,status,payment_status,goods_amount,shipping_amount,total_amount,commission_rate,platform_fee,artist_net,tracking_number,terms_version,terms_accepted_at,dispute_open,stock_released,fee_collected_amount,fee_returned_amount,completed_at,created_at,updated_at'.split(',').map(k=>'o.'+k).join(',');
 const listOrders=async(where,params,light=false)=> (await pool.query(`SELECT ${light?summaryFields+",(o.product_snapshot - 'images') AS product_snapshot":'o.*'},u.name AS seller_name,b.name AS buyer_name FROM market_orders o JOIN users u ON u.id=o.seller_id JOIN users b ON b.id=o.buyer_id ${where}`,params)).rows;
 const readOrder=async(req,admin=false)=>{
  const o=(await listOrders('WHERE o.id=$1',[id(req.params.id)]))[0];if(!o||(!admin&&req.user.id!==o.buyer_id&&req.user.id!==o.seller_id))fail('Không tìm thấy đơn hàng.',404);
  const events=(await pool.query('SELECT * FROM market_order_events WHERE order_id=$1 ORDER BY created_at,id',[o.id])).rows;
  return {order:sanitizeOrder(o,req.user,admin),events:events.map(e=>({...e,actor_id:!admin&&e.actor_id===o.buyer_id&&req.user.id!==o.buyer_id?alias(o.id):e.actor_id}))};
 };
 const quote=async(p,quantity,method)=>{
  if(!p||p.status!=='active')fail('Sản phẩm không còn bán.',404);
  const qty=integer(quantity,1,99,'Số lượng');if(p.stock<qty)fail('Số lượng vượt quá tồn kho.',409);
  const settings=(await pool.query('SELECT * FROM market_seller_settings WHERE seller_id=$1',[p.seller_id])).rows[0]||{allow_cod:true,allow_transfer:false};
  if(method&&method!=='wallet')fail('Phương thức thanh toán không khả dụng.');
  return {quantity:qty,...amounts(Number(p.price),qty,Number(p.shipping_fee)),allow_transfer:false,allow_cod:false,allow_wallet:true,version:p.version,terms_version:TERMS_VERSION};
 };
 router.use('/api/market',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 router.use('/api/admin/market',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 router.get('/api/market/terms',(req,res)=>res.json({version:TERMS_VERSION,sections:TERMS}));
 router.get('/api/market/products',wrap(async(req,res)=>{const page=integer(req.query.page||1,1,100000,'Trang');res.json({products:await getProducts(24,(page-1)*24,text(req.query.q,100),text(req.query.category,60),req.query.sort),page});}));
 router.get('/api/market/products/:id',wrap(async(req,res)=>{const p=await getProduct(id(req.params.id));if(!p||!(p.status==='active'||p.restore_preview===true))fail('Không tìm thấy sản phẩm.',404);res.json({product:publicProduct(p),quote:p.restore_preview===true?null:await quote({...p,stock:Math.max(1,p.stock)},1)});}));
 router.get('/api/market/products/:id/quote',wrap(async(req,res)=>res.json(await quote(await getProduct(id(req.params.id)),req.query.quantity||1,req.query.method))));
 router.get('/api/market/seller/settings',...auth,artisan,wrap(async(req,res)=>res.json({settings:(await pool.query('SELECT * FROM market_seller_settings WHERE seller_id=$1',[req.user.id])).rows[0]||{allow_cod:true,allow_transfer:false}})));
 router.put('/api/market/seller/settings',...auth,artisan,wrap(async(req,res)=>{const s=settingsInput(req.body);await pool.query(`INSERT INTO market_seller_settings(seller_id,bank_name,account_name,account_number,allow_transfer,allow_cod) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(seller_id) DO UPDATE SET bank_name=$2,account_name=$3,account_number=$4,allow_transfer=$5,allow_cod=$6,updated_at=NOW()`,[req.user.id,s.bank_name,s.account_name,s.account_number,s.allow_transfer,s.allow_cod]);res.json({settings:s});}));
 router.get('/api/market/seller/products',...auth,artisan,wrap(async(req,res)=>res.json({products:(await pool.query(publicSelect+' WHERE p.seller_id=$1 ORDER BY p.created_at DESC LIMIT 500',[req.user.id])).rows.map(p=>({...publicProduct(p),images:p.images}))})));
 router.post('/api/market/seller/products',...auth,artisan,wrap(async(req,res)=>{
  const p=productInput(req.body),pid=crypto.randomUUID(),slug=slugify(p.title)+'-'+pid.slice(0,8);
  if(p.images.some(s=>s.startsWith('/media/market/')))fail('Sản phẩm mới cần tải ảnh hoặc dùng đường dẫn HTTPS.');
  await pool.query(`INSERT INTO market_products(id,seller_id,slug,title,description,category,condition,price,shipping_fee,stock,images,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[pid,req.user.id,slug,p.title,p.description,p.category,p.condition,p.price,p.shipping_fee,p.stock,JSON.stringify(p.images),p.status]);res.status(201).json({product:publicProduct(await getProduct(pid))});
 }));
 router.put('/api/market/seller/products/:id',...auth,artisan,wrap(async(req,res)=>{
  const p=productInput(req.body),pid=id(req.params.id);
  await transaction(pool,async c=>{
   const old=(await c.query('SELECT * FROM market_products WHERE id=$1 FOR UPDATE',[pid])).rows[0];if(!old||old.seller_id!==req.user.id)fail('Không tìm thấy sản phẩm.',404);
   if(Number(req.body.version)!==old.version||Number(req.body.previous_stock)!==old.stock)fail('Sản phẩm hoặc tồn kho vừa thay đổi. Tải lại danh sách trước khi sửa.',409);
   p.images=p.images.map(src=>{if(src.startsWith('/media/market/')){const m=src.match(/^\/media\/market\/([a-f0-9-]+)\/(\d+)/);if(!m||m[1]!==pid||!old.images[Number(m[2])])fail('Ảnh không thuộc sản phẩm.');return old.images[Number(m[2])];}return src;});
   await c.query(`UPDATE market_products SET title=$2,description=$3,category=$4,condition=$5,price=$6,shipping_fee=$7,stock=$8,images=$9,status=$10,version=version+1,updated_at=NOW() WHERE id=$1`,[pid,p.title,p.description,p.category,p.condition,p.price,p.shipping_fee,p.stock,JSON.stringify(p.images),p.status]);
  });res.json({product:publicProduct(await getProduct(pid))});
 }));
 router.get('/media/market/:id/:index',wrap(async(req,res)=>{
  const i=integer(req.params.index,0,5,'Ảnh');
  const p=(await pool.query(`SELECT p.images->>$2::int AS image,p.status,(p.status='draft' AND lc.old_user_id IS NOT NULL AND lc.access_verified=FALSE AND restored.old_status='active') AS preview FROM market_products p LEFT JOIN legacy_restore_control lc ON lc.old_user_id=p.seller_id LEFT JOIN legacy_restored_product_status restored ON restored.product_id=p.id WHERE p.id=$1`,[id(req.params.id),i])).rows[0];const v=p?.image;
  if(!p||(p.status!=='active'&&!p.preview)||!v?.startsWith('data:image/'))return res.status(404).end();const [prefix,body]=v.split(',');res.set('Cache-Control','public, max-age=300').set('X-Content-Type-Options','nosniff').type(prefix.slice(5).split(';')[0]).send(Buffer.from(body,'base64'));
 }));
 router.post('/api/market/orders',...auth,wrap(async(req,res)=>{
  if(req.user.role!=='customer')fail('Đăng nhập tài khoản khách hàng để mua.',403);
  if(req.body.accepted_terms!==true||req.body.terms_version!==TERMS_VERSION)fail('Vui lòng đọc và đồng ý phiên bản điều khoản mua hàng hiện tại.',409);
  const pid=id(req.body.product_id),key=id(req.body.request_key),quantity=integer(req.body.quantity,1,99,'Số lượng'),recipient=shippingAddress(req.body.recipient||{}),method=req.body.payment_method;
  const hash=fingerprint({pid,quantity,recipient,method,version:req.body.product_version,terms:TERMS_VERSION});
  const existing=async c=>(await c.query('SELECT * FROM market_orders WHERE buyer_id=$1 AND request_key=$2',[req.user.id,key])).rows[0];
  const replay=o=>{if(o.request_hash!==hash)fail('Mã yêu cầu đã dùng cho một nội dung khác.',409);return o;};
  let result;
  try{result=await transaction(pool,async c=>{
   const prior=await existing(c);if(prior)return replay(prior);
   const p=(await c.query('SELECT * FROM market_products WHERE id=$1 FOR UPDATE',[pid])).rows[0];
   const again=await existing(c);if(again)return replay(again);
   if(!p||p.status!=='active')fail('Sản phẩm không còn bán.',404);if(p.seller_id===req.user.id)fail('Không thể mua sản phẩm của chính mình.');
   if(p.version!==Number(req.body.product_version))fail('Sản phẩm vừa được cập nhật. Xem lại giá và đặt lại đơn.',409);
   if(p.stock<quantity)fail('Sản phẩm không còn đủ tồn kho.',409);
   const settings=(await c.query('SELECT * FROM market_seller_settings WHERE seller_id=$1',[p.seller_id])).rows[0]||{allow_cod:true,allow_transfer:false};
   if(method!=='wallet')fail('Phương thức thanh toán không khả dụng.');
   const n=amounts(Number(p.price),quantity,Number(p.shipping_fee)),oid=crypto.randomUUID();
   const snapshot={title:p.title,description:p.description,category:p.category,condition:p.condition,price:Number(p.price),slug:p.slug,images:p.images,version:p.version};
   const bank=method==='transfer'?{bank_name:settings.bank_name,account_name:settings.account_name,account_number:settings.account_number}:{};
   const o=(await c.query(`INSERT INTO market_orders(id,request_key,buyer_id,seller_id,product_id,request_hash,product_snapshot,quantity,recipient,bank_snapshot,payment_method,payment_status,goods_amount,shipping_amount,total_amount,commission_rate,platform_fee,artist_net,terms_version,terms_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,[oid,key,req.user.id,p.seller_id,pid,hash,JSON.stringify(snapshot),quantity,JSON.stringify(recipient),JSON.stringify(bank),method,method==='cod'?'awaiting_cod':'pending',n.goods,n.shipping,n.total,n.rate,n.fee,n.artistNet,TERMS_VERSION,JSON.stringify(TERMS)])).rows[0];
   if(method==='wallet'){await fund(c,'market:'+oid,req.user.id,p.seller_id,n.total,n.fee);await c.query("UPDATE market_orders SET payment_status='wallet_held' WHERE id=$1",[oid]);o.payment_status='wallet_held';}
   await c.query('UPDATE market_products SET stock=stock-$1,updated_at=NOW() WHERE id=$2',[quantity,pid]);await event(c,o,{id:req.user.id,role:'customer'},'created','Khách đã đọc và đồng ý '+TERMS_VERSION);return o;
  });}catch(e){if(e.code==='23505'){const o=await existing(pool);if(!o)throw e;result=replay(o);}else throw e;}
  res.status(201).json({order:sanitizeOrder(result,req.user)});
 }));
 router.get('/api/market/orders',...auth,wrap(async(req,res)=>{const page=integer(req.query.page||1,1,100000,'Trang');const seller=req.query.role==='seller';if(seller&&req.user.role!=='artisan')fail('Không có quyền xem đơn bán.',403);const rows=await listOrders(`WHERE o.${seller?'seller_id':'buyer_id'}=$1 ORDER BY o.created_at DESC LIMIT 30 OFFSET $2`,[req.user.id,(page-1)*30],true);res.json({orders:rows.map(o=>{const r=sanitizeOrder(o,req.user);delete r.product_snapshot.images;delete r.terms_snapshot;return r;}),page});}));
 router.get('/api/market/orders/:id',...auth,wrap(async(req,res)=>res.json(await readOrder(req))));
 router.post('/api/market/orders/:id/actions',...auth,wrap(async(req,res)=>{
  const oid=id(req.params.id);await transaction(pool,async c=>{const o=(await c.query('SELECT * FROM market_orders WHERE id=$1 FOR UPDATE',[oid])).rows[0];if(!o)fail('Không tìm thấy đơn.',404);await changeOrder(c,o,{id:req.user.id,role:req.user.role},req.body.action,req.body);});res.json(await readOrder(req));
 }));
 router.get('/api/admin/market/orders/:id',requireAdmin,wrap(async(req,res)=>res.json(await readOrder(req,true))));
 router.post('/api/admin/market/orders/:id/actions',requireAdmin,wrap(async(req,res)=>{await transaction(pool,async c=>{const o=(await c.query('SELECT * FROM market_orders WHERE id=$1 FOR UPDATE',[id(req.params.id)])).rows[0];if(!o)fail('Không tìm thấy đơn.',404);await changeOrder(c,o,{id:req.admin.id,role:'admin'},req.body.action,req.body);});res.json(await readOrder(req,true));}));
 const report=async query=>{
  const p=period(query);const rows=await listOrders('WHERE o.created_at >= $1 AND o.created_at < $2 ORDER BY o.created_at DESC LIMIT 20001',[p.start,p.end],true);if(rows.length>20000)fail('Kỳ báo cáo quá lớn. Hãy chọn khoảng ngày ngắn hơn.',413);
  const result=aggregate(rows,p);const before={...p,start:new Date(+new Date(p.start)-p.days*864e5).toISOString(),end:p.start};
  const prevRows=await listOrders('WHERE o.created_at >= $1 AND o.created_at < $2 ORDER BY o.created_at DESC LIMIT 20001',[before.start,before.end],true);if(prevRows.length>20000)fail('Kỳ so sánh quá lớn. Hãy chọn khoảng ngày ngắn hơn.',413);
  const previous=aggregate(prevRows,{...p,...before});result.previous=previous.totals;result.growthPercent=previous.totals.goods?Math.round((result.totals.goods-previous.totals.goods)/previous.totals.goods*1000)/10:null;result.financeReport=require('./finance-report').buildMarketplaceFinanceReport(result);return result;
 };
 router.get('/api/admin/market/report',requireAdmin,wrap(async(req,res)=>{const result=await report(req.query);result.orders=result.orders.map(o=>{const r=sanitizeOrder(o,req.user,true);delete r.product_snapshot.images;delete r.terms_snapshot;delete r.recipient;delete r.bank_snapshot;return r;});res.json(result);}));
 router.get('/api/admin/market/export.xlsx',requireAdmin,wrap(async(req,res)=>{const r=await report(req.query);const workbook=await reportWorkbook(r);res.set('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').set('Content-Disposition',`attachment; filename="DioraLink-Marketplace-${r.period.from}-${r.period.to}.xlsx"`);res.send(Buffer.from(await workbook.xlsx.writeBuffer()));}));
 router.get('/marketplace',wrap(async(req,res)=>{const page=integer(req.query.page||1,1,100000,'Trang'),search=text(req.query.q,100),category=text(req.query.category,60),sort=req.query.sort||'new';const products=await getProducts(25,(page-1)*24,search,category,sort);const p=marketPage(products.slice(0,24),{page,search,category,sort,more:products.length>24});res.type('html').set('Cache-Control','no-cache').send(renderDocument(template,p,[]));}));
 router.get('/marketplace/:slug',wrap(async(req,res,next)=>{const row=(await pool.query(lightPublicSelect+" WHERE p.slug=$1 AND "+visibleWhere,[req.params.slug])).rows[0];if(!row)return next();const p=publicProduct(row);res.type('html').set('Cache-Control','no-cache').send(renderDocument(template,productPage(p),[]));}));
 router.get('/dieu-khoan-mua-hang',(req,res)=>res.type('html').set('Cache-Control','no-cache').send(renderDocument(template,termsPage(),[])));
 router.use((error,req,res,next)=>{if(!req.path.startsWith('/api/')&&!req.path.startsWith('/marketplace')&&!req.path.startsWith('/media/market'))return next(error);const status=error.status||500;if(status===500)console.error('Marketplace:',error);res.status(status).json({message:status===500?'Không thể xử lý yêu cầu. Vui lòng thử lại.':error.message});});
 return {router,getHomeSection:async()=>homeSection(await getProducts(6)),getSitemapEntries:async()=>{const rows=(await pool.query("SELECT slug,updated_at FROM market_products WHERE status='active' ORDER BY created_at DESC")).rows;return [{path:'/marketplace'},{path:'/dieu-khoan-mua-hang'},...rows.map(r=>({path:'/marketplace/'+r.slug,lastmod:r.updated_at}))];}};
}
module.exports={ensureMarketplaceSchema,createMarketplace,changeOrder,productInput,settingsInput,publicProduct,transaction};

