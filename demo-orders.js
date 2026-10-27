'use strict';
const fs=require('node:fs');
const path=require('node:path');
const batch=JSON.parse(fs.readFileSync(path.join(__dirname,'demo/orders-20261023-27.json'),'utf8').replace(/^\uFEFF/,''));
function validateBatch(data){
 if(data.isDemo!==true||data.expectedTotal!==6000000||data.orders.length!==20)throw Error('Invalid demo batch');
 const ids=new Set(),buyers=new Set(),sellers=new Set();let total=0;
 for(const o of data.orders){
  if(!o.isDemo||!o.id.startsWith('DEMO-')||ids.has(o.id)||o.buyerId===o.sellerId||!Number.isSafeInteger(o.goodsAmount)||o.goodsAmount<=0||o.currency!=='VND'||o.simulatedStatus!=='delivered'||!/^2026-10-2[3-7]T\d{2}:00:00\+07:00$/.test(o.simulatedRecordedAt))throw Error('Invalid demo order');
  ids.add(o.id);buyers.add(o.buyerId);sellers.add(o.sellerId);total+=o.goodsAmount;
 }
 if(total!==data.expectedTotal||buyers.size!==20||sellers.size!==5||[...buyers].some(id=>sellers.has(id)))throw Error('Invalid demo allocation');
 return data;
}
validateBatch(batch);
const participants=new Set(batch.orders.flatMap(o=>[o.buyerId,o.sellerId]));
function demoReport(){
 const daily=Object.values(batch.orders.reduce((days,o)=>{
  const date=o.simulatedRecordedAt.slice(0,10);days[date]??={date,orders:0,goodsAmount:0};days[date].orders++;days[date].goodsAmount+=o.goodsAmount;return days;
 },{}));
 return {...batch,accountingRevenue:0,walletImpact:0,inventoryImpact:0,totalDemoGoods:batch.orders.reduce((n,o)=>n+o.goodsAmount,0),daily};
}
function demoHomeSection(){
 const data=demoReport();
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>new Intl.NumberFormat('vi-VN').format(n)+' ₫';
 return `<section class="art-section home-demo" id="don-hang-mo-phong" aria-labelledby="demo-orders-heading">
 <div class="art-section-head"><div><p class="art-kicker">DEMO / 23–27.10.2026</p><h2 id="demo-orders-heading">Đơn hàng mô phỏng.</h2></div><strong class="home-demo-total">${money(data.totalDemoGoods)}<small>Tổng giá trị mô phỏng · 20 đơn</small></strong></div>
 <p class="home-demo-notice"><strong>DỮ LIỆU MÔ PHỎNG — KHÔNG PHẢI DOANH THU THẬT.</strong> Người mua, người bán và sản phẩm thuộc bộ thử nghiệm. Ngày và trạng thái giao hàng là giả lập; không cộng vào doanh thu, ví hoặc tồn kho.</p>
 <div class="home-demo-days">${data.daily.map(d=>`<div><span>${escape(d.date.slice(8,10))}/10/2026</span><strong>${money(d.goodsAmount)}</strong><small>${d.orders} đơn mô phỏng</small></div>`).join('')}</div>
 <details open class="home-demo-details"><summary>Xem 20 đơn đã giao hàng (mô phỏng)</summary><div class="home-demo-table" role="region" aria-label="Danh sách đơn hàng mô phỏng" tabindex="0"><table><thead><tr><th scope="col">Mã demo</th><th scope="col">Ngày mô phỏng</th><th scope="col">Người mua test</th><th scope="col">Người bán test</th><th scope="col">Sản phẩm giả lập</th><th scope="col">Giá trị mô phỏng</th><th scope="col">Trạng thái mô phỏng</th></tr></thead><tbody>${data.orders.map(o=>`<tr data-demo-order="${escape(o.id)}"><td>${escape(o.id)}</td><td>${escape(o.simulatedRecordedAt.slice(8,10))}/10/2026</td><td>${escape(o.buyerName)}</td><td>${escape(o.sellerName)}</td><td>${escape(o.productTitle)}</td><td>${money(o.goodsAmount)}</td><td>Đã giao hàng (mô phỏng)</td></tr>`).join('')}</tbody></table></div></details>
 </section>`;
}
function createDemoOrdersRouter({requireAuth,requireAdmin}){
 const router=require('express').Router();
 router.use(['/api/demo','/api/admin/demo'],(_req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Robots-Tag','noindex, nofollow');next();});
 router.get('/api/demo/orders',requireAuth,(req,res)=>{
  if(!participants.has(req.user.id))return res.status(403).json({message:'Demo data is available only to designated test accounts.'});
  res.json(demoReport());
 });
 router.get('/api/admin/demo/orders',requireAdmin,(_req,res)=>res.json(demoReport()));
 return router;
}
module.exports={createDemoOrdersRouter,demoReport,demoHomeSection,validateBatch,participants};
