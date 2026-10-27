'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildSnapshot,ensureReconstruction,loadReconstruction}=require('../analytics-reconstruction');
test('historical reconstruction totals, stable allocation and date boundaries',()=>{
 const s=buildSnapshot();assert.deepEqual(s,buildSnapshot());
 assert.deepEqual(s.kpis,{sessions:6000,visitors:300,bounceRate:67.8,avgSessionSeconds:383,pagesPerSession:9.6,avgScrollDepth:82,conversionRate:3.5});
 const total=key=>s.daily.reduce((n,d)=>n+d[key],0);
 assert.equal(total('sessions'),6000);assert.equal(total('bounced'),4068);
 assert.equal(total('convertingSessions'),210);assert.equal(total('marketplaceConversions'),200);
 assert.equal(total('commissionConversions'),10);assert.equal(total('commissionSubmitted'),6);
 assert.equal(s.daily[0].day,'2026-10-19');assert.equal(s.daily.at(-1).day,'2026-10-27');
 assert.equal(s.topPages.reduce((n,p)=>n+p.views,0),6000*9.6);
 for(const d of s.daily){assert.ok(d.visitors<=300);assert.ok(d.commissionSubmitted<=d.commissionConversions);}
});
test('admin screen renders historical metrics and can switch to measured analytics',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const code=fs.readFileSync(require.resolve('../Public/app.js'),'utf8');
 const content={dataset:{},innerHTML:''},app={innerHTML:''},controls={insertAdjacentHTML(){}};
 const historical={...buildSnapshot(),marketplaceOrders:{actual:20,simulated:0,recognizedGoods:6000000,simulatedGoods:0}};
 const requested=[];
 const context={document:{getElementById:id=>id==='app'?app:content,querySelector:()=>controls},esc:String,
  adminApi:async url=>{requested.push(url);return {ok:true,json:async()=>url.includes('period=')?historical:{source:'measured',kpis:{sessions:2},rangeDays:7}};}};
 vm.createContext(context);vm.runInContext(code.slice(code.indexOf('async function loadAdminAnalytics('),code.indexOf('function adminStatus(')),context);
 await context.renderAdminAnalytics();
 for(const value of ['67.8%','6m 23s','9.60','82.0%','6000','300','3.5%','PAGE PERFORMANCE','DAILY PERFORMANCE','6.000.000'])assert.ok(content.innerHTML.includes(value),value);
 assert.match(requested[0],/period=2026-10-19_2026-10-27/);
 await context.renderAdminAnalytics(7);assert.match(requested[1],/days=7/);assert.match(content.innerHTML,/Dữ liệu đo thực tế/);assert.doesNotMatch(content.innerHTML,/DAILY PERFORMANCE/);
});
test('snapshot persists without touching measured data; funnel reconciles only period orders',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();await db.waitReady;
 const pool={query:(sql,p)=>db.query(sql,p)};
 try{
  await db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT);
   INSERT INTO users VALUES('seller','Seller');
   CREATE TABLE market_orders(id TEXT PRIMARY KEY,seller_id TEXT,created_at TIMESTAMPTZ,status TEXT,dispute_open BOOLEAN,goods_amount INT,commission_rate INT,platform_fee INT,fee_collected_amount INT,fee_returned_amount INT,product_snapshot JSONB);
   INSERT INTO market_orders VALUES('actual-order','seller','2026-10-27T23:59:59+07:00','completed',false,100000,10,10000,10000,0,'{"title":"Product"}');
   INSERT INTO market_orders SELECT 'outside-period',seller_id,'2026-10-28T00:00:00+07:00',status,dispute_open,goods_amount,commission_rate,platform_fee,fee_collected_amount,fee_returned_amount,product_snapshot FROM market_orders;`);
  await require('../analytics-server').ensureAnalyticsSchema(pool);
  await pool.query(`INSERT INTO analytics_sessions(session_id,visitor_id) VALUES('measured-session','measured-visitor')`);
  const first=(await pool.query('SELECT created_at FROM analytics_report_snapshots')).rows[0].created_at;
  await ensureReconstruction(pool);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM analytics_report_snapshots')).rows[0].n,1);
  assert.deepEqual((await pool.query('SELECT created_at FROM analytics_report_snapshots')).rows[0].created_at,first);
  const s=await loadReconstruction(pool);assert.equal(s.marketplaceOrders.total,21);assert.equal(s.marketplaceOrders.recognizedGoods,6100000);assert.equal(s.funnels.marketplace.at(-1).sessions,21);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM analytics_sessions')).rows[0].n,1);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM analytics_events')).rows[0].n,0);
  const express=require('express'),app=express();app.use(express.json());
  app.use(require('../analytics-server').createAnalyticsRouter({pool,requireAdmin:(req,res,next)=>req.headers['x-test-admin']==='yes'?next():res.sendStatus(401)}));
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  try{
   const url='http://127.0.0.1:'+server.address().port;
   assert.equal((await fetch(url+'/api/admin/analytics/summary?period=2026-10-19_2026-10-27')).status,401);
   const r=await fetch(url+'/api/admin/analytics/summary?period=2026-10-19_2026-10-27',{headers:{'x-test-admin':'yes'}});
   assert.equal(r.status,200);assert.equal((await r.json()).kpis.sessions,6000);
   const live=await fetch(url+'/api/admin/analytics/summary?days=7',{headers:{'x-test-admin':'yes'}});
   assert.equal((await live.json()).kpis.sessions,1);
  }finally{await new Promise(resolve=>server.close(resolve));}
 }finally{await db.close();}
});
