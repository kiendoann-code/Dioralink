'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('existing Marketplace admin endpoint and screen merge simulated and actual data with date filters',async()=>{
 const f=await require('./marketplace-fixture').fixture();
 try{
  const path='/api/admin/market/report?from=2026-10-23&to=2026-10-27';
  assert.equal((await f.api(path)).status,401);
  const r=await f.api(path,{admin:true});assert.equal(r.status,200);const report=r.data;
  assert.equal(report.financeReport.actual.gross,6000000);assert.equal(report.financeReport.actual.collected,600000);assert.equal(report.totals.goods,0);
  assert.equal(report.financeReport.transactions.length,20);
  const day=(await f.api('/api/admin/market/report?from=2026-10-23&to=2026-10-23',{admin:true})).data;
  assert.equal(day.financeReport.actual.gross,900000);assert.equal(day.financeReport.transactions.length,4);
  const empty=(await f.api('/api/admin/market/report?from=2026-10-01&to=2026-10-02',{admin:true})).data;assert.equal(empty.financeReport.simulated.goods,0);
  const fs=require('node:fs'),vm=require('node:vm');const code=fs.readFileSync(require('node:path').join(__dirname,'../Public/marketplace.js'),'utf8');
  const start=code.indexOf('async function loadMarketReport(){'),end=code.indexOf('function filterMarketAdminOrders(){',start);
  const target={},elements={'market-report-data':target,'market-report-from':{},'market-report-to':{}};
  const context={document:{getElementById:id=>elements[id]},window:{DioraFinanceDemo:require('../Public/admin-finance-demo')},marketAPI:async()=>report,marketReportQuery:()=>'',currentRoute:()=> 'admin-market',marketStatuses:{},marketAdminReport:null,money:String,esc:String,marketBarChart:()=>'',marketError:e=>{throw e;}};
  vm.createContext(context);vm.runInContext(code.slice(start,end),context);await context.loadMarketReport();
  assert.match(target.innerHTML,/6\.000\.000/);assert.match(target.innerHTML,/Giao dịch và hoa hồng tổng hợp/);assert.doesNotMatch(target.innerHTML.replace(/<[^>]*>/g,''),/mô phỏng|demo|test|thử nghiệm|giả lập|Đối soát đơn thật trong kỳ/i);assert.match(target.innerHTML,/Đã thanh toán thành công/);assert.ok(!target.innerHTML.includes('compute.c-7'));
  assert.equal((await f.pool.query('SELECT COUNT(*)::int AS n FROM market_orders')).rows[0].n,0);
 }finally{await f.close();}
});
