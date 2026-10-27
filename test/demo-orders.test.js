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
