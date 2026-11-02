'use strict';
const express=require('express'),crypto=require('node:crypto');
const {fund}=require('./wallet');
const {TERMS_VERSION,TERMS,text,fail,integer,amounts,shippingAddress,fingerprint}=require('./marketplace-core');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function uuid(value){if(typeof value!=='string'||!UUID.test(value))fail('Mã không hợp lệ.',404);return value;}
function buyerNote(value){if(value==null||value==='')return '';if(typeof value!=='string'||value.trim().length>1000)fail('Ghi chú cho nghệ nhân tối đa 1.000 ký tự.');return value.trim();}
async function transaction(pool,fn){const c=await pool.connect();try{await c.query('BEGIN');const x=await fn(c);await c.query('COMMIT');return x;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function ensureCartSchema(pool){
 await pool.query([
 'CREATE TABLE IF NOT EXISTS market_cart_items(buyer_id TEXT NOT NULL REFERENCES users(id),product_id UUID NOT NULL REFERENCES market_products(id),quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(buyer_id,product_id));',
 'CREATE TABLE IF NOT EXISTS market_cart_checkouts(buyer_id TEXT NOT NULL REFERENCES users(id),request_key UUID NOT NULL,request_hash TEXT NOT NULL,seller_id TEXT NOT NULL REFERENCES users(id),order_ids UUID[] NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(buyer_id,request_key));',
 'CREATE TABLE IF NOT EXISTS market_order_items(order_id UUID NOT NULL REFERENCES market_orders(id),product_id UUID NOT NULL REFERENCES market_products(id),quantity INTEGER NOT NULL CHECK(quantity>0),unit_price BIGINT NOT NULL CHECK(unit_price>0),goods_amount BIGINT NOT NULL CHECK(goods_amount>=0),product_snapshot JSONB NOT NULL,PRIMARY KEY(order_id,product_id));',
 'CREATE INDEX IF NOT EXISTS market_order_items_product ON market_order_items(product_id);'
 ].join('\n'));
}
function totals(items){
 const map=new Map();
 for(const item of items){
  let g=map.get(item.seller_id);
  if(!g){g={seller_id:item.seller_id,seller_name:item.seller_name,items:[],goods:0,shipping:0,quantity:0};map.set(item.seller_id,g);}
  g.items.push(item);g.goods+=item.price*item.quantity;g.shipping=Math.max(g.shipping,item.shipping_fee);g.quantity+=item.quantity;
 }
 return [...map.values()].map(g=>({...g,total:g.goods+g.shipping,available:g.items.every(i=>i.status==='active'&&i.stock>=i.quantity&&i.stock>0)}));
}
function createCartRouter({pool,requireAuth}){
 const r=express.Router(),wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
 const customer=(req,res,next)=>req.user.role==='customer'?next():res.status(403).json({message:'Chuyển sang chế độ Khách hàng để sử dụng giỏ hàng.'});
 r.use('/api/market/cart',requireAuth,customer);
 const cartRows=async(buyer)=>{
  const result=await pool.query("SELECT i.product_id,i.quantity,i.updated_at,p.seller_id,p.title,p.price,p.shipping_fee,p.stock,p.version,p.status,p.images,COALESCE(profile.profile->>'name',seller.name) AS seller_name FROM market_cart_items i JOIN market_products p ON p.id=i.product_id JOIN users seller ON seller.id=p.seller_id LEFT JOIN public_artisan_profiles profile ON profile.user_id=p.seller_id AND profile.published=TRUE WHERE i.buyer_id=$1 ORDER BY p.seller_id,p.id",[buyer]);
  return result.rows.map(v=>({product_id:v.product_id,quantity:v.quantity,updated_at:v.updated_at,seller_id:v.seller_id,seller_name:v.seller_name,title:v.title,price:Number(v.price),shipping_fee:Number(v.shipping_fee),stock:v.stock,version:v.version,status:v.status,image:String(v.images?.[0]||'').startsWith('data:')?'/media/market/'+v.product_id+'/0?v='+v.version:(v.images?.[0]||'')}));
 };
 const respond=async(req,res)=>{const items=await cartRows(req.user.id);res.json({items,groups:totals(items)});};
 r.get('/api/market/cart',wrap(respond));
 r.post('/api/market/cart/items',wrap(async(req,res)=>{
  const product=uuid(req.body?.product_id),qty=integer(req.body?.quantity??1,1,99,'Số lượng');
  await transaction(pool,async c=>{
   await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const p=(await c.query('SELECT seller_id,status,stock FROM market_products WHERE id=$1',[product])).rows[0];
   if(!p||p.status!=='active'||qty>p.stock)fail('Sản phẩm đã hết hoặc không còn bán.',409);
   if(p.seller_id===req.user.id)fail('Không thể mua sản phẩm của chính mình.',409);
   await c.query('INSERT INTO market_cart_items(buyer_id,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT (buyer_id,product_id) DO NOTHING',[req.user.id,product,qty]);
  });await respond(req,res);
 }));
 r.patch('/api/market/cart/items/:id',wrap(async(req,res)=>{
  const product=uuid(req.params.id),qty=integer(req.body?.quantity,1,99,'Số lượng');
  await transaction(pool,async c=>{
   await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const p=(await c.query('SELECT status,stock FROM market_products WHERE id=$1',[product])).rows[0];
   if(!p||p.status!=='active'||qty>p.stock)fail('Tồn kho hiện không đáp ứng số lượng đã chọn.',409);
   const updated=await c.query('UPDATE market_cart_items SET quantity=$3,updated_at=NOW() WHERE buyer_id=$1 AND product_id=$2 RETURNING product_id',[req.user.id,product,qty]);
   if(!updated.rows.length)fail('Sản phẩm không có trong giỏ.',404);
  });await respond(req,res);
 }));
 r.delete('/api/market/cart/items/:id',wrap(async(req,res)=>{
  const product=uuid(req.params.id);
  await transaction(pool,async c=>{
   await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   await c.query('DELETE FROM market_cart_items WHERE buyer_id=$1 AND product_id=$2',[req.user.id,product]);
  });await respond(req,res);
 }));
 r.post('/api/market/cart/checkout',wrap(async(req,res)=>{
  if(req.body?.accepted_terms!==true||req.body.terms_version!==TERMS_VERSION)fail('Vui lòng đồng ý điều khoản mua hàng hiện tại.',409);
  const key=uuid(req.body.request_key),seller=text(req.body.seller_id,120),recipient=shippingAddress(req.body.recipient||{}),note=buyerNote(req.body.buyer_note),method=req.body.payment_method;
  if(method!=='wallet')fail('Chỉ hỗ trợ Ví Diora.',409);
  if(!seller)fail('Chưa chọn nghệ nhân thanh toán.');
  const hash=fingerprint({seller,recipient,note,method,terms:TERMS_VERSION});
  const result=await transaction(pool,async c=>{
   // Serializes edits and two checkout submissions for the same buyer.
   await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const prior=(await c.query('SELECT * FROM market_cart_checkouts WHERE buyer_id=$1 AND request_key=$2',[req.user.id,key])).rows[0];
   if(prior){
    if(prior.request_hash!==hash)fail('Mã thanh toán đã dùng cho nội dung khác.',409);
    const rows=(await c.query('SELECT * FROM market_orders WHERE id=ANY($1::uuid[]) ORDER BY created_at,id',[prior.order_ids])).rows;
    return {orders:rows,replayed:true};
   }
   const products=(await c.query('SELECT p.*,i.quantity FROM market_cart_items i JOIN market_products p ON p.id=i.product_id WHERE i.buyer_id=$1 AND p.seller_id=$2 ORDER BY p.id FOR UPDATE OF p,i',[req.user.id,seller])).rows;
   if(!products.length)fail('Giỏ không có sản phẩm của nghệ nhân này.',409);
   if(products.length>40)fail('Tối đa 40 mặt hàng trong một lượt thanh toán.',409);
   // One checkout creates one order, tracking number, wallet hold and receipt confirmation.
   // Keep all product lines snapshotted for accurate stock and historical reporting.
   for(const p of products){
    if(p.status!=='active'||p.stock<p.quantity||!p.stock)fail('Sản phẩm "'+p.title+'" đã hết hoặc thay đổi số lượng. Hãy cập nhật giỏ.',409);
    if(p.seller_id===req.user.id)fail('Không thể mua sản phẩm của chính mình.',409);
   }
   const goods=products.reduce((sum,p)=>sum+Number(p.price)*p.quantity,0);
   const shipping=Math.max(...products.map(p=>Number(p.shipping_fee)));
   const sums=amounts(goods,1,shipping);
   const items=products.map(p=>({
    product_id:p.id,quantity:p.quantity,unit_price:Number(p.price),
    goods_amount:Number(p.price)*p.quantity,title:p.title,description:p.description,
    category:p.category,condition:p.condition,slug:p.slug,version:p.version,images:p.images
   }));
   const first=items[0],units=products.reduce((sum,p)=>sum+p.quantity,0);
   const snapshot={
    title:items.length===1?first.title:'Đơn gồm '+items.length+' sản phẩm',
    description:items.length===1?first.description:'Các sản phẩm gửi cùng một kiện hàng.',
    category:first.category,condition:first.condition,price:goods,
    slug:first.slug,version:first.version,images:first.images,items
   };
   const oid=crypto.randomUUID(),batch=crypto.randomUUID();
   const order=(await c.query("INSERT INTO market_orders(id,request_key,buyer_id,seller_id,product_id,request_hash,product_snapshot,quantity,recipient,bank_snapshot,payment_method,payment_status,goods_amount,shipping_amount,total_amount,commission_rate,platform_fee,artist_net,terms_version,terms_snapshot,buyer_note,cart_batch_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'{}'::jsonb,'wallet','wallet_held',$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *",[
     oid,crypto.randomUUID(),req.user.id,seller,first.product_id,hash,JSON.stringify(snapshot),units,JSON.stringify(recipient),
     sums.goods,sums.shipping,sums.total,sums.rate,sums.fee,sums.artistNet,TERMS_VERSION,JSON.stringify(TERMS),note,batch
   ])).rows[0];
   for(const p of products){
    const item=items.find(x=>x.product_id===p.id);
    await c.query('INSERT INTO market_order_items(order_id,product_id,quantity,unit_price,goods_amount,product_snapshot) VALUES($1,$2,$3,$4,$5,$6)',[
      oid,p.id,p.quantity,item.unit_price,item.goods_amount,JSON.stringify(item)
    ]);
    await c.query('UPDATE market_products SET stock=stock-$1,updated_at=NOW() WHERE id=$2',[p.quantity,p.id]);
   }
   await fund(c,'market:'+oid,req.user.id,seller,sums.total,sums.fee);
   await c.query('INSERT INTO market_order_events(id,order_id,actor_id,actor_role,action,note) VALUES($1,$2,$3,$4,$5,$6)',[crypto.randomUUID(),oid,req.user.id,'customer','created','Đơn nhiều sản phẩm từ giỏ hàng; đồng ý '+TERMS_VERSION]);
   const orders=[order];
   await c.query('DELETE FROM market_cart_items WHERE buyer_id=$1 AND product_id=ANY($2::uuid[])',[req.user.id,products.map(p=>p.id)]);
   await c.query('INSERT INTO market_cart_checkouts(buyer_id,request_key,request_hash,seller_id,order_ids) VALUES($1,$2,$3,$4,$5)',[req.user.id,key,hash,seller,orders.map(o=>o.id)]);
   return {orders,replayed:false};
  });
  res.status(result.replayed?200:201).json({orders:result.orders.map(o=>{const x={...o};delete x.request_hash;delete x.request_key;return x;}),replayed:result.replayed});
 }));
 return r;
}
module.exports={ensureCartSchema,createCartRouter,totals};