'use strict';
// Marketplace grouped checkout: one physical shipment and one order per artisan.
const express=require('express');
const {randomUUID}=require('node:crypto');
const {fund}=require('./wallet');
const {TERMS_VERSION,TERMS,text,fail,integer,feeRate,shippingAddress,fingerprint}=require('./marketplace-core');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function normalizeItems(value){
 if(!Array.isArray(value)||!value.length||value.length>20)fail('Giỏ hàng phải có từ 1 đến 20 sản phẩm.');
 const ids=new Set();
 return value.map(row=>{
  if(!row||typeof row.product_id!=='string'||!UUID.test(row.product_id))fail('Mã sản phẩm không hợp lệ.');
  const product_id=row.product_id.toLowerCase();
  if(ids.has(product_id))fail('Sản phẩm trùng trong giỏ. Hãy tăng số lượng thay vì thêm dòng mới.');ids.add(product_id);
  return {product_id,quantity:integer(row.quantity,1,99,'Số lượng'),product_version:integer(row.product_version,1,100000000,'Phiên bản sản phẩm')};
 });
}
function voucherCode(value){
 const code=text(value||'',32).toUpperCase();
 if(code&&!/^[A-Z0-9_-]{3,32}$/.test(code))fail('Mã voucher không hợp lệ.');
 return code;
}
async function compute(c,body,{buyerId,lock=false}={}){
 const lines=normalizeItems(body.items),method=body.payment_method;
 if(!['cod','wallet'].includes(method))fail('Chọn COD hoặc Ví Diora.');
 const products=new Map();
 for(const productId of lines.map(x=>x.product_id).sort()){
  const p=(await c.query('SELECT * FROM market_products WHERE id=$1'+(lock?' FOR UPDATE':''),[productId])).rows[0];
  if(!p||p.status!=='active')fail('Một sản phẩm trong giỏ không còn bán.',409);
  products.set(productId,p);
 }
 const sellerId=products.get(lines[0].product_id).seller_id;
 if(lines.some(i=>products.get(i.product_id).seller_id!==sellerId))fail('Mỗi lần thanh toán chỉ chọn sản phẩm của cùng một nghệ nhân.',409);
 const sellerSettings=(await c.query('SELECT allow_cod FROM market_seller_settings WHERE seller_id=$1',[sellerId])).rows[0];
 const allowCod=sellerSettings?.allow_cod!==false;
 if(method==='cod'&&!allowCod)fail('Nghệ nhân này chưa hỗ trợ COD.',409);
 let goods=0,shipping=0;
 const items=lines.map(line=>{
  const p=products.get(line.product_id);
  if(p.version!==line.product_version)fail('Sản phẩm vừa đổi giá hoặc thông tin. Cập nhật giỏ hàng trước khi mua.',409);
  if(p.stock<line.quantity)fail('Sản phẩm '+p.title+' không đủ tồn kho.',409);
  const price=Number(p.price),itemGoods=price*line.quantity;
  goods+=itemGoods;shipping=Math.max(shipping,Number(p.shipping_fee));
  return {product_id:p.id,quantity:line.quantity,price,goods:itemGoods,title:p.title,description:p.description,category:p.category,condition:p.condition,slug:p.slug,images:p.images,version:p.version};
 });
 if(!Number.isSafeInteger(goods)||goods>10000000000)fail('Tổng tiền hàng vượt giới hạn.');
 const rate=feeRate(goods),grossFee=Math.round(goods*rate/100);
 const code=voucherCode(body.voucher_code);
 let discount=0;
 if(code){
  const voucher=(await c.query('SELECT * FROM market_vouchers WHERE code=$1'+(lock?' FOR UPDATE':''),[code])).rows[0];
  if(!voucher||!voucher.active||voucher.starts_at&&new Date(voucher.starts_at)>new Date()||voucher.ends_at&&new Date(voucher.ends_at)<=new Date())fail('Voucher không tồn tại, chưa có hiệu lực hoặc đã hết hạn.',409);
  if(goods<Number(voucher.min_goods))fail('Đơn hàng chưa đủ giá trị tối thiểu để áp dụng voucher.',409);
  if(Number(voucher.used)>=Number(voucher.usage_limit))fail('Voucher đã hết lượt sử dụng.',409);
  if(buyerId){
   const used=(await c.query("SELECT COUNT(*)::int AS count FROM market_orders WHERE buyer_id=$1 AND voucher_code=$2 AND voucher_reversed=FALSE",[buyerId,code])).rows[0];
   if(Number(used.count)>0)fail('Bạn đã sử dụng voucher này.',409);
  }
  discount=voucher.kind==='percent'?Math.floor(goods*Number(voucher.value)/100):Number(voucher.value);
  if(Number(voucher.max_discount)>0)discount=Math.min(discount,Number(voucher.max_discount));
  // Platform-funded vouchers reduce the service fee, never the artisan's earnings.
  discount=Math.min(discount,grossFee);
  if(discount<=0)fail('Voucher không đủ điều kiện áp dụng.',409);
 }
 return {items,seller_id:sellerId,quantity:items.reduce((sum,i)=>sum+i.quantity,0),goods,shipping,total:goods+shipping-discount,discount,voucher_code:code,rate,gross_fee:grossFee,fee:grossFee-discount,artist_net:goods-grossFee,allow_cod:allowCod,allow_wallet:true,allow_transfer:false,terms_version:TERMS_VERSION};
}
function createCartRoutes({pool,requireAuth,requireAdmin,transaction,sanitizeOrder}){
 const router=express.Router(),wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 router.use(['/api/market/cart','/api/admin/market/vouchers'],(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 router.post('/api/market/cart/quote',requireAuth,wrap(async(req,res)=>{
  if(req.user.role!=='customer')fail('Đăng nhập tài khoản khách hàng để mua.',403);
  const q=await compute(pool,req.body,{buyerId:req.user.id});
  // Display only public product information in quotes.
  res.json(q);
 }));
 router.post('/api/market/cart/orders',requireAuth,wrap(async(req,res)=>{
  if(req.user.role!=='customer')fail('Đăng nhập tài khoản khách hàng để mua.',403);
  if(req.body.accepted_terms!==true||req.body.terms_version!==TERMS_VERSION)fail('Vui lòng đồng ý điều khoản mua hàng hiện tại.',409);
  if(!UUID.test(req.body.request_key||''))fail('Mã yêu cầu đặt hàng không hợp lệ.');
  const recipient=shippingAddress(req.body.recipient||{});
  const lines=normalizeItems(req.body.items);
  const request_key=req.body.request_key,method=req.body.payment_method,code=voucherCode(req.body.voucher_code);
  const hash=fingerprint({items:lines,recipient,method,code,terms:TERMS_VERSION});
  const existing=async c=>(await c.query('SELECT * FROM market_orders WHERE buyer_id=$1 AND request_key=$2',[req.user.id,request_key])).rows[0];
  const replay=o=>{if(o.request_hash!==hash)fail('Mã yêu cầu đã dùng cho nội dung đặt hàng khác.',409);return o;};
  let result;
  try{result=await transaction(pool,async c=>{
   const old=await existing(c);if(old)return replay(old);
   const q=await compute(c,{items:lines,payment_method:method,voucher_code:code},{buyerId:req.user.id,lock:true});
   const again=await existing(c);if(again)return replay(again);
   const orderId=randomUUID(),primary=q.items[0];
   if(req.user.id===q.seller_id)fail('Không thể mua sản phẩm của chính mình.',409);
   const snapshot={title:primary.title,description:primary.description,category:primary.category,condition:primary.condition,price:primary.price,slug:primary.slug,images:primary.images,version:primary.version};
   const created=(await c.query(`INSERT INTO market_orders(id,request_key,buyer_id,seller_id,product_id,request_hash,product_snapshot,quantity,recipient,bank_snapshot,payment_method,payment_status,goods_amount,shipping_amount,total_amount,commission_rate,platform_fee,artist_net,terms_version,terms_snapshot,items,voucher_code,voucher_discount) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
   [orderId,request_key,req.user.id,q.seller_id,primary.product_id,hash,JSON.stringify(snapshot),q.quantity,JSON.stringify(recipient),'{}',method,method==='cod'?'awaiting_cod':'pending',q.goods,q.shipping,q.total,q.rate,q.fee,q.artist_net,TERMS_VERSION,JSON.stringify(TERMS),JSON.stringify(q.items),code,q.discount])).rows[0];
   if(method==='wallet'){
    await fund(c,'market:'+orderId,req.user.id,q.seller_id,q.total,q.fee);
    await c.query("UPDATE market_orders SET payment_status='wallet_held' WHERE id=$1",[orderId]);created.payment_status='wallet_held';
   }
   for(const line of q.items)await c.query('UPDATE market_products SET stock=stock-$1,updated_at=NOW() WHERE id=$2',[line.quantity,line.product_id]);
   if(code)await c.query('UPDATE market_vouchers SET used=used+1 WHERE code=$1',[code]);
   await c.query('INSERT INTO market_order_events(id,order_id,actor_id,actor_role,action,note,evidence) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),orderId,req.user.id,'customer','created','Đặt '+q.items.length+' dòng sản phẩm; đồng ý '+TERMS_VERSION+(code?'; voucher '+code:''),'[]']);
   return created;
  });}catch(e){if(e.code==='23505'){const old=await existing(pool);if(!old)throw e;result=replay(old);}else throw e;}
  res.status(201).json({order:sanitizeOrder(result,req.user)});
 }));
 router.get('/api/admin/market/vouchers',requireAdmin,wrap(async(req,res)=>{
  res.json({vouchers:(await pool.query('SELECT * FROM market_vouchers ORDER BY created_at DESC LIMIT 200')).rows});
 }));
 router.post('/api/admin/market/vouchers',requireAdmin,wrap(async(req,res)=>{
  const b=req.body,code=voucherCode(b.code);
  if(!code)fail('Nhập mã voucher.');
  if(!['fixed','percent'].includes(b.kind))fail('Chọn kiểu giảm giá.');
  const value=integer(b.value,1,b.kind==='percent'?100:1000000000,'Giá trị voucher'),
   min_goods=integer(b.min_goods??0,0,10000000000,'Giá trị đơn tối thiểu'),
   max_discount=integer(b.max_discount??0,0,1000000000,'Mức giảm tối đa'),
   usage_limit=integer(b.usage_limit,1,1000000,'Số lượt sử dụng');
  const ends_at=b.ends_at?new Date(b.ends_at):null;
  if(ends_at&&(!Number.isFinite(+ends_at)||ends_at<=new Date()))fail('Ngày hết hạn phải ở tương lai.');
  const row=(await pool.query('INSERT INTO market_vouchers(code,kind,value,min_goods,max_discount,usage_limit,ends_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[code,b.kind,value,min_goods,max_discount,usage_limit,ends_at,req.admin.id])).rows[0];
  res.status(201).json({voucher:row});
 }));
 router.use((err,req,res,next)=>{
  if(!req.path.startsWith('/api/market/cart')&&!req.path.startsWith('/api/admin/market/vouchers'))return next(err);
  if(!err.status)console.error('Marketplace cart:',err);
  res.status(err.status||500).json({message:err.status?err.message:'Không thể xử lý yêu cầu. Vui lòng thử lại.'});
 });
 return router;
}
module.exports={createCartRoutes,normalizeItems,compute};
