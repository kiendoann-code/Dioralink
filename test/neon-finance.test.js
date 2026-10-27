'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
test('Neon report authenticates existing admins, serves protected report and refuses writes',async()=>{
 const {createHandler}=await import('../functions/finance.mjs');const seen=[];
 const pool={async query(sql,params){seen.push(sql);if(sql.includes('platform_admins')){assert.deepEqual(params,['admin@example.test']);return {rows:[{id:'admin',active:true,password_hash:'stored-hash'}]};}return {rows:[]};}};
 pool.connect=async()=>({query:pool.query.bind(pool),release(){}});
 const handler=createHandler(pool,async(password,hash)=>password==='correct'&&hash==='stored-hash');
 const call=(path,authorization,method='GET')=>handler.fetch(new Request('https://finance.example.test'+path,{method,headers:authorization?{authorization}:{}}));
 assert.equal((await call('/')).status,401);assert.equal(seen.length,0);
 const bad='Basic '+Buffer.from('admin@example.test:wrong').toString('base64');assert.equal((await call('/api/admin/finance',bad)).status,401);
 const auth='Basic '+Buffer.from('admin@example.test:correct').toString('base64');
 const response=await call('/',auth);assert.equal(response.status,200);const html=await response.text();assert.match(html,/Tài chính tổng hợp/);assert.match(html,/6\.000\.000/);assert.ok(!html.includes('Mã demo'));assert.ok(!html.includes('stored-hash'));
 assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 const report=await call('/api/admin/finance',auth);assert.equal(report.status,200);const data=await report.json();assert.equal(data.report.actual.collected,0);assert.equal(data.report.simulated.goods,6000000);
 assert.equal((await call('/api/admin/finance',auth,'POST')).status,405);assert.equal((await call('/api/health')).status,200);
 assert.ok(seen.every(sql=>sql.startsWith('SELECT ')||sql.startsWith('BEGIN ')||sql==='COMMIT'));
 const revoked=createHandler({query:async()=>({rows:[{active:false,password_hash:'hash'}]})},async()=>true);assert.equal((await revoked.fetch(new Request('https://finance.example.test/',{headers:{authorization:auth}}))).status,401);
});
