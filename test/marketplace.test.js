'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const ExcelJS=require('exceljs');
const {fixture}=require('./marketplace-fixture');
const {TERMS_VERSION,feeRate,period}=require('../marketplace-core');
let f;before(async()=>{f=await fixture();});after(async()=>f?.close());
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';
const productBody={title:'Nhà gỗ thu nhỏ',description:'Mô hình làm sẵn bằng gỗ, kích thước 20 x 30 cm, đóng gói bảo vệ đầy đủ.',category:'Miniature',condition:'Mới',price:2000000,shipping_fee:30000,stock:5,images:[image],status:'active'};
async function product(overrides={}){const r=await f.api('/api/market/seller/products',{user:'seller',method:'POST',body:{...productBody,...overrides}});assert.equal(r.status,201,JSON.stringify(r.data));return r.data.product;}
function payload(p,extra={}){return {product_id:p.id,product_version:p.version,quantity:1,request_key:randomUUID(),recipient:{name:'Khách An',phone:'0901234567',address:'123 Đường Lê Lợi, Hà Nội'},payment_method:'wallet',accepted_terms:true,terms_version:TERMS_VERSION,...extra};}
async function order(p,extra={}){const r=await f.api('/api/market/orders',{user:'buyer',method:'POST',body:payload(p,extra)});assert.equal(r.status,201,JSON.stringify(r.data));return r.data.order;}
async function act(o,user,action,extra={},status=200){const admin=user==='admin';const r=await f.api(`/api/${admin?'admin/':''}market/orders/${o.id}/actions`,{user,admin,method:'POST',body:{action,...extra}});assert.equal(r.status,status,JSON.stringify(r.data));return r.data.order;}
test('product listings and order notes do not apply chat-only contact filters',async()=>{
  const p=await product({
    title:'Diorama FB thu nhỏ',
    description:'Mô hình FB, mã 123456789012345, lấy cảm hứng từ https://example.com; email reference@example.com.'
  });
  assert.match(p.description,/example\.com/);
  const updated=await f.api('/api/market/seller/products/'+p.id,{
    user:'seller',method:'PUT',body:{...productBody,title:'Mô hình Zalo phiên bản 2',
      description:'Tác phẩm miniature dựa theo từ khóa Facebook, có mã dài 123456789012345, nguồn ảnh https://example.com.',
      version:p.version,previous_stock:p.stock}
  });
  assert.equal(updated.status,200,JSON.stringify(updated.data));
  const o=await order(updated.data.product);
  await act(o,'buyer','cancel',{note:'Hủy vì thay đổi dự án, tham chiếu https://example.com và Facebook.'});
});
test('fee boundaries and Vietnamese date ranges',()=>{assert.deepEqual([1999999,2000000,5000000,5000001,10000000,10000001].map(feeRate),[10,8,8,7,7,5]);assert.equal(period({from:'2026-10-01',to:'2026-10-01'}).start,'2026-09-30T17:00:00.000Z');assert.equal(period({to:'2026-10-04'}).days,30);for(const q of [{from:'2026-02-30'},{from:'2026-10-03',to:'2026-10-01'},{from:'2020-01-01',to:'2026-01-01'}])assert.throws(()=>period(q));});
test('server enforces roles, ownership, terms, price and public data boundaries',async()=>{
 assert.equal((await f.api('/api/market/seller/products')).status,401);
 assert.equal((await f.api('/api/market/seller/products',{user:'buyer',method:'POST',body:productBody})).status,403);
 const p=await product();
 assert.equal((await f.api('/api/market/seller/products/'+p.id,{user:'outsider',method:'PUT',body:{...productBody,version:1,previous_stock:5}})).status,404);
 for(const changes of [{accepted_terms:false},{terms_version:'old'},{product_version:0},{quantity:6}])assert.equal((await f.api('/api/market/orders',{user:'buyer',method:'POST',body:payload(p,changes)})).status,409);
 const o=await order(p,{price:1,platform_fee:0});assert.equal(Number(o.goods_amount),2000000);assert.equal(Number(o.platform_fee),160000);assert.deepEqual(o.bank_snapshot,{});
 assert.equal((await f.api('/api/market/orders/'+o.id,{user:'buyer2'})).status,404);
 assert.equal((await f.api('/api/admin/market/report',{user:'buyer'})).status,401);
 assert.equal((await f.api('/api/admin/market/export.xlsx',{user:'seller'})).status,401);
 const pub=await f.api('/api/market/products/'+p.id);assert.equal(pub.status,200);assert.ok(!JSON.stringify(pub.data).includes('account_number'));
});
test('concurrent last-unit checkout, replay and cancellation conserve inventory',async()=>{
 const p=await product({stock:1});const a=payload(p),b=payload(p);
 const results=await Promise.all([f.api('/api/market/orders',{user:'buyer',method:'POST',body:a}),f.api('/api/market/orders',{user:'buyer2',method:'POST',body:b})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);const idx=results.findIndex(r=>r.status===201),who=idx===0?'buyer':'buyer2',body=idx===0?a:b,o=results[idx].data.order;
 const replay=await f.api('/api/market/orders',{user:who,method:'POST',body});assert.equal(replay.data.order.id,o.id);
 assert.equal((await f.api('/api/market/products/'+p.id)).data.product.stock,0);
 assert.equal((await f.api('/api/market/orders',{user:who,method:'POST',body:{...body,quantity:2}})).status,409);
 await act(o,who,'cancel',{note:'Khách thay đổi nhu cầu'});await act(o,who,'cancel',{note:'Gửi hủy lặp lại'},409);
 assert.equal((await f.api('/api/market/products/'+p.id)).data.product.stock,1);
});
test('wallet orders conceal buyers, sellers update SPX, buyer receipt pays seller once',async()=>{
 const p=await product(),o=await order(p);await act(o,'buyer','accept',{},409);await act(o,'seller','accept');
 const seller=await f.api('/api/market/orders/'+o.id,{user:'seller'});assert.match(seller.data.order.buyer_id,/^KH-/);assert.ok(!JSON.stringify(seller.data).includes('0901234567'));assert.ok(!JSON.stringify(seller.data).includes('Khách An'));
 await act(o,'buyer','ship',{tracking_number:'SPXTEST12345'},409);
 const shipped=await act(o,'seller','ship',{tracking_number:'SPXTEST12345'});assert.equal(shipped.status,'shipped');
 await act(o,'buyer','update_tracking',{tracking_number:'SPXTEST12346'},409);
 await act(o,'seller','update_tracking',{tracking_number:'SPXTEST12346'});
 const corrected=await act(o,'admin','update_tracking',{tracking_number:'SPXTEST12347'});assert.equal(corrected.tracking_number,'SPXTEST12347');
 await act(o,'seller','receive',{},409);
 assert.equal((await f.pool.query("SELECT status FROM diora_holds WHERE ref=$1",['market:'+o.id])).rows[0].status,'held');
 assert.equal((await f.pool.query("SELECT COUNT(*)::int AS n FROM diora_ledger WHERE ref=$1 AND kind='sale'",['market:'+o.id])).rows[0].n,0);
 const complete=await act(o,'buyer','receive');assert.equal(complete.status,'completed');assert.equal(Number(complete.fee_collected_amount),160000);
 await act(o,'buyer','receive',{},409);await act(o,'admin','collect_fee',{reference:'FEE123'},409);
 const entries=(await f.pool.query("SELECT * FROM diora_ledger WHERE ref=$1 AND kind='sale'",['market:'+o.id])).rows;assert.equal(entries.length,1);assert.equal(Number(entries[0].delta),1870000);
});
test('wallet dispute freezes payout and admin refunds held funds with audit trail',async()=>{
 const p=await product(),o=await order(p);await act(o,'seller','accept');
 await act(o,'buyer','dispute',{note:'Sản phẩm không đúng yêu cầu cần kiểm tra.',evidence:[image]});await act(o,'admin','ship',{tracking_number:'SPX123456'},409);
 const refunded=await act(o,'admin','refund',{note:'Hai bên thống nhất hoàn toàn bộ tiền giữ do không giao sản phẩm.'});assert.equal(refunded.status,'refunded');
 assert.equal((await f.api('/api/market/products/'+p.id)).data.product.stock,5);
 assert.equal((await f.pool.query("SELECT status FROM diora_holds WHERE ref=$1",['market:'+o.id])).rows[0].status,'refunded');
});
test('SSR, homepage, sitemap and product schema use live catalog; missing URLs are 404',async()=>{
 const p=await product({title:'Mô hình <script>alert(1)</script>'});
 const detail=await f.api('/marketplace/'+p.slug);assert.equal(detail.status,200);assert.match(detail.data,/application\/ld\+json/);assert.match(detail.data,/"@type":"Product"/);assert.ok(!detail.data.includes('<script>alert(1)</script>'));
 assert.match((await f.api('/sitemap.xml')).data,new RegExp(p.slug));assert.equal((await f.api('/marketplace/missing-product')).status,404);
 assert.match((await f.api('/dieu-khoan-mua-hang')).data,/Hủy và tranh chấp/);
});
test('XLSX values reconcile with report and formula-like text stays literal',async()=>{
 const p=await product({title:'=1+1 mẫu thử'}),o=await order(p);await act(o,'seller','accept');await act(o,'admin','ship',{tracking_number:'SPXEXCEL123'});await act(o,'buyer','receive');
 const report=(await f.api('/api/admin/market/report',{admin:true})).data;
 const response=await fetch(f.url+'/api/admin/market/export.xlsx',{headers:{'x-test-admin':'yes'}});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/spreadsheetml/);
 const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await response.arrayBuffer()));assert.ok(book.worksheets.length>=4,'Marketplace workbook must retain its four original worksheets');
 assert.equal(book.getWorksheet('Tong quan').getCell('B6').value,report.reconciliation.totals.goods);
 const sheet=book.getWorksheet('Don hang');let sum=0,formulaTitle;
 sheet.eachRow((r,n)=>{if(n>1){assert.equal(typeof r.getCell(10).value,'number');assert.ok(r.getCell(2).value instanceof Date);if(r.getCell(7).value==='Hoàn tất'&&r.getCell(9).value==='Không')sum+=r.getCell(10).value;if(r.getCell(1).value===o.id)formulaTitle=r.getCell(4).value;}});
 assert.equal(sum,report.reconciliation.totals.goods);assert.equal(formulaTitle,p.title);assert.equal(typeof formulaTitle,'string');
});



