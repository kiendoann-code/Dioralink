(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DioraFinanceDemo=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('vi-VN').format(n)+' ₫';
  function render(data){
    if(data?.isDemo!==true||!Array.isArray(data.orders)||data.orders.some(o=>o.isDemo!==true)||data.walletImpact!==0||data.accountingRevenue!==0)throw Error('Dữ liệu không hợp lệ.');
    const total=data.orders.reduce((n,o)=>n+Number(o.goodsAmount),0);
    if(!Number.isSafeInteger(total)||total!==data.totalDemoGoods)throw Error('Tổng giá trị không khớp.');
    return `<section class="card pad" aria-labelledby="finance-demo-heading" style="margin-bottom:24px;border:1px solid #a98641">
      <div class="between"><div><div class="eyebrow" style="color:#edca80">23–27/10/2026</div><h2 id="finance-demo-heading" class="section-title" style="font-size:29px;margin-top:6px">SỐ LIỆU TÀI CHÍNH</h2></div><span class="pill pill-warning">Chưa hạch toán</span></div>
      <p class="small" style="margin:12px 0 18px;color:#edca80">Các khoản dưới đây chưa được ghi nhận vào doanh thu hoặc thanh toán. Số liệu không cộng vào sổ hoa hồng hay số dư ví.</p>
      <div class="grid three"><div class="card metric"><div class="n">${money(total)}</div><div class="k">Tổng giá trị đơn</div></div><div class="card metric"><div class="n">${data.orders.length}</div><div class="k">Số đơn trong báo cáo</div></div><div class="card metric"><div class="n">${money(0)}</div><div class="k">Tiền thực thu</div></div></div>
      <div class="wrap" style="margin:18px 0">${(data.daily||[]).map(d=>`<div class="card-soft pad"><div class="tiny muted">${esc(d.date)}</div><strong>${money(Number(d.goodsAmount))}</strong><div class="tiny muted">${Number(d.orders)} đơn</div></div>`).join('')}</div>
      <details open><summary style="cursor:pointer;font-weight:700;padding:10px 0">Chi tiết ${data.orders.length} đơn</summary><div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Người mua</th><th>Người bán</th><th>Sản phẩm</th><th>Giá trị</th><th>Trạng thái</th></tr></thead><tbody>${data.orders.map(o=>`<tr data-finance-demo-order="${esc(o.id)}"><td>${esc(String(o.simulatedRecordedAt).slice(0,10))}</td><td>${esc(o.buyerName)}</td><td>${esc(o.sellerName)}</td><td>${esc(o.productTitle)}</td><td>${money(Number(o.goodsAmount))}</td><td>Chưa hạch toán</td></tr>`).join('')}</tbody></table></div></details>
    </section>`;
  }
  async function load(target,request){
    try{
      const response=await request('/api/admin/demo/orders');
      if(!response.ok)throw Error(response.status===401||response.status===403?'Cần đăng nhập quản trị để xem số liệu.':'Không tải được số liệu.');
      const html=render(await response.json());
      if(target.isConnected!==false)target.innerHTML=html;
    }catch(error){if(target.isConnected!==false)target.textContent=error.message||'Không tải được số liệu.';}
  }
  function renderReport(report){
    if(!report||!Array.isArray(report.transactions))throw Error('Báo cáo tài chính không hợp lệ.');
    const a=report.actual,d=report.simulated;
    const metric=(label,value)=>'<div class="card metric"><div class="n">'+money(value)+'</div><div class="k">'+label+'</div></div>';
    const labels={unpaid:'Chưa thu hoa hồng',collected:'Đã thu hoa hồng',completed:'Hoàn tất',cancelled:'Đã hủy',refunded:'Đã hoàn tiền',disputed:'Đang tranh chấp',delivered_simulated:'Chưa hạch toán'};
    return '<p class="small">Giá trị giao dịch không phải doanh thu nền tảng. Hoa hồng thật dùng tỷ lệ và số tiền đã lưu trên từng giao dịch; Marketplace chỉ ghi nhận phí được hưởng khi đơn hoàn tất, không tranh chấp. Hoa hồng đã thu ròng tách khỏi khoản chưa thu. Các khoản chưa hạch toán không được cộng vào thực thu hoặc số dư ví.</p><div class="grid three">'+metric('Giá trị giao dịch thật được ghi nhận',a.gross)+metric('Hoa hồng thật được hưởng',a.platformFee)+metric('Hoa hồng thật đã thu ròng',a.collected)+metric('Hoa hồng thật còn phải thu',a.unpaid)+metric('Phí thật cần hoàn lại',a.feeReturnDue)+metric('Giá trị chưa hạch toán · '+d.orders+' đơn · thực thu 0 ₫',d.goods)+'</div><div class="card pad" style="margin-top:16px"><h2>Giao dịch và hoa hồng tổng hợp</h2><div class="table-wrap"><table><thead><tr><th>Loại dữ liệu</th><th>Nguồn</th><th>Ngày (VN)</th><th>Người bán</th><th>Đơn / Dự án</th><th>Giá trị</th><th>Tỷ lệ đã lưu</th><th>Phí đã lưu</th><th>Phí được hưởng</th><th>Đã thu ròng</th><th>Trạng thái</th></tr></thead><tbody>'+report.transactions.map(o=>'<tr><td>'+ (o.dataType==='simulated'?'Chưa hạch toán':'Đã ghi nhận')+'</td><td>'+esc(o.source==='demo'?'Báo cáo nội bộ':o.source)+'</td><td>'+esc(new Date(o.date).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}))+'</td><td>'+esc(o.seller)+'</td><td>'+esc(o.title)+'</td><td>'+money(o.gross)+'</td><td>'+(o.rate===null?'—':esc(o.rate)+'%')+'</td><td>'+(o.fee===null?'—':money(o.fee))+'</td><td>'+money(o.earned)+'</td><td>'+money(o.collected)+'</td><td>'+esc(labels[o.status]||o.status)+'</td></tr>').join('')+'</tbody></table></div></div>';
  }
  return {render,load,renderReport};
});
