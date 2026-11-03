'use strict';
const ExcelJS=require('exceljs');
const {buildMarketplaceReconciliation}=require('./marketplace-reconciliation');
const number=v=>v===null||v===undefined?'':Number(v);
const vnDate=v=>{if(!v)return '';const d=new Date(v);return Number.isNaN(+d)?'':new Date(+d+7*3600000);};
const labelStatus=v=>({
 completed:'Hoàn tất',cancelled:'Đã hủy',refunded:'Đã hoàn tiền',
 disputed:'Đang tranh chấp',pending:'Chờ xử lý',
 received:'Đã nhận tiền',wallet_held:'Ví đang giữ tiền'
}[v]||v||'');
function reportWorkbook(report){
 const joined=report.reconciliation||buildMarketplaceReconciliation(report);
 const {totals:t,orders:all,trend:days,sellers:artists}=joined;
 const book=new ExcelJS.Workbook();book.creator='DioraLink';book.created=new Date();
 const add=(name,headers,widths)=>{
  const s=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]});
  s.columns=headers.map((header,i)=>({header,width:widths?.[i]||22}));
  const head=s.getRow(1);head.font={bold:true,color:{argb:'FFFFFFFF'}};
  head.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF103640'}};
  head.height=34;head.alignment={vertical:'middle',wrapText:true};
  return s;
 };
 const moneyColumns=(sheet,columns)=>{for(const i of columns)sheet.getColumn(i).numFmt='#,##0';};
 const summary=add('Tai chinh tong hop',['Chỉ tiêu','Giá trị'],[52,33]);
 summary.addRows([
  ['Giá trị giao dịch được ghi nhận (VND)',t.goods],
  ['Hoa hồng nền tảng được hưởng (VND)',t.platformFee],
  ['Hoa hồng đã thu ròng (VND)',t.feeCollected],
  ['Hoa hồng chưa thu (VND)',t.feeOutstanding],
  ['Số giao dịch được ghi nhận',t.completed],
  ['Đơn trên hệ thống',t.systemOrders],
  ['Hồ sơ phục hồi đã được quản trị xác nhận',t.recoveredOrders],
  ['Phí vận chuyển có dữ liệu (VND)',t.shipping],
  ['Số hồ sơ chưa có dữ liệu phí vận chuyển',t.shippingUnknown],
  ['Kỳ đối soát (ngày ghi nhận, giờ Việt Nam)',report.period.from+' – '+report.period.to],
  ['Nguyên tắc đối soát','Các đơn trong Neon và hồ sơ được quản trị xác nhận đều được tính ở Tổng quan, Xu hướng, Đơn hàng, Nghệ nhân. Khoản chưa có chứng từ liên quan giữ trống, không tự tạo mã SPX, địa chỉ thanh toán hay hình thức thanh toán.']
 ]);
 moneyColumns(summary,[2]);
 summary.getRow(12).height=70;summary.getCell('B12').alignment={wrapText:true,vertical:'top'};
 const details=add('Giao dich tong hop',
  ['Ngày ghi nhận (VN)','Họ tên KH','Email','SĐT KH','Người bán','Sản phẩm / Hồ sơ',
   'Số lượng','Giá trị tiền hàng (VND)','Hoa hồng được hưởng (VND)','Hoa hồng đã thu ròng (VND)',
   'Trạng thái','Nguồn xác nhận','Mã đơn / hồ sơ'],
  [24,25,32,20,26,38,12,24,26,29,22,34,28]);
 for(const o of all)details.addRow([
  vnDate(o.created_at),o.buyer_name,o.buyer_email,o.buyer_phone,o.seller_name,
  o.product_title,o.quantity,o.goods_amount,o.fee_earned,o.fee_collected,
  labelStatus(o.status),o.source_label,o.id
 ]);
 details.getColumn(1).numFmt='dd/mm/yyyy hh:mm';moneyColumns(details,[7,8,9,10]);
 const overview=add('Tong quan',['Chỉ tiêu','Giá trị'],[54,48]);
 overview.addRows([
  ['Kỳ báo cáo (ngày ghi nhận, giờ Việt Nam)',report.period.from+' – '+report.period.to],
  ['Thời điểm xuất (UTC)',new Date()],
  ['Tổng số đơn / hồ sơ đối soát',t.orders],
  ['Hoàn tất, không tranh chấp',t.completed],
  ['Doanh số tiền hàng hoàn tất (VND)',t.goods],
  ['Phí vận chuyển có dữ liệu (VND)',t.shipping],
  ['Hoa hồng DioraLink được hưởng (VND)',t.platformFee],
  ['Nghệ nhân được hưởng từ tiền hàng (VND)',t.artistNet],
  ['Hoa hồng đã thu ròng (VND)',t.feeCollected],
  ['Hoa hồng còn phải thu (VND)',t.feeOutstanding],
  ['Hoa hồng cần hoàn lại sau hủy/hoàn (VND)',t.feeReturnDue],
  ['Giá trị đơn đã hoàn cho khách (VND)',t.refunded],
  ['Đơn đang tranh chấp',t.disputes],
  ['Đơn đã hủy',t.cancelled],
  ['Giá trị tiền hàng trung bình / giao dịch',t.averageOrder],
  ['Giải thích','Thống kê hợp nhất theo ngày ghi nhận, chỉ tính tiền hàng hoàn tất. Phí vận chuyển tách riêng; số chưa có căn cứ không mặc định bằng 0.']
 ]);
 overview.getCell('B3').numFmt='dd/mm/yyyy hh:mm';moneyColumns(overview,[2]);
 overview.getRow(17).height=70;overview.getCell('B17').alignment={wrapText:true,vertical:'top'};
 const trend=add('Xu huong',
  ['Ngày ghi nhận (VN)','Số giao dịch','Đã hoàn tất','Doanh số tiền hàng (VND)',
   'Hoa hồng được hưởng (VND)','Hoa hồng đã thu ròng (VND)','Đơn trên hệ thống','Hồ sơ phục hồi'],
  [23,19,18,29,29,30,23,22]);
 for(const d of days)trend.addRow([
  new Date(d.date+'T12:00:00+07:00'),d.orders,d.completed,d.goods,
  d.platformFee,d.feeCollected,d.systemOrders,d.recoveredOrders
 ]);
 trend.getColumn(1).numFmt='dd/mm/yyyy';moneyColumns(trend,[2,3,4,5,6,7,8]);
 const orders=add('Don hang',[
  'Mã đơn / Hồ sơ đối soát','Ngày ghi nhận (VN)','Nghệ nhân','Sản phẩm','Số lượng',
  'Hình thức thanh toán','Trạng thái','Xác nhận thanh toán','Tranh chấp mở',
  'Giá trị tiền hàng (VND)','Phí vận chuyển (VND)','Tổng phải thanh toán (VND)',
  'Tỷ lệ hoa hồng','Phí theo đơn (VND)','Hoa hồng được hưởng (VND)',
  'Hoa hồng đã thu (VND)','Hoa hồng đã trả (VND)','Mã SPX',
  'Họ tên KH','SĐT khách hàng','Email khách hàng','Tên người nhận','SĐT người nhận',
  'Địa chỉ nhận hàng','Địa chỉ thanh toán','Thành phố tài khoản KH',
  'Nguồn đối soát','Ngày quản trị xác nhận (VN)'
 ],[31,24,27,38,13,29,21,29,17,26,24,29,20,22,28,26,26,29,27,22,34,27,22,52,44,25,38,26]);
 for(const o of all)orders.addRow([
  o.id,vnDate(o.created_at),o.seller_name,o.product_title,o.quantity,
  o.payment_method,labelStatus(o.status),labelStatus(o.payment_status),o.dispute_open?'Có':'Không',
  o.goods_amount,number(o.display_shipping_amount??o.shipping_amount),number(o.display_total_amount??o.total_amount),
  o.commission_rate/100,o.platform_fee,o.fee_earned,o.fee_collected,o.fee_returned,
  o.tracking_number,o.buyer_name,o.buyer_phone,o.buyer_email,o.recipient_name,
  o.recipient_phone,o.delivery_address,o.billing_address,o.buyer_city,
  o.source_label,vnDate(o.confirmed_at)
 ]);
 orders.getColumn(2).numFmt='dd/mm/yyyy hh:mm';orders.getColumn(13).numFmt='0.00%';orders.getColumn(28).numFmt='dd/mm/yyyy';
 moneyColumns(orders,[5,10,11,12,14,15,16,17]);
 const sellers=add('Nghe nhan',
  ['Nghệ nhân','Mã nghệ nhân','Giao dịch hoàn tất','Tiền hàng (VND)','Hoa hồng nền tảng (VND)','Nghệ nhân được hưởng (VND)'],
  [35,38,24,30,29,34]);
 for(const a of artists)sellers.addRow([a.name,a.id,a.orders,a.goods,a.platformFee,a.artistNet]);
 moneyColumns(sellers,[3,4,5,6]);
 const provenance=add('Kiem tra doi soat',
  ['Mã đơn / Hồ sơ','Nguồn','Họ tên KH','SĐT','Email','Địa chỉ nhận hàng',
  'Địa chỉ thanh toán','Phương thức thanh toán','Mã SPX','Tình trạng thông tin'],
  [30,38,27,23,35,50,48,35,30,40]);
 for(const o of all){
  const missing=[];
  if(!o.buyer_name)missing.push('Họ tên');
  if(!o.buyer_phone)missing.push('SĐT');
  if(!o.buyer_email)missing.push('Email');
  if(String(o.buyer_phone||'').replace(/\D/g,'').length<9 || (o.audit_buyer_phone && o.buyer_phone!==o.audit_buyer_phone))missing.push('SĐT');
  if(!o.delivery_address)missing.push('Địa chỉ nhận');
  if(!o.billing_address || o.billing_address==='29')missing.push('Địa chỉ thanh toán');
  if(o.payment_method==='Chưa có trong hồ sơ phục hồi')missing.push('Hình thức thanh toán');
  if(!o.tracking_number)missing.push('Mã SPX');
  provenance.addRow([
   o.id,o.source_label,o.buyer_name,o.audit_buyer_phone||o.buyer_phone,o.buyer_email,
   o.delivery_address,o.billing_address,o.payment_method,o.tracking_number,
   missing.length?'Cần bổ sung chứng từ: '+missing.join(', '):'Đầy đủ'
  ]);
 }
 for(const sh of book.worksheets){
  if(sh.rowCount>1)sh.autoFilter={from:{row:1,column:1},to:{row:sh.rowCount,column:sh.columnCount}};
  sh.eachRow((row,index)=>{
   if(index===1)return;
   row.alignment={vertical:'middle',wrapText:true};
   if(index%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F7F7'}};
   row.eachCell(cell=>{cell.border={bottom:{style:'hair',color:{argb:'FFD9E4E4'}}};});
  });
  sh.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
 }
 return book;
}
module.exports={reportWorkbook};