test('cart stores unique items by account, updates quantity, and separates other buyers',async()=>{
 const a=await product({title:'Đồ chơi mô hình gỗ thủ công',price:450000,shipping_fee:29000,stock:5});
 const b=await product({title:'Đèn tiểu cảnh để bàn',price:100000,shipping_fee:45000,stock:7});
 assert.equal((await f.api('/api/market/cart')).status,401);
 assert.equal((await f.api('/api/market/cart',{user:'seller'})).status,403);
 const added=await f.api('/api/market/cart/items',{user:'buyer',method:'POST',body:{product_id:a.id}});
 assert.equal(added.status,200,JSON.stringify(added.data));
 const same=await f.api('/api/market/cart/items',{user:'buyer',method:'POST',body:{product_id:a.id}});
 assert.equal(same.data.items.filter(i=>i.product_id===a.id).length,1);
 await f.api('/api/market/cart/items',{user:'buyer',method:'POST',body:{product_id:b.id}});
 const cart=(await f.api('/api/market/cart',{user:'buyer'})).data;
 assert.equal(cart.groups.find(g=>g.seller_id==='seller').shipping,45000);
 assert.equal((await f.api('/api/market/cart',{user:'buyer2'})).data.items.length,0);
 let result=await f.api('/api/market/cart/items/'+a.id,{user:'buyer',method:'PATCH',body:{quantity:2}});
 assert.equal(result.status,200,JSON.stringify(result.data));
 assert.equal(result.data.items.find(i=>i.product_id===a.id).quantity,2);
 await f.api('/api/market/cart/items/'+a.id,{user:'buyer',method:'DELETE'});
 await f.api('/api/market/cart/items/'+b.id,{user:'buyer',method:'DELETE'});
 assert.equal((await f.api('/api/market/cart',{user:'buyer'})).data.items.length,0);
});
test('notes persist on buy-now orders and remain visible to the seller without exposing recipient PII',async()=>{
 const p=await product({title:'Trang trí hộp gỗ thủ công'});
 const note='Vui lòng đóng gói chắc chắn vì đây là quà sinh nhật.';
 const o=await order(p,{buyer_note:note});
 assert.equal(o.buyer_note,note);
 const seller=await f.api('/api/market/orders/'+o.id,{user:'seller'});
 assert.equal(seller.data.order.buyer_note,note);
 assert.ok(!JSON.stringify(seller.data).includes('0901234567'));
 const another=await f.api('/api/market/orders/'+o.id,{user:'buyer2'});
 assert.equal(another.status,404);
});
test('same-seller cart payment is atomic, one shipping charge and no duplicate payment on retries',async()=>{
 const a=await product({title:'Bàn gỗ tiểu cảnh size nhỏ',price:800000,shipping_fee:30000,stock:4});
 const b=await product({title:'Ghế gỗ tiểu cảnh size nhỏ',price:1000000,shipping_fee:50000,stock:5});
 for(const p of [a,b]){
  const add=await f.api('/api/market/cart/items',{user:'buyer2',method:'POST',body:{product_id:p.id}});
  assert.equal(add.status,200,JSON.stringify(add.data));
 }
 const note='Cho hai mô hình vào một hộp có bọc chống sốc kỹ.';
 const body={seller_id:'seller',request_key:randomUUID(),payment_method:'wallet',recipient:{name:'Khách Bình',phone:'0911222333',address:'Tầng 2 số 25 đường Láng Hà Nội'},buyer_note:note,accepted_terms:true,terms_version:TERMS_VERSION};
 const [one,two]=await Promise.all([f.api('/api/market/cart/checkout',{user:'buyer2',method:'POST',body}),f.api('/api/market/cart/checkout',{user:'buyer2',method:'POST',body})]);
 assert.deepEqual([one.status,two.status].sort(),[200,201],JSON.stringify([one.data,two.data]));
 const orders=one.data.orders;assert.equal(orders.length,1);
 assert.equal(Number(orders[0].shipping_amount),50000);
 assert.equal(Number(orders[0].total_amount),1850000);
 assert.equal(orders[0].buyer_note,note);assert.equal(orders[0].payment_status,'wallet_held');assert.equal(orders[0].quantity,2);assert.equal(orders[0].product_snapshot.items.length,2);assert.equal(Number(orders[0].platform_fee),180000);
 assert.equal((await f.api('/api/market/cart',{user:'buyer2'})).data.items.length,0);
 assert.equal((await f.api('/api/market/products/'+a.id)).data.product.stock,3);
 assert.equal((await f.api('/api/market/products/'+b.id)).data.product.stock,4);
 const hold=await f.pool.query('SELECT COUNT(*)::int AS n FROM diora_holds WHERE ref=$1',['market:'+orders[0].id]);
 assert.equal(hold.rows[0].n,1);
 const lines=(await f.pool.query('SELECT product_id,quantity,goods_amount FROM market_order_items WHERE order_id=$1',[orders[0].id])).rows;assert.equal(lines.length,2);
 const conflict=await f.api('/api/market/cart/checkout',{user:'buyer2',method:'POST',body:{...body,buyer_note:'Nội dung ghi chú khác'}});
 assert.equal(conflict.status,409);
});
test('cart checkout cannot partly reserve stock when an item is no longer available',async()=>{
 const a=await product({title:'Hộp đựng figure bằng gỗ',price:120000,stock:3});
 const b=await product({title:'Đèn dây cho mô hình nhỏ',price:50000,stock:2});
 for(const p of [a,b])await f.api('/api/market/cart/items',{user:'buyer2',method:'POST',body:{product_id:p.id}});
 const edited=await f.api('/api/market/seller/products/'+b.id,{user:'seller',method:'PUT',body:{...productBody,title:b.title,price:50000,stock:0,version:b.version,previous_stock:b.stock}});
 assert.equal(edited.status,200,JSON.stringify(edited.data));
 const body={seller_id:'seller',request_key:randomUUID(),payment_method:'wallet',recipient:{name:'Khách Bình',phone:'0911222333',address:'Tầng 3 số 21 đường Láng Hà Nội'},accepted_terms:true,terms_version:TERMS_VERSION};
 const result=await f.api('/api/market/cart/checkout',{user:'buyer2',method:'POST',body});
 assert.equal(result.status,409);
 assert.equal((await f.api('/api/market/products/'+a.id)).data.product.stock,3);
 const cart=(await f.api('/api/market/cart',{user:'buyer2'})).data.items;
 assert.ok(cart.some(p=>p.product_id===a.id));assert.ok(cart.some(p=>p.product_id===b.id));
 for(const p of [a,b])await f.api('/api/market/cart/items/'+p.id,{user:'buyer2',method:'DELETE'});
});


