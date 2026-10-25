'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {fixture}=require('./marketplace-fixture');
const {TERMS_VERSION}=require('../marketplace-core');
let f;before(async()=>{f=await fixture();});after(async()=>f?.close());
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';
async function product(overrides={},user='seller'){
 const body={title:'Sản phẩm mô hình',description:'Mô hình thủ công làm sẵn kích thước 20 x 30 cm để trưng bày.',category:'Miniature',condition:'Mới',price:100000,shipping_fee:20000,stock:6,images:[image],status:'active',...overrides};
 const r=await f.api('/api/market/seller/products',{user,method:'POST',body});
 assert.equal(r.status,201,JSON.stringify(r.data));return r.data.product;
}
const recipient={name:'Khách An',phone:'0901234567',address:'123 Đường Lê Lợi, Hà Nội'};
const lines=(...items)=>items.map(p=>({product_id:p.id,product_version:p.version,quantity:1}));
function request(items,method='wallet',extra={}){return {items,payment_method:method,request_key:randomUUID(),recipient,accepted_terms:true,terms_version:TERMS_VERSION,...extra};}
async function post(path,body,user='buyer',admin=false){return f.api(path,{user,admin,method:'POST',body});}
test('COD checkout groups two products of one artisan under one shipping fee',async()=>{
 const p=await product({shipping_fee:30000}),q=await product({price:250000,shipping_fee:50000});
 const body=request(lines(p,q),'cod');
 const quoted=await post('/api/market/cart/quote',body);
 assert.equal(quoted.status,200,JSON.stringify(quoted.data));assert.equal(quoted.data.goods,350000);assert.equal(quoted.data.shipping,50000);assert.equal(quoted.data.total,400000);
 const order=await post('/api/market/cart/orders',body);
 assert.equal(order.status,201,JSON.stringify(order.data));const o=order.data.order;
 assert.equal(o.items.length,2);assert.equal(o.payment_method,'cod');assert.equal(o.payment_status,'awaiting_cod');assert.equal(Number(o.shipping_amount),50000);
 assert.equal((await post('/api/market/cart/orders',body)).data.order.id,o.id);
 assert.equal((await post('/api/market/cart/orders',{...body,items:lines(p)},'buyer')).status,409);
 assert.equal((await f.api('/api/market/products/'+p.id)).data.product.stock,5);
 assert.equal((await f.api('/api/market/products/'+q.id)).data.product.stock,5);
 await post('/api/market/orders/'+o.id+'/actions',{action:'accept'},'seller');
 const shipped=await post('/api/admin/market/orders/'+o.id+'/actions',{action:'ship',tracking_number:'SPXCART1234'},'buyer',true);
 assert.equal(shipped.status,200,JSON.stringify(shipped.data));
 assert.equal((await post('/api/market/orders/'+o.id+'/actions',{action:'receive'})).data.order.status,'delivered');
 assert.equal((await post('/api/market/orders/'+o.id+'/actions',{action:'cod_received',reference:'SPXCOD1234'},'seller')).data.order.status,'completed');
 const holds=(await f.pool.query("SELECT * FROM diora_holds WHERE ref=$1",['market:'+o.id])).rows;
 assert.equal(holds.length,0);
});
test('platform voucher reduces buyer payment and platform fee, not artisan revenue',async()=>{
 const p=await product({price:500000,shipping_fee:30000}),q=await product({price:300000,shipping_fee:40000});
 const voucher=await post('/api/admin/market/vouchers',{code:'SAVE40000',kind:'fixed',value:40000,min_goods:400000,max_discount:40000,usage_limit:2},'buyer',true);
 assert.equal(voucher.status,201,JSON.stringify(voucher.data));
 const body=request(lines(p,q),'wallet',{voucher_code:'SAVE40000'});
 const preview=await post('/api/market/cart/quote',body);assert.equal(preview.status,200,JSON.stringify(preview.data));
 assert.equal(preview.data.goods,800000);assert.equal(preview.data.shipping,40000);assert.equal(preview.data.discount,40000);
 assert.equal(preview.data.total,800000);assert.equal(preview.data.fee,40000);assert.equal(preview.data.artist_net,720000);
 const res=await post('/api/market/cart/orders',body);assert.equal(res.status,201,JSON.stringify(res.data));const o=res.data.order;
 const holds=(await f.pool.query('SELECT * FROM diora_holds WHERE ref=$1',['market:'+o.id])).rows;
 assert.equal(Number(holds[0].amount),800000);assert.equal(Number(holds[0].fee),40000);
 const duplicate=await post('/api/market/cart/orders',request(lines(p),'wallet',{voucher_code:'SAVE40000'}));assert.equal(duplicate.status,409);
 assert.equal((await f.pool.query('SELECT used FROM market_vouchers WHERE code=$1',['SAVE40000'])).rows[0].used,1);
 await post('/api/market/orders/'+o.id+'/actions',{action:'accept'},'seller');
 await post('/api/admin/market/orders/'+o.id+'/actions',{action:'ship',tracking_number:'SPXWALLET123'},'buyer',true);
 const done=await post('/api/market/orders/'+o.id+'/actions',{action:'receive'});assert.equal(done.status,200,JSON.stringify(done.data));
 const sale=(await f.pool.query("SELECT delta FROM diora_ledger WHERE ref=$1 AND kind='sale'",['market:'+o.id])).rows[0];
 assert.equal(Number(sale.delta),760000);
 const r=await f.api('/api/admin/market/report',{admin:true});
 assert.ok(r.data.products.some(x=>x.id===p.id&&x.goods>=500000));assert.ok(r.data.products.some(x=>x.id===q.id&&x.goods>=300000));
});
test('cancelling bundled wallet order restores all stock, refund and voucher allocation',async()=>{
 const p=await product({price:300000}),q=await product({price:200000});
 const voucher=await post('/api/admin/market/vouchers',{code:'RETURN400',kind:'fixed',value:40000,min_goods:300000,usage_limit:1},'buyer',true);assert.equal(voucher.status,201);
 const b=request(lines(p,q),'wallet',{voucher_code:'RETURN400'});
 const o=await post('/api/market/cart/orders',b);assert.equal(o.status,201,JSON.stringify(o.data));
 const oid=o.data.order.id;
 assert.equal((await post('/api/market/orders/'+oid+'/actions',{action:'cancel',note:'Khách thay đổi nhu cầu'})).status,200);
 assert.equal((await f.api('/api/market/products/'+p.id)).data.product.stock,6);
 assert.equal((await f.api('/api/market/products/'+q.id)).data.product.stock,6);
 assert.equal((await f.pool.query('SELECT status FROM diora_holds WHERE ref=$1',['market:'+oid])).rows[0].status,'refunded');
 assert.equal((await f.pool.query('SELECT used FROM market_vouchers WHERE code=$1',['RETURN400'])).rows[0].used,0);
 assert.equal((await post('/api/market/orders/'+oid+'/actions',{action:'cancel',note:'Hủy lặp lại'})).status,409);
});
test('cart disallows multiple artisans and over-selling; voucher admin cannot be forged',async()=>{
 const p=await product({stock:1}),q=await product({},'outsider');
 const mixed=await post('/api/market/cart/orders',request(lines(p,q),'cod'));assert.equal(mixed.status,409);
 assert.equal((await post('/api/admin/market/vouchers',{code:'FAKE123',kind:'percent',value:5,usage_limit:1})).status,401);
 const payload=request(lines(p),'cod');
 const res=await Promise.all([post('/api/market/cart/orders',payload),post('/api/market/cart/orders',request(lines(p),'cod'),'buyer2')]);
 assert.deepEqual(res.map(r=>r.status).sort(),[201,409]);
 assert.equal((await f.api('/api/market/products/'+p.id)).data.product.stock,0);
});
