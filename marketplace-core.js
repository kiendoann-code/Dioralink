'use strict';
const crypto=require('node:crypto');
const TERMS_VERSION='2026-10-14-wallet-v1';
const TERMS=[
 ['Thanh toán bằng Ví Diora','Đơn mới giữ đủ tổng tiền trong Ví Diora khi đặt hàng. Tiền được chuyển vào ví nghệ nhân sau khi khách xác nhận nhận hàng, trừ phí dịch vụ.'],
 ['Nạp và rút tiền','Nạp chỉ được cộng sau khi admin đối soát ngân hàng. Nhập đúng mã nạp và số tiền. DioraLink không chịu trách nhiệm đối với sai sót do người gửi nhập sai thông tin; vui lòng liên hệ hỗ trợ với chứng từ để kiểm tra. Rút tiền được xử lý bởi admin; số tiền yêu cầu rút sẽ tạm giữ.'],
 ['Ẩn danh người mua','Nghệ nhân chỉ thấy mã khách theo đơn; tên, điện thoại và địa chỉ nhận hàng do nền tảng quản lý và dùng để điều phối giao hàng. Khách vẫn xem được thông tin nghệ nhân.'],
 ['Giao hàng','Admin điều phối vận đơn và cập nhật mã SPX. Không gửi thông tin liên hệ cá nhân trong trao đổi.'],
 ['Hủy và tranh chấp','Khách có thể hủy đơn đang chờ xác nhận để hoàn số tiền giữ. Khi có tranh chấp, tiền chưa giải ngân tiếp tục được giữ để admin xem xét chứng cứ. Giao dịch đã giải ngân cần được đối soát và xử lý riêng, không tự động hoàn.'],
 ['Phí dịch vụ','Phí trên tiền hàng: 10% dưới 2 triệu; 8% từ 2 đến 5 triệu; 7% trên 5 đến 10 triệu; 5% trên 10 triệu đồng. Phí vận chuyển được tách riêng.']
];
const text=(v,n=3000)=>typeof v==='string'?v.trim().slice(0,n):'';
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function integer(v,min,max,label){const n=Number(v);if(!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isSafeInteger(n)||n<min||n>max)fail(label+' không hợp lệ.');return n;}
function feeRate(goods){return goods<2000000?10:goods<=5000000?8:goods<=10000000?7:5;}
function amounts(price,qty,shipping){const goods=price*qty,rate=feeRate(goods),fee=Math.round(goods*rate/100);return {goods,shipping,total:goods+shipping,rate,fee,artistNet:goods-fee};}
function shippingAddress(b){const a={name:text(b.name,150),phone:text(b.phone,30),address:text(b.address,600)};if(a.name.length<2||!/^[+\d ()-]{8,25}$/.test(a.phone)||a.address.length<12)fail('Điền tên người nhận, số điện thoại và địa chỉ giao hàng đầy đủ.');return a;}
function fingerprint(body){return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');}
function period(query={}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const to=text(query.to,10)||today;
 const d=new Date(to+'T00:00:00+07:00');if(Number.isNaN(+d))fail('Ngày kết thúc không hợp lệ.');
 const from=text(query.from,10)||dayVi(new Date(+d-29*864e5));
 for(const s of [from,to]){const date=new Date(s+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(+date)||date.toISOString().slice(0,10)!==s)fail('Ngày báo cáo không hợp lệ.');}
 const start=new Date(from+'T00:00:00+07:00'),end=new Date(to+'T00:00:00+07:00');const days=Math.round((end-start)/864e5)+1;
 if(days<1||days>366)fail('Chọn khoảng ngày từ 1 đến 366 ngày.');
 return {from,to,days,start:start.toISOString(),end:new Date(+end+864e5).toISOString()};
}
const dayVi=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
function aggregate(rows,p){
 const totals={orders:rows.length,completed:0,cancelled:0,disputes:0,pending:0,goods:0,shipping:0,platformFee:0,artistNet:0,feeCollected:0,feeOutstanding:0,feeReturnDue:0,refunded:0,averageOrder:0};
 const days=new Map();for(let i=0;i<p.days;i++){const day=dayVi(new Date(+new Date(p.start)+i*864e5));days.set(day,{date:day,orders:0,completed:0,goods:0,platformFee:0});}
 const sellers=new Map(),products=new Map();
 for(const o of rows){
  const recognized=o.status==='completed'&&!o.dispute_open;
  const goods=Number(o.goods_amount),fee=Number(o.platform_fee),collected=Number(o.fee_collected_amount||0)-Number(o.fee_returned_amount||0);
  const earned=recognized?fee:0;
  totals.feeCollected+=collected;totals.feeOutstanding+=Math.max(0,earned-collected);
  if(['refunded','cancelled'].includes(o.status))totals.feeReturnDue+=Math.max(0,collected);
  if(o.dispute_open)totals.disputes++;
  if(o.status==='cancelled')totals.cancelled++;
  if(o.status==='refunded')totals.refunded+=Number(o.total_amount);
  if(!['completed','cancelled','refunded'].includes(o.status)||o.dispute_open)totals.pending++;
  const day=days.get(dayVi(o.created_at));if(day)day.orders++;
  if(recognized){
   totals.completed++;totals.goods+=goods;totals.shipping+=Number(o.shipping_amount);totals.platformFee+=fee;totals.artistNet+=goods-fee;
   if(day){day.completed++;day.goods+=goods;day.platformFee+=fee;}
   const s=sellers.get(o.seller_id)||{id:o.seller_id,name:o.seller_name,orders:0,goods:0,platformFee:0,artistNet:0};s.orders++;s.goods+=goods;s.platformFee+=fee;s.artistNet+=goods-fee;sellers.set(o.seller_id,s);
   const a=products.get(o.product_id)||{id:o.product_id,title:o.product_snapshot.title,quantity:0,goods:0};a.quantity+=o.quantity;a.goods+=goods;products.set(o.product_id,a);
  }
 }
 totals.averageOrder=totals.completed?Math.round(totals.goods/totals.completed):0;
 return {period:{from:p.from,to:p.to},totals,trend:[...days.values()],sellers:[...sellers.values()].sort((a,b)=>b.goods-a.goods),products:[...products.values()].sort((a,b)=>b.goods-a.goods),orders:rows};
}
module.exports={TERMS_VERSION,TERMS,text,fail,integer,feeRate,amounts,shippingAddress,fingerprint,period,aggregate};

