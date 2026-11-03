'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const historical=require('../recovered-marketplace-orders.json');
const {buildFinanceReport}=require('../finance-report');
const {buildMarketplaceReconciliation}=require('../marketplace-reconciliation');
const {reportWorkbook}=require('../marketplace-report');
test('owner-confirmed recovered orders are actual and preserve immutable audit references',()=>{
 assert.equal(historical.orders.length,20);
 assert.ok(historical.orders.every(o=>o.isActual===true&&o.isDemo===false&&o.dataType==='actual'&&o.legacyId));
 assert.equal(historical.orders.reduce((a,o)=>a+o.goodsAmount,0),6000000);
 assert.equal(historical.orders.reduce((a,o)=>a+o.confirmedReceivedAmount*o.confirmedRate/100,0),600000);
});
test('all Marketplace export tabs reconcile verified receipts and never fabricate customer data',()=>{
 const financeReport=buildFinanceReport([],[]);
 const directory=historical.orders.map((o,i)=>({
  id:o.buyerId,name:o.buyerName,email:'customer'+i+'@example.test',phone:'0900000000',city:'Hà Nội'
 }));
 const report={period:{from:'2026-10-23',to:'2026-10-27'},orders:[],financeReport};
 const linked=buildMarketplaceReconciliation(report,directory);
 assert.equal(linked.orders.length,20);
 assert.equal(linked.totals.goods,6000000);
 assert.equal(linked.totals.platformFee,600000);
 assert.equal(linked.totals.feeCollected,600000);
 assert.equal(linked.trend.reduce((sum,d)=>sum+d.goods,0),6000000);
 assert.equal(linked.sellers.reduce((sum,s)=>sum+s.goods,0),6000000);
 assert.ok(linked.orders.every(o=>o.buyer_email&&o.buyer_phone&&o.isActual&&!o.isDemo));
 assert.ok(linked.orders.every(o=>!o.tracking_number&&!o.billing_address&&o.payment_method==='Chưa có trong hồ sơ phục hồi'));
 const book=reportWorkbook({...report,reconciliation:linked});
 assert.equal(book.getWorksheet('Tong quan').getCell('B6').value,6000000);
 assert.equal(book.getWorksheet('Tai chinh tong hop').getCell('B4').value,600000);
 const trend=book.getWorksheet('Xu huong'),orders=book.getWorksheet('Don hang'),sellers=book.getWorksheet('Nghe nhan');
 const sum=(s,col)=>{let result=0;s.eachRow((row,i)=>{if(i>1)result+=Number(row.getCell(col).value||0)});return result};
 assert.equal(sum(trend,4),6000000);
 assert.equal(sum(orders,10),6000000);
 assert.equal(sum(sellers,4),6000000);
 assert.ok(Array.from({length:20},(_,i)=>orders.getCell('U'+(i+2)).value).includes('customer0@example.test'));
 assert.equal(orders.getCell('R2').value,'');
 assert.equal(orders.getCell('Y2').value,'');
});
