'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {buildFinanceReport,loadFinanceReport}=require('../finance-report');
const commission={id:'c',confirmed_at:'2026-10-27',artist_name:'<script>',project_title:'Dự án',gross_amount:'2000000',commission_rate:'0.0325',platform_fee:'65000',status:'unpaid'};
const market={id:'m',created_at:'2026-10-26',seller_name:'Xưởng',product_title:'Mô hình',goods_amount:'1000000',commission_rate:3,platform_fee:'30000',fee_collected_amount:'30000',fee_returned_amount:'0',status:'completed',dispute_open:false};
test('uses per-order stored fees and rate units; simulation never contributes to actual totals',()=>{
 const c=[commission,{...commission,id:'c2',status:'collected'}],m=[market,{...market,id:'m2',status:'cancelled'},{...market,id:'m3',dispute_open:true,fee_collected_amount:0}];const before=JSON.stringify([c,m]);
 const r=buildFinanceReport(c,m);assert.deepEqual(r.actual,{gross:5000000,platformFee:160000,unpaid:65000,collected:125000,feeReturnDue:30000});
 assert.equal(r.transactions.find(o=>o.id==='c').rate,3.25);assert.equal(r.transactions.find(o=>o.id==='m').rate,3);
 assert.equal(r.simulated.goods,6000000);assert.equal(r.transactions.filter(o=>o.dataType==='simulated').length,20);
 assert.ok(r.transactions.filter(o=>o.dataType==='simulated').every(o=>o.fee===null&&o.collected===0));assert.equal(JSON.stringify([c,m]),before);
 const html=require('../Public/admin-finance-demo').renderReport(r);assert.ok(!html.includes('<script>'));assert.match(html,/3.25%/);assert.ok(!html.includes('Mã demo'));
});
test('reads source schemas in PostgreSQL and keeps every commission beyond previous 200-row limit',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();await db.waitReady;
 try{
  await db.exec('CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT);');
  const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../Server.js'),'utf8');
  const block=source.slice(source.indexOf('async function ensureFinanceSchema(){'));const sql=block.slice(block.indexOf('`')+1,block.indexOf('`',block.indexOf('`')+1));await db.exec(sql);
  const pool={query:(sql,params)=>!params&&sql.includes(';')?db.exec(sql):db.query(sql,params)};
  await require('../marketplace').ensureMarketplaceSchema(pool);
  await require('../wallet').ensureWalletSchema(pool);
  await db.query('INSERT INTO users VALUES ($1,$2)',['seller','Xưởng']);
  await db.exec("INSERT INTO platform_commissions(artisan_user_id,project_ref,milestone_ref,gross_amount,net_amount,commission_rate,platform_fee,artist_net) SELECT 'seller','project',n::text,1000,1000,0.0325,32.5,967.5 FROM generate_series(1,205) n;");
  await db.exec("INSERT INTO diora_holds(ref,user_id,seller_id,amount,fee,status) VALUES ('commission:wallet:m1','buyer','seller',2000000,23456,'released'),('commission:project:1','buyer','seller',1000,32,'released'),('market:order','buyer','seller',1000000,30000,'released'),('commission:held:m1','buyer','seller',500000,5000,'held'); INSERT INTO diora_ledger(id,user_id,kind,ref,delta,held_delta,balance_after,held_after) SELECT gen_random_uuid(),'@platform','fee',ref,fee,0,fee,0 FROM diora_holds WHERE status='released';");
  const r=await loadFinanceReport(db);assert.equal(r.actual.platformFee,30118.5);assert.equal(r.actual.gross,2205000);assert.equal(r.actual.collected,23456);
  assert.equal(r.transactions.filter(o=>o.source==='wallet_commission').length,1);
  assert.equal(r.transactions.find(o=>o.source==='wallet_commission').fee,23456);assert.equal(r.transactions.filter(o=>o.source==='commission').length,205);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM platform_commissions')).rows[0].n,205);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM market_orders')).rows[0].n,0);
 }finally{await db.close();}
});
