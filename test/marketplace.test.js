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
test('wallet orders conceal buyers and only admin dispatches, receipt pays seller once',async()=>{
 const p=await product(),o=await order(p);await act(o,'buyer','accept',{},409);await act(o,'seller','accept');
 const seller=await f.api('/api/market/orders/'+o.id,{user:'seller'});assert.match(seller.data.order.buyer_id,/^KH-/);assert.ok(!JSON.stringify(seller.data).includes('0901234567'));assert.ok(!JSON.stringify(seller.data).includes('Khách An'));
 await act(o,'seller','ship',{tracking_number:'SPXTEST12345'},409);
 await act(o,'admin','ship',{tracking_number:'SPXTEST12345'});const complete=await act(o,'buyer','receive');assert.equal(complete.status,'completed');assert.equal(Number(complete.fee_collected_amount),160000);
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
 assert.match((await f.api('/')).data,new RegExp(p.slug));assert.match((await f.api('/sitemap.xml')).data,new RegExp(p.slug));assert.equal((await f.api('/marketplace/missing-product')).status,404);
 assert.match((await f.api('/dieu-khoan-mua-hang')).data,/Hủy và tranh chấp/);
});
test('XLSX values reconcile with report and formula-like text stays literal',async()=>{
 const p=await product({title:'=1+1 mẫu thử'}),o=await order(p);await act(o,'seller','accept');await act(o,'admin','ship',{tracking_number:'SPXEXCEL123'});await act(o,'buyer','receive');
 const report=(await f.api('/api/admin/market/report',{admin:true})).data;
 const response=await fetch(f.url+'/api/admin/market/export.xlsx',{headers:{'x-test-admin':'yes'}});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/spreadsheetml/);
 const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await response.arrayBuffer()));assert.equal(book.worksheets.length,4);
 assert.equal(book.getWorksheet('Tong quan').getCell('B6').value,report.totals.goods);
 const sheet=book.getWorksheet('Don hang');let sum=0,formulaTitle;
 sheet.eachRow((r,n)=>{if(n>1){assert.equal(typeof r.getCell(10).value,'number');assert.ok(r.getCell(2).value instanceof Date);if(r.getCell(7).value==='completed'&&r.getCell(9).value==='Không')sum+=r.getCell(10).value;if(r.getCell(1).value===o.id)formulaTitle=r.getCell(4).value;}});
 assert.equal(sum,report.totals.goods);assert.equal(formulaTitle,p.title);assert.equal(typeof formulaTitle,'string');
});

