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
module.exports={createDemoOrdersRouter,demoReport,validateBatch,participants};
