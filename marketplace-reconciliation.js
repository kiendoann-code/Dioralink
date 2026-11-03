'use strict';
// Unified, read-only reconciliation of live Marketplace orders and owner-confirmed historical receipts.
// The historical source file retains its original identifiers for audit; external reports use an
// explicitly labelled reconciliation reference, never a made-up shipping or payment reference.
const {demoReport}=require('./demo-orders');
const confirmedReceipts=require('./confirmed-receipts.json');
const receiptById=new Map(confirmedReceipts.orders.map(row=>[row.id,row]));
const dayVN=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const numeric=value=>Number(value||0);
const formatMethod=value=>({wallet:'Ví Diora',cod:'COD',transfer:'Chuyển khoản'}[value]||value||'Chưa xác minh');
function buildMarketplaceReconciliation(report,buyerUsers=[]){
 const people=new Map(buyerUsers.map(u=>[String(u.id),u]));
 const live=(report.orders||[]).map(o=>{
  const recipient=o.recipient||{};
  const earned=o.status==='completed'&&!o.dispute_open;
  return {
   id:String(o.id),record_id:String(o.id),source:'marketplace',source_label:'Đơn trên hệ thống',
   isActual:true,isDemo:false,created_at:o.created_at,buyer_id:o.buyer_id||'',
   buyer_name:o.buyer_name||'',buyer_email:o.buyer_email||'',buyer_phone:o.buyer_phone||'',
   buyer_city:o.buyer_city||'',recipient_name:recipient.name||'',recipient_phone:recipient.phone||'',
   delivery_address:recipient.address||'',billing_address:'',
   seller_id:o.seller_id||'',seller_name:o.seller_name||'',product_title:o.product_snapshot?.title||'',
   quantity:numeric(o.quantity),payment_method:formatMethod(o.payment_method),
   payment_status:o.payment_status||'',status:o.status||'',dispute_open:!!o.dispute_open,
   goods_amount:numeric(o.goods_amount),shipping_amount:numeric(o.shipping_amount),
   total_amount:numeric(o.total_amount),commission_rate:numeric(o.commission_rate),
   platform_fee:numeric(o.platform_fee),fee_earned:earned?numeric(o.platform_fee):0,
   fee_collected:numeric(o.fee_collected_amount)-numeric(o.fee_returned_amount),
   fee_returned:numeric(o.fee_returned_amount),artist_net:earned?numeric(o.goods_amount)-numeric(o.platform_fee):0,
   tracking_number:o.tracking_number||'',recognized:earned,confirmed_at:o.completed_at||null
  };
 });
 const actualHistoricalIds=new Set((report.financeReport?.transactions||[])
  .filter(o=>o.dataType==='actual'&&o.source==='owner_confirmed').map(o=>String(o.id)));
 const historical=demoReport().orders.filter(o=>actualHistoricalIds.has(o.id)).map(o=>{
  const receipt=receiptById.get(o.id);
  if(!receipt||Number(receipt.goodsAmount)!==Number(o.goodsAmount))
   throw Error('Thiếu chứng từ xác nhận phù hợp cho hồ sơ lịch sử '+o.id);
  const user=people.get(String(o.buyerId))||{};
  const fee=Math.round(numeric(o.goodsAmount)*numeric(receipt.rate)/100);
  const collected=Math.round(numeric(receipt.receivedAmount)*numeric(receipt.rate)/100);
  return {
   id:'HS-'+o.id.replace(/^DEMO-/,''),record_id:o.id,source:'owner_confirmed',source_label:'Hồ sơ phục hồi · quản trị xác nhận',
   isActual:true,isDemo:false,created_at:o.simulatedRecordedAt,buyer_id:o.buyerId,
   buyer_name:user.name||o.buyerName,buyer_email:user.email||'',buyer_phone:user.phone||'',
   buyer_city:user.city||'',recipient_name:'',recipient_phone:'',
   delivery_address:'',billing_address:'',seller_id:o.sellerId,
   seller_name:o.sellerName,product_title:o.productTitle,quantity:numeric(o.quantity),
   payment_method:'Chưa có trong hồ sơ phục hồi',payment_status:'Quản trị xác nhận đã thu',
   status:'completed',dispute_open:false,goods_amount:numeric(o.goodsAmount),
   shipping_amount:null,total_amount:null,commission_rate:numeric(receipt.rate),
   platform_fee:fee,fee_earned:fee,fee_collected:collected,fee_returned:0,
   artist_net:numeric(o.goodsAmount)-fee,tracking_number:'',
   recognized:true,confirmed_at:confirmedReceipts.confirmedOn
  };
 });
 const rows=[...live,...historical].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||a.id.localeCompare(b.id));
 const totals={
  orders:rows.length,completed:0,cancelled:0,disputes:0,pending:0,
  goods:0,shipping:0,shippingUnknown:0,platformFee:0,artistNet:0,
  feeCollected:0,feeOutstanding:0,feeReturnDue:0,refunded:0,averageOrder:0,
  recoveredOrders:historical.length,systemOrders:live.length
 };
 const trends=new Map();
 for(let i=0,from=new Date(report.period.from+'T00:00:00+07:00');i<=(new Date(report.period.to+'T00:00:00+07:00')-from)/86400000;i++){
  const date=dayVN(new Date(+from+i*86400000));
  trends.set(date,{date,orders:0,completed:0,goods:0,platformFee:0,feeCollected:0,systemOrders:0,recoveredOrders:0});
 }
 const sellers=new Map();
 for(const o of rows){
  const day=trends.get(dayVN(o.created_at));if(day){day.orders++;day[o.source==='owner_confirmed'?'recoveredOrders':'systemOrders']++;}
  if(o.dispute_open)totals.disputes++;
  if(o.status==='cancelled')totals.cancelled++;
  if(o.status==='refunded')totals.refunded+=o.total_amount||0;
  if(!o.recognized)totals.pending++;
  totals.feeCollected+=o.fee_collected;
  totals.feeOutstanding+=Math.max(0,o.fee_earned-o.fee_collected);
  if(['cancelled','refunded'].includes(o.status))totals.feeReturnDue+=Math.max(0,o.fee_collected);
  if(day)day.feeCollected+=o.fee_collected;
  if(!o.recognized)continue;
  totals.completed++;totals.goods+=o.goods_amount;
  if(o.shipping_amount===null)totals.shippingUnknown++;else totals.shipping+=o.shipping_amount;
  totals.platformFee+=o.fee_earned;totals.artistNet+=o.artist_net;
  if(day){day.completed++;day.goods+=o.goods_amount;day.platformFee+=o.fee_earned;}
  const seller=sellers.get(o.seller_id)||{id:o.seller_id,name:o.seller_name,orders:0,goods:0,platformFee:0,artistNet:0};
  seller.orders++;seller.goods+=o.goods_amount;seller.platformFee+=o.fee_earned;seller.artistNet+=o.artist_net;
  sellers.set(o.seller_id,seller);
 }
 totals.averageOrder=totals.completed?Math.round(totals.goods/totals.completed):0;
 return {
  period:report.period,totals,orders:rows,trend:[...trends.values()],
  sellers:[...sellers.values()].sort((a,b)=>b.goods-a.goods),
  sourceSummary:{marketplace:{orders:live.length,goods:live.filter(o=>o.recognized).reduce((s,o)=>s+o.goods_amount,0)},
                 historical:{orders:historical.length,goods:historical.reduce((s,o)=>s+o.goods_amount,0)}}
 };
}
module.exports={buildMarketplaceReconciliation};
