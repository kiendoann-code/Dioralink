'use strict';
const crypto=require('node:crypto');
const TERMS_VERSION='marketplace-2026-10-05-v1';
const TERMS=[
 ['Sản phẩm và giá bán','Marketplace dành cho sản phẩm làm sẵn. Nghệ nhân chịu trách nhiệm về quyền bán, nguồn gốc, ảnh thật, tình trạng, kích thước, chất liệu, tồn kho và mô tả chính xác. Giá tiền hàng, phí giao hàng và tổng thanh toán được hiển thị trước khi đặt; nghệ nhân không được tự ý đổi giá của đơn đã tạo.'],
 ['Thanh toán chuyển khoản hoặc COD','Với chuyển khoản, chờ nghệ nhân xác nhận nhận đơn rồi chuyển đúng tổng tiền vào thông tin ngân hàng trong đơn, ghi đúng mã đơn và lưu chứng từ. Thông báo “đã chuyển” của khách không đồng nghĩa ngân hàng đã xác nhận tiền. Với COD, khách thanh toán số tiền hiển thị trong đơn khi nhận hàng; nghệ nhân tự đối soát tiền thu hộ với SPX. DioraLink không giữ tiền ký quỹ và không tự động thu, chuyển hoặc hoàn tiền.'],
 ['Giao hàng SPX','Sau khi chấp nhận đơn, nghệ nhân có trách nhiệm đóng gói bảo vệ sản phẩm, tạo vận đơn SPX và cung cấp mã cho khách trước khi chuyển đơn sang “Đang giao”. Mã và tình trạng trên DioraLink do người bán cập nhật, không phải xác nhận tự động từ SPX. Nghệ nhân cần khai báo giá trị và làm việc với SPX theo chính sách vận chuyển áp dụng. Không phát sinh khoản thu ngoài tổng đơn nếu chưa được khách đồng ý.'],
 ['Nhận hàng và hủy đơn','Khách kiểm tra thông tin người nhận, theo dõi vận đơn và phối hợp nhận hàng. Nên lưu ảnh kiện hàng, tem vận đơn, sản phẩm và video mở kiện nếu có; thiếu video không tự động làm mất quyền khiếu nại. Đơn chưa được chấp nhận có thể hủy trực tiếp. Sau khi chấp nhận, yêu cầu hủy, hàng sai mô tả, thiếu, hỏng hoặc thất lạc được xử lý qua mục tranh chấp; không mặc định mọi trường hợp đều không hoàn tiền.'],
 ['Khiếu nại và xử lý tranh chấp','Mở đơn hàng, chọn “Yêu cầu hỗ trợ / tranh chấp”, mô tả vấn đề và gửi chứng cứ. Hai bên phản hồi trong lịch sử đơn; quản trị viên xem mô tả tại lúc mua, chứng từ thanh toán, ảnh và mã vận đơn để hỗ trợ thương lượng. Trong thời gian tranh chấp đang mở, các bước hoàn tất đơn và thu phí nền tảng bị tạm dừng. Quản trị có thể ghi nhận phương án tiếp tục đơn, hủy đơn chưa thanh toán, hoặc hoàn toàn bộ khoản đã thanh toán. Quyết định xử lý, lý do và bằng chứng được lưu lại cho hai bên.'],
 ['Hoàn tiền và quyền của các bên','Nếu thống nhất hoàn tiền, nghệ nhân thực hiện hoàn bên ngoài nền tảng và cung cấp chứng từ; chỉ ghi nhận “Đã hoàn tiền” khi khách xác nhận hoặc quản trị kiểm chứng và ghi rõ căn cứ. Trường hợp trả hàng, hai bên thống nhất người chịu phí và tình trạng hàng trước khi hoàn lại tồn kho. DioraLink không tự động hoàn tiền thay nghệ nhân. Cơ chế nội bộ không hạn chế quyền yêu cầu cơ quan có thẩm quyền, hòa giải, trọng tài hoặc tòa án giải quyết theo pháp luật; không loại trừ trách nhiệm bắt buộc của người bán và nền tảng.'],
 ['Phí nền tảng và đối soát','Theo bảng phí DioraLink, phí trên tiền hàng của mỗi đơn (không gồm phí giao hàng): dưới 2.000.000₫ là 10%; từ 2.000.000₫ đến 5.000.000₫ là 8%; trên 5.000.000₫ đến 10.000.000₫ là 7%; trên 10.000.000₫ là 5%. Tỷ lệ được lưu khi đặt hàng. Nghệ nhân nhận tiền trực tiếp và có trách nhiệm đối soát, nộp phí nền tảng; đây là chia doanh thu, không phải lợi nhuận sau chi phí sản xuất, thuế hay vận chuyển. Đơn hủy hoặc hoàn toàn bộ không ghi nhận phí được hưởng; khoản phí đã thu cần được đối soát hoàn lại.'],
 ['Thông tin cá nhân và chấp thuận','Tên, số điện thoại và địa chỉ giao hàng chỉ được cung cấp cho người bán và quản trị để thực hiện, hỗ trợ đơn; nghệ nhân chỉ sử dụng cho mục đích này và giao nhận với SPX. Không công khai thông tin thanh toán hay chứng cứ tranh chấp ra trang sản phẩm. Khi đặt hàng, khách chủ động xác nhận đã đọc điều khoản và kiểm tra thông tin đơn. Phiên bản điều khoản và thời điểm đồng ý được lưu cùng đơn hàng.']
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
