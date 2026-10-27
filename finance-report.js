'use strict';
const {demoReport}=require('./demo-orders');
const confirmations=require('./confirmed-receipts.json');
const receipts=new Map(confirmations.orders.map(o=>[o.id,o]));
// Reporting only: owner-confirmed receipts are overlaid without writing wallets or replacing source rows.
// Stored fees are already commission amounts: never apply their rate a second time.
function buildFinanceReport(commissions,marketOrders,demo=demoReport(),wallet=[]){
 const transactions=commissions.map(o=>({id:o.id,dataType:'actual',source:'commission',date:o.confirmed_at,seller:o.artist_name,title:o.project_title||o.project_ref,gross:Number(o.gross_amount),rate:Number(o.commission_rate)*100,fee:Number(o.platform_fee),earned:Number(o.gross_amount),collected:o.status==='collected'?Number(o.platform_fee):0,status:o.status}));
 for(const o of marketOrders){const earned=o.status==='completed'&&!o.dispute_open;transactions.push({id:o.id,dataType:'actual',source:'marketplace',date:o.created_at,seller:o.seller_name,title:o.product_title,gross:Number(o.goods_amount),rate:Number(o.commission_rate),fee:Number(o.platform_fee),earned:earned?Number(o.goods_amount):0,collected:Number(o.fee_collected_amount)-Number(o.fee_returned_amount),status:o.dispute_open?'disputed':o.status,recognized:earned});}
 for(const o of wallet)transactions.push({id:o.ref,dataType:'actual',source:'wallet_commission',date:o.confirmed_at,seller:o.seller_name,title:o.ref,gross:Number(o.amount),rate:Number(o.amount)?Number(o.fee)/Number(o.amount)*100:0,fee:Number(o.fee),earned:Number(o.amount),collected:Number(o.fee),status:'collected'});
 const simulated={orders:0,goods:0,accountingRevenue:0,collected:0};
 for(const o of demo.orders){
  const receipt=receipts.get(o.id);
  const confirmed=receipt&&receipt.goodsAmount===o.goodsAmount;
  const rate=confirmed?receipt.rate:null,fee=confirmed?Math.round(o.goodsAmount*rate/100):null;
  transactions.push({id:o.id,dataType:confirmed?'actual':'simulated',source:confirmed?'owner_confirmed':'demo',originalSource:'demo',confirmationDate:confirmed?confirmations.confirmedOn:null,receiptBasis:confirmed?'owner_confirmation':null,date:o.simulatedRecordedAt,seller:o.sellerName,title:o.productTitle,gross:o.goodsAmount,receivedAmount:confirmed?receipt.receivedAmount:0,rate,fee,earned:confirmed?o.goodsAmount:0,collected:confirmed?Math.round(receipt.receivedAmount*rate/100):0,status:confirmed?'payment_succeeded':'delivered_simulated'});
  if(!confirmed){simulated.orders++;simulated.goods+=o.goodsAmount;}
 }
 const actual={gross:0,platformFee:0,unpaid:0,collected:0,feeReturnDue:0};
 for(const o of transactions){if(o.dataType!=='actual')continue;if(o.recognized!==false)actual.gross+=o.gross;actual.platformFee+=o.earned;actual.collected+=o.collected;actual.unpaid+=Math.max(0,(o.earned?o.fee:0)-o.collected);if(['cancelled','refunded'].includes(o.status))actual.feeReturnDue+=Math.max(0,o.collected);}
 transactions.sort((a,b)=>new Date(b.date)-new Date(a.date)||String(a.id).localeCompare(String(b.id)));
 return {actual,simulated,transactions};
}
async function loadFinanceReport(pool){
 const commissions=(await pool.query(`SELECT pc.*,u.name AS artist_name FROM platform_commissions pc JOIN users u ON u.id=pc.artisan_user_id ORDER BY pc.confirmed_at DESC`)).rows;
 const market=(await pool.query(`SELECT o.id,o.created_at,o.status,o.dispute_open,o.goods_amount,o.commission_rate,o.platform_fee,o.fee_collected_amount,o.fee_returned_amount,o.product_snapshot->>'title' AS product_title,u.name AS seller_name FROM market_orders o JOIN users u ON u.id=o.seller_id ORDER BY o.created_at DESC`)).rows;
 // Marketplace wallet payments already appear in market_orders. Exclude legacy commission references too.
 const wallet=(await pool.query(`SELECT h.ref,h.amount,h.fee,u.name AS seller_name,l.created_at AS confirmed_at FROM diora_holds h JOIN users u ON u.id=h.seller_id JOIN diora_ledger l ON l.ref=h.ref AND l.user_id='@platform' AND l.kind='fee' WHERE h.status='released' AND h.ref LIKE 'commission:%' AND NOT EXISTS (SELECT 1 FROM platform_commissions pc WHERE h.ref='commission:'||pc.project_ref||':'||pc.milestone_ref)`)).rows;
 return buildFinanceReport(commissions,market,undefined,wallet);
}
function buildMarketplaceFinanceReport(report){
 const demo=demoReport();
 const orders=demo.orders.filter(o=>{const date=o.simulatedRecordedAt.slice(0,10);return date>=report.period.from&&date<=report.period.to;});
 return buildFinanceReport([],report.orders.map(o=>({...o,product_title:o.product_snapshot.title})),{...demo,orders,totalDemoGoods:orders.reduce((sum,o)=>sum+o.goodsAmount,0)});
}
module.exports={buildFinanceReport,loadFinanceReport,buildMarketplaceFinanceReport};
