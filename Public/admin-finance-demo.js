(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DioraFinanceDemo=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('vi-VN').format(n)+' ₫';
  function render(data){
    if(data?.isDemo!==true||!Array.isArray(data.orders)||data.orders.some(o=>o.isDemo!==true)||data.walletImpact!==0||data.accountingRevenue!==0)throw Error('Dữ liệu mô phỏng không hợp lệ.');
    const total=data.orders.reduce((n,o)=>n+Number(o.goodsAmount),0);
    if(!Number.isSafeInteger(total)||total!==data.totalDemoGoods)throw Error('Tổng giá trị mô phỏng không khớp.');
    return `<section class="card pad" aria-labelledby="finance-demo-heading" style="margin-bottom:24px;border:1px solid #a98641">
      <div class="between"><div><div class="eyebrow" style="color:#edca80">DEMO · 23–27/10/2026</div><h2 id="finance-demo-heading" class="section-title" style="font-size:29px;margin-top:6px">SỐ LIỆU TÀI CHÍNH MÔ PHỎNG</h2></div><span class="pill pill-warning">Dữ liệu thử nghiệm</span></div>
      <p class="small" style="margin:12px 0 18px;color:#edca80">Các đơn dưới đây là mô phỏng, không phải doanh thu hoặc thanh toán thật. Số liệu không cộng vào sổ hoa hồng hay số dư ví.</p>
      <div class="grid three"><div class="card metric"><div class="n">${money(total)}</div><div class="k">Tổng giá trị đơn mô phỏng</div></div><div class="card metric"><div class="n">${data.orders.length}</div><div class="k">Đơn đã giao hàng (mô phỏng)</div></div><div class="card metric"><div class="n">${money(0)}</div><div class="k">Tiền thực thu từ bộ mô phỏng</div></div></div>
      <div class="wrap" style="margin:18px 0">${(data.daily||[]).map(d=>`<div class="card-soft pad"><div class="tiny muted">${esc(d.date)}</div><strong>${money(Number(d.goodsAmount))}</strong><div class="tiny muted">${Number(d.orders)} đơn mô phỏng</div></div>`).join('')}</div>
      <details open><summary style="cursor:pointer;font-weight:700;padding:10px 0">Chi tiết ${data.orders.length} đơn mô phỏng</summary><div class="table-wrap"><table><thead><tr><th>Mã demo</th><th>Ngày mô phỏng</th><th>Người mua test</th><th>Người bán test</th><th>Sản phẩm giả lập</th><th>Giá trị mô phỏng</th><th>Trạng thái mô phỏng</th></tr></thead><tbody>${data.orders.map(o=>`<tr data-finance-demo-order="${esc(o.id)}"><td>${esc(o.id)}</td><td>${esc(String(o.simulatedRecordedAt).slice(0,10))}</td><td>${esc(o.buyerName)}</td><td>${esc(o.sellerName)}</td><td>${esc(o.productTitle)}</td><td>${money(Number(o.goodsAmount))}</td><td>Đã giao hàng (mô phỏng)</td></tr>`).join('')}</tbody></table></div></details>
    </section>`;
  }
  async function load(target,request){
    try{
      const response=await request('/api/admin/demo/orders');
      if(!response.ok)throw Error(response.status===401||response.status===403?'Cần đăng nhập quản trị để xem số liệu mô phỏng.':'Không tải được số liệu mô phỏng.');
      const html=render(await response.json());
      if(target.isConnected!==false)target.innerHTML=html;
    }catch(error){if(target.isConnected!==false)target.textContent=error.message||'Không tải được số liệu mô phỏng.';}
  }
  return {render,load};
});
