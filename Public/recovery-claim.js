'use strict';
function recoveryApi(path,opts={}){return fetch(path,{credentials:'include',...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||'Không thể thực hiện yêu cầu.');return j;});}
async function renderArtisanRecovery(){
 document.getElementById('app').innerHTML='<section class="page"><div class="eyebrow">DioraLink · Khôi phục</div><h1 class="section-title">Nhận lại hồ sơ nghệ nhân</h1><p class="body">Nếu bạn đã từng đăng ký DioraLink trước khi chuyển database, hãy yêu cầu liên kết lại hồ sơ và ảnh cũ. Quản trị viên sẽ xác minh quyền sở hữu trước khi duyệt. Mật khẩu, đơn hàng và Ví Diora không được phục hồi bằng tính năng này.</p><div id="recovery-user"><div class="empty">Đang tìm hồ sơ...</div></div></section>';
 try{
  const data=await recoveryApi('/api/artisan/recovery');
  const claimed=new Set(data.claims.map(c=>c.source_profile_id));
  const pending=data.claims.map(c=>'<article class="card pad"><b>'+esc(c.name)+'</b> · '+esc(c.status==='pending'?'Đang chờ xác minh':c.status==='approved'?'Đã khôi phục':'Đã từ chối')+'<p class="small muted">'+esc(c.admin_note||'')+'</p></article>').join('');
  const opts=data.profiles.filter(p=>!claimed.has(p.id)).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');
  document.getElementById('recovery-user').innerHTML='<div class="grid two"><div><h2 class="seo-card-title">Yêu cầu mới</h2>'+(opts?'<form id="recovery-claim-form" onsubmit="sendArtisanRecovery(event)"><label>Hồ sơ cần nhận lại<select class="field" name="profile_id">'+opts+'</select></label><label>Căn cứ xác minh<textarea class="field" name="evidence" minlength="20" maxlength="2000" required placeholder="Đường dẫn fanpage/website chính thức, thông tin liên hệ hoặc chứng từ trước đây."></textarea></label><button class="btn btn-mint" type="submit">Gửi yêu cầu khôi phục</button></form>':'<p class="body">Không còn hồ sơ phù hợp để yêu cầu. Nếu hồ sơ chưa công khai, hãy dùng đúng tên đăng ký cũ.</p>')+'</div><div><h2 class="seo-card-title">Yêu cầu của bạn</h2>'+(pending||'<p>Chưa có yêu cầu.</p>')+'</div></div>';
 }catch(e){document.getElementById('recovery-user').textContent=e.message;}
}
async function sendArtisanRecovery(event){
 event.preventDefault();const f=event.target,button=f.querySelector('button');button.disabled=true;
 try{const d=new FormData(f);await recoveryApi('/api/artisan/recovery/claims',{method:'POST',body:JSON.stringify({profile_id:d.get('profile_id'),evidence:d.get('evidence')})});toast('Đã gửi yêu cầu, chờ quản trị viên xác minh.','success');renderArtisanRecovery();}
 catch(e){toast(e.message,'error');button.disabled=false;}
}
async function renderAdminArtisanRecovery(){
 document.getElementById('app').innerHTML='<section class="page"><div class="eyebrow">Admin · Xác minh</div><h1 class="section-title">Khôi phục hồ sơ nghệ nhân</h1><p class="body">Đối chiếu quyền sở hữu qua kênh độc lập trước khi phê duyệt. Chỉ khôi phục hồ sơ, ảnh và URL — không ảnh hưởng tài khoản ngân hàng, Ví Diora hay đơn hàng.</p><div class="card pad"><h2 class="seo-card-title">Nhập ảnh từ file khôi phục</h2><p class="small">Chọn file DioraLink_CuuHoSoNgheNhan_2026-10-25.json mà bạn đã lưu. Hệ thống chỉ gửi ảnh đã khớp hồ sơ về Neon, không gửi dữ liệu đăng nhập.</p><input class="field" id="recovery-import-file" type="file" accept=".json,application/json"><button class="btn" type="button" onclick="importRecoveredMedia()">Nhập ảnh vào Neon</button><div id="recovery-import-result"></div></div><div id="recovery-admin-list" class="seo-section"><div class="empty">Đang tải...</div></div></section>';
 try{
  const data=await recoveryApi('/api/admin/artisan-recovery/claims');
  document.getElementById('recovery-admin-list').innerHTML=data.claims.map(c=>'<article class="card pad"><h2 class="seo-card-title">'+esc(c.profile_name)+' → '+esc(c.claimant_name)+'</h2><p class="small muted">Email tài khoản mới: '+esc(c.claimant_email)+' · Trạng thái: '+esc(c.status)+' · Ảnh đã nhập: '+Number(c.image_count)+'/2</p><p class="body">Người nhận hồ sơ cung cấp: '+esc(c.evidence)+'</p>'+(c.status==='pending'?'<form onsubmit="reviewArtisanRecovery(event, \''+esc(c.id)+'\')"><label>Phương thức xác minh độc lập<select class="field" name="verification_method"><option value="direct_artist_contact">Liên hệ trực tiếp nghệ nhân</option><option value="social_profile_message">Nhắn tin qua fanpage / profile cũ</option><option value="existing_invoice">Chứng từ hoặc hợp đồng cũ</option><option value="other_document">Tài liệu xác thực khác</option></select></label><label>Căn cứ quyết định<textarea class="field" name="note" required minlength="20" maxlength="2000" placeholder="Nêu rõ đã kiểm chứng bằng nguồn nào, kết quả ra sao."></textarea></label><div class="wrap"><button class="btn btn-mint" type="submit" name="decision" value="approve">Xác minh và liên kết</button><button class="btn" type="submit" name="decision" value="reject">Từ chối</button></div></form>':'<p class="small muted">'+esc(c.admin_note||'')+'</p>')+'</article>').join('')||'<div class="empty">Chưa có yêu cầu nào. Nghệ nhân mở menu Khôi phục hồ sơ để gửi.</div>';
 }catch(e){document.getElementById('recovery-admin-list').textContent=e.message;}
}
async function importRecoveredMedia(){
 const file=document.getElementById('recovery-import-file')?.files?.[0],target=document.getElementById('recovery-import-result');
 if(!file){target.textContent='Chọn file JSON đã xuất từ DioraLink.';return;}
 try{
  if(file.size>16*1024*1024)throw new Error('File quá lớn.');
  const raw=JSON.parse(await file.text());
  if(raw.source!=='DioraLink browser local recovery'||!Array.isArray(raw.assetImages))throw new Error('Không đúng định dạng file khôi phục.');
  const images=raw.assetImages.map(x=>({id:x.id,image:x.image}));target.textContent='Đang kiểm tra và nhập ảnh...';
  const result=await recoveryApi('/api/admin/artisan-recovery/media/import',{method:'POST',body:JSON.stringify({images})});
  target.textContent='Đã nhập '+Number(result.imported)+' ảnh mới. Ảnh đã có sẽ không bị ghi đè.';renderAdminArtisanRecovery();
 }catch(e){target.textContent=e.message;}
}
async function reviewArtisanRecovery(event,id){
 event.preventDefault();const f=event.target,button=event.submitter;const decision=button?.value;
 if(decision==='approve'&&!confirm('Bạn đã kiểm chứng độc lập chủ sở hữu? Liên kết hồ sơ cũ với tài khoản mới sẽ thay đổi quyền quản lý hồ sơ.'))return;
 const d=new FormData(f);
 try{await recoveryApi('/api/admin/artisan-recovery/claims/'+encodeURIComponent(id)+'/review',{method:'POST',body:JSON.stringify({action:decision,note:d.get('note'),verification_method:d.get('verification_method')})});toast('Đã ghi nhận kết quả đối soát.','success');renderAdminArtisanRecovery();}
 catch(e){toast(e.message,'error');}
}
