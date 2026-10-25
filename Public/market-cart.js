/* Marketplace persistent cart. A seller group is one order and one shipping fee. */
const MARKET_CART_STORAGE='dioralink_market_cart_v1';
let marketCartProducts=[],marketCartCurrentSeller=null,marketCartCheckoutState=null,marketCartBusy=false;
function readMarketCart(){
 try{const cart=JSON.parse(localStorage.getItem(MARKET_CART_STORAGE)||'[]');return Array.isArray(cart)?cart.filter(x=>x&&/^[a-f0-9-]{36}$/i.test(x.product_id)&&Number.isInteger(x.quantity)&&x.quantity>0).slice(0,20):[];}catch{return [];}
}
function writeMarketCart(items){localStorage.setItem(MARKET_CART_STORAGE,JSON.stringify(items));}
async function addMarketCartProduct(productId){
 try{
  const {product:p}=await marketAPI('/api/market/products/'+encodeURIComponent(productId));
  if(p.stock<1)throw new Error('Sản phẩm đã hết hàng.');
  const cart=readMarketCart(),line=cart.find(x=>x.product_id===p.id);
  if(line){if(line.quantity>=Math.min(p.stock,99))throw new Error('Đã đạt số lượng khả dụng.');line.quantity++;}
  else{if(cart.length>=20)throw new Error('Giỏ hàng chỉ chứa tối đa 20 loại sản phẩm.');cart.push({product_id:p.id,quantity:1});}
  writeMarketCart(cart);toast('Đã thêm vào giỏ hàng.','success');
 }catch(e){toast(e.message||'Không thể thêm vào giỏ.','error');}
}
function changeMarketCartQuantity(id,quantity){const cart=readMarketCart(),line=cart.find(x=>x.product_id===id);if(!line)return;const p=marketCartProducts.find(p=>p.id===id);line.quantity=Math.max(1,Math.min(99,p?.stock||99,Number(quantity)||1));writeMarketCart(cart);renderMarketCart();}
function removeMarketCartProduct(id){writeMarketCart(readMarketCart().filter(x=>x.product_id!==id));renderMarketCart();}
async function loadMarketCartProducts(){
 const cart=readMarketCart();
 const responses=await Promise.all(cart.map(async line=>{
  try{const r=await marketAPI('/api/market/products/'+encodeURIComponent(line.product_id));return r.product;}
  catch{return null;}
 }));
 marketCartProducts=responses.filter(Boolean);
 return {cart,stale:cart.filter((line,i)=>!responses[i])};
}
async function renderMarketCart(){
 marketScreen('Giỏ hàng','Sản phẩm cùng một nghệ nhân được gộp thành một đơn, thu một lần phí giao hàng.',`<a class="btn" href="/marketplace">← Tiếp tục mua sắm</a>`);
 try{
  const {cart,stale}=await loadMarketCartProducts();
  if(currentRoute()!=='market-cart')return;
  const groups=new Map();
  for(const line of cart){const p=marketCartProducts.find(p=>p.id===line.product_id);if(!p)continue;
   if(!groups.has(p.seller_id))groups.set(p.seller_id,{seller:p.seller_name,items:[]});
   groups.get(p.seller_id).items.push({p,quantity:line.quantity});
  }
  const html=[...groups.entries()].map(([sellerId,group])=>{
   const goods=group.items.reduce((sum,{p,quantity})=>sum+p.price*quantity,0);
   const shipping=Math.max(...group.items.map(({p})=>p.shipping_fee));
   return `<section class="card pad"><div class="between"><div><div class="eyebrow">NGHỆ NHÂN</div><h2 class="seo-card-title">${esc(group.seller)}</h2></div><span class="pill pill-mint">Một đơn · Một phí ship</span></div><div class="grid seo-note">${group.items.map(({p,quantity})=>`<div class="between market-cart-line"><div class="row" style="display:flex;align-items:center;gap:12px;min-width:0"><img src="${esc(p.images[0])}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:10px"><div><a class="seo-link" href="/marketplace/${esc(p.slug)}">${esc(p.title)}</a><p class="small muted">${money(p.price)} · Còn ${p.stock}</p></div></div><div class="wrap"><input class="field" aria-label="Số lượng ${esc(p.title)}" type="number" min="1" max="${Math.min(99,p.stock)}" value="${quantity}" onchange="changeMarketCartQuantity('${esc(p.id)}',this.value)" style="width:82px"><button type="button" class="btn btn-sm" onclick="removeMarketCartProduct('${esc(p.id)}')">Xóa</button></div></div>`).join('')}</div><div class="market-totals"><span>Tiền hàng</span><b>${money(goods)}</b><span>Phí giao hàng / nghệ nhân</span><b>${money(shipping)}</b><strong>Tạm tính trước voucher</strong><strong>${money(goods+shipping)}</strong></div><button class="btn btn-mint seo-note" type="button" onclick="startMarketCartCheckout('${esc(sellerId)}')">Thanh toán nhóm sản phẩm này</button></section>`;
  }).join('');
  document.getElementById('market-content').innerHTML=(stale.length?`<p class="notice">${stale.length} sản phẩm không còn bán và sẽ không được thanh toán. Bạn có thể xóa khỏi giỏ.</p>`:'')+(html||'<div class="empty">Giỏ hàng đang trống. <a href="/marketplace">Khám phá sản phẩm →</a></div>');
 }catch(e){marketError(e);}
}
function startMarketCartCheckout(sellerId){sessionStorage.setItem('dioralink_market_cart_seller',sellerId);navigate('market-checkout/cart');}
function cartCheckoutInput(){
 if(!marketCartCheckoutState)throw new Error('Giỏ hàng chưa được tải.');
 const f=document.getElementById('market-cart-checkout-form');
 return {items:marketCartCheckoutState.lines,payment_method:f.payment_method.value,voucher_code:f.voucher_code.value.trim().toUpperCase()};
}
async function renderMarketCartCheckout(){
 marketScreen('Thanh toán giỏ hàng','Một đơn hàng, một vận đơn và một lần phí giao hàng cho nghệ nhân này.',`<a class="btn" href="/ung-dung#market-cart">← Về giỏ hàng</a>`);
 try{
  const {cart}=await loadMarketCartProducts(),sellerId=sessionStorage.getItem('dioralink_market_cart_seller');
  const lines=cart.map(line=>{const p=marketCartProducts.find(p=>p.id===line.product_id);return p&&p.seller_id===sellerId?{product_id:p.id,product_version:p.version,quantity:Math.min(line.quantity,p.stock,99)}:null;}).filter(x=>x&&x.quantity>0);
  if(!lines.length)throw new Error('Không còn sản phẩm khả dụng của nghệ nhân này trong giỏ.');
  marketCartCheckoutState={sellerId,lines};
  const q=await marketPost('/api/market/cart/quote',{items:lines,payment_method:'wallet'});
  if(currentRoute()!=='market-checkout')return;
  document.getElementById('market-content').innerHTML=`<div class="grid two"><form class="card pad" id="market-cart-checkout-form" onsubmit="reviewMarketCartCheckout(event)"><h2 class="seo-card-title">Thông tin nhận hàng</h2><label class="market-field">Tên người nhận<input class="field" name="name" required minlength="2" maxlength="150" value="${esc(state.user.name||'')}"></label><label class="market-field">Số điện thoại<input class="field" name="phone" type="tel" required minlength="8" maxlength="25" value="${esc(state.user.phone||'')}"></label><label class="market-field">Địa chỉ đầy đủ<textarea class="field" name="address" required minlength="12" maxlength="600" placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"></textarea></label><label class="market-field">Phương thức thanh toán<select class="field" name="payment_method" onchange="refreshMarketCartQuote()"><option value="wallet">Ví Diora</option>${q.allow_cod?'<option value="cod">COD – thanh toán khi nhận hàng</option>':''}</select></label><label class="market-field">Voucher Marketplace<input class="field" name="voucher_code" maxlength="32" placeholder="Nhập mã giảm giá" onchange="refreshMarketCartQuote()"></label><button class="btn btn-sm" type="button" onclick="refreshMarketCartQuote()">Áp dụng voucher</button><p class="small muted seo-note">Ví Diora giữ tiền khi đặt hàng; COD thu tiền khi giao hàng. Voucher hợp lệ được tính trực tiếp bởi DioraLink.</p><button class="btn btn-mint seo-note" type="submit">Xem điều khoản và xác nhận</button></form><aside class="card pad"><h2 class="seo-card-title">Sản phẩm từ ${esc(marketCartProducts.find(p=>p.seller_id===sellerId)?.seller_name||'nghệ nhân')}</h2><div class="grid seo-note">${q.items.map(i=>`<div class="between small"><span>${esc(i.title)} × ${i.quantity}</span><b>${money(i.goods)}</b></div>`).join('')}</div><div id="market-checkout-total"></div><p class="small muted seo-note">Phí vận chuyển lấy mức cao nhất trong nhóm sản phẩm cùng nghệ nhân và chỉ tính một lần.</p></aside></div>`;
  marketCartCheckoutState.quote=q;renderMarketQuote(q);
 }catch(e){marketError(e);}
}
async function refreshMarketCartQuote(){
 try{const q=await marketPost('/api/market/cart/quote',cartCheckoutInput());marketCartCheckoutState.quote=q;renderMarketQuote(q);toast(q.discount?'Voucher đã được áp dụng.':'Đã cập nhật tổng tiền.','success');return q;}catch(e){toast(e.message,'error');throw e;}
}
async function reviewMarketCartCheckout(event){
 event.preventDefault();const f=event.target,b=f.querySelector('button[type="submit"]');b.disabled=true;
 try{
  const q=await marketPost('/api/market/cart/quote',cartCheckoutInput());
  marketCartCheckoutState.quote=q;renderMarketQuote(q);
  const t=await marketAPI('/api/market/terms'),fd=new FormData(f);
  const payload={items:marketCartCheckoutState.lines,payment_method:fd.get('payment_method'),voucher_code:fd.get('voucher_code').trim().toUpperCase(),recipient:{name:fd.get('name'),phone:fd.get('phone'),address:fd.get('address')},terms_version:t.version};
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
  const digest=Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,'0')).join('');
  let saved;try{saved=JSON.parse(sessionStorage.getItem('dioralink_market_checkout')||'null');}catch{}
  const key=saved?.digest===digest?saved.key:crypto.randomUUID();
  sessionStorage.setItem('dioralink_market_checkout',JSON.stringify({digest,key}));
  marketCartCheckoutState.payload={...payload,request_key:key};
  marketModal('Kiểm tra và đồng ý điều khoản',`<p class="body">Một đơn gồm <b>${q.items.length} loại sản phẩm</b> · ${q.quantity} sản phẩm · <strong>${money(q.total)}</strong> · ${payload.payment_method==='wallet'?'Ví Diora':'COD'}</p><p class="small">Giao tới: ${esc(payload.recipient.name)} · ${esc(payload.recipient.phone)} · ${esc(payload.recipient.address)}</p>${q.discount?`<p class="notice">Voucher ${esc(q.voucher_code)}: giảm ${money(q.discount)}</p>`:''}<div class="market-terms-scroll" tabindex="0">${t.sections.map(([title,body],i)=>`<h3>${i+1}. ${esc(title)}</h3><p>${esc(body)}</p>`).join('')}</div><label class="market-check"><input id="market-terms-consent" type="checkbox"> Tôi đã đọc điều khoản, kiểm tra sản phẩm, phí vận chuyển, voucher và thông tin nhận hàng.</label><button id="market-place-order" class="btn btn-mint seo-note" type="button" onclick="placeMarketCartOrder()">Đồng ý và đặt hàng</button><p id="market-checkout-error" class="small"></p>`);
 }catch(e){toast(e.message,'error');}finally{b.disabled=false;}
}
async function placeMarketCartOrder(){
 const error=document.getElementById('market-checkout-error');
 if(!document.getElementById('market-terms-consent').checked){error.textContent='Vui lòng đồng ý điều khoản.';return;}
 if(marketCartBusy)return;marketCartBusy=true;
 const b=document.getElementById('market-place-order');b.disabled=true;
 try{
  const data=await marketPost('/api/market/cart/orders',{...marketCartCheckoutState.payload,accepted_terms:true});
  const ids=new Set(marketCartCheckoutState.lines.map(line=>line.product_id));
  writeMarketCart(readMarketCart().filter(line=>!ids.has(line.product_id)));
  sessionStorage.removeItem('dioralink_market_checkout');sessionStorage.removeItem('dioralink_market_cart_seller');
  closeModal();toast('Đã đặt hàng thành công.','success');navigate('market-order/'+data.order.id);
 }catch(e){error.textContent=e.message;b.disabled=false;}finally{marketCartBusy=false;}
}