test('a combined purchase has one SPX shipment, one receipt confirmation and one wallet payout',async()=>{
 const a=await product({title:'Đường phố mô hình số 1',price:120000,shipping_fee:20000,stock:3});
 const b=await product({title:'Đường phố mô hình số 2',price:180000,shipping_fee:25000,stock:3});
 for(const p of [a,b]){
  const added=await f.api('/api/market/cart/items',{user:'buyer2',method:'POST',body:{product_id:p.id}});
  assert.equal(added.status,200,JSON.stringify(added.data));
 }
 const paid=await f.api('/api/market/cart/checkout',{user:'buyer2',method:'POST',body:{
  seller_id:'seller',request_key:randomUUID(),payment_method:'wallet',
  recipient:{name:'Khách Bình',phone:'0911222333',address:'Tầng 1 số 10 đường Trần Phú Hà Nội'},
  buyer_note:'Vui lòng đóng chung một kiện',accepted_terms:true,terms_version:TERMS_VERSION
 }});
 assert.equal(paid.status,201,JSON.stringify(paid.data));
 assert.equal(paid.data.orders.length,1);
 const o=paid.data.orders[0];
 assert.equal(Number(o.total_amount),325000);
 assert.equal(Number(o.platform_fee),30000);
 const before=(await f.pool.query('SELECT status FROM diora_holds WHERE ref=$1',['market:'+o.id])).rows[0];
 assert.equal(before.status,'held');
 await act(o,'seller','accept');
 const shipped=await act(o,'seller','ship',{tracking_number:'SPXCOMBINED9999'});
 assert.equal(shipped.tracking_number,'SPXCOMBINED9999');
 assert.equal(shipped.status,'shipped');
 await act(o,'seller','ship',{tracking_number:'SPXSECOND123'},409);
 await act(o,'seller','receive',{},409);
 const confirmed=await act(o,'buyer2','receive');
 assert.equal(confirmed.status,'completed');
 assert.equal(confirmed.payment_status,'received');
 assert.equal(Number(confirmed.fee_collected_amount),30000);
 await act(o,'buyer2','receive',{},409);
 const ledger=(await f.pool.query("SELECT kind,delta FROM diora_ledger WHERE ref=$1 AND kind='sale'",['market:'+o.id])).rows;
 assert.equal(ledger.length,1);
 assert.equal(Number(ledger[0].delta),295000);
 const sellerOrders=await f.api('/api/market/orders?role=seller',{user:'seller'});
 assert.equal(sellerOrders.data.orders.filter(x=>x.id===o.id).length,1);
 const listItem=sellerOrders.data.orders.find(x=>x.id===o.id);
 assert.equal(listItem.product_snapshot.items.length,2);
 assert.ok(listItem.product_snapshot.items.every(x=>!Object.hasOwn(x,'images')),'order lists must exclude nested base64 images');
 const report=(await f.api('/api/admin/market/report',{admin:true})).data;
 assert.ok(report.products.some(p=>p.id===a.id&&p.goods>=120000));
 assert.ok(report.products.some(p=>p.id===b.id&&p.goods>=180000));
});
test('cancelling combined cart purchase restores all product stock and wallet once',async()=>{
 const a=await product({title:'Mẫu ghế gỗ nhỏ',price:110000,stock:4});
 const b=await product({title:'Mẫu bàn gỗ nhỏ',price:230000,stock:2});
 for(const p of [a,b])await f.api('/api/market/cart/items',{user:'buyer2',method:'POST',body:{product_id:p.id}});
 const paid=await f.api('/api/market/cart/checkout',{user:'buyer2',method:'POST',body:{
  seller_id:'seller',request_key:randomUUID(),payment_method:'wallet',
  recipient:{name:'Khách Bình',phone:'0911222333',address:'Số 10 đường Trần Phú Hà Nội'},
  accepted_terms:true,terms_version:TERMS_VERSION
 }});
 assert.equal(paid.status,201,JSON.stringify(paid.data));
 const order=paid.data.orders[0];
 assert.equal((await f.api('/api/market/products/'+a.id)).data.product.stock,3);
 assert.equal((await f.api('/api/market/products/'+b.id)).data.product.stock,1);
 const cancelled=await act(order,'buyer2','cancel',{note:'Khách đổi địa chỉ nên hủy đơn'});
 assert.equal(cancelled.status,'cancelled');
 assert.equal(cancelled.payment_status,'refunded');
 assert.equal((await f.api('/api/market/products/'+a.id)).data.product.stock,4);
 assert.equal((await f.api('/api/market/products/'+b.id)).data.product.stock,2);
 await act(order,'buyer2','cancel',{note:'Hủy một lần nữa'},409);
 const hold=(await f.pool.query('SELECT status FROM diora_holds WHERE ref=$1',['market:'+order.id])).rows[0];
 assert.equal(hold.status,'refunded');
});
