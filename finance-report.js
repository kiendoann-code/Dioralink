'use strict';
const {demoReport}=require('./demo-orders');
// Reporting only: source tables/files retain provenance; never write simulated rows to financial ledgers.
// Legacy commission rates are fractions; Marketplace rates are percentages. Fees always come from stored values.
function buildFinanceReport(commissions,marketOrders,demo=demoReport(),wallet=[]){
 const transactions=commissions.map(o=>({id:o.id,dataType:'actual',source:'commission',date:o.confirmed_at,seller:o.artist_name,title:o.project_title||o.project_ref,gross:Number(o.gross_amount),rate:Number(o.commission_rate)*100,fee:Number(o.platform_fee),earned:Number(o.platform_fee),collected:o.status==='collected'?Number(o.platform_fee):0,status:o.status}));
 for(const o of marketOrders){const earned=o.status==='completed'&&!o.dispute_open;transactions.push({id:o.id,dataType:'actual',source:'marketplace',date:o.created_at,seller:o.seller_name,title:o.product_title,gross:Number(o.goods_amount),rate:Number(o.commission_rate),fee:Number(o.platform_fee),earned:earned?Number(o.platform_fee):0,collected:Number(o.fee_collected_amount)-Number(o.fee_returned_amount),status:o.dispute_open?'disputed':o.status,recognized:earned});}
 for(const o of wallet)transactions.push({id:o.ref,dataType:'actual',source:'wallet_commission',date:o.confirmed_at,seller:o.seller_name,title:o.ref,gross:Number(o.amount),rate:null,fee:Number(o.fee),earned:Number(o.fee),collected:Number(o.fee),status:'collected'});
 const actual={gross:0,platformFee:0,unpaid:0,collected:0,feeReturnDue:0};
 for(const o of transactions){if(o.recognized!==false)actual.gross+=o.gross;actual.platformFee+=o.earned;actual.collected+=o.collected;actual.unpaid+=Math.max(0,o.earned-o.collected);if(['cancelled','refunded'].includes(o.status))actual.feeReturnDue+=Math.max(0,o.collected);}
 for(const o of demo.orders)transactions.push({id:o.id,dataType:'simulated',source:'demo',date:o.simulatedRecordedAt,seller:o.sellerName,title:o.productTitle,gross:o.goodsAmount,rate:null,fee:null,earned:0,collected:0,status:'delivered_simulated'});
 transactions.sort((a,b)=>new Date(b.date)-new Date(a.date)||String(a.id).localeCompare(String(b.id)));
 return {actual,simulated:{orders:demo.orders.length,goods:demo.totalDemoGoods,accountingRevenue:0,collected:0},transactions};
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
