'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {demoReport,validateBatch,participants}=require('../demo-orders');
test('demo totals six million across five dates and all 25 designated accounts',()=>{
 const report=demoReport();assert.equal(report.totalDemoGoods,6000000);assert.equal(report.orders.length,20);assert.equal(participants.size,25);
 assert.deepEqual(report.daily.map(d=>[d.date,d.goodsAmount]),[['2026-10-23',900000],['2026-10-24',1200000],['2026-10-25',1050000],['2026-10-26',1350000],['2026-10-27',1500000]]);
 assert.equal(report.accountingRevenue,0);assert.equal(report.walletImpact,0);assert.equal(report.inventoryImpact,0);
});
test('rejects real-order flags, changed totals, dates, duplicate IDs and overlapping parties',()=>{
 for(const change of [d=>d.orders[0].isDemo=false,d=>d.orders[0].goodsAmount++,d=>d.orders[0].simulatedRecordedAt='2026-10-22T10:00:00+07:00',d=>d.orders[1].id=d.orders[0].id,d=>d.orders[0].sellerId=d.orders[0].buyerId]){
  const data=structuredClone(demoReport());change(data);assert.throws(()=>validateBatch(data));
 }
});
test('demo records are absent from the public homepage',()=>{
 const html=require('../home').homePage([]);
 assert.ok(!html.includes('don-hang-mo-phong'));assert.ok(!html.includes('data-demo-order='));
 for(const id of participants)assert.ok(!html.includes(id));
});
test('finance demo shows all orders, escapes names and does not mutate actual finance data',()=>{
 const {render}=require('../Public/admin-finance-demo');const data=structuredClone(demoReport());
 data.orders[0].buyerName='<img src=x onerror=alert(1)>';
 const before=JSON.stringify(data);const html=render(data);
 assert.match(html,/SỐ LIỆU TÀI CHÍNH MÔ PHỎNG/);assert.match(html,/6\.000\.000 ₫/);
 assert.equal((html.match(/data-finance-demo-order=/g)||[]).length,20);
 assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
 assert.equal(JSON.stringify(data),before);
 assert.throws(()=>render({...data,isDemo:false}));
 assert.throws(()=>render({...data,accountingRevenue:6000000}));
});
test('finance demo requests only the admin endpoint and handles denied access without rendering amounts',async()=>{
 const {load}=require('../Public/admin-finance-demo');let called='';
 const target={isConnected:true,innerHTML:'',textContent:''};
 await load(target,async path=>{called=path;return {ok:false,status:401};});
 assert.equal(called,'/api/admin/demo/orders');assert.equal(target.innerHTML,'');assert.match(target.textContent,/đăng nhập quản trị/);
 await load(target,async()=>({ok:true,json:async()=>demoReport()}));
 assert.match(target.innerHTML,/6\.000\.000 ₫/);
 const detached={isConnected:false,innerHTML:'left page'};
 await load(detached,async()=>({ok:true,json:async()=>demoReport()}));assert.equal(detached.innerHTML,'left page');
});
test('finance dashboard renders demo and actual totals into separate containers',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const code=fs.readFileSync(require('node:path').join(__dirname,'../Public/app.js'),'utf8');
 const start=code.indexOf('async function renderAdminDashboard(){');const end=code.indexOf('async function renderAdminCommissions(){',start);
 const elements={'app':{},'admin-finance-demo':{isConnected:true},'admin-finance-content':{}};
 const actual={summary:{gross:123,platformFee:12,unpaid:12,collected:0},commissions:[]};
 const before=JSON.stringify(actual);
 const context={document:{getElementById:id=>elements[id]},window:{DioraFinanceDemo:require('../Public/admin-finance-demo')},loadAdminFinance:async()=>actual,adminApi:async path=>{assert.equal(path,'/api/admin/demo/orders');return {ok:true,json:async()=>demoReport()};},money:n=>String(n)+' VND',esc:s=>String(s)};
 vm.createContext(context);vm.runInContext(code.slice(start,end),context);
 await context.renderAdminDashboard();await new Promise(resolve=>setImmediate(resolve));
 assert.match(elements['admin-finance-content'].innerHTML,/123 VND/);
 assert.ok(!elements['admin-finance-content'].innerHTML.includes('6000000'));
 assert.match(elements['admin-finance-demo'].innerHTML,/6\.000\.000 ₫/);
 assert.equal(JSON.stringify(actual),before);
});
test('only designated accounts or admins can read demo; regular pages keep their headers',async()=>{
 const express=require('express');const app=express();
 const requireAuth=(req,res,next)=>{const id=req.headers['x-test-id'];if(!id)return res.sendStatus(401);req.user={id};next();};
 const requireAdmin=(req,res,next)=>req.headers['x-test-admin']==='yes'?next():res.sendStatus(401);
 app.use(require('../demo-orders').createDemoOrdersRouter({requireAuth,requireAdmin}));
 app.get('/ordinary',(_req,res)=>res.send('normal page'));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(origin+'/api/demo/orders')).status,401);
  assert.equal((await fetch(origin+'/api/demo/orders',{headers:{'x-test-id':'outsider'}})).status,403);
  for(const id of participants){const r=await fetch(origin+'/api/demo/orders',{headers:{'x-test-id':id}});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('x-robots-tag'),/noindex/);const body=await r.json();assert.equal(body.totalDemoGoods,6000000);assert.equal(body.isDemo,true);assert.ok(!JSON.stringify(body).includes('@gmail.com'));}
  assert.equal((await fetch(origin+'/api/admin/demo/orders')).status,401);
  assert.equal((await fetch(origin+'/api/admin/demo/orders',{headers:{'x-test-admin':'yes'}})).status,200);
  const regular=await fetch(origin+'/ordinary');assert.equal(regular.status,200);assert.equal(regular.headers.get('x-robots-tag'),null);
  assert.equal((await fetch(origin+'/api/demo/orders',{method:'POST',headers:{'x-test-id':[...participants][0]}})).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
