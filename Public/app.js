/* DioraLink application */

const CONFIG = {
  apiBase: window.DIORALINK_CONFIG?.apiBase || "",
  storageKey: "dioralink_state_v25_directpay",
  demoMode: window.DIORALINK_CONFIG?.demoMode ?? false,
  currency: "VND",
  googleClientId: window.DIORALINK_CONFIG?.googleClientId || "",
  facebookAppId: window.DIORALINK_CONFIG?.facebookAppId || ""
};

const SEED = {
  session: { authenticated: false, userId: null },
  user: {
    id: "USR-CUSTOMER-01", name: "Quỳnh Anh", email: "quynhanh@example.com", phone: "09xx xxx 888", city: "Hà Nội",
    role: "customer", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    bio: "Collector & miniature hobby enthusiast.", joined: "2024"
  },
  artisans: [
    {id:"A-001",name:"Đào Studio",handle:"@DaoStudio",city:"Hà Nội",verified:true,online:true,rating:4.9,reviews:42,completed:61,startingPrice:5000000,response:"< 2h",specialties:["Fantasy","Resin","Architecture"],bio:"Fantasy environments, resin water effects and atmospheric miniature scenes.",avatar:"https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",hero:"https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=1000&q=80",portfolio:["https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80"],paymentProfile:{method:"vietqr",bankName:"",accountName:"",accountNumber:"",qrImage:""}},
    {id:"A-002",name:"Quân Customs",handle:"@QuanCustoms",city:"TP. Hồ Chí Minh",verified:true,online:false,rating:4.8,reviews:31,completed:44,startingPrice:7000000,response:"< 6h",specialties:["Mecha","Gunpla","Miniature"],bio:"Custom mecha, display scenes and precision miniature fabrication.",avatar:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",hero:"https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=80",portfolio:["https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80"],paymentProfile:{method:"vietqr",bankName:"",accountName:"",accountNumber:"",qrImage:""}},
    {id:"A-003",name:"Lumino Craft",handle:"@LuminoCraft",city:"Đà Nẵng",verified:true,online:true,rating:4.7,reviews:27,completed:39,startingPrice:4500000,response:"< 4h",specialties:["Lighting","Fantasy","Resin"],bio:"Miniature lighting, resin scenes and cinematic display pieces.",avatar:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",hero:"https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=80",portfolio:["https://images.unsplash.com/photo-1518655048521-f130df041f66?auto=format&fit=crop&w=900&q=80","https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80"],paymentProfile:{method:"vietqr",bankName:"",accountName:"",accountNumber:"",qrImage:""}},
    {id:"A-004",name:"Gara Tí Hon",handle:"@GaraTiHon",city:"Hà Nội",verified:false,online:true,rating:4.6,reviews:19,completed:21,startingPrice:3000000,response:"< 1d",specialties:["Architecture","Miniature","Mecha"],bio:"Architectural miniature scenes, diorama structures and custom display bases.",avatar:"https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",hero:"https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80",portfolio:["https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"]}
  ],
  requests: [
    {
      id:"REQ-2026-001", customerId:"USR-CUSTOMER-01", title:"Elf Waterfall — Fantasy Diorama", style:"Fantasy", size:"40 × 30 × 30 cm", budget:35000000, timeline:"45 ngày",
      description:"Diorama fantasy với thác nước resin, cây cổ thụ, character elf và atmospheric lighting.", status:"proposal_received", createdAt:"2026-09-18", creatorMode:"matching", preferredArtisanId:null,
      attachments:[{name:"brief-v1.pdf",size:180000}], proposals:[
        {id:"PROP-001",requestId:"REQ-2026-001",artisanId:"A-001",quote:35000000,timeline:"48 ngày",message:"Mình đã xem brief. Concept phù hợp với hướng fantasy environment và resin water effect của studio.",deliverables:["Concept refinement","Base structure","Sculpt & composition","Paint & resin","Final assembly"],status:"pending",createdAt:"2026-09-18T09:30:00"}
      ]
    }
  ],
  projects: [
    {
      id:"DL-2026-009",requestId:"REQ-2026-DEMO",customerId:"USR-CUSTOMER-01",artisanId:"A-001",title:"Forest Shrine — Lighting Study",budget:28000000,progress:45,status:"in_production",currentMilestone:3,dueDate:"2026-10-27",
      milestones:[
        {id:"M1",name:"Concept & Scope",percentage:20,amount:5600000,status:"approved",evidence:"Concept v2 approved.",approvedAt:"2026-09-12"},
        {id:"M2",name:"Base & Structure",percentage:25,amount:7000000,status:"approved",evidence:"Base structure and first surface pass.",approvedAt:"2026-09-18"},
        {id:"M3",name:"Sculpt & Composition",percentage:20,amount:5600000,status:"submitted",evidence:"https://images.unsplash.com/photo-1526749837599-b4eba9fd855e?auto=format&fit=crop&w=900&q=80",approvedAt:null},
        {id:"M4",name:"Paint, Resin & Lighting",percentage:20,amount:5600000,status:"pending",evidence:"",approvedAt:null},
        {id:"M5",name:"Final Assembly & Delivery",percentage:15,amount:4200000,status:"pending",evidence:"",approvedAt:null}
      ],
      files:[{id:"FILE-01",name:"brief-v1.pdf",size:180000,uploader:"customer",time:"2026-09-10"},{id:"FILE-02",name:"concept-v2.jpg",size:820000,uploader:"artisan",time:"2026-09-12"}],
      messages:[{id:"MSG-01",senderId:"A-001",senderRole:"artisan",text:"Mình đã nhận brief và bắt đầu chuẩn bị phần composition.",time:"2026-09-12 10:30"},{id:"MSG-02",senderId:"USR-CUSTOMER-01",senderRole:"customer",text:"Ok anh, ưu tiên giữ mood ánh sáng ấm nhé.",time:"2026-09-12 11:05"}],
      payments:[
        {milestoneId:"M1",status:"confirmed",amount:5600000,customerPaid:5600000,discount:0,voucherCode:null,paidAt:"2026-09-12",confirmedAt:"2026-09-14",transferReference:"DL-DL-2026-009-M1"},
        {milestoneId:"M2",status:"confirmed",amount:7000000,customerPaid:7000000,discount:0,voucherCode:null,paidAt:"2026-09-18",confirmedAt:"2026-09-20",transferReference:"DL-DL-2026-009-M2"},
        
      ],
      activity:[{text:"Milestone M3 submitted for customer review",time:"2026-09-22 16:15"},{text:"M2 approved and direct payment confirmed",time:"2026-09-20 09:10"}]
    }
  ],
  vouchers:[
    {code:"DIORA10",type:"percent",value:10,maxDiscount:500000,minSpend:3000000,description:"Giảm 10%, tối đa 500.000₫"},
    {code:"MINT500",type:"fixed",value:500000,minSpend:5000000,description:"Giảm 500.000₫ cho đơn từ 5.000.000₫"},
    {code:"NEWUSER15",type:"percent",value:15,maxDiscount:1000000,minSpend:5000000,description:"Giảm 15%, tối đa 1.000.000₫"}
  ],
  notifications:[
    {id:"N-01",title:"Proposal mới",body:"@DaoStudio đã gửi proposal cho request Elf Waterfall.",time:"8 phút trước",route:"request/REQ-2026-001",read:false},
    {id:"N-02",title:"Milestone cần nghiệm thu",body:"M3 của Forest Shrine đang chờ bạn approval.",time:"2 giờ trước",route:"project/DL-2026-009",read:false}
  ],
  savedCreators:["A-001"]
};

const GUEST_USER={id:null,name:"Guest",email:"",phone:"",city:"",role:"customer",avatar:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",bio:""};
let state = loadState();
const publicArtisans = window.DIORALINK_PUBLIC_PAGE?.artisans || [];
for (const profile of publicArtisans) {
  const existing=state.artisans.find(a=>a.id===profile.id);
  if(existing) Object.assign(existing,{...profile,...existing,slug:profile.slug});
  else state.artisans.push({...profile,verified:false,rating:0,reviews:0,completed:0});
}
const restoreAdminOnLoad=state.user?.role==='admin'||location.hash.startsWith('#admin-');
if(!CONFIG.demoMode){ state.session={authenticated:false,userId:null}; state.user=clone(GUEST_USER); }
let explore = {query:"",category:"all",budget:50000000};
let mobileNavOpen = false;

let commissionConversations=[];
let commissionCustomers={};
let commissionSyncPromise=null;
let commissionWorkspaceUser='';
let activeConversationKey='';
const attachmentRegistry=new Map();

function isCommissionRoute(route=currentRoute()){
  return ['customer-dashboard','commission','requests','request','projects','project','messages','artisan-dashboard','artisan-requests','artisan-request','artisan-proposals','artisan-projects','artisan-project'].includes(route);
}
async function commissionApi(path,options={}){
  const init={credentials:'include',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}};
  const res=await fetch(apiURL('/api/commission'+path),init);
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.message||('Commission API error '+res.status));
  return data;
}
function registerAttachment(f){
  const key=String(f?.id||f?.storageId||('ATT-'+Math.random().toString(36).slice(2)));
  attachmentRegistry.set(key,f||{});
  return key;
}
async function downloadAttachmentRef(key){
  const f=attachmentRegistry.get(String(key));
  if(!f){toast('File is no longer available.','error');return;}
  if(f.dataUrl){
    const a=document.createElement('a');a.href=f.dataUrl;a.download=f.name||'download';document.body.appendChild(a);a.click();a.remove();return;
  }
  return downloadStoredFile(f.storageId||f.id,f.name||'download');
}
async function syncCommissionWorkspace({force=false,rerender=false}={}){
  if(CONFIG.demoMode||!isAuthenticated()||!['customer','artisan'].includes(currentRole()))return null;
  const key=state.user.id+'|'+currentRole();
  if(!force&&commissionWorkspaceUser===key&&commissionSyncPromise)return commissionSyncPromise;
  if(commissionSyncPromise&&commissionWorkspaceUser===key)return commissionSyncPromise;
  commissionWorkspaceUser=key;
  commissionSyncPromise=(async()=>{
    const data=await commissionApi('/workspace');
    state.requests=Array.isArray(data.requests)?data.requests:[];
    state.projects=Array.isArray(data.projects)?data.projects:[];
    commissionConversations=Array.isArray(data.conversations)?data.conversations:[];
    commissionCustomers=data.participants?.customers||{};
    for(const profile of data.participants?.artisans||[]){
      const existing=state.artisans.find(a=>a.id===profile.id);
      if(existing){
        const hero=existing.hero,portfolio=existing.portfolio,slug=existing.slug,paymentProfile=existing.paymentProfile;
        Object.assign(existing,profile);
        if(hero)existing.hero=hero;if(portfolio?.length)existing.portfolio=portfolio;if(slug)existing.slug=slug;if(paymentProfile)existing.paymentProfile=paymentProfile;
      }else state.artisans.push(profile);
    }
    save();
    if(rerender&&isCommissionRoute())render();
    return data;
  })().catch(err=>{console.error('COMMISSION SYNC ERROR',err);if(rerender)toast(err.message||'Không thể đồng bộ request/project.','warning');return null;}).finally(()=>{commissionSyncPromise=null;});
  return commissionSyncPromise;
}
function queueCommissionSync(){
  if(CONFIG.demoMode||!isAuthenticated()||!['customer','artisan'].includes(currentRole()))return;
  setTimeout(()=>syncCommissionWorkspace({force:true,rerender:isCommissionRoute()}),0);
}
async function persistProjectSnapshot(p){
  if(CONFIG.demoMode||!p?.id)return;
  try{await commissionApi('/projects/'+encodeURIComponent(p.id),{method:'PUT',body:JSON.stringify(p)});}
  catch(err){console.error('PROJECT SYNC ERROR',err);toast('Thay đổi đã lưu cục bộ nhưng chưa đồng bộ lên server.','warning');}
}

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function normalizeState(input){
  const base=clone(SEED);
  const source=(input&&typeof input==='object')?input:{};
  const out={...base,...source};
  out.user={...base.user,...(source.user||{})};
  out.session={...base.session,...(source.session||{})};
  const collections=['artisans','requests','projects','notifications','savedCreators','vouchers'];
  for(const key of collections){
    if(!Array.isArray(source[key])) out[key]=clone(base[key]||[]);
  }
  return out;
}
function loadState(){
  try{ const raw=localStorage.getItem(CONFIG.storageKey); if(raw) return normalizeState(JSON.parse(raw)); }catch(e){}
  return clone(SEED);
}
function save(){ try{ const snapshot=CONFIG.demoMode?state:{...state,requests:[],projects:[]}; localStorage.setItem(CONFIG.storageKey, JSON.stringify(snapshot)); refreshShell(); return true; }catch(e){ if(e?.name==='QuotaExceededError'||e?.code===22){ toast('Storage is full. Uploaded media is stored separately; please reload the page and try again.','warning'); return false; } throw e; } }
const FORM_DRAFT_PREFIX='dioralink_form_draft_v1';
function formDraftStorageKey(key){
  return FORM_DRAFT_PREFIX+':'+String(state.user?.id||'guest')+':'+String(key||'form');
}
function serializeDraftForm(form){
  const data={};
  const radioDone=new Set();
  for(const el of Array.from(form.elements||[])){
    if(!el.name||el.disabled||['file','password','submit','button','reset'].includes(String(el.type||'').toLowerCase()))continue;
    if(el.type==='radio'){
      if(radioDone.has(el.name))continue;
      radioDone.add(el.name);
      data[el.name]=form.querySelector(`[name="${CSS.escape(el.name)}"]:checked`)?.value??null;
    }else if(el.type==='checkbox'){
      data[el.name]=!!el.checked;
    }else if(el.tagName==='SELECT'&&el.multiple){
      data[el.name]=Array.from(el.selectedOptions).map(o=>o.value);
    }else{
      data[el.name]=el.value;
    }
  }
  return data;
}
function updateDraftStatus(form,message){
  const el=form?.querySelector?.('[data-autosave-status]');
  if(el)el.textContent=message;
}
function saveFormDraft(form){
  const key=form?.dataset?.autosaveKey;
  if(!key)return;
  try{
    localStorage.setItem(formDraftStorageKey(key),JSON.stringify({savedAt:new Date().toISOString(),values:serializeDraftForm(form)}));
    updateDraftStatus(form,'Đã tự động lưu · '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){
    updateDraftStatus(form,'Không thể tự động lưu trên thiết bị này.');
  }
}
function restoreFormDraft(form){
  if(!form?.dataset?.autosaveKey||form.dataset.draftRestored==='1')return;
  form.dataset.draftRestored='1';
  try{
    const raw=localStorage.getItem(formDraftStorageKey(form.dataset.autosaveKey));
    if(!raw){updateDraftStatus(form,'Tự động lưu đang bật.');return;}
    const draft=JSON.parse(raw);
    const values=draft?.values||{};
    for(const el of Array.from(form.elements||[])){
      if(!el.name||!(el.name in values)||['file','password','submit','button','reset'].includes(String(el.type||'').toLowerCase()))continue;
      const value=values[el.name];
      if(el.type==='radio')el.checked=el.value===value;
      else if(el.type==='checkbox')el.checked=!!value;
      else if(el.tagName==='SELECT'&&el.multiple){
        const selected=Array.isArray(value)?value:[];
        Array.from(el.options).forEach(o=>o.selected=selected.includes(o.value));
      }else if(value!==null&&value!==undefined)el.value=value;
    }
    updateDraftStatus(form,'Đã khôi phục bản nháp tự động'+(draft.savedAt?' · '+new Date(draft.savedAt).toLocaleString('vi-VN'):'')+'.');
  }catch(e){
    updateDraftStatus(form,'Tự động lưu đang bật.');
  }
}
function restoreDraftForms(root=document){
  root.querySelectorAll?.('form[data-autosave-key]').forEach(restoreFormDraft);
}
function clearFormDraft(keyOrForm){
  const key=typeof keyOrForm==='string'?keyOrForm:keyOrForm?.dataset?.autosaveKey;
  if(!key)return;
  try{localStorage.removeItem(formDraftStorageKey(key));}catch(e){}
}
document.addEventListener('input',event=>{
  const form=event.target?.closest?.('form[data-autosave-key]');
  if(form)saveFormDraft(form);
});
document.addEventListener('change',event=>{
  const form=event.target?.closest?.('form[data-autosave-key]');
  if(form)saveFormDraft(form);
});
const formDraftObserver=new MutationObserver(records=>{
  for(const record of records){
    for(const node of record.addedNodes){
      if(node.nodeType===1){
        if(node.matches?.('form[data-autosave-key]'))restoreFormDraft(node);
        restoreDraftForms(node);
      }
    }
  }
});
formDraftObserver.observe(document.body,{childList:true,subtree:true});
setTimeout(()=>restoreDraftForms(),0);

function openImagePreview(src,alt='Ảnh sản phẩm'){
  const root=document.getElementById('lightbox-root');
  if(!root||!src)return;
  root.innerHTML=`<div class="image-lightbox-backdrop" onclick="closeImagePreview(event)"><div class="image-lightbox" role="dialog" aria-modal="true" aria-label="${esc(alt)}" onclick="event.stopPropagation()"><button class="image-lightbox-close" type="button" onclick="closeImagePreview()" aria-label="Đóng ảnh"><i data-lucide="x"></i></button><img src="${esc(src)}" alt="${esc(alt)}"></div></div>`;
  document.body.classList.add('lightbox-open');
  window.lucide?.createIcons();
}
function closeImagePreview(event){
  if(event&&event.target!==event.currentTarget)return;
  const root=document.getElementById('lightbox-root');
  if(root)root.innerHTML='';
  document.body.classList.remove('lightbox-open');
}
document.addEventListener('click',event=>{
  const link=event.target?.closest?.('a[target="_blank"]');
  const image=link?.querySelector?.('img');
  if(link&&image){
    event.preventDefault();
    openImagePreview(link.href,image.alt||'Ảnh');
  }
});
function apiURL(path){ return (CONFIG.apiBase||"").replace(/\/$/,"")+path; }
function authUserFromArtisan(a,provider="demo"){ return {id:"USR-ARTISAN-01",name:a?.name||"Artisan",email:"artisan@example.com",phone:"",city:a?.city||"",role:"artisan",avatar:a?.avatar||GUEST_USER.avatar,bio:a?.bio||"",joined:"2026",artisanId:a?.id||"A-001",authenticated:true,provider}; }
function setGuest(){ state.session={authenticated:false,userId:null}; state.user=clone(GUEST_USER); commissionConversations=[];commissionCustomers={};commissionWorkspaceUser=''; save(); window.DioraAnalytics?.setContext({user_role:'guest'}); }
function isAuthenticated(){ return state.session?.authenticated===true && !!state.user?.id; }
function requireAuth(){ if(isAuthenticated()) return true; toast("Vui lòng đăng nhập để tiếp tục.","warning"); openAuthModal("login"); return false; }
function ensureCurrentArtisanProfile(){
  if(!isArtisan() || !state.user?.id) return null;

  const aid=`ART-${state.user.id}`;
  const rawName=String(state.user.name||'New Artisan').trim() || 'New Artisan';

  const handleBase=rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9]+/g,'')
    .toLowerCase()
    .slice(0,18) || 'artisan';

  if(!Array.isArray(state.artisans)){
    state.artisans=[];
  }

  let a=state.artisans.find(x=>x.id===aid);

  if(!a){
    a={
      id:aid,
      name:rawName,
      handle:'@'+handleBase,
      city:String(state.user.city||'').trim(),
      verified:false,
      online:true,
      rating:0,
      reviews:0,
      completed:0,
      startingPrice:3000000,
      response:'< 1d',
      specialties:[],
      bio:String(state.user.bio||'').trim(),
      avatar:state.user.avatar||GUEST_USER.avatar,
      hero:state.user.avatar||GUEST_USER.avatar,
      portfolio:[],
      paymentProfile:{
        method:'vietqr',
        bankName:'',
        accountName:rawName,
        accountNumber:'',
        qrImage:''
      }
    };

    state.artisans.push(a);
  }else{
    if(!a.slug){
      a.name=rawName;
      a.city=String(state.user.city||a.city||'').trim();
      a.bio=String(state.user.bio||a.bio||'').trim();
      a.avatar=state.user.avatar||a.avatar||GUEST_USER.avatar;
    }
    a.hero=a.hero||a.avatar||GUEST_USER.avatar;

    if(!a.handle){
      a.handle='@'+handleBase;
    }

    if(!Array.isArray(a.portfolio)){
      a.portfolio=[];
    }

    if(!a.paymentProfile){
      a.paymentProfile={
        method:'vietqr',
        bankName:'',
        accountName:rawName,
        accountNumber:'',
        qrImage:''
      };
    }
  }

  state.user.artisanId=aid;
  return a;
}

function applyAuthenticatedUser(u,provider='email'){
  state.user={
    ...state.user,
    ...(u||{}),
    authenticated:true,
    provider:provider||u?.provider||'email'
  };

  if(!Array.isArray(state.user.roles)||!state.user.roles.length){
    state.user.roles=[state.user.role].filter(Boolean);
  }

  state.session={
    authenticated:true,
    userId:state.user.id
  };

  if(state.user.role==='artisan'){
    ensureCurrentArtisanProfile();
  }

  save();
  window.DioraAnalytics?.setContext({user_role:['customer','artisan'].includes(state.user.role)?state.user.role:'guest'});
  queueCommissionSync();
}

function roleAfterLogin(role){
  const next=sessionStorage.getItem('dioralink_market_after_login');
  if(next && role==='customer' && /^(market-checkout|market-order)\/[a-f0-9-]+$/.test(next)){sessionStorage.removeItem('dioralink_market_after_login');return next;}
  if(next==='market-seller' && role==='artisan'){sessionStorage.removeItem('dioralink_market_after_login');return next;}
  return role==='artisan'?'artisan-dashboard':'customer-dashboard';
}
function resetDemo(){ localStorage.removeItem(CONFIG.storageKey); state=clone(SEED); navigate('home'); toast('Workspace reset.','success'); }
function money(n){ return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(n||0)); }
function dateTime(v){ try{return new Date(v).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return v||''} }
function dateOnly(v){ try{return new Date(v).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});}catch{return v||''} }
function esc(v){ const d=document.createElement('div'); d.textContent=v??''; return d.innerHTML; }
function artisanById(id){ return state.artisans.find(a=>a.id===id); }
function requestById(id){ return state.requests.find(r=>r.id===id); }
function projectById(id){ return state.projects.find(p=>p.id===id); }
function expireStaleCommissionRequests(){
  if(!CONFIG.demoMode)return false;
  const now=Date.now();
  let changed=false;
  for(const r of state.requests||[]){
    if(!['pending','proposal_received'].includes(r.status))continue;
    if(r.selectedProposal || state.projects.some(p=>p.requestId===r.id))continue;
    const created=new Date(r.createdAt).getTime();
    if(!Number.isFinite(created) || now-created < 72*60*60*1000)continue;

    r.status='expired';
    r.expiredAt=new Date().toISOString();
    r.cancelReason='AUTO_72H_NO_ACCEPTED_VALUE';
    for(const p of r.proposals||[]){
      if(p.status==='pending')p.status='expired';
    }
    if(isAuthenticated() && state.user.id===r.customerId && !r.expiryNotified){
      addNotification({
        title:'Yêu cầu đã tự động hủy',
        body:`${r.title} đã quá 3 ngày mà chưa có proposal được chấp nhận để tạo thành đơn có giá trị.`,
        route:`request/${r.id}`
      });
      r.expiryNotified=true;
    }
    changed=true;
  }
  if(changed)save();
  return changed;
}
function customerById(id){ return commissionCustomers[id] || (id===SEED.user.id ? SEED.user : (id==='USR-CUSTOMER-01' ? {name:'Quỳnh Anh',avatar:SEED.user.avatar,email:'quynhanh@example.com'} : {name:'Customer',avatar:'',email:''})); }
function isAdmin(){ return state.user?.role==='admin' && state.session?.authenticated===true; }
function currentRole(){ return state.user?.role||'guest'; }
function hasRole(role){ return Array.isArray(state.user?.roles)?state.user.roles.includes(role):currentRole()===role; }
function isCustomer(){ return currentRole()==='customer'; }
function isArtisan(){ return currentRole()==='artisan'; }
function requireAdmin(){ if(isAdmin()) return true; openAdminLogin(); return false; }
function statusLabel(s){ return ({proposal_received:'Proposal received',pending:'Pending',in_production:'In production',completed:'Completed',submitted:'Submitted',approved:'Approved',released:'Released',customer_reported:'Payment reported',confirmed:'Paid directly',awaiting_payment:'Awaiting payment',draft:'Draft',cancelled:'Cancelled',cancelled_by_customer:'Stopped by customer',expired:'Tự động hủy sau 3 ngày'})[s]||s; }
function pill(s){
  const cls=(s==='approved'||s==='released'||s==='confirmed'||s==='completed')?'pill-success':(s==='submitted'||s==='proposal_received'||s==='in_production'||s==='customer_reported')?'pill-mint':(s==='awaiting_payment'||s==='pending')?'pill-warning':'pill';
  return `<span class="pill ${cls}">${esc(statusLabel(s))}</span>`;
}

const NAV_PUBLIC=[
  ['home','Home','house'],['marketplace','Marketplace','store'],['services','Dịch vụ','layers'],['explore','Creators','compass'],['trust','Trust','badge-check']
];
const NAV_CUSTOMER=[
  ['marketplace','Marketplace','store'],['market-orders','Đơn mua','shopping-bag'],
  ['customer-dashboard','Dashboard','layout-dashboard'],['explore','Creators','compass'],['commission','New Commission','plus-circle'],['requests','Requests','file-text'],['projects','Projects','layers'],['messages','Messages','message-circle'],['complaints','Khiếu nại','shield-alert'],['saved','Saved','bookmark'],['account','Account','user']
];
const NAV_ARTISAN=[
  ['marketplace','Marketplace','store'],['market-seller','Gian hàng','package'],['market-sales','Đơn bán','shopping-bag'],
  ['artisan-dashboard','Dashboard','layout-dashboard'],['artisan-requests','Requests','inbox'],['artisan-proposals','Proposals','send'],['artisan-projects','Projects','layers'],['messages','Messages','message-circle'],['complaints','Khiếu nại','shield-alert'],['artisan-portfolio','Hồ sơ nghệ nhân','images'],['artisan-earnings','Earnings','wallet-cards'],['account','Account','user']
];
const NAV_ADMIN=[
  ['marketplace','Marketplace','store'],['admin-market','Kinh doanh Marketplace','chart-column'],
  ['admin-dashboard','Finance','wallet-cards'],['admin-analytics','Analytics','activity'],['admin-commissions','Commissions','receipt-text'],['admin-complaints','Khiếu nại','shield-alert'],['admin-notifications','Notifications','bell']
];

function routeParts(){
  const route=location.hash.replace(/^#/,'').trim() || window.DIORALINK_PUBLIC_PAGE?.route || 'home';
  return route.split('/');
}
function currentRoute(){ return routeParts()[0]; }
function routeURL(route){
  const paths={home:'/',explore:'/nghe-nhan',trust:'/quy-trinh',services:'/dich-vu',marketplace:'/marketplace'};
  if(paths[route]) return paths[route];
  if(route.startsWith('service/'))return '/dich-vu/'+encodeURIComponent(route.slice(8));
  if(route.startsWith('creator/')){
    const a=publicArtisans.find(a=>a.id===route.slice(8));
    if(a)return '/nghe-nhan/'+a.slug;
  }
  return '/ung-dung#'+route;
}
function navigate(route){
  const target=routeURL(route);
  if(target===location.pathname+location.hash){render();return;}
  if(target.startsWith('/ung-dung#') && location.pathname==='/ung-dung') location.hash=route;
  else location.assign(target);
}
function filterPublicCreators(query){
  const q=query.trim().toLocaleLowerCase('vi');let count=0;
  document.querySelectorAll('[data-creator-search]').forEach(el=>{el.hidden=!el.dataset.creatorSearch.includes(q);if(!el.hidden)count++;});
  const empty=document.getElementById('public-search-empty');if(empty)empty.hidden=count>0;
}
function requireRole(role){ if(!requireAuth()) return false; if(currentRole()!==role){ toast('Khu vực này thuộc role '+(role==='customer'?'Customer':'Artisan')+'.','error'); navigate(role==='customer'?'home':'artisan-dashboard'); return false;} return true; }
function roleNav(){ return isAdmin()?NAV_ADMIN:(isAuthenticated()?(isCustomer()?NAV_CUSTOMER:NAV_ARTISAN):NAV_PUBLIC); }
function navButton(route,label,icon){ const active=currentRoute()===route; return `<a class="nav-btn ${active?'active':''}" href="${routeURL(route)}"><i data-lucide="${icon}" style="width:14px;vertical-align:-3px;margin-right:5px"></i>${t(label)}</a>`; }
function navMenuItem(route,label,icon){
  const active=currentRoute()===route;
  return `<a class="nav-menu-item ${active?'active':''}" href="${routeURL(route)}"><i data-lucide="${icon}"></i><span>${t(label)}</span></a>`;
}
function toggleDesktopNavMenu(){
  const menu=document.getElementById('desktop-nav-menu');
  const trigger=document.getElementById('desktop-nav-trigger');
  if(!menu)return;
  const open=menu.hidden;
  menu.hidden=!open;
  trigger?.setAttribute('aria-expanded',open?'true':'false');
}
function closeDesktopNavMenu(){
  const menu=document.getElementById('desktop-nav-menu');
  const trigger=document.getElementById('desktop-nav-trigger');
  if(menu)menu.hidden=true;
  trigger?.setAttribute('aria-expanded','false');
}
function headerTab(route,label,icon){
  const active=currentRoute()===route;
  return `<a class="radio-nav-item ${active?'active':''}" href="${routeURL(route)}"><span class="pre-name"></span><span class="pos-name"></span><span class="radio-nav-label"><i data-lucide="${icon}"></i>${t(label)}</span></a>`;
}
function renderTopNav(){
  const nav=roleNav();
  const top=document.getElementById('top-nav');
  if(!top)return;

  if(!isAuthenticated() && !isAdmin()){
    top.className='nav';
    top.innerHTML=nav.map(x=>navButton(...x)).join('');
  }else{
    top.className='nav radio-inputs';
    const visibleRoutes=isAdmin()
      ? ['marketplace','admin-dashboard']
      : isCustomer()
        ? ['marketplace','explore','customer-dashboard']
        : ['marketplace','explore','artisan-dashboard','artisan-portfolio'];

    const visible=visibleRoutes.map(route=>nav.find(x=>x[0]===route)).filter(Boolean);
    const secondary=nav.filter(x=>!visibleRoutes.includes(x[0]));

    top.innerHTML=`
      ${visible.map(x=>headerTab(...x)).join('')}
      <details class="radio-menu-wrap">
        <summary class="radio-nav-item radio-menu-trigger" aria-label="Mở menu">
          <span class="radio-nav-label"><i data-lucide="menu"></i>Menu<i data-lucide="chevron-down" class="header-menu-chevron"></i></span>
        </summary>
        <div class="header-menu-dropdown">
          <div class="header-menu-title">${isAdmin()?'Admin':isCustomer()?t('Customer'):t('Artisan')}</div>
          ${secondary.map(x=>navMenuItem(...x)).join('')}
          ${isArtisan()?(() => {
            const me=artisanById(state.user.artisanId);
            return `<div class="header-menu-divider"></div>
              <a class="nav-menu-item profile-public-link" href="/ung-dung#artisan-portfolio"><i data-lucide="user-round-cog"></i><span>Chỉnh sửa hồ sơ của tôi</span></a>
              ${me?.slug?`<a class="nav-menu-item profile-public-link" href="/nghe-nhan/${esc(me.slug)}"><i data-lucide="external-link"></i><span>Xem hồ sơ công khai</span></a>`:''}`;
          })():''}
          ${!isAdmin()?(() => {
            const other=isCustomer()?'artisan':'customer';
            const enabled=hasRole(other);
            const label=other==='artisan'?'Nghệ nhân':'Khách hàng';
            return `<div class="header-menu-divider"></div><button class="nav-menu-item role-switch-action" type="button" onclick="activateRole('${other}',${enabled?'false':'true'})"><i data-lucide="${enabled?'repeat-2':'user-plus'}"></i><span>${enabled?'Chuyển sang ':'Trở thành '}${label}</span></button>`;
          })():''}
        </div>
      </details>`;
  }

  const mobile=document.getElementById('mobile-nav');
  if(mobile)mobile.innerHTML=`<div style="display:grid;gap:5px">${nav.map(x=>`<a class="side-link" href="${routeURL(x[0])}"><i data-lucide="${x[2]}" style="width:15px"></i>${t(x[1])}</a>`).join('')}${isArtisan()?`<a class="side-link" href="/ung-dung#artisan-portfolio"><i data-lucide="user-round-cog" style="width:15px"></i>Hồ sơ của tôi</a>`:''}</div>`;
}
function refreshShell(){
  renderTopNav();
  const actions=document.getElementById('auth-header-actions');
  if(actions){
    if(isAdmin()){
      actions.innerHTML=`<button class="icon-btn" onclick="openAdminNotifications()" title="Notifications"><i data-lucide="bell"></i><span id="notif-dot" class="dot" hidden></span></button><span class="role-badge">Admin</span><button class="btn btn-sm btn-danger" onclick="adminLogout()">Logout</button>`;
    }else if(isAuthenticated()){
      actions.innerHTML=`<button class="icon-btn" onclick="openNotifications()" title="Notifications"><i data-lucide="bell"></i><span id="notif-dot" class="dot" hidden></span></button><button class="icon-btn" onclick="openAccountMenu()" title="Tài khoản"><img id="header-avatar" class="avatar" alt="Avatar" ${mediaAttrs(state.user.avatar,state.user.avatarFallback||GUEST_USER.avatar)}></button>`;
      const dot=document.getElementById('notif-dot'); if(dot) dot.hidden=!state.notifications.some(n=>!n.read);
    }else{
      actions.innerHTML=`<button class="btn btn-sm" onclick="openAuthModal('login')">Sign in</button><button class="btn btn-sm btn-mint" onclick="openAuthModal('register')">Register</button>`;
    }
  }
  window.lucide?.createIcons(); hydrateMediaAssets();
}
function toggleMobileNav(){ mobileNavOpen=!mobileNavOpen; document.getElementById('mobile-nav').style.display=mobileNavOpen?'block':'none'; }
const currentLanguage='vi';
try{localStorage.removeItem('dioralink_language');}catch(e){}
const I18N={
  en:{},
  vi:{
    'Miniature commission platform':'Nền tảng đặt làm mô hình thu nhỏ',
    'Custom miniature & diorama commissions.':'Đặt làm mô hình thu nhỏ & diorama theo yêu cầu.',
    'Explore':'Khám phá','Creators':'Nghệ nhân','Trust':'Tin cậy','Account':'Tài khoản','Sign in':'Đăng nhập','Register':'Đăng ký',
    'Support':'Hỗ trợ','Help center':'Trung tâm trợ giúp','Terms':'Điều khoản','Privacy':'Bảo mật','All rights reserved.':'Bảo lưu mọi quyền.',
    'Home':'Trang chủ','Dashboard':'Bảng điều khiển','New Commission':'Đơn đặt mới','Requests':'Yêu cầu','Projects':'Dự án','Messages':'Tin nhắn','Saved':'Đã lưu',
    'Creators':'Nghệ nhân','Proposal received':'Đã nhận đề xuất','In production':'Đang sản xuất','Payment reported':'Đã báo thanh toán','Paid directly':'Đã thanh toán trực tiếp',
    'Awaiting payment':'Chờ thanh toán','Stopped by customer':'Khách hàng dừng dự án','Verified':'Đã xác minh','Discovery':'Khám phá','Featured artisans':'Nghệ nhân nổi bật',
    'DISCOVER CRAFT':'KHÁM PHÁ TAY NGHỀ','View all':'Xem tất cả','View profile':'Xem hồ sơ','from':'từ','Save creator':'Lưu nghệ nhân','Saved creator':'Đã lưu nghệ nhân',
    'EXPLORE CREATORS':'KHÁM PHÁ NGHỆ NHÂN','Search':'Tìm kiếm','Style':'Phong cách','Budget':'Ngân sách','Creator / specialty':'Nghệ nhân / chuyên môn',
    'No messages yet.':'Chưa có tin nhắn.','No conversations.':'Chưa có cuộc trò chuyện nào.','No notifications.':'Chưa có thông báo.',
    'Account':'Tài khoản','PROFILE & SETTINGS':'HỒ SƠ & CÀI ĐẶT','Change avatar':'Đổi ảnh đại diện','Name':'Họ tên','Phone':'Số điện thoại','City':'Thành phố','Bio':'Giới thiệu',
    'Save changes':'Lưu thay đổi','Security':'Bảo mật','ACCOUNT SECURITY':'BẢO MẬT TÀI KHOẢN','Role':'Vai trò','Provider':'Phương thức đăng nhập','Change password':'Đổi mật khẩu','Log out':'Đăng xuất','Logout':'Đăng xuất',
    'Customer':'Khách hàng','Artisan':'Nghệ nhân','Create account':'Tạo tài khoản','Join DioraLink':'Tham gia DioraLink','Welcome back':'Chào mừng trở lại','Account type':'Loại tài khoản','Sign in as':'Đăng nhập với vai trò',
    'Start a Commission':'Bắt đầu đặt làm','Request Inbox':'Hộp thư yêu cầu','YOUR PROPOSAL':'ĐỀ XUẤT CỦA BẠN','CREATE PROPOSAL':'TẠO ĐỀ XUẤT',
    'Publish request':'Đăng yêu cầu','Request published':'Đã đăng yêu cầu','Commission request published.':'Đã đăng yêu cầu đặt làm.','Specific artisan':'Nghệ nhân cụ thể','Open matching':'Tìm nghệ nhân phù hợp',
    'Open matching to qualified artisans':'Mở yêu cầu cho các nghệ nhân phù hợp','New Commission':'Đơn đặt mới','Project created':'Đã tạo dự án','Project stopped':'Đã dừng dự án',
    'No projects yet.':'Chưa có dự án nào.','No projects assigned yet.':'Chưa có dự án nào được giao.','Project not found.':'Không tìm thấy dự án.','Project unavailable.':'Không thể mở dự án.',
    'Progress':'Tiến độ','Current stage':'Giai đoạn hiện tại','Due':'Hạn hoàn thành','Due date not set':'Chưa đặt hạn hoàn thành','Open project →':'Mở dự án →','Files & activity':'Tệp & hoạt động',
    'No files yet.':'Chưa có tệp.','No files':'Không có tệp','Upload file':'Tải tệp lên','Write a message or attach a file.':'Viết tin nhắn hoặc đính kèm tệp.',
    'Each attachment must be 20MB or smaller.':'Mỗi tệp đính kèm không được vượt quá 20MB.','File uploaded.':'Đã tải tệp lên.','Unable to send attachment.':'Không thể gửi tệp đính kèm.',
    'VOUCHER CODE':'MÃ VOUCHER','Voucher code':'Mã voucher','Voucher removed.':'Đã xoá voucher.','Mã voucher không hợp lệ.':'Mã voucher không hợp lệ.',
    'Terms of service':'Điều khoản dịch vụ','Use of DioraLink is subject to the project scope, payment terms and platform rules agreed by the parties.':'Việc sử dụng DioraLink tuân theo phạm vi dự án, điều khoản thanh toán và quy tắc nền tảng do các bên thỏa thuận.',
    'Password reset link sent.':'Đã gửi liên kết đặt lại mật khẩu.','Unable to send reset link.':'Không thể gửi liên kết đặt lại mật khẩu.',
    'Signed in.':'Đăng nhập thành công.','Signed out.':'Đã đăng xuất.','Signed out on this device.':'Đã đăng xuất trên thiết bị này.',
    'Invalid email or password.':'Email hoặc mật khẩu không chính xác.','Password must be at least 8 characters.':'Mật khẩu phải có ít nhất 8 ký tự.',
    'New passwords do not match.':'Mật khẩu mới không khớp.','Current password is incorrect.':'Mật khẩu hiện tại không chính xác.','Password updated.':'Đã cập nhật mật khẩu.',
    'Account created.':'Đã tạo tài khoản.','Unable to create account.':'Không thể tạo tài khoản.','Đăng ký thất bại.':'Đăng ký thất bại.','Đăng nhập thất bại.':'Đăng nhập thất bại.',
    'Signed in with Google.':'Đã đăng nhập bằng Google.','Signed in with Facebook.':'Đã đăng nhập bằng Facebook.','Google authentication failed':'Xác thực Google thất bại','Facebook authentication failed':'Xác thực Facebook thất bại',
    'Session restore failed:':'Không thể khôi phục phiên đăng nhập:','Logout request failed.':'Yêu cầu đăng xuất thất bại.','Storage is full. Uploaded media is stored separately; please reload the page and try again.':'Bộ nhớ đầy. Tệp phương tiện đã tải lên được lưu riêng; hãy tải lại trang và thử lại.',
    'Please confirm the no-refund warning.':'Vui lòng xác nhận cảnh báo không hoàn tiền.','Project stopped. Paid amounts remain non-refundable.':'Đã dừng dự án. Các khoản đã thanh toán không được hoàn lại.',
    'Milestone started.':'Đã bắt đầu milestone.','Milestone submitted':'Đã gửi milestone','Sent for review.':'Đã gửi để nghiệm thu.','Milestone approved':'Milestone đã được duyệt',
    'Confirm the previous milestone payment before starting this stage.':'Hãy xác nhận thanh toán milestone trước trước khi bắt đầu giai đoạn này.','Add progress evidence before submitting.':'Hãy thêm bằng chứng tiến độ trước khi gửi.',
    'DIRECT PAYMENTS':'THANH TOÁN TRỰC TIẾP','Payment details':'Thông tin thanh toán','Payment QR':'QR thanh toán','Payment QR removed.':'Đã xoá QR thanh toán.','Payment details saved.':'Đã lưu thông tin thanh toán.',
    'Bank name':'Tên ngân hàng','Account holder':'Chủ tài khoản','Account number':'Số tài khoản','Personal QR image':'Ảnh QR cá nhân',
    'Customers pay directly to your bank account. Add the QR code and transfer details you want displayed at checkout.':'Khách hàng thanh toán trực tiếp vào tài khoản ngân hàng của bạn. Hãy thêm mã QR và thông tin chuyển khoản hiển thị khi thanh toán.',
    'Portfolio updated.':'Đã cập nhật portfolio.','Profile published.':'Đã công khai hồ sơ.','Not verified':'Chưa xác minh','Portfolio':'Portfolio','Add work':'Thêm tác phẩm','Remove':'Xoá',
    'Your Studio':'Studio của bạn','Response time':'Thời gian phản hồi','Earnings':'Thu nhập','Proposals':'Đề xuất',
    'Proposal already sent.':'Đã gửi đề xuất trước đó.','Select at least one deliverable.':'Hãy chọn ít nhất một hạng mục bàn giao.','Proposal sent':'Đã gửi đề xuất','Proposal sent.':'Đã gửi đề xuất.',
    'Waiting for proposals.':'Đang chờ các đề xuất.','Waiting for proposals':'Đang chờ các đề xuất.','No matching requests.':'Không có yêu cầu phù hợp.',
    'No proposals yet.':'Chưa có đề xuất nào.','No projects assigned yet.':'Chưa có dự án nào được giao.','Basic identity / profile completeness':'Thông tin cơ bản / độ hoàn thiện hồ sơ',
    'Public project history and selected works':'Lịch sử dự án công khai và tác phẩm tiêu biểu','Customer feedback linked to completed work':'Phản hồi khách hàng gắn với dự án đã hoàn thành',
    'Direct request for specific artisan':'Yêu cầu trực tiếp tới nghệ nhân cụ thể','Open matching request':'Mở yêu cầu tìm nghệ nhân phù hợp',
    'Start a Commission':'Bắt đầu đặt làm','Open project →':'Mở dự án →','Back':'Quay lại','Keep project':'Giữ dự án','Stop project':'Dừng dự án',
    'You are about to stop production at this stage. The project will not continue to later milestones.':'Bạn sắp dừng sản xuất tại giai đoạn này. Dự án sẽ không tiếp tục sang các milestone sau.',
    'Important:':'Quan trọng:','payments already made or transferred directly to the artisan are non-refundable.':'các khoản đã thanh toán hoặc chuyển trực tiếp cho nghệ nhân sẽ không được hoàn lại.',
    'I understand that stopping the project does not create a refund.':'Tôi hiểu rằng việc dừng dự án không tạo quyền hoàn tiền.',
    'Pay direct to artisan ·':'Thanh toán trực tiếp cho nghệ nhân ·','Paid directly to artisan':'Đã thanh toán trực tiếp cho nghệ nhân','Payment reported · awaiting artisan confirmation.':'Đã báo thanh toán · đang chờ nghệ nhân xác nhận.',
    'Artisan has not configured a payment method yet.':'Nghệ nhân chưa cấu hình phương thức thanh toán.','Enter the transfer reference.':'Nhập mã tham chiếu giao dịch.','Payment proof must be 5MB or smaller.':'Ảnh chứng từ thanh toán không được vượt quá 5MB.',
    'Payment reported to the artisan.':'Đã báo thanh toán cho nghệ nhân.','Payment confirmed':'Đã xác nhận thanh toán','Payment confirmed.':'Đã xác nhận thanh toán.','No payment report to confirm.':'Không có báo cáo thanh toán để xác nhận.',
    'Vui lòng đăng nhập để tiếp tục.':'Vui lòng đăng nhập để tiếp tục.','Khu vực này thuộc role ':'Khu vực này thuộc vai trò ',
    'Request not found.':'Không tìm thấy yêu cầu.','Unknown artisan':'Không xác định được nghệ nhân','Artisan not found.':'Không tìm thấy nghệ nhân.',
    'Proposal accepted → Project created':'Đã chấp nhận đề xuất → Đã tạo dự án','Proposal accepted. Project created.':'Đã chấp nhận đề xuất. Đã tạo dự án.',
    'No matching requests.':'Không có yêu cầu phù hợp.','File storage is unavailable in this browser.':'Bộ nhớ tệp không khả dụng trên trình duyệt này.',
    'Unable to open file storage.':'Không thể mở bộ nhớ tệp.','Unable to save file.':'Không thể lưu tệp.','File is no longer available.':'Tệp không còn khả dụng.','Unable to download file.':'Không thể tải tệp xuống.',
    'Avatar must be 3MB or smaller.':'Ảnh đại diện không được vượt quá 3MB.','Avatar must be 5MB or smaller.':'Ảnh đại diện không được vượt quá 5MB.','Avatar must be an image.':'Ảnh đại diện phải là tệp hình ảnh.',
    'Cover image must be 5MB or smaller.':'Ảnh cover không được vượt quá 5MB.','QR image must be 5MB or smaller.':'Ảnh QR không được vượt quá 5MB.','Portfolio image must be 5MB or smaller.':'Ảnh portfolio không được vượt quá 5MB.',
    'Name is required.':'Họ tên là bắt buộc.','Unable to process avatar image.':'Không thể xử lý ảnh đại diện.','Unable to read avatar image.':'Không thể đọc ảnh đại diện.','Unable to read avatar file.':'Không thể đọc tệp ảnh đại diện.',
    'Unable to update profile.':'Không thể cập nhật hồ sơ.','Profile updated.':'Đã cập nhật hồ sơ.','Update password':'Cập nhật mật khẩu','Unable to update password.':'Không thể cập nhật mật khẩu.',
    'Workspace reset.':'Đã đặt lại workspace.','Workspace switched to ':'Đã chuyển workspace sang ',
    'Mỗi ảnh không được vượt quá 8MB.':'Mỗi ảnh không được vượt quá 8MB.','Vui lòng gửi ít nhất một hình ảnh tham khảo.':'Vui lòng gửi ít nhất một hình ảnh tham khảo.',
    'Chỉ chấp nhận file hình ảnh ở Reference images.':'Chỉ chấp nhận tệp hình ảnh ở Reference images.','Hãy chọn artisan cụ thể hoặc chuyển sang Open matching.':'Hãy chọn nghệ nhân cụ thể hoặc chuyển sang Tìm nghệ nhân phù hợp.',
    'Gara Tí Hon':'Gara Tí Hon',
    'Finance':'Tài chính','Commissions':'Hoa hồng','Notifications':'Thông báo','Admin':'Quản trị','Admin sign in':'Đăng nhập quản trị','Admin email':'Email quản trị','Admin password':'Mật khẩu quản trị','Sign in to Admin':'Đăng nhập Admin','Admin signed in.':'Đã đăng nhập Admin.','Admin signed out.':'Đã đăng xuất Admin.','PLATFORM FINANCE':'TÀI CHÍNH NỀN TẢNG','Gross transaction value':'Tổng giá trị giao dịch','Platform commission':'Hoa hồng nền tảng','Commission unpaid':'Hoa hồng chưa thu','Commission collected':'Hoa hồng đã thu','Latest transactions':'Giao dịch gần đây','COMMISSION LEDGER':'SỔ HOA HỒNG','View all':'Xem tất cả','Artist net':'Nghệ nhân thực nhận','Collected':'Đã thu','Unpaid':'Chưa thu','Mark collected':'Đánh dấu đã thu','No commission records yet.':'Chưa có giao dịch hoa hồng.','NOTIFICATIONS':'THÔNG BÁO','Loading finance...':'Đang tải tài chính...','Loading...':'Đang tải...','Platform commission marked as collected.':'Đã đánh dấu hoa hồng nền tảng đã thu.','Could not record platform commission.':'Không thể ghi nhận hoa hồng nền tảng.','Payment confirmed. Platform fee ':'Đã xác nhận thanh toán. Phí nền tảng ',
  }
};
function t(value){
  const s=String(value??'');
  return I18N.vi[s] ?? s;
}
function applyLanguage(){
  if(typeof document==='undefined') return;
  const root=document.body;
  const skip=new Set(['SCRIPT','STYLE','NOSCRIPT']);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  let node;
  while(node=walker.nextNode()){
    if(skip.has(node.parentElement?.tagName)) continue;
    const raw=node.nodeValue;
    const trimmed=raw.trim();
    if(!trimmed) continue;
    nodes.push({node,raw,trimmed});
  }
  nodes.forEach(({node,raw,trimmed})=>{
    const translated=t(trimmed);
    if(translated!==trimmed){
      node.nodeValue=raw.replace(trimmed,translated);
    }
  });
  document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{
    for(const attr of ['placeholder','title','aria-label']){
      if(el.hasAttribute(attr)){
        const val=el.getAttribute(attr)||''; const translated=t(val); if(translated!==val) el.setAttribute(attr,translated);
      }
    }
  });
  document.documentElement.lang='vi';
}
const I18NObserver=new MutationObserver(()=>{ if(!window.__i18nApplying){ window.__i18nApplying=true; requestAnimationFrame(()=>{try{applyLanguage();}finally{window.__i18nApplying=false;}}); } });
function initI18N(){
  document.documentElement.lang='vi';
  I18NObserver.observe(document.body,{childList:true,subtree:true});
  applyLanguage();
}

window.addEventListener('hashchange', render);

function render(){
  expireStaleCommissionRequests();
  const incoming=location.hash.replace(/^#/,'').trim();
  if(incoming){
    const target=routeURL(incoming);
    if(target!==location.pathname+location.hash){location.replace(target);return;}
  }
  refreshShell();
  // Keep the exact server-rendered public content and metadata for users and crawlers.
  if(location.pathname!=='/ung-dung' && window.DIORALINK_PUBLIC_PAGE){
    hydrateMediaAssets();applyLanguage();return;
  }
  document.querySelector('meta[name="robots"]')?.setAttribute('content','noindex,follow');
  const [route,param]=routeParts();
  if(!isAuthenticated() && ['market-checkout','market-order','market-seller'].includes(route))sessionStorage.setItem('dioralink_market_after_login',route+(param?'/'+param:''));
  const protectedCustomer=['market-checkout','market-orders','customer-dashboard','commission','requests','request','projects','project','saved'];
  if(protectedCustomer.includes(route) && !requireRole('customer')) return;
  const protectedArtisan=['market-seller','market-sales','artisan-dashboard','artisan-requests','artisan-request','artisan-proposals','artisan-projects','artisan-project','artisan-portfolio','artisan-earnings'];
  if(protectedArtisan.includes(route) && !requireRole('artisan')) return;
  const protectedAdmin=['admin-market','admin-market-order','admin-dashboard','admin-analytics','admin-commissions','admin-complaints','admin-notifications'];
  if(protectedAdmin.includes(route) && !requireAdmin()) return;
  if(route==='complaints' && !requireAuth())return;
  if(route==='messages' && (!requireAuth() || !['customer','artisan'].includes(currentRole())))return;
  if(route==='market-order' && !requireAuth())return;
  const map={'market-checkout':()=>renderMarketCheckout(param),'market-orders':()=>renderMarketOrders(false),'market-sales':()=>renderMarketOrders(true),'market-order':()=>renderMarketOrder(param),'market-seller':renderMarketSeller,'admin-market':renderMarketAdmin,'admin-market-order':()=>renderMarketOrder(param,true),home:renderHome,'customer-dashboard':renderCustomerDashboard,explore:renderExplore,creator:()=>renderCreator(param),commission:renderCommission,requests:renderRequests,request:()=>renderRequest(param),projects:renderProjects,project:()=>renderProject(param),messages:renderMessages,complaints:renderComplaints,saved:renderSaved,account:renderAccount,trust:renderTrust,
    'artisan-dashboard':renderArtisanDashboard,'artisan-requests':renderArtisanRequests,'artisan-request':()=>renderArtisanRequest(param),'artisan-proposals':renderArtisanProposals,'artisan-projects':renderArtisanProjects,'artisan-project':()=>renderArtisanProject(param),'artisan-portfolio':renderArtisanPortfolio,'artisan-earnings':renderArtisanEarnings,
    'admin-dashboard':renderAdminDashboard,'admin-analytics':renderAdminAnalytics,'admin-commissions':renderAdminCommissions,'admin-complaints':renderAdminComplaints,'admin-notifications':renderAdminNotifications};
  (map[route]||renderHome)();
  refreshShell();
  window.scrollTo({top:0,behavior:'instant'});
  applyLanguage();
}

function renderHome(){
  const featured=state.artisans.filter(a=>a.verified).slice(0,4);
  const activeCount=state.projects.filter(p=>p.status==='in_production').length;
  document.getElementById('app').innerHTML=`
    <section class="page">
      <div class="hero">
        <div class="hero-main">
          <div class="eyebrow">COMMISSION PLATFORM</div>
          <h1 class="hero-title display">From brief<br>to crafted.</h1>
          <p class="hero-copy">Commission miniature & diorama theo quy trình rõ ràng từ brief đến bàn giao.</p>
          <div class="hero-cta">
            <button class="btn btn-mint" onclick="${isCustomer()?"navigate('commission')":"navigate('artisan-requests')"}">${isCustomer()?'Start a Commission':'Request Inbox'} <i data-lucide="arrow-up-right" style="width:15px;vertical-align:-3px"></i></button>
            <button class="btn" onclick="navigate('explore')">Creators</button>
          </div>
          
        </div>
        <div class="hero-side">
          <div class="hero-art">
            <div style="background-image:url('https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=80')"></div>
            <div style="background-image:url('https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=80')"></div>
          </div>
          <div class="grid three">
            <div class="stat-box"><div class="stat-num">${state.artisans.length}</div><div class="stat-label">Artisans</div></div>
            <div class="stat-box"><div class="stat-num">${state.requests.length}</div><div class="stat-label">Requests</div></div>
            <div class="stat-box"><div class="stat-num">${activeCount}</div><div class="stat-label">Active projects</div></div>
          </div>
        </div>
      </div>

      <div class="section-head"><div><div class="eyebrow">DioraLink</div><div class="section-title">FROM BRIEF TO DELIVERY</div></div></div>
      <div class="grid four">
        ${[['01','Brief'],['02','Proposal'],['03','Project'],['04','Delivery']].map(x=>`<div class="card pad"><div class="eyebrow">${x[0]}</div><h3 style="margin-top:8px;font-size:20px;text-transform:uppercase">${x[1]}</h3></div>`).join('')}
      </div>

      <div class="section-head"><div><div class="eyebrow">Featured artisans</div><div class="section-title">DISCOVER CRAFT</div></div><button class="btn btn-sm" onclick="navigate('explore')">View all</button></div>
      <div class="creator-grid">${featured.map(renderCreatorCard).join('')}</div>
    </section>`;
}

function renderCreatorCard(a){
  const saved=state.savedCreators.includes(a.id);
  return `<article class="card creator-card">
    <div class="creator-cover"><img ${mediaAttrs(a.hero,a.heroFallback||'')} alt="${esc(a.name)}"><button class="icon-btn" style="position:absolute;right:10px;top:10px;background:rgba(4,17,23,.58)" onclick="toggleSaved('${a.id}')"><i data-lucide="${saved?'bookmark-check':'bookmark'}" style="width:16px"></i></button>${a.verified?'<span class="pill pill-success" style="position:absolute;left:10px;bottom:10px">Verified</span>':''}</div>
    <div class="creator-body">
      <div class="between"><div><div class="creator-name">${esc(a.name)}</div><div class="creator-handle">${esc(a.handle)} · ${esc(a.city)}</div></div><div class="rating">★ ${a.rating}</div></div>
      <p class="body" style="margin-top:12px;min-height:43px">${esc(a.bio)}</p>
      <div class="wrap" style="margin-top:12px">${a.specialties.slice(0,3).map(s=>`<span class="pill">${esc(s)}</span>`).join('')}</div>
      <div class="between" style="margin-top:15px"><span class="tiny muted">from ${money(a.startingPrice)}</span><a class="btn btn-sm btn-mint" href="${routeURL('creator/'+a.id)}">View profile</a></div>
    </div>
  </article>`;
}
function toggleSaved(id){ if(state.savedCreators.includes(id)) state.savedCreators=state.savedCreators.filter(x=>x!==id); else state.savedCreators.push(id); save(); render(); }

function renderExplore(){
  let list=state.artisans.filter(a=>{
    const q=explore.query.trim().toLowerCase();
    const qm=!q||a.name.toLowerCase().includes(q)||a.handle.toLowerCase().includes(q)||a.specialties.join(' ').toLowerCase().includes(q);
    const cm=explore.category==='all'||a.specialties.some(s=>s.toLowerCase()===explore.category.toLowerCase());
    const bm=a.startingPrice<=explore.budget; return qm&&cm&&bm;
  });
  document.getElementById('app').innerHTML=`<section class="page">
    <div class="section-head"><div><div class="eyebrow">Discovery</div><div class="section-title">EXPLORE CREATORS</div></div><button class="btn" onclick="navigate('trust')">Trust</button></div>
    <div class="layout">
      <aside class="sidebar card pad">
        <div class="label">Search</div><input class="field" value="${esc(explore.query)}" oninput="explore.query=this.value;renderExplore()" placeholder="Creator / specialty">
        <div class="divider"></div><div class="label">Style</div><div class="wrap">${['all','Fantasy','Resin','Mecha','Gunpla','Miniature','Architecture','Lighting'].map(x=>`<button class="pill ${explore.category.toLowerCase()===x.toLowerCase()?'pill-mint':''}" onclick="explore.category='${x}';renderExplore()">${x}</button>`).join('')}</div>
        <div class="divider"></div><div class="between"><div class="label" style="margin:0">Max starting price</div><span class="tiny" style="color:var(--mint)">${money(explore.budget)}</span></div><input type="range" min="1000000" max="50000000" step="500000" value="${explore.budget}" oninput="explore.budget=Number(this.value);renderExplore()" style="width:100%;margin-top:12px">
        <div class="divider"></div><button class="btn" style="width:100%" onclick="explore={query:'',category:'all',budget:50000000};renderExplore()">Reset filters</button>
      </aside>
      <div><div class="between" style="margin-bottom:12px"><span class="small muted">${list.length} artisan(s) found</span></div><div class="creator-grid">${list.length?list.map(renderCreatorCard).join(''):'<div class="empty" style="grid-column:1/-1">No artisans found.</div>'}</div></div>
    </div>
  </section>`;
}


function renderCustomerDashboard(){
  const mine=state.projects.filter(p=>p.customerId===state.user.id), reqs=state.requests.filter(r=>r.customerId===state.user.id), saved=state.artisans.filter(a=>state.savedCreators.includes(a.id));
  const pending=reqs.reduce((n,r)=>n+r.proposals.filter(p=>p.status==='pending').length,0);
  const active=mine.filter(p=>p.status!=='completed').length;
  document.getElementById('app').innerHTML=`<section class="page dashboard-shell"><div class="section-head"><div><div class="eyebrow">Customer</div><div class="section-title">DASHBOARD</div></div><button class="btn btn-mint" onclick="navigate('commission')">New commission</button></div>
    <div class="quick-grid"><div class="quick-card"><div class="metric"><div class="n">${reqs.length}</div><div class="k">Requests</div></div></div><div class="quick-card"><div class="metric"><div class="n">${pending}</div><div class="k">New proposals</div></div></div><div class="quick-card"><div class="metric"><div class="n">${active}</div><div class="k">Active projects</div></div></div><div class="quick-card"><div class="metric"><div class="n">${saved.length}</div><div class="k">Saved artisans</div></div></div></div>
    <div class="grid two" style="margin-top:16px"><div class="card pad"><div class="between"><div><div class="eyebrow">Projects</div><div class="section-title" style="font-size:30px">ACTIVE</div></div><button class="btn btn-sm" onclick="navigate('projects')">View all</button></div>${mine.slice(0,3).map(p=>renderProjectCard(p,'customer')).join('')||'<div class="empty" style="margin-top:12px">No active projects.</div>'}</div>
      <div class="card pad"><div class="between"><div><div class="eyebrow">Requests</div><div class="section-title" style="font-size:30px">RECENT</div></div><button class="btn btn-sm" onclick="navigate('requests')">View all</button></div>${reqs.slice(0,4).map(r=>`<button class="list-row" style="width:100%;background:none;border:0;color:inherit;text-align:left" onclick="navigate('request/${r.id}')"><div><b>${esc(r.title)}</b><div class="small muted">${money(r.budget)} · ${r.proposals.length} proposals</div></div>${pill(r.status)}</button>`).join('')||'<div class="empty" style="margin-top:12px">No requests.</div>'}</div></div>
  </section>`;
}
function renderSaved(){
  const list=state.artisans.filter(a=>state.savedCreators.includes(a.id));
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Customer</div><div class="section-title">SAVED ARTISANS</div></div><button class="btn" onclick="navigate('explore')">Explore</button></div><div class="creator-grid">${list.length?list.map(renderCreatorCard).join(''):'<div class="empty" style="grid-column:1/-1">No saved artisans.</div>'}</div></section>`;
}
function artisanConversationKey(id){
  const raw=String(id||'');
  return raw.startsWith('ART-')?raw.slice(4):raw;
}
function demoConversations(){
  return state.projects.filter(p=>isCustomer()?p.customerId===state.user.id:p.artisanId===state.user.artisanId).map(p=>{
    const aid=artisanConversationKey(p.artisanId),a=artisanById(p.artisanId),c=customerById(p.customerId),msgs=p.messages||[];
    return {key:p.requestId+'|'+aid,requestId:p.requestId,artisanUserId:aid,artisanId:p.artisanId,projectId:p.id,title:p.title,requestStatus:p.status,
      counterpart:isCustomer()?{name:a?.name||'Artisan',avatar:a?.avatar||''}:{name:c?.name||'Customer',avatar:c?.avatar||''},messages:msgs,lastMessage:msgs[msgs.length-1]||null};
  });
}
function openRequestConversation(requestId,artisanId){
  activeConversationKey=String(requestId)+'|'+artisanConversationKey(artisanId);
  navigate('messages');
}
function openConversation(key){
  activeConversationKey=String(key||'');
  renderMessages();
}
function renderMessages(){
  const list=CONFIG.demoMode?demoConversations():commissionConversations;
  if(!activeConversationKey||!list.some(x=>x.key===activeConversationKey))activeConversationKey=list[0]?.key||'';
  const active=list.find(x=>x.key===activeConversationKey)||null;
  const messages=active?.messages||[];
  document.getElementById('app').innerHTML='<section class="page"><div class="section-head"><div><div class="eyebrow">Inbox</div><div class="section-title">TIN NHẮN</div></div>'+(active?.projectId?'<button class="btn btn-sm" onclick="navigate(\''+(isCustomer()?'project/':'artisan-project/')+esc(active.projectId)+'\')">Mở dự án →</button>':'')+'</div>'+
    '<div class="grid two" style="align-items:start;grid-template-columns:minmax(260px,.78fr) minmax(0,1.6fr)">'+
      '<div class="card pad"><div class="label">Cuộc trò chuyện</div><div style="display:grid;gap:8px;margin-top:10px">'+
        (list.length?list.map(c=>'<button type="button" class="card-soft pad" style="text-align:left;color:inherit;border:'+(c.key===activeConversationKey?'1px solid var(--mint)':'1px solid var(--line)')+'" onclick="openConversation(\''+esc(c.key)+'\')"><div class="row"><img class="avatar" '+mediaAttrs(c.counterpart?.avatar,c.counterpart?.avatar||GUEST_USER.avatar)+'><div style="min-width:0"><b>'+esc(c.counterpart?.name||'Đối tác')+'</b><div class="small muted">'+esc(c.title||'Commission')+'</div></div></div><div class="small" style="margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(c.lastMessage?.text||'Chưa có tin nhắn. Bắt đầu trao đổi tại đây.')+'</div></button>').join(''):'<div class="empty">Chưa có cuộc trò chuyện. Sau khi chọn nghệ nhân hoặc gửi proposal, cuộc trò chuyện sẽ xuất hiện ở đây.</div>')+
      '</div></div>'+
      '<div class="card pad">'+(active?
        '<div class="between"><div><div class="eyebrow">Trao đổi trực tiếp</div><div class="section-title" style="font-size:29px">'+esc(active.title||'Commission chat')+'</div><div class="small muted">'+esc(active.counterpart?.name||'Đối tác')+'</div></div>'+pill(active.requestStatus||'pending')+'</div>'+
        '<div class="chat" style="margin-top:14px;max-height:520px;overflow:auto">'+(messages.length?messages.map(m=>'<div class="msg '+(m.senderRole===currentRole()?'me':'')+'">'+esc(m.text||'')+renderMessageAttachments(m)+'<div class="msg-meta">'+(m.senderRole===currentRole()?'Bạn':esc(active.counterpart?.name||'Đối tác'))+' · '+esc(m.time||dateTime(m.createdAt))+'</div></div>').join(''):'<div class="empty">Chưa có tin nhắn. Bạn có thể bắt đầu trao đổi ngay.</div>')+'</div>'+
        '<div class="chat-compose"><input id="inbox-msg" class="field" placeholder="Nhập tin nhắn..." onkeydown="if(event.key===\'Enter\'){event.preventDefault();sendConversationMessage()}"><button class="btn btn-mint" onclick="sendConversationMessage()">Gửi</button></div>'+
        '<div class="chat-tools"><label class="file-input-label"><i data-lucide="paperclip" style="width:14px"></i> Đính kèm<input id="inbox-chat-files" type="file" multiple accept="image/*,application/pdf,.stl,.obj,.3mf,.blend,.fbx,.glb,.gltf,.step,.stp,.3ds,.dae,.ply" style="display:none" onchange="showSelectedInboxFiles(this)"></label><span id="inbox-file-summary" class="tiny muted"></span></div>'
        :'<div class="empty">Chọn một cuộc trò chuyện để bắt đầu.</div>')+'</div>'+
    '</div></section>';
  window.lucide?.createIcons();
}
function showSelectedInboxFiles(input){
  const files=Array.from(input?.files||[]),el=document.getElementById('inbox-file-summary');
  if(el)el.textContent=files.length?files.map(f=>f.name+' · '+formatBytes(f.size)).join(' · '):'';
}
async function sendConversationMessage(){
  if(!requireAuth())return;
  const list=CONFIG.demoMode?demoConversations():commissionConversations,active=list.find(x=>x.key===activeConversationKey);
  if(!active){toast('Chưa chọn cuộc trò chuyện.','warning');return;}
  const input=document.getElementById('inbox-msg'),fileInput=document.getElementById('inbox-chat-files');
  const message=input?.value.trim()||'',files=Array.from(fileInput?.files||[]);
  if(!message&&!files.length){toast('Hãy nhập tin nhắn hoặc đính kèm tệp.','warning');return;}
  for(const f of files){if(f.size>8*1024*1024){toast('Mỗi tệp đính kèm tối đa 8MB.','error');return;}}
  try{
    if(CONFIG.demoMode){
      const p=projectById(active.projectId);if(!p)return;
      const attachments=[];for(const f of files)attachments.push(await storeBinaryFile(f,'chat'));
      p.messages=p.messages||[];p.messages.push({id:'MSG-'+Date.now(),senderId:state.user.id,senderRole:currentRole(),text:message,time:dateTime(new Date()),attachments});
      save();
    }else{
      const attachments=[];for(const f of files)attachments.push({name:f.name,dataUrl:await readFileDataUrl(f)});
      await commissionApi('/conversations/'+encodeURIComponent(active.requestId)+'/'+encodeURIComponent(active.artisanId)+'/messages',{method:'POST',body:JSON.stringify({text:message,attachments})});
      await syncCommissionWorkspace({force:true});
    }
    if(input)input.value='';if(fileInput)fileInput.value='';
    renderMessages();
  }catch(err){toast(err.message||'Không thể gửi tin nhắn.','error');}
}
function renderCreator(id){
  const published=publicArtisans.find(a=>a.id===id);
  if(published){location.replace('/nghe-nhan/'+published.slug);return;}
  const a=artisanById(id); if(!a){document.getElementById('app').innerHTML='<section class="page"><div class="empty">Artisan not found.</div></section>';return;}
  document.getElementById('app').innerHTML=`<section class="page">
    <button class="btn btn-sm" onclick="navigate('explore')">← Back to creators</button>
    <div class="grid two" style="margin-top:16px">
      <div class="card" style="overflow:hidden"><img ${mediaAttrs(a.hero,a.heroFallback||'')} style="width:100%;height:420px;object-fit:cover" alt="${esc(a.name)}"></div>
      <div class="card pad"><div class="row"><img class="avatar" ${mediaAttrs(a.avatar,a.avatarFallback||GUEST_USER.avatar)} alt=""><div><div class="display" style="font-size:38px;text-transform:uppercase;line-height:.9">${esc(a.name)}</div><div class="small muted">${esc(a.handle)} · ${esc(a.city)}</div></div></div>
        <div class="wrap" style="margin-top:15px">${a.verified?'<span class="pill pill-success">Verified</span>':''}<span class="pill">★ ${a.rating} / ${a.reviews} reviews</span><span class="pill">${a.completed} completed</span><span class="pill">response ${esc(a.response)}</span></div>
        <p class="body" style="margin-top:17px">${esc(a.bio)}</p>
        <div class="divider"></div><div class="label">Specialties</div><div class="wrap">${a.specialties.map(s=>`<span class="pill pill-mint">${esc(s)}</span>`).join('')}</div>
        <div class="divider"></div><div class="between"><div><div class="label">Starting price</div><div class="display" style="font-size:34px">${money(a.startingPrice)}</div></div><button class="btn btn-mint" onclick="startFromCreator('${a.id}')">Commission this artisan</button></div>
        <button class="btn" style="width:100%;margin-top:10px" onclick="toggleSaved('${a.id}')">${state.savedCreators.includes(a.id)?'Saved creator':'Save creator'}</button>
      </div>
    </div>
    <div class="section-head"><div><div class="eyebrow">Portfolio</div><div class="section-title">SELECTED WORKS</div></div></div>
    <div class="grid three">${a.portfolio.map((img,i)=>`<div class="card" style="overflow:hidden"><img ${mediaAttrs(img,a.portfolioFallback?.[i]||'')} style="width:100%;height:230px;object-fit:cover"></div>`).join('')}</div>
  </section>`;
}
function startFromCreator(id){ if(!requireRole('customer')) return; sessionStorage.setItem('dioralink_preferred_artisan',id); navigate('commission'); }

const FILE_DB_NAME='dioralink_attachment_store_v1';
const FILE_DB_VERSION=1;
const FILE_STORE='blobs';
function openFileDB(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(new Error('File storage is unavailable in this browser.'));return;}const req=indexedDB.open(FILE_DB_NAME,FILE_DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(FILE_STORE))db.createObjectStore(FILE_STORE,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Unable to open file storage.'));});}
async function storeBinaryFile(file,scope='project'){const id=`ATT-${scope}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;const db=await openFileDB();await new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,'readwrite');tx.objectStore(FILE_STORE).put({id,blob:file,name:file.name,size:file.size,type:file.type||'application/octet-stream',createdAt:new Date().toISOString()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Unable to save file.'));});db.close();return{id,name:file.name,size:file.size,type:file.type||'application/octet-stream',createdAt:new Date().toISOString()};}
function mediaAttrs(value,fallback=''){
  const v=String(value||'');
  if(v.startsWith('asset:')) return `src="${esc(fallback)}" data-media-id="${esc(v.slice(6))}"`;
  return `src="${esc(v||fallback)}"`;
}
const mediaUrlCache=new Map();
async function hydrateMediaAssets(){
  const nodes=[...document.querySelectorAll('[data-media-id]')];
  for(const node of nodes){
    const id=node.getAttribute('data-media-id'); if(!id) continue;
    try{
      let url=mediaUrlCache.get(id);
      if(!url){
        const db=await openFileDB();
        const record=await new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,'readonly');const req=tx.objectStore(FILE_STORE).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
        db.close();
        if(record?.blob){url=URL.createObjectURL(record.blob);mediaUrlCache.set(id,url);}
      }
      if(url) node.src=url;
    }catch(e){ /* keep fallback */ }
  }
}
async function migrateEmbeddedMedia(){
  const tasks=[];
  const add=(obj,field,scope,fallback)=>{
    if(!obj)return; const value=obj[field];
    if(typeof value==='string' && value.startsWith('data:image/')){
      tasks.push((async()=>{try{
        const blob=await (await fetch(value)).blob();
        const rec=await storeBinaryFile(new File([blob],`${scope}.img`,{type:blob.type||'image/jpeg'}),scope);
        obj[`${field}AssetId`]=rec.id; obj[`${field}Fallback`]=fallback||''; obj[field]=`asset:${rec.id}`;
      }catch(e){} })());
    }
  };
  add(state.user,'avatar','avatar',GUEST_USER.avatar);
  (state.artisans||[]).forEach((a,i)=>{
    add(a,'avatar',`artisan-avatar-${i}`,a.avatar&&a.avatar.startsWith('http')?a.avatar:GUEST_USER.avatar);
    add(a,'hero',`artisan-hero-${i}`,a.hero&&a.hero.startsWith('http')?a.hero:'');
    if(Array.isArray(a.portfolio)) a.portfolio=a.portfolio.map((v,j)=>{
      if(typeof v==='string' && v.startsWith('data:image/')){
        const holder={v}; tasks.push((async()=>{try{const blob=await (await fetch(v)).blob();const rec=await storeBinaryFile(new File([blob],`portfolio-${i}-${j}.img`,{type:blob.type||'image/jpeg'}),'portfolio'); holder.v=`asset:${rec.id}`;}catch(e){} })()); return holder;}
      return {v};
    }).map(x=>x.v);
    add(a.paymentProfile,'qrImage',`artisan-qr-${i}`,a.paymentProfile?.qrImage?.startsWith('http')?a.paymentProfile.qrImage:'');
  });
  if(tasks.length){await Promise.all(tasks);try{localStorage.setItem(CONFIG.storageKey,JSON.stringify(state));}catch(e){/* migrated media may still be constrained by unrelated data */}}
}
async function downloadStoredFile(id,name){try{const db=await openFileDB();const record=await new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,'readonly');const req=tx.objectStore(FILE_STORE).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.close();if(!record?.blob){toast('File is no longer available.','error');return;}const url=URL.createObjectURL(record.blob);const a=document.createElement('a');a.href=url;a.download=name||record.name||'download';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}catch(e){toast(e.message||'Unable to download file.','error');}}
function fileIcon(type,name){const n=String(name||'').toLowerCase();if((type||'').startsWith('image/'))return 'image';if(type==='application/pdf'||n.endsWith('.pdf'))return 'file-text';if(/\.(stl|obj|3mf|blend|fbx|glb|gltf|step|stp|3ds|dae|ply)$/i.test(n))return 'box';return 'paperclip';}
function fileLabel(f){const ext=(String(f.name||'').split('.').pop()||'FILE').toUpperCase();return ext.slice(0,6);}
function formatBytes(n){const v=Number(n||0);if(v<1024)return v+' B';if(v<1024*1024)return Math.round(v/1024)+' KB';return (v/(1024*1024)).toFixed(1)+' MB';}
function renderAttachmentList(files=[]){
  if(!files?.length)return '';
  return '<div class="file-list">'+files.map(f=>{
    const key=registerAttachment(f);
    return '<button type="button" class="file-item" style="text-align:left;width:100%" onclick="downloadAttachmentRef(\''+esc(key)+'\')"><span class="file-meta"><span class="file-icon"><i data-lucide="'+fileIcon(f.type,f.name)+'" style="width:16px"></i></span><span style="min-width:0"><span class="file-name">'+esc(f.name||'file')+'</span><span class="file-size">'+fileLabel(f)+' · '+formatBytes(f.size)+'</span></span></span><i data-lucide="download" style="width:15px;flex:0 0 auto"></i></button>';
  }).join('')+'</div>';
}
function renderMessageAttachments(m){
  return m.attachments?.length?'<div class="msg-attachments">'+m.attachments.map(f=>{
    const key=registerAttachment(f);
    return '<button type="button" class="msg-attachment" onclick="downloadAttachmentRef(\''+esc(key)+'\')"><i data-lucide="'+fileIcon(f.type,f.name)+'" style="width:14px"></i><span class="file-name">'+esc(f.name||'file')+'</span><span style="margin-left:auto;opacity:.65;font-size:8px">'+formatBytes(f.size)+'</span></button>';
  }).join('')+'</div>':'';
}

function renderCommission(){
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Customer</div><div class="section-title">CREATE COMMISSION</div></div><button class="btn" onclick="navigate('requests')">Requests</button></div><form class="grid two" data-autosave-key="commission-new" onsubmit="createRequest(event)"><div class="card pad"><div class="label">Project title</div><input name="title" class="field" required placeholder="e.g. Forest Shrine — 1/12 Diorama"><div class="grid two" style="margin-top:14px"><div><div class="label">Style</div><select name="style" class="field"><option>Fantasy</option><option>Resin</option><option>Mecha</option><option>Gunpla</option><option>Miniature</option><option>Architecture</option><option>Lighting</option></select></div><div><div class="label">Size</div><input name="size" class="field" required placeholder="40 × 30 × 30 cm"></div></div><div class="grid two" style="margin-top:14px"><div><div class="label">Budget (VND)</div><input name="budget" type="number" min="500000" step="50000" class="field" required value="20000000"></div><div><div class="label">Timeline</div><input name="timeline" class="field" required placeholder="45 days"></div></div><div style="margin-top:14px"><div class="label">Brief</div><textarea name="description" class="field" required placeholder="Mood, characters, materials, lighting, references, important constraints..."></textarea></div><div style="margin-top:14px"><div class="label">Reference images</div><input name="referenceImages" class="field" type="file" accept="image/*" multiple required><div class="tiny muted" style="margin-top:6px">At least one image is required.</div></div></div><div class="card pad"><div class="label">Routing</div><label class="card-soft pad" style="display:block;margin-top:8px"><input type="radio" name="creatorMode" value="matching" checked> <b>Open matching</b><div class="small muted" style="margin-top:5px">Send to qualified artisans</div></label><label class="card-soft pad" style="display:block;margin-top:8px"><input type="radio" name="creatorMode" value="specific"> <b>Specific artisan</b><div class="small muted" style="margin-top:5px">Send to a selected artisan</div></label><div style="margin-top:14px"><div class="label">Preferred artisan</div><select name="preferredArtisanId" class="field"><option value="">— Select artisan —</option>${publicArtisans.map(a=>`<option value="${a.id}">${esc(a.name)} ${a.verified?'· Verified':''}</option>`).join('')}</select></div><div class="divider"></div><div class="notice">Your images will be shared with artisans who receive this request.</div><p class="tiny muted" data-autosave-status style="margin-top:16px">Tự động lưu đang bật. Tệp đính kèm cần chọn lại nếu đóng trang.</p><div class="sticky-actions" style="margin-top:12px"><button class="btn btn-mint" style="width:100%">Publish request <i data-lucide="arrow-up-right" style="width:15px;vertical-align:-3px"></i></button></div></div></form></section>`;const pre=sessionStorage.getItem('dioralink_preferred_artisan');if(pre){const el=document.querySelector('[name="preferredArtisanId"]');if(el){el.value=pre;document.querySelector('[value="specific"]').checked=true;}sessionStorage.removeItem('dioralink_preferred_artisan');}window.lucide?.createIcons();
}
async function createRequest(e){
  if(!requireRole('customer'))return;
  e.preventDefault();
  const fd=new FormData(e.target),files=Array.from(document.querySelector('[name="referenceImages"]')?.files||[]);
  const mode=fd.get('creatorMode'),preferred=fd.get('preferredArtisanId')||null;
  if(mode==='specific'&&!preferred){toast('Hãy chọn artisan cụ thể hoặc chuyển sang Open matching.','error');return;}
  if(!files.length){toast('Vui lòng gửi ít nhất một hình ảnh tham khảo.','error');return;}
  for(const file of files){
    if(!file.type.startsWith('image/')){toast('Chỉ chấp nhận file hình ảnh ở Reference images.','error');return;}
    if(file.size>8*1024*1024){toast('Mỗi ảnh không được vượt quá 8MB.','error');return;}
  }
  const submit=e.target.querySelector('button[type="submit"]');
  if(submit){submit.disabled=true;submit.textContent='Publishing...';}
  let createdId='';
  try{
    const payload={title:String(fd.get('title')).trim(),style:String(fd.get('style')),size:String(fd.get('size')).trim(),budget:Number(fd.get('budget')),
      timeline:String(fd.get('timeline')).trim(),description:String(fd.get('description')).trim(),creatorMode:mode,preferredArtisanId:preferred};
    if(CONFIG.demoMode){
      const attachments=[];for(const file of files)attachments.push(await storeBinaryFile(file,'request'));
      createdId='REQ-'+new Date().getFullYear()+'-'+String(state.requests.length+1).padStart(3,'0');
      state.requests.unshift({id:createdId,customerId:state.user.id,...payload,status:'pending',createdAt:new Date().toISOString(),attachments,proposals:[]});
      save();
    }else{
      const created=await commissionApi('/requests',{method:'POST',body:JSON.stringify(payload)});
      createdId=created.request.id;
      for(const file of files){
        await commissionApi('/requests/'+encodeURIComponent(createdId)+'/attachment',{method:'POST',body:JSON.stringify({name:file.name,dataUrl:await readFileDataUrl(file)})});
      }
      await syncCommissionWorkspace({force:true});
    }
    clearFormDraft(e.target);
    const r=requestById(createdId);
    addNotification({title:'Request published',body:(r?.title||payload.title)+' has been sent to the Artisan inbox.',route:'request/'+createdId});
    save();
    window.DioraAnalytics?.track('commission_submitted',{routing:mode,budget:Number(payload.budget||0),style:String(payload.style||'')});
    toast('Commission request published.','success');
    navigate('request/'+createdId);
  }catch(err){
    if(createdId&&!CONFIG.demoMode){try{await commissionApi('/requests/'+encodeURIComponent(createdId),{method:'DELETE'});}catch(e){}}
    toast(err.message||'Unable to publish commission request.','error');
  }finally{
    if(submit){submit.disabled=false;submit.textContent='Publish request';}
  }
}

function renderRequests(){
  const mine=state.requests.filter(r=>r.customerId===state.user.id);
  document.getElementById('app').innerHTML=`<section class="page">
    <div class="section-head"><div><div class="eyebrow">Customer</div><div class="section-title">MY REQUESTS</div></div><button class="btn btn-mint" onclick="navigate('commission')">+ New commission</button></div>
    <div class="grid three"><div class="card metric"><div class="n">${mine.length}</div><div class="k">Requests</div></div><div class="card metric"><div class="n">${mine.reduce((n,r)=>n+r.proposals.length,0)}</div><div class="k">Proposals</div></div><div class="card metric"><div class="n">${state.projects.length}</div><div class="k">Projects</div></div></div>
    <div style="margin-top:16px">${mine.length?mine.map(r=>`<article class="card pad" style="margin-bottom:12px"><div class="between"><div><div class="wrap">${pill(r.status)}<span class="pill">${esc(r.style)}</span></div><h3 class="display" style="font-size:31px;text-transform:uppercase;margin-top:8px">${esc(r.title)}</h3><div class="small muted">${money(r.budget)} · ${esc(r.timeline)} · ${dateOnly(r.createdAt)}</div></div><button class="btn btn-sm" onclick="navigate('request/${r.id}')">Open request →</button></div><div class="between" style="margin-top:14px"><span class="small muted">${r.proposals.length} proposal(s)</span><span class="tiny muted">Routing: ${r.creatorMode==='specific'?'Specific artisan':'Open matching'}</span></div></article>`).join(''):'<div class="empty" style="margin-top:16px">No commission requests yet.</div>'}</div>
  </section>`;
}


function requestExtraActions(r){
  const active=['pending','proposal_received'].includes(r.status);
  let out='';
  if(active) out+='<button class="btn btn-sm" type="button" onclick="toggleRequestEdit(\''+esc(r.id)+'\')">Tinh chỉnh brief & ngân sách</button>';
  if(r.creatorMode==='specific'&&r.preferredArtisanId) out+='<button class="btn btn-sm btn-mint" type="button" onclick="openRequestConversation(\''+esc(r.id)+'\',\''+esc(r.preferredArtisanId)+'\')">Nhắn nghệ nhân</button>';
  return out;
}
function requestEditPanel(r){
  if(!['pending','proposal_received'].includes(r.status))return '';
  return '<form id="request-edit-panel" class="card pad" style="display:none;margin-bottom:16px" data-autosave-key="request-edit:'+esc(r.id)+'" onsubmit="updateCommissionRequest(event,\''+esc(r.id)+'\')">'+
    '<div class="between"><div><div class="eyebrow">Tinh chỉnh yêu cầu</div><div class="section-title" style="font-size:27px">BRIEF & NGÂN SÁCH</div></div><button type="button" class="btn btn-sm" onclick="toggleRequestEdit(\''+esc(r.id)+'\')">Đóng</button></div>'+
    '<div class="grid two" style="margin-top:12px"><div><div class="label">Tên dự án</div><input class="field" name="title" value="'+esc(r.title)+'" required></div><div><div class="label">Ngân sách (VND)</div><input class="field" name="budget" type="number" min="500000" step="50000" value="'+Number(r.budget||0)+'" required></div></div>'+
    '<div class="grid two" style="margin-top:12px"><div><div class="label">Kích thước</div><input class="field" name="size" value="'+esc(r.size||'')+'" required></div><div><div class="label">Timeline</div><input class="field" name="timeline" value="'+esc(r.timeline||'')+'" required></div></div>'+
    '<div style="margin-top:12px"><div class="label">Phong cách</div><input class="field" name="style" value="'+esc(r.style||'')+'"></div>'+
    '<div style="margin-top:12px"><div class="label">Brief cập nhật</div><textarea class="field" name="description" required>'+esc(r.description||'')+'</textarea></div>'+
    '<p class="tiny muted" style="margin-top:10px">Khi lưu, nghệ nhân đã kết nối sẽ thấy phiên bản mới của brief/ngân sách và có thể cập nhật báo giá.</p>'+
    '<button class="btn btn-mint" style="width:100%;margin-top:10px" type="submit">Gửi bản cập nhật cho nghệ nhân</button></form>';
}
function toggleRequestEdit(){
  const panel=document.getElementById('request-edit-panel');
  if(!panel)return;
  panel.style.display=panel.style.display==='none'?'block':'none';
}
async function updateCommissionRequest(event,id){
  event.preventDefault();
  if(!requireRole('customer'))return;
  const r=requestById(id);if(!r)return;
  const fd=new FormData(event.target);
  const patch={title:String(fd.get('title')||'').trim(),style:String(fd.get('style')||'').trim(),size:String(fd.get('size')||'').trim(),budget:Number(fd.get('budget')),timeline:String(fd.get('timeline')||'').trim(),description:String(fd.get('description')||'').trim()};
  const button=event.target.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{
    if(CONFIG.demoMode){Object.assign(r,patch,{updatedAt:new Date().toISOString()});save();}
    else{await commissionApi('/requests/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(patch)});await syncCommissionWorkspace({force:true});}
    clearFormDraft(event.target);
    toast('Đã gửi brief/ngân sách cập nhật cho nghệ nhân.','success');
    renderRequest(id);
  }catch(err){toast(err.message||'Không thể cập nhật yêu cầu.','error');}
  finally{if(button)button.disabled=false;}
}
function proposalActionButtons(r,p,selected){
  let out='<div class="wrap" style="margin-top:12px">';
  if(Number(p.revisionNo||1)>1) out+='<span class="pill">Báo giá cập nhật lần '+Number(p.revisionNo)+'</span>';
  out+='<button type="button" class="btn btn-sm" onclick="openRequestConversation(\''+esc(r.id)+'\',\''+esc(p.artisanId)+'\')">Nhắn nghệ nhân</button>';
  if(!selected&&p.status==='pending') out+='<button type="button" class="btn btn-mint btn-sm" onclick="acceptProposal(\''+esc(r.id)+'\',\''+esc(p.id)+'\')">Chấp nhận báo giá & tạo dự án</button>';
  return out+'</div>';
}
function renderRequest(id){
  const r=requestById(id); if(!r){document.getElementById('app').innerHTML='<section class="page"><div class="empty">Request not found.</div></section>';return;}
  const selected=r.selectedProposal? r.proposals.find(p=>p.id===r.selectedProposal):null;
  document.getElementById('app').innerHTML=`<section class="page">
    <button class="btn btn-sm" onclick="navigate('requests')">← Back</button>
    <div class="section-head"><div><div class="eyebrow">Request ${esc(r.id)}</div><div class="section-title">${esc(r.title)}</div><div class="wrap" style="margin-top:10px">${pill(r.status)}<span class="pill">${esc(r.style)}</span><span class="pill">${esc(r.size)}</span></div></div><div class="card pad" style="min-width:210px"><div class="label">Budget</div><div class="display" style="font-size:33px">${money(r.budget)}</div><div class="small muted" style="margin-top:4px">Timeline ${esc(r.timeline)}</div></div></div>
    <div class="wrap" style="margin:-4px 0 16px"><button class="btn btn-danger btn-sm" onclick="openComplaint('commission_request','${esc(r.id)}','${esc(r.title)}')"><i data-lucide="shield-alert" style="width:14px"></i> Gửi khiếu nại</button>${requestExtraActions(r)}</div>${requestEditPanel(r)}
    <div class="grid two">
      <div class="card pad"><div class="label">Brief</div><p class="body">${esc(r.description)}</p>${r.attachments?.length?`<div class="divider"></div><div class="label">Reference images</div>${renderAttachmentList(r.attachments)}`:``}<div class="divider"></div><div class="label">Routing</div><div class="small">${r.creatorMode==='specific'?`Specific artisan: <b>${esc(artisanById(r.preferredArtisanId)?.name||'')}</b>`:'Open matching to qualified artisans'}</div></div>
      <div class="card pad"><div class="between"><div><div class="eyebrow">Proposals</div><div class="section-title" style="font-size:29px">${r.proposals.length} RECEIVED</div></div>${selected?pill('approved'):''}</div>
      ${r.proposals.length?r.proposals.map(p=>{const a=artisanById(p.artisanId); return `<div class="card-soft pad" style="margin-top:12px"><div class="between"><div class="row"><img class="avatar" ${mediaAttrs(a?.avatar,a?.avatarFallback||GUEST_USER.avatar)} alt=""><div><b>${esc(a?.name||'Unknown artisan')}</b><div class="small muted">${esc(a?.handle||'')}</div></div></div>${pill(p.status)}</div><div class="grid three" style="margin-top:12px"><div><div class="label">Quote</div><b>${money(p.quote)}</b></div><div><div class="label">Timeline</div><b>${esc(p.timeline)}</b></div><div><div class="label">Status</div><b>${selected?.id===p.id?'Selected':'Available'}</b></div></div><p class="body" style="margin-top:10px">${esc(p.message)}</p><div class="wrap" style="margin-top:10px">${p.deliverables.map(d=>`<span class="pill">${esc(d)}</span>`).join('')}</div>${proposalActionButtons(r,p,selected)}</div>`}).join(''):'<div class="empty" style="margin-top:12px">Waiting for proposals.</div>'}
      </div>
    </div>
  </section>`;
}
async function acceptProposal(requestId,proposalId){
  if(!requireRole('customer'))return;
  const r=requestById(requestId),proposal=r?.proposals.find(x=>x.id===proposalId);
  if(!r||!proposal)return;
  if(r.status==='expired'){toast('Yêu cầu đã tự động hủy vì quá 3 ngày chưa tạo thành đơn.','warning');return;}
  try{
    if(!CONFIG.demoMode){
      const data=await commissionApi('/requests/'+encodeURIComponent(requestId)+'/proposals/'+encodeURIComponent(proposalId)+'/accept',{method:'POST'});
      await syncCommissionWorkspace({force:true});
      toast(data.message||'Đã chấp nhận báo giá và tạo dự án.','success');
      const project=state.projects.find(x=>x.requestId===requestId);
      navigate('project/'+(project?.id||data.project?.id||''));
      return;
    }
    r.selectedProposal=proposalId;r.status='proposal_accepted';proposal.status='accepted';r.proposals.forEach(x=>{if(x.id!==proposalId)x.status='declined';});
    const projectId='DL-'+new Date().getFullYear()+'-'+String(state.projects.length+10).padStart(3,'0');
    if(!state.projects.some(x=>x.requestId===r.id)){
      const b=proposal.quote,ms=[['M1','Concept & Scope',20],['M2','Base & Structure',20],['M3','Sculpt & Composition',20],['M4','Paint, Resin & Lighting',25],['M5','Final Assembly & Delivery',15]].map(x=>({id:x[0],name:x[1],percentage:x[2],amount:Math.round(b*x[2]/100),status:'pending',evidence:'',approvedAt:null}));
      state.projects.unshift({id:projectId,requestId:r.id,customerId:r.customerId,artisanId:proposal.artisanId,title:r.title,budget:b,progress:0,status:'awaiting_production',currentMilestone:1,dueDate:'',milestones:ms,files:[],messages:[{id:'MSG-'+Date.now(),senderId:proposal.artisanId,senderRole:'artisan',text:'Cảm ơn bạn đã chọn proposal. Mình sẽ bắt đầu từ milestone M1.',time:dateTime(new Date())}],payments:[],activity:[{text:'Proposal accepted → Project created',time:dateTime(new Date())}]});
    }
    save();toast('Proposal accepted. Project created.','success');navigate('project/'+state.projects.find(x=>x.requestId===r.id).id);
  }catch(err){toast(err.message||'Không thể chấp nhận báo giá.','error');}
}

function renderProjects(){
  const mine=state.projects.filter(p=>p.customerId===state.user.id);
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Customer</div><div class="section-title">PROJECTS</div></div><button class="btn" onclick="navigate('requests')">Requests</button></div>${mine.length?`<div class="grid two">${mine.map(p=>renderProjectCard(p,'customer')).join('')}</div>`:'<div class="empty">No projects yet.</div>'}</section>`;
}
function renderProjectCard(p,viewer){ const a=artisanById(p.artisanId);return `<article class="card pad"><div class="between"><div class="row"><img class="avatar" ${mediaAttrs(a?.avatar,a?.avatarFallback||GUEST_USER.avatar)} alt=""><div><div class="display" style="font-size:28px;text-transform:uppercase">${esc(p.title)}</div><div class="small muted">${esc(a?.name||'')}</div></div></div>${pill(p.status)}</div><div style="margin-top:16px"><div class="between tiny"><span>Progress</span><span>${p.progress}%</span></div><div class="progress" style="margin-top:6px"><div style="width:${p.progress}%"></div></div></div><div class="grid three" style="margin-top:15px"><div><div class="label">Budget</div><b>${money(p.budget)}</b></div><div><div class="label">Current stage</div><b>${esc(p.milestones.find(m=>m.id===`M${p.currentMilestone}`)?.name||'—')}</b></div><div><div class="label">Due</div><b>${p.dueDate?dateOnly(p.dueDate):'—'}</b></div></div><button class="btn btn-sm btn-mint" style="margin-top:14px" onclick="navigate('${viewer==='customer'?'project':'artisan-project'}/${p.id}')">Open project →</button></article>`; }

function renderProject(id){
  const p=projectById(id); if(!p){document.getElementById('app').innerHTML='<section class="page"><div class="empty">Project not found.</div></section>';return;}
  const a=artisanById(p.artisanId); const next=p.milestones.find(m=>m.status!=='approved'); const backRoute=isArtisan()?'artisan-projects':'projects';
  document.getElementById('app').innerHTML=`<section class="page"><button class="btn btn-sm" onclick="navigate('${backRoute}')">← Back</button><div class="section-head"><div><div class="eyebrow">Project ${esc(p.id)}</div><div class="section-title">${esc(p.title)}</div><div class="wrap" style="margin-top:10px">${pill(p.status)}<span class="pill">Artisan: ${esc(a?.name||'')}</span></div></div><div class="card pad" style="min-width:220px"><div class="label">Project value</div><div class="display" style="font-size:34px">${money(p.budget)}</div><div class="small muted">${p.dueDate?`Due ${dateOnly(p.dueDate)}`:'Due date not set'}</div></div></div><div class="wrap" style="margin:-4px 0 16px"><button class="btn btn-danger btn-sm" onclick="openComplaint('commission_project','${esc(p.id)}','${esc(p.title)}')"><i data-lucide="shield-alert" style="width:14px"></i> Gửi khiếu nại</button></div><div class="grid two"><div class="card pad"><div class="between"><div><div class="eyebrow">Milestones</div><div class="section-title" style="font-size:29px">PROGRESS ${p.progress}%</div></div><span class="tiny muted">5 stages</span></div><div class="progress" style="margin-top:12px"><div style="width:${p.progress}%"></div></div><div class="timeline" style="margin-top:18px">${p.milestones.map((m,i)=>`<div class="timeline-item ${m.status==='approved'?'done':''} ${next?.id===m.id?'current':''}"><div class="timeline-dot">${m.status==='approved'?'✓':i+1}</div><div class="card-soft pad"><div class="between"><div><b>${esc(m.name)}</b><div class="small muted">${m.percentage}% · ${money(m.amount)}</div></div>${pill(m.status)}</div>${m.evidence?`<div class="small" style="margin-top:8px">Evidence: ${esc(m.evidence)}</div>`:''}${isCustomer()&&m.status==='submitted'&&p.status!=='cancelled_by_customer'?`<div class="wrap" style="margin-top:9px"><button class="btn btn-mint btn-sm" onclick="approveMilestone('${p.id}','${m.id}')">Approve</button><button class="btn btn-danger btn-sm" onclick="openCancelMilestone('${p.id}','${m.id}')">Stop project</button></div>`:''}${isCustomer()&&['approved','in_progress','pending'].includes(m.status)&&p.status!=='cancelled_by_customer'?`<button class="btn btn-danger btn-sm" style="margin-top:9px;width:100%" onclick="openCancelMilestone('${p.id}','${m.id}')">Stop building after this stage</button>`:''}${m.status==='cancelled'?`<div class="small" style="margin-top:8px;color:#F3C7C7">Project stopped at this stage.</div>`:''}</div></div>`).join('')}</div></div><div class="grid" style="gap:16px"><div class="card pad"><div class="between"><div><div class="eyebrow">Chat</div><div class="section-title" style="font-size:29px">PROJECT CHAT</div></div><span class="tiny muted">Customer · Artisan</span></div><div class="chat" id="chat-box" style="margin-top:12px">${p.messages.map(m=>`<div class="msg ${m.senderRole===currentRole()?'me':''}">${esc(m.text||'')}${renderMessageAttachments(m)}<div class="msg-meta">${m.senderRole===currentRole()?'You':esc(m.senderRole==='artisan'?(a?.name||'Artisan'):'Customer')} · ${esc(m.time)}</div></div>`).join('')}</div><div class="chat-compose"><input id="project-msg" class="field" placeholder="Message"><button class="btn btn-mint" onclick="sendMessage('${p.id}','${currentRole()}')">Send</button></div><div class="chat-tools"><label class="file-input-label"><i data-lucide="paperclip" style="width:14px"></i> Attach files<input id="project-chat-files" type="file" multiple accept="image/*,application/pdf,.stl,.obj,.3mf,.blend,.fbx,.glb,.gltf,.step,.stp,.3ds,.dae,.ply" style="display:none" onchange="showSelectedFiles(this)"></label><span id="chat-file-summary" class="tiny muted"></span></div></div><div class="card pad"><div class="between"><div><div class="eyebrow">Files & payments</div></div>${isCustomer()?`<button class="btn btn-sm" onclick="openVoucherInfo()">View offers</button>`:''}</div><div class="grid two" style="margin-top:10px"><div><div class="label">Files</div>${p.files.length?p.files.map(f=>`<div class="card-soft pad" style="margin-top:7px"><div class="small">${esc(f.name)}</div><div class="tiny muted">${Math.round(f.size/1024)} KB · ${esc(f.uploader)}</div></div>`).join(''):'<div class="small muted">No files yet.</div>'}</div><div><div class="label">Payment status</div>${p.milestones.map(m=>{const pay=p.payments.find(x=>x.milestoneId===m.id);const calc=milestonePayable(p,m);return `<div class="card-soft pad" style="margin-top:7px"><div class="between"><span class="small">${esc(m.name)}</span>${pill(pay?.status||'pending')}</div><div class="price-line"><span>Milestone value</span><b>${money(m.amount)}</b></div>${isCustomer()&&!pay?`<div class="voucher-row" style="margin-top:9px"><input id="voucher-${p.id}-${m.id}" class="field voucher-code" placeholder="VOUCHER CODE" value="${p.appliedVoucher?.milestoneId===m.id?esc(p.appliedVoucher.code):''}"><button class="btn btn-sm" onclick="applyVoucher('${p.id}','${m.id}')">Apply</button></div>${p.appliedVoucher?.milestoneId===m.id?`<div class="price-line discount"><span>Voucher ${esc(calc.code)} <button class="btn btn-sm" style="padding:3px 6px;font-size:7px" onclick="removeVoucher('${p.id}')">Remove</button></span><b>−${money(calc.discount)}</b></div>`:''}<div class="price-line"><span>Customer pays</span><b class="price-total">${money(calc.total)}</b></div>`:p.appliedVoucher?.milestoneId===m.id?`<div class="price-line discount"><span>Applied voucher</span><b>−${money(calc.discount)}</b></div>`:''}${m.status==='approved'&&p.status!=='cancelled_by_customer'&&(!pay||pay.status!=='confirmed')&&isCustomer()?`<button class="btn btn-sm btn-mint" style="margin-top:8px;width:100%" onclick="openDirectPayment('${p.id}','${m.id}')">Pay direct to artisan · ${money(calc.total)}</button>`:''}${pay?.status==='customer_reported'?`<div class="notice" style="margin-top:8px">Payment reported · awaiting artisan confirmation.</div>`:''}${pay?.status==='confirmed'?`<div class="small muted" style="margin-top:7px">Paid directly to artisan${pay.confirmedAt?` · ${dateOnly(pay.confirmedAt)}`:''}.</div>`:''}</div>`}).join('')}</div></div></div></div></div></section>`;
}
function openCancelMilestone(projectId,milestoneId){if(!requireRole('customer'))return;const p=projectById(projectId);const m=p?.milestones.find(x=>x.id===milestoneId);if(!p||!m||p.status==='completed'||p.status==='cancelled_by_customer'||m.status==='cancelled')return;document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><div><div class="eyebrow">Project control</div><b>Stop project</b></div><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body"><div class="card-soft pad cancel-card"><div class="section-title" style="font-size:28px">${esc(m.name)}</div><p class="cancel-copy" style="margin-top:10px">You are about to stop production at this stage. The project will not continue to later milestones.</p><p class="cancel-copy" style="margin-top:8px"><b>Important:</b> payments already made or transferred directly to the artisan are non-refundable.</p></div><label class="row" style="margin-top:14px;align-items:flex-start"><input id="cancel-ack" type="checkbox" style="margin-top:3px"><span class="small">I understand that stopping the project does not create a refund.</span></label><div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn" onclick="closeModal()">Keep project</button><button class="btn btn-danger" onclick="confirmCancelMilestone('${p.id}','${m.id}')">Stop project</button></div></div></div></div>`;window.lucide?.createIcons();}
function confirmCancelMilestone(projectId,milestoneId){if(!document.getElementById('cancel-ack')?.checked){toast('Please confirm the no-refund warning.','warning');return;}const p=projectById(projectId);const idx=p?.milestones.findIndex(x=>x.id===milestoneId);if(!p||idx<0)return;for(let i=idx;i<p.milestones.length;i++){if(p.milestones[i].status!=='approved')p.milestones[i].status='cancelled';}p.status='cancelled_by_customer';p.cancelledAt=new Date().toISOString();p.cancelledMilestoneId=milestoneId;p.activity.unshift({text:`Customer stopped the project at ${milestoneId}`,time:dateTime(new Date())});addNotification({title:'Project stopped',body:`${p.title} was stopped by the customer.`,route:`project/${p.id}`});save();closeModal();toast('Project stopped. Paid amounts remain non-refundable.','warning');render();}

function approveMilestone(projectId,milestoneId){ const p=projectById(projectId); const m=p?.milestones.find(x=>x.id===milestoneId); if(!p||!m||m.status!=='submitted'){toast('Milestone chưa ở trạng thái submitted.','error');return;}m.status='approved';m.approvedAt=new Date().toISOString();p.progress=p.milestones.filter(x=>x.status==='approved').reduce((s,x)=>s+x.percentage,0);p.currentMilestone=p.milestones.findIndex(x=>x.status!=='approved')+1;if(p.progress>=100)p.status='completed';else p.status='in_production';p.activity.unshift({text:`Customer approved ${m.id}`,time:dateTime(new Date())});addNotification({title:'Milestone approved',body:`${m.name} đã được approve.`,route:`project/${p.id}`});save();toast('Milestone đã được approve.','success');render();}
function getArtisanPaymentProfile(artisanId){
  const a=artisanById(artisanId); if(!a) return null;
  if(!a.paymentProfile)a.paymentProfile={method:'vietqr',bankName:'',accountName:'',accountNumber:'',qrImage:''};
  return a.paymentProfile;
}
function paymentReference(projectId,milestoneId){ return `DL-${projectId}-${milestoneId}`; }
function openDirectPayment(projectId,milestoneId){
  if(!requireRole('customer')) return;
  const p=projectById(projectId); const m=p?.milestones.find(x=>x.id===milestoneId); const a=p?artisanById(p.artisanId):null;
  if(!p||!m||!a)return;
  const pay=p.payments.find(x=>x.milestoneId===milestoneId); if(pay?.status==='confirmed'){toast('Milestone này đã được xác nhận thanh toán.','warning');return;}
  const profile=getArtisanPaymentProfile(a.id); const calc=milestonePayable(p,m); const ref=paymentReference(p.id,m.id); const hasPaymentMethod=!!(profile?.qrImage||profile?.accountNumber);
  if(!hasPaymentMethod){toast('Artisan has not configured a payment method yet.','warning');return;}
  document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" style="width:min(760px,100%)" onclick="event.stopPropagation()">
    <div class="modal-head"><div><div class="eyebrow">Direct payment</div><b>Pay ${esc(a.name)}</b></div><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="grid two" style="align-items:start">
      <div class="card-soft pad" style="text-align:center"><div class="label">Scan to pay</div>${profile?.qrImage?`<img src="${esc(profile.qrImage)}" alt="VietQR" style="width:min(300px,100%);aspect-ratio:1;object-fit:contain;background:#fff;padding:12px;border-radius:4px;margin:10px auto">`:`<div class="empty" style="margin-top:10px">Artisan has not added a QR code yet.</div>`}<div class="tiny muted">Amount ${money(calc.total)}</div></div>
      <div><div class="card-soft pad"><div class="label">Transfer details</div><div class="price-line"><span>Recipient</span><b>${esc(profile?.accountName||a.name)}</b></div>${profile?.bankName?`<div class="price-line"><span>Bank</span><b>${esc(profile.bankName)}</b></div>`:''}${profile?.accountNumber?`<div class="price-line"><span>Account</span><b>${esc(profile.accountNumber)}</b></div>`:''}<div class="price-line"><span>Amount</span><b class="price-total">${money(calc.total)}</b></div><div class="price-line"><span>Transfer note</span><b>${esc(ref)}</b></div><button class="btn btn-sm" style="width:100%;margin-top:10px" onclick="copyText('${esc(ref)}')">Copy transfer note</button></div>
      ${calc.code?`<div class="notice" style="margin-top:10px">Voucher ${esc(calc.code)} · discount ${money(calc.discount)}</div>`:''}
      <form onsubmit="markDirectPayment(event,'${p.id}','${m.id}')" class="card-soft pad" style="margin-top:10px"><div class="label">Payment confirmation</div><div class="small muted">Transfer the amount directly to the artisan, then confirm here.</div><input name="transferReference" class="field" style="margin-top:9px" value="${esc(ref)}" required><div style="margin-top:9px"><div class="label">Payment screenshot (optional)</div><input name="proof" class="field" type="file" accept="image/*"></div><button id="direct-pay-submit" class="btn btn-mint" style="width:100%;margin-top:12px">I have transferred the money</button></form>
      </div></div>
      <div class="tiny muted" style="margin-top:12px">DioraLink does not hold this payment. The transfer goes directly to the artisan's bank account.</div>
    </div></div></div>`;window.lucide?.createIcons();
}
async function markDirectPayment(e,projectId,milestoneId){
  e.preventDefault(); if(!requireRole('customer'))return; const p=projectById(projectId); const m=p?.milestones.find(x=>x.id===milestoneId); if(!p||!m)return;
  const calc=milestonePayable(p,m); const fd=new FormData(e.target); const ref=String(fd.get('transferReference')||'').trim(); const proofFile=fd.get('proof');
  if(!ref){toast('Enter the transfer reference.','warning');return;}
  let proof=null; if(proofFile&&proofFile.size){if(proofFile.size>5*1024*1024){toast('Payment proof must be 5MB or smaller.','error');return;}proof=await storeBinaryFile(proofFile,'payment-proof');}
  const record={milestoneId,amount:m.amount,customerPaid:calc.total,discount:calc.discount,voucherCode:calc.code,status:'customer_reported',paidAt:new Date().toISOString(),confirmedAt:null,transferReference:ref,proof};
  const existing=p.payments.find(x=>x.milestoneId===milestoneId); if(existing)Object.assign(existing,record);else p.payments.push(record);
  p.activity.unshift({text:`Customer reported direct payment for ${milestoneId}`,time:dateTime(new Date())}); addNotification({title:'Payment reported',body:`Customer reported a direct payment for ${m.name}.`,route:`artisan-project/${p.id}`}); p.appliedVoucher=null; save(); window.DioraAnalytics?.track('payment_reported',{amount:Number(calc.total||0),voucher_used:!!calc.code}); closeModal(); toast('Payment reported to the artisan.','success'); render();
}
async function confirmDirectPayment(projectId,milestoneId){
  if(!requireRole('artisan'))return;
  const p=projectById(projectId);
  const m=p?.milestones.find(x=>x.id===milestoneId);
  if(!p||!m)return;
  const pay=p.payments.find(x=>x.milestoneId===milestoneId);
  if(!pay||pay.status!=='customer_reported'){toast('No payment report to confirm.','warning');return;}
  try{
    const res=await fetch(apiURL('/api/finance/commission/confirm'),{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        projectRef:p.id,
        milestoneRef:m.id,
        projectTitle:p.title||'',
        milestoneName:m.name||'',
        customerRef:p.customerId||'',
        grossAmount:Number(m.amount||0),
        discount:Number(pay.discount||0),
        netAmount:Number(pay.customerPaid||pay.amount||0),
        transferReference:pay.transferReference||''
      })
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.message||'Could not record platform commission.');
    pay.status='confirmed';
    pay.confirmedAt=data.confirmedAt||new Date().toISOString();
    pay.platformCommission=Number(data.commission?.platformFee||0);
    pay.commissionRate=Number(data.commission?.rate||0);
    pay.artistNet=Number(data.commission?.artistNet||0);
    p.activity.unshift({text:`Artisan confirmed direct payment for ${milestoneId}`,time:dateTime(new Date())});
    addNotification({title:'Payment confirmed',body:`${m.name} payment was confirmed. Platform commission recorded.`,route:`project/${p.id}`});
    save();
    toast(`Payment confirmed. Platform fee ${money(pay.platformCommission)}.`,`success`);
    render();
  }catch(error){
    toast(error?.message||'Unable to confirm payment.','error');
  }
}
function adminApi(path,options={}){return fetch(apiURL(path),{credentials:'include',...options});}
async function openAdminLogin(){
  document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><div><div class="eyebrow">DioraLink</div><b>Admin sign in</b></div><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body"><form onsubmit="adminLogin(event)"><div class="label">Admin email</div><input id="admin-email" class="field" type="email" required autocomplete="username"><div style="margin-top:10px"><div class="label">Admin password</div><input id="admin-password" class="field" type="password" required autocomplete="current-password"></div><button id="admin-login-submit" class="btn btn-mint" style="width:100%;margin-top:14px">Sign in to Admin</button></form></div></div></div>`;window.lucide?.createIcons();
}
async function adminLogin(e){
  e.preventDefault();
  const submit=document.getElementById('admin-login-submit'); if(submit)submit.disabled=true;
  try{
    const email=document.getElementById('admin-email')?.value.trim().toLowerCase();
    const password=document.getElementById('admin-password')?.value||'';
    const res=await adminApi('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.message||'Admin login failed.');
    state=normalizeState({...state,user:{id:data.admin.id,name:data.admin.name,email:data.admin.email,role:'admin',avatar:'',bio:'',authenticated:true,provider:'admin'},session:{authenticated:true,userId:data.admin.id}});
    save();window.DioraAnalytics?.setContext({user_role:'admin'});closeModal();toast('Admin signed in.','success');navigate('admin-dashboard');
  }catch(error){toast(error?.message||'Admin login failed.','error');}finally{if(submit)submit.disabled=false;}
}
async function adminLogout(){
  try{await adminApi('/api/admin/logout',{method:'POST'});}catch(e){}
  setGuest();closeModal();navigate('home');toast('Admin signed out.','success');
}
async function loadAdminFinance(){
  const res=await adminApi('/api/admin/finance');
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.message||'Unable to load finance dashboard.');
  return data;
}
async function loadAdminAnalytics(days=7){
  const res=await adminApi('/api/admin/analytics/summary?days='+encodeURIComponent(days));
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.message||'Unable to load analytics.');
  return data;
}
function analyticsDuration(seconds){
  const n=Math.max(0,Number(seconds||0));
  if(n<60)return Math.round(n)+'s';
  const m=Math.floor(n/60),s=Math.round(n%60);
  return m+'m '+String(s).padStart(2,'0')+'s';
}
function analyticsBar(label,value,max=100){
  const v=Math.max(0,Math.min(max,Number(value||0)));
  const width=max?Math.max(0,Math.min(100,(v/max)*100)):0;
  return `<div style="display:grid;grid-template-columns:90px 1fr 55px;gap:10px;align-items:center;margin:10px 0"><span class="small muted">${esc(label)}</span><div style="height:8px;background:rgba(129,216,208,.10);overflow:hidden;border-radius:99px"><div style="height:100%;width:${width}%;background:var(--mint);border-radius:99px"></div></div><b class="small" style="text-align:right">${Math.round(v*10)/10}%</b></div>`;
}
function analyticsFunnel(items){
  const first=Math.max(1,Number(items?.[0]?.sessions||0));
  return (items||[]).map((item,index)=>{
    const value=Number(item.sessions||0);
    const rate=index===0?(value?100:0):(value/first*100);
    return `<div class="card-soft pad" style="margin-top:8px"><div class="between"><span class="small">${esc(item.step)}</span><b>${value}</b></div><div style="height:6px;background:rgba(129,216,208,.10);margin-top:8px;border-radius:99px;overflow:hidden"><div style="height:100%;width:${Math.min(100,rate)}%;background:var(--mint);border-radius:99px"></div></div><div class="tiny muted" style="margin-top:5px">${Math.round(rate*10)/10}% so với bước đầu</div></div>`;
  }).join('');
}
async function renderAdminAnalytics(days=7){
  const selected=Math.min(90,Math.max(1,Number(days)||7));
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Admin · Behavior analytics</div><div class="section-title">USER BEHAVIOR</div><div class="small muted">First-party anonymous analytics · không lưu email, tên, số điện thoại hay nội dung tin nhắn.</div></div><div class="wrap"><button class="btn btn-sm ${selected===7?'btn-mint':''}" onclick="renderAdminAnalytics(7)">7 ngày</button><button class="btn btn-sm ${selected===30?'btn-mint':''}" onclick="renderAdminAnalytics(30)">30 ngày</button><button class="btn btn-sm ${selected===90?'btn-mint':''}" onclick="renderAdminAnalytics(90)">90 ngày</button></div></div><div id="admin-analytics-content"><div class="empty">Đang tải analytics…</div></div></section>`;
  try{
    const data=await loadAdminAnalytics(selected);
    const k=data.kpis||{},scroll=data.scrollDepth||{},market=data.funnels?.marketplace||[],commission=data.funnels?.commission||[];
    const top=(data.topPages||[]).map(p=>`<tr><td><code>${esc(p.path)}</code></td><td>${p.views}</td><td>${p.sessions}</td></tr>`).join('');
    const roles=(data.roles||[]).map(r=>`<span class="pill">${esc(r.role)} · ${r.sessions}</span>`).join('');
    const devices=(data.devices||[]).map(r=>`<span class="pill">${esc(r.device)} · ${r.sessions}</span>`).join('');
    document.getElementById('admin-analytics-content').innerHTML=`
      <div class="grid four">
        <div class="card metric"><div class="n">${Number(k.bounceRate||0).toFixed(1)}%</div><div class="k">Bounce rate</div></div>
        <div class="card metric"><div class="n">${analyticsDuration(k.avgSessionSeconds)}</div><div class="k">Avg session duration</div></div>
        <div class="card metric"><div class="n">${Number(k.pagesPerSession||0).toFixed(2)}</div><div class="k">Pages / session</div></div>
        <div class="card metric"><div class="n">${Number(k.avgScrollDepth||0).toFixed(1)}%</div><div class="k">Avg scroll depth</div></div>
      </div>
      <div class="grid four" style="margin-top:14px">
        <div class="card metric"><div class="n">${k.sessions||0}</div><div class="k">Sessions</div></div>
        <div class="card metric"><div class="n">${k.visitors||0}</div><div class="k">Visitors</div></div>
        <div class="card metric"><div class="n">${Number(k.conversionRate||0).toFixed(1)}%</div><div class="k">Session conversion</div></div>
        <div class="card metric"><div class="n">${data.rangeDays||selected}d</div><div class="k">Reporting range</div></div>
      </div>
      <div class="grid two" style="margin-top:16px">
        <div class="card pad"><div class="eyebrow">Scroll depth</div><h3 style="margin:8px 0 16px">DEPTH REACHED</h3>${analyticsBar('25%',scroll['25'])}${analyticsBar('50%',scroll['50'])}${analyticsBar('75%',scroll['75'])}${analyticsBar('90%',scroll['90'])}${analyticsBar('100%',scroll['100'])}</div>
        <div class="card pad"><div class="eyebrow">Segments</div><h3 style="margin:8px 0 16px">ROLE & DEVICE</h3><div class="label">Role</div><div class="wrap" style="margin:8px 0 18px">${roles||'<span class="small muted">Chưa có dữ liệu</span>'}</div><div class="label">Device</div><div class="wrap" style="margin-top:8px">${devices||'<span class="small muted">Chưa có dữ liệu</span>'}</div></div>
      </div>
      <div class="grid two" style="margin-top:16px">
        <div class="card pad"><div class="eyebrow">Marketplace funnel</div><h3 style="margin:8px 0 12px">VIEW → ORDER</h3>${analyticsFunnel(market)||'<div class="small muted">Chưa có dữ liệu.</div>'}</div>
        <div class="card pad"><div class="eyebrow">Commission funnel</div><h3 style="margin:8px 0 12px">START → SUBMIT</h3>${analyticsFunnel(commission)||'<div class="small muted">Chưa có dữ liệu.</div>'}</div>
      </div>
      <div class="card pad" style="margin-top:16px"><div class="between"><div><div class="eyebrow">Top pages</div><h3 style="margin-top:8px">PAGE PERFORMANCE</h3></div><div class="tiny muted">Generated ${new Date(data.generatedAt||Date.now()).toLocaleString('vi-VN')}</div></div><div style="overflow:auto;margin-top:12px"><table class="table"><thead><tr><th>Page</th><th>Views</th><th>Sessions</th></tr></thead><tbody>${top||'<tr><td colspan="3" class="muted">Chưa có dữ liệu.</td></tr>'}</tbody></table></div></div>`;
  }catch(error){
    document.getElementById('admin-analytics-content').innerHTML=`<div class="empty">${esc(error.message||'Không thể tải analytics.')}</div>`;
  }
}
function adminStatus(status){
  return `<span class="pill ${status==='collected'?'pill-success':'pill-warning'}">${esc(status==='collected'?'Collected':'Unpaid')}</span>`;
}
async function renderAdminDashboard(){
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Admin</div><div class="section-title">PLATFORM FINANCE</div></div><div class="wrap"><a class="btn btn-mint" href="/ung-dung#admin-market">Kinh doanh Marketplace</a><button class="btn btn-sm" onclick="renderAdminDashboard()">Refresh</button></div></div><div id="admin-finance-content"><div class="empty">Loading finance...</div></div></section>`;
  try{const data=await loadAdminFinance();const c=data.summary||{};document.getElementById('admin-finance-content').innerHTML=`<div class="grid four"><div class="card metric"><div class="n">${money(c.gross||0)}</div><div class="k">Gross transaction value</div></div><div class="card metric"><div class="n">${money(c.platformFee||0)}</div><div class="k">Platform commission</div></div><div class="card metric"><div class="n">${money(c.unpaid||0)}</div><div class="k">Commission unpaid</div></div><div class="card metric"><div class="n">${money(c.collected||0)}</div><div class="k">Commission collected</div></div></div><div class="card pad" style="margin-top:16px"><div class="between"><div><div class="eyebrow">Latest transactions</div><div class="section-title" style="font-size:29px">COMMISSION LEDGER</div></div><button class="btn btn-sm btn-mint" onclick="navigate('admin-commissions')">View all</button></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Artist</th><th>Project</th><th>Gross</th><th>Rate</th><th>Platform fee</th><th>Confirmed</th><th>Status</th></tr></thead><tbody>${(data.commissions||[]).slice(0,10).map(x=>`<tr><td>${esc(x.artist_name||'—')}</td><td>${esc(x.project_title||x.project_ref||'—')}</td><td>${money(x.gross_amount)}</td><td>${Number(x.commission_rate||0)}%</td><td>${money(x.platform_fee)}</td><td>${x.confirmed_at?dateTime(x.confirmed_at):'—'}</td><td>${adminStatus(x.status)}</td></tr>`).join('')||'<tr><td colspan="7">No commission records yet.</td></tr>'}</tbody></table></div></div></div>`;}catch(e){document.getElementById('admin-finance-content').innerHTML=`<div class="empty">${esc(e.message||'Unable to load finance.')}</div>`;}
}
async function renderAdminCommissions(){
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Admin</div><div class="section-title">COMMISSIONS</div></div><button class="btn btn-sm" onclick="renderAdminCommissions()">Refresh</button></div><div id="admin-commission-content"><div class="empty">Loading...</div></div></section>`;
  try{const data=await loadAdminFinance();document.getElementById('admin-commission-content').innerHTML=`<div class="card pad"><div class="table-wrap"><table><thead><tr><th>Artist</th><th>Project / Milestone</th><th>Customer paid</th><th>Commission</th><th>Artist net</th><th>Confirmed at</th><th>Status</th><th></th></tr></thead><tbody>${(data.commissions||[]).map(x=>`<tr><td>${esc(x.artist_name||'—')}<div class="tiny muted">${esc(x.artisan_user_id||'')}</div></td><td>${esc(x.project_title||x.project_ref||'—')}<div class="tiny muted">${esc(x.milestone_name||x.milestone_ref||'')}</div></td><td>${money(x.net_amount)}</td><td>${Number(x.commission_rate||0)}% · ${money(x.platform_fee)}</td><td>${money(x.artist_net)}</td><td>${x.confirmed_at?dateTime(x.confirmed_at):'—'}</td><td>${adminStatus(x.status)}</td><td>${x.status==='unpaid'?`<button class="btn btn-sm btn-mint" onclick="adminMarkCollected('${x.id}')">Mark collected</button>`:'<span class="tiny muted">Collected</span>'}</td></tr>`).join('')||'<tr><td colspan="8">No commission records yet.</td></tr>'}</tbody></table></div></div>`;}catch(e){document.getElementById('admin-commission-content').innerHTML=`<div class="empty">${esc(e.message||'Unable to load commissions.')}</div>`;}
}
async function adminMarkCollected(id){
  if(!isAdmin())return;
  try{const res=await adminApi(`/api/admin/commissions/${id}/collect`,{method:'POST'});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||'Unable to mark collected.');toast('Platform commission marked as collected.','success');renderAdminCommissions();}catch(e){toast(e.message||'Unable to update commission.','error');}
}
async function loadAdminNotifications(){
  const res=await adminApi('/api/admin/notifications');
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.message||'Unable to load notifications.');
  return data.notifications||[];
}
async function renderAdminNotifications(){
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Admin</div><div class="section-title">NOTIFICATIONS</div></div><button class="btn btn-sm" onclick="renderAdminNotifications()">Refresh</button></div><div id="admin-notification-content"><div class="empty">Loading...</div></div></section>`;
  try{const list=await loadAdminNotifications();document.getElementById('admin-notification-content').innerHTML=`<div class="card pad">${list.map(n=>`<button class="card-soft pad" style="display:block;width:100%;text-align:left;margin-bottom:8px;${n.read_at?'opacity:.65':''}" onclick="openAdminNotification('${n.id}','${esc(n.route||'')}')"><div class="between"><b class="small">${esc(n.title)}</b><span class="tiny muted">${n.created_at?dateTime(n.created_at):''}</span></div><div class="small muted" style="margin-top:5px">${esc(n.body)}</div></button>`).join('')||'<div class="empty">No admin notifications.</div>'}</div>`;}catch(e){document.getElementById('admin-notification-content').innerHTML=`<div class="empty">${esc(e.message||'Unable to load notifications.')}</div>`;}
}
async function openAdminNotifications(){if(!isAdmin()){openAdminLogin();return;}await renderAdminNotifications();navigate('admin-notifications');}
async function openAdminNotification(id,route){
  try{await adminApi(`/api/admin/notifications/${id}/read`,{method:'POST'});}catch(e){}
  if(route)navigate(route);else renderAdminNotifications();
}
function copyText(value){navigator.clipboard?.writeText(String(value)).then(()=>toast('Copied.','success')).catch(()=>toast(String(value),'success'));}
function payMilestone(projectId,milestoneId){openDirectPayment(projectId,milestoneId);}
async function sendMessage(projectId,role){
  if(!requireAuth())return;
  const p=projectById(projectId),input=document.getElementById('project-msg'),fileInput=document.getElementById('project-chat-files');
  if(!p){toast('Project not found.','error');return;}
  const participant=p.customerId===state.user.id||p.artisanId===(state.user.artisanId||'__none__');
  const demoProject=p.id==='DL-2026-009'||p.requestId==='REQ-2026-001';
  if(!participant&&!demoProject){toast('You are not a participant in this project.','warning');return;}
  const message=input?.value.trim()||'',files=Array.from(fileInput?.files||[]);
  if(!message&&!files.length){toast('Write a message or attach a file.','warning');return;}
  for(const file of files){if(file.size>8*1024*1024){toast('Each attachment must be 8MB or smaller.','error');return;}}
  try{
    if(CONFIG.demoMode){
      const attachments=[];for(const file of files)attachments.push(await storeBinaryFile(file,'chat'));
      p.messages=p.messages||[];p.messages.push({id:'MSG-'+Date.now(),senderId:state.user.id,senderRole:role,text:message,time:dateTime(new Date()),attachments});
      p.activity=p.activity||[];p.activity.unshift({text:(role==='artisan'?'Artisan':'Customer')+' sent a message',time:dateTime(new Date())});
      save();
    }else{
      const attachments=[];for(const file of files)attachments.push({name:file.name,dataUrl:await readFileDataUrl(file)});
      await commissionApi('/conversations/'+encodeURIComponent(p.requestId)+'/'+encodeURIComponent(p.artisanId)+'/messages',{method:'POST',body:JSON.stringify({text:message,attachments})});
      await syncCommissionWorkspace({force:true});
    }
    if(input)input.value='';if(fileInput)fileInput.value='';
    render();
  }catch(err){toast(err.message||'Unable to send message.','error');}
}

function showSelectedFiles(input){const files=Array.from(input?.files||[]);const el=document.getElementById('chat-file-summary');if(el)el.textContent=files.length?files.map(f=>`${f.name} · ${formatBytes(f.size)}`).join(' ·'):'';}
function complaintMediaMarkup(src){
  const safe=esc(src);
  return String(src||'').startsWith('data:video/')
    ? `<video class="complaint-media" controls preload="metadata"><source src="${safe}"></video>`
    : `<img class="complaint-media" src="${safe}" alt="Bằng chứng khiếu nại" loading="lazy">`;
}
function openComplaint(subjectType,subjectRef,title=''){
  if(!requireAuth())return;
  document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><div><div class="eyebrow">DioraLink Support</div><b>Gửi khiếu nại</b></div><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body"><p class="body"><b>${esc(title||subjectRef)}</b></p><form data-autosave-key="complaint:${esc(subjectType)}:${esc(subjectRef)}" onsubmit="submitComplaint(event,'${esc(subjectType)}','${esc(subjectRef)}')"><div class="label">Lý do khiếu nại</div><textarea class="field" name="reason" minlength="20" maxlength="3000" required placeholder="Mô tả cụ thể vấn đề, thời điểm xảy ra và điều bạn cần DioraLink xem xét."></textarea><div style="margin-top:12px"><div class="label">Ảnh hoặc video bằng chứng</div><input class="field" name="evidence" type="file" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" required><div class="tiny muted" style="margin-top:6px">Bắt buộc ít nhất 1 tệp · tối đa 3 tệp · mỗi tệp tối đa 4 MB.</div></div><p class="tiny muted" data-autosave-status style="margin-top:10px">Tự động lưu đang bật. Tệp đính kèm cần chọn lại nếu đóng trang.</p><button class="btn btn-danger" style="width:100%;margin-top:10px" type="submit">Gửi để xét duyệt</button><p id="complaint-submit-error" class="small"></p></form></div></div></div>`;
  window.lucide?.createIcons();
}
async function submitComplaint(event,subjectType,subjectRef){
  event.preventDefault();
  const form=event.target;
  const button=form.querySelector('button[type="submit"]');
  const fd=new FormData(form);
  const reason=String(fd.get('reason')||'').trim();
  const files=fd.getAll('evidence').filter(file=>file?.size);
  const error=document.getElementById('complaint-submit-error');
  if(reason.length<20){if(error)error.textContent='Lý do cần ít nhất 20 ký tự.';return;}
  if(!files.length){if(error)error.textContent='Vui lòng thêm ảnh hoặc video bằng chứng.';return;}
  if(files.length>3){if(error)error.textContent='Tối đa 3 tệp bằng chứng.';return;}
  button.disabled=true;
  try{
    const evidence=[];
    for(const file of files){
      if(!file.type.startsWith('image/')&&!['video/mp4','video/webm'].includes(file.type))throw new Error('Chỉ hỗ trợ ảnh, MP4 hoặc WebM.');
      if(file.size>4*1024*1024)throw new Error('Mỗi tệp bằng chứng tối đa 4 MB.');
      const data=await readFileDataUrl(file);
      evidence.push(file.type.startsWith('image/')?await publicImageValue(data):data);
    }
    const res=await fetch(apiURL('/api/complaints'),{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subjectType,subjectRef,reason,evidence})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.message||'Không thể gửi khiếu nại.');
    clearFormDraft(form);
    closeModal();
    toast('Đã gửi khiếu nại để DioraLink xét duyệt.','success');
  }catch(e){
    if(error)error.textContent=e.message||'Không thể gửi khiếu nại.';
    button.disabled=false;
  }
}
async function renderComplaints(){
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Support</div><div class="section-title">KHIẾU NẠI CỦA TÔI</div></div></div><div id="complaint-list"><div class="empty">Đang tải…</div></div></section>`;
  try{
    const res=await fetch(apiURL('/api/complaints/mine'),{credentials:'include'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.message||'Không thể tải khiếu nại.');
    const list=document.getElementById('complaint-list');
    if(!list)return;
    list.innerHTML=data.complaints?.length?data.complaints.map(item=>`<article class="card pad" style="margin-bottom:12px"><div class="between"><div><div class="eyebrow">${esc(item.subject_type)} · ${esc(item.subject_ref)}</div><h3 style="margin-top:7px">${esc(item.reason)}</h3></div><span class="pill ${item.status==='approved'?'pill-success':item.status==='pending'?'pill-warning':''}">${item.status==='pending'?'Chờ xét duyệt':item.status==='approved'?'Đã chấp thuận':'Không chấp thuận'}</span></div><div class="grid three complaint-media-grid">${(item.evidence||[]).map(complaintMediaMarkup).join('')}</div>${item.admin_note?`<div class="notice" style="margin-top:12px"><b>Kết luận DioraLink:</b> ${esc(item.admin_note)}</div>`:''}<div class="tiny muted" style="margin-top:10px">${dateTime(item.created_at)}</div></article>`).join(''):'<div class="empty">Bạn chưa gửi khiếu nại nào.</div>';
  }catch(e){document.getElementById('complaint-list').innerHTML=`<div class="notice">${esc(e.message)}</div>`;}
}
async function renderAdminComplaints(){
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Admin</div><div class="section-title">XÉT DUYỆT KHIẾU NẠI</div></div></div><div id="admin-complaint-list"><div class="empty">Đang tải…</div></div></section>`;
  try{
    const res=await adminApi('/api/admin/complaints');
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.message||'Không thể tải khiếu nại.');
    const target=document.getElementById('admin-complaint-list');
    if(!target)return;
    target.innerHTML=data.complaints?.length?data.complaints.map(item=>`<article class="card pad" style="margin-bottom:14px"><div class="between"><div><div class="eyebrow">${esc(item.complainant_role)} · ${esc(item.complainant_name||'')} · ${esc(item.subject_type)} ${esc(item.subject_ref)}</div><h3 style="margin-top:7px">${esc(item.reason)}</h3></div><span class="pill ${item.status==='pending'?'pill-warning':item.status==='approved'?'pill-success':''}">${esc(item.status)}</span></div><div class="grid three complaint-media-grid">${(item.evidence||[]).map(complaintMediaMarkup).join('')}</div>${item.admin_note?`<div class="notice" style="margin-top:10px">${esc(item.admin_note)}</div>`:''}${item.status==='pending'?`<div class="wrap" style="margin-top:12px"><button class="btn btn-mint btn-sm" onclick="reviewComplaint('${item.id}','approved')">Chấp thuận</button><button class="btn btn-danger btn-sm" onclick="reviewComplaint('${item.id}','rejected')">Từ chối</button></div>`:''}</article>`).join(''):'<div class="empty">Chưa có khiếu nại.</div>';
  }catch(e){document.getElementById('admin-complaint-list').innerHTML=`<div class="notice">${esc(e.message)}</div>`;}
}
function reviewComplaint(id,status){
  document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><b>${status==='approved'?'Chấp thuận':'Từ chối'} khiếu nại</b><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body"><form onsubmit="submitComplaintReview(event,'${id}','${status}')"><div class="label">Kết luận / căn cứ</div><textarea class="field" name="note" minlength="10" maxlength="3000" required></textarea><button class="btn ${status==='approved'?'btn-mint':'btn-danger'}" style="width:100%;margin-top:14px">Xác nhận</button></form></div></div></div>`;
  window.lucide?.createIcons();
}
async function submitComplaintReview(event,id,status){
  event.preventDefault();
  const fd=new FormData(event.target);
  try{
    const res=await adminApi('/api/admin/complaints/'+encodeURIComponent(id)+'/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,note:fd.get('note')})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.message||'Không thể xét duyệt.');
    closeModal();toast('Đã cập nhật kết quả khiếu nại.','success');renderAdminComplaints();
  }catch(e){toast(e.message||'Không thể xét duyệt.','error');}
}

function addNotification(n){state.notifications.unshift({id:'N-'+Date.now(),read:false,time:'Vừa xong',...n});}
function openNotifications(){
  document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><b>Notifications</b><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body">${state.notifications.length?state.notifications.map(n=>`<button class="card-soft pad" style="width:100%;text-align:left;margin-bottom:8px;${n.read?'opacity:.65':''}" onclick="openNotification('${n.id}')"><div class="between"><b class="small">${esc(n.title)}</b><span class="tiny muted">${esc(n.time)}</span></div><div class="small muted" style="margin-top:5px">${esc(n.body)}</div></button>`).join(''):'<div class="empty">No notifications.</div>'}</div></div></div>`;window.lucide?.createIcons();}
function openNotification(id){const n=state.notifications.find(x=>x.id===id);if(!n)return;n.read=true;save();closeModal();if(n.route)navigate(n.route);}
function closeModal(e){if(e && e.target!==e.currentTarget)return;const root=document.getElementById('modal-root');if(e&&root?.querySelector('form')){toast('Biểu mẫu vẫn đang mở để tránh mất nội dung. Dùng nút × nếu bạn thực sự muốn đóng.','warning');return;}if(root)root.innerHTML='';}
function toast(message,type='success'){const el=document.createElement('div');el.className='toast '+type;el.textContent=message;document.getElementById('toast-root').appendChild(el);setTimeout(()=>el.remove(),3500);}

function renderAccount(){
  if(!isAuthenticated()){document.getElementById('app').innerHTML=`<section class="page"><div class="auth-grid"><div class="auth-brand"><div class="eyebrow">Account</div><div class="section-title" style="font-size:54px;margin-top:12px">WELCOME BACK.<br><span style="color:var(--mint)">BUILD WITH DIORALINK.</span></div><div class="hero-cta"><button class="btn btn-mint" onclick="openAuthModal('login')">Sign in</button><button class="btn" onclick="openAuthModal('register')">Register</button></div></div><div class="card pad"><div class="eyebrow">Access</div><div class="section-title" style="font-size:34px;margin-top:10px">ACCOUNT ACCESS</div><div class="wrap" style="margin-top:14px"><span class="pill">Customer</span><span class="pill">Artisan</span></div><div class="divider"></div><div class="small muted">Email, Google or Facebook</div></div></div></section>`;return;}
  const isA=isArtisan();const artisanProfile=isA?artisanById(state.user.artisanId):null;document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Account</div><div class="section-title">PROFILE & SETTINGS</div></div><div class="wrap"><span class="role-badge">${isA?'Artisan':'Customer'}</span><button class="btn btn-danger" onclick="logout()">Logout</button></div></div>${isA?`<div class="card pad artisan-profile-shortcut"><div><div class="eyebrow">Hồ sơ nghệ nhân</div><div class="section-title" style="font-size:30px;margin-bottom:6px">STUDIO CỦA BẠN</div><p class="small muted">${artisanProfile?.slug?'Hồ sơ đang công khai trên DioraLink.':'Hoàn thiện portfolio và công khai để khách hàng có thể tìm thấy bạn.'}</p></div><div class="wrap"><button class="btn btn-mint" onclick="navigate('artisan-portfolio')">Chỉnh sửa hồ sơ nghệ nhân</button>${artisanProfile?.slug?`<a class="btn" href="/nghe-nhan/${esc(artisanProfile.slug)}">Xem hồ sơ công khai</a>`:''}</div></div>`:''}<div class="grid two"><form class="card pad" data-autosave-key="profile:${esc(state.user.id)}" onsubmit="saveProfile(event)"><div class="avatar-editor"><img id="profile-avatar-preview" class="avatar" ${mediaAttrs(state.user.avatar,state.user.avatarFallback||GUEST_USER.avatar)}><div><div class="display" style="font-size:29px;text-transform:uppercase">${esc(state.user.name)}</div><div class="small muted">${esc(state.user.email)} · ${esc(state.user.provider||'email')}</div><label class="file-input-label" style="margin-top:8px"><i data-lucide="camera" style="width:14px"></i> Change avatar<input id="profile-avatar-file" name="avatarFile" type="file" accept="image/*" style="display:none" onchange="previewAvatarFile(this)"></label></div></div><div class="grid two" style="margin-top:16px"><div><div class="label">Name</div><input class="field" name="name" value="${esc(state.user.name)}" required></div><div><div class="label">Phone</div><input class="field" name="phone" value="${esc(state.user.phone||'')}"></div></div><div style="margin-top:12px"><div class="label">City</div><input class="field" name="city" value="${esc(state.user.city||'')}"></div><div style="margin-top:12px"><div class="label">Bio</div><textarea class="field" name="bio">${esc(state.user.bio||'')}</textarea></div><p class="tiny muted" data-autosave-status style="margin-top:12px">Tự động lưu đang bật.</p><button class="btn btn-mint" style="margin-top:10px">Save changes</button></form><div class="card pad"><div class="eyebrow">Security</div><div class="section-title" style="font-size:31px">ACCOUNT SECURITY</div><div class="grid two" style="margin-top:14px"><div class="card-soft pad"><div class="label">Role</div><b>${isA?'Artisan':'Customer'}</b></div><div class="card-soft pad"><div class="label">Provider</div><b>${esc(state.user.provider||'email')}</b></div></div><div class="divider"></div><button class="btn btn-mint" style="width:100%;margin-bottom:8px" onclick="openRoleSwitcher()">Quản lý vai trò · ${(state.user.roles||[state.user.role]).length}/2</button><button class="btn" style="width:100%" onclick="openChangePassword()">Change password</button><button class="btn btn-danger" style="width:100%;margin-top:8px" onclick="logout()">Log out</button></div></div></section>`;window.lucide?.createIcons();
}
function previewAvatarFile(input){const f=input?.files?.[0];if(!f)return;if(f.size>3*1024*1024){toast('Avatar must be 3MB or smaller.','error');input.value='';return;}readFileDataUrl(f).then(url=>{const el=document.getElementById('profile-avatar-preview');if(el)el.src=url;});}
async function compressAvatarFile(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const maxSize=800;
        let width=img.width;
        let height=img.height;
        if(width>maxSize||height>maxSize){
          const scale=Math.min(maxSize/width,maxSize/height);
          width=Math.round(width*scale);
          height=Math.round(height*scale);
        }
        const canvas=document.createElement('canvas');
        canvas.width=width;
        canvas.height=height;
        const ctx=canvas.getContext('2d');
        if(!ctx){reject(new Error('Unable to process avatar image.'));return;}
        ctx.fillStyle='#ffffff';
        ctx.fillRect(0,0,width,height);
        ctx.drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL('image/jpeg',0.82));
      };
      img.onerror=()=>reject(new Error('Unable to read avatar image.'));
      img.src=reader.result;
    };
    reader.onerror=()=>reject(new Error('Unable to read avatar file.'));
    reader.readAsDataURL(file);
  });
}

async function saveProfile(e){
  e.preventDefault();
  if(!requireAuth())return;
  const fd=new FormData(e.target);
  const submit=e.target.querySelector("button[type='submit']");
  if(submit){submit.disabled=true;submit.textContent='Saving...';}
  try{
    const name=String(fd.get('name')||'').trim();
    const phone=String(fd.get('phone')||'').trim();
    const city=String(fd.get('city')||'').trim();
    const bio=String(fd.get('bio')||'').trim();
    if(!name)throw new Error('Name is required.');
    let avatar=state.user.avatar||GUEST_USER.avatar;
    const avatarFile=fd.get('avatarFile');
    if(avatarFile&&avatarFile.size){
      if(!avatarFile.type.startsWith('image/'))throw new Error('Avatar must be an image.');
      if(avatarFile.size>3*1024*1024)throw new Error('Avatar must be 3MB or smaller.');
      avatar=await compressAvatarFile(avatarFile);
    }
    const res=await fetch(apiURL('/api/auth/profile'),{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify({name,phone,city,bio,avatar})
    });
    const raw=await res.text();
    let data={};
    try{data=raw?JSON.parse(raw):{};}catch{}
    if(!res.ok){
      console.error('Profile API error:',res.status,raw);
      throw new Error(data.message||`Profile update failed (HTTP ${res.status}).`);
    }
    const user=data.user||{};
    state.user={...state.user,...user,authenticated:true};
    state.session={authenticated:true,userId:state.user.id};
    clearFormDraft(e.target);
    save();
    toast('Profile updated.','success');
    render();
  }catch(error){
    console.error('saveProfile error:',error);
    toast(error.message||'Unable to update profile.','error');
  }finally{
    if(submit){submit.disabled=false;submit.textContent='Save changes';}
  }
}
function openAccountMenu(){if(!isAuthenticated()){openAuthModal('login');return;}navigate('account');}
function openChangePassword(){document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><div><div class="eyebrow">Security</div><b>Change password</b></div><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body"><form onsubmit="changePassword(event)"><div class="label">Current password</div><input class="field" name="currentPassword" type="password" autocomplete="current-password" minlength="8" required><div style="margin-top:12px"><div class="label">New password</div><input class="field" name="newPassword" type="password" autocomplete="new-password" minlength="8" required></div><div style="margin-top:12px"><div class="label">Confirm new password</div><input class="field" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></div><button id="change-password-submit" class="btn btn-mint" style="width:100%;margin-top:16px">Update password</button></form></div></div></div>`;window.lucide?.createIcons();}
async function changePassword(e){e.preventDefault();if(!requireAuth())return;const fd=new FormData(e.target);const current=String(fd.get('currentPassword')||'');const next=String(fd.get('newPassword')||'');const confirm=String(fd.get('confirmPassword')||'');if(next.length<8){toast('Password must be at least 8 characters.','warning');return;}if(next!==confirm){toast('New passwords do not match.','warning');return;}const submit=document.getElementById('change-password-submit');if(submit){submit.disabled=true;submit.textContent='Updating...';}try{if(CONFIG.demoMode){state.authPasswords=state.authPasswords||{};const key=state.user.email.toLowerCase();const existing=state.authPasswords[key];if(existing&&existing!==current)throw new Error('Current password is incorrect.');state.authPasswords[key]=next;save();closeModal();toast('Password updated.','success');return;}const res=await fetch(apiURL('/api/auth/change-password'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({currentPassword:current,newPassword:next})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||'Unable to update password.');closeModal();toast('Password updated.','success');}catch(error){toast(error.message||'Unable to update password.','warning');}finally{if(submit){submit.disabled=false;submit.textContent='Update password';}}}

function openRoleSwitcher(){
  if(!requireAuth())return;
  const customerEnabled=hasRole('customer');
  const artisanEnabled=hasRole('artisan');
  document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><div><div class="eyebrow">Một tài khoản · hai vai trò</div><b>Chọn không gian làm việc</b></div><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body"><p class="body">Bạn có thể mua hàng và đặt commission bằng vai trò Khách hàng, đồng thời bán sản phẩm và nhận commission bằng vai trò Nghệ nhân. Dữ liệu của hai vai trò dùng chung một tài khoản.</p><div class="role-cards" style="margin-top:16px"><button class="role-card ${isCustomer()?'selected':''}" onclick="activateRole('customer',${customerEnabled?'false':'true'})"><b>Khách hàng</b><span>${customerEnabled?'Đã bật · '+(isCustomer()?'Đang sử dụng':'Chuyển sang'):'Bật vai trò này'}</span></button><button class="role-card ${isArtisan()?'selected':''}" onclick="activateRole('artisan',${artisanEnabled?'false':'true'})"><b>Nghệ nhân</b><span>${artisanEnabled?'Đã bật · '+(isArtisan()?'Đang sử dụng':'Chuyển sang'):'Bật vai trò này'}</span></button></div></div></div></div>`;
  window.lucide?.createIcons();
}

async function activateRole(role,enable=false){
  if(!requireAuth())return;
  if(!['customer','artisan'].includes(role))return;
  if(currentRole()===role){closeModal();return;}
  try{
    if(CONFIG.demoMode){
      state.user.roles=Array.from(new Set([...(state.user.roles||[state.user.role]),role]));
      state.user.role=role;
      if(role==='artisan')ensureCurrentArtisanProfile();
      save();
      closeModal();
      toast(role==='artisan'?'Đã chuyển sang Nghệ nhân.':'Đã chuyển sang Khách hàng.','success');
      navigate(role==='artisan'?'artisan-dashboard':'customer-dashboard');
      return;
    }
    const res=await fetch(apiURL('/api/auth/role'),{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({role,enable})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.message||'Không thể thay đổi vai trò.');
    applyAuthenticatedUser(data.user,data.user?.provider||state.user.provider||'email');
    closeModal();
    toast(enable
      ? (role==='artisan'?'Bạn đã trở thành Nghệ nhân trên DioraLink.':'Bạn đã bật vai trò Khách hàng.')
      : (role==='artisan'?'Đã chuyển sang Nghệ nhân.':'Đã chuyển sang Khách hàng.'),
      'success'
    );
    navigate(role==='artisan'?'artisan-dashboard':'customer-dashboard');
  }catch(error){
    toast(error.message||'Không thể thay đổi vai trò.','error');
  }
}
function switchRole(role){return activateRole(role,!hasRole(role));}

function renderTrust(){ document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Trust</div><div class="section-title">TRUST & VERIFICATION</div></div></div><div class="grid three">${[['Identity','Basic identity / profile completeness'],['Portfolio','Public project history and selected works'],['Reviews','Customer feedback linked to completed work']].map(x=>`<div class="card pad"><div class="eyebrow">${x[0]}</div><div class="display" style="font-size:30px;text-transform:uppercase;margin-top:7px">${x[0]}</div><p class="body" style="margin-top:7px">${x[1]}</p></div>`).join('')}</div></section>`; }


function artisanProjects(){
  const aid=state.user?.artisanId;
  if(!aid) return [];
  return state.projects.filter(p=>p.artisanId===aid);
}
function matchingRequests(){
  const aid=state.user?.artisanId;
  if(!aid) return [];

  return state.requests.filter(
    r =>
      ['pending','proposal_received'].includes(r.status) &&
      !r.selectedProposal &&
      !r.proposals.some(p=>p.artisanId===aid) &&
      (r.creatorMode==='matching'||r.preferredArtisanId===aid)
  );
}
function renderArtisanDashboard(){
  const aid=state.user.artisanId||'A-001'; const a=artisanById(aid); const reqs=matchingRequests();const props=state.requests.flatMap(r=>r.proposals||[]).filter(p=>p.artisanId===aid);const projs=artisanProjects();const earnings=projs.flatMap(p=>p.payments||[]).filter(x=>x.status==='confirmed').reduce((s,x)=>s+(x.customerPaid||x.amount||0),0); const payProfile=getArtisanPaymentProfile(aid); const paymentReady=!!(payProfile?.qrImage||payProfile?.accountNumber);
  document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Dashboard</div><div class="section-title">WELCOME, ${esc((a?.name||state.user.name).split(' ')[0])}</div></div><button class="btn btn-mint" onclick="navigate('artisan-portfolio')">Manage portfolio</button></div>${!paymentReady?`<div class="notice" style="margin-bottom:14px">Add your bank details or personal QR before accepting direct payments. <button class="link-btn" type="button" onclick="navigate('artisan-portfolio')">Set up payments</button></div>`:''}
    <div class="grid four"><div class="card metric"><div class="n">${reqs.length}</div><div class="k">New commissions</div></div><div class="card metric"><div class="n">${props.length}</div><div class="k">My proposals</div></div><div class="card metric"><div class="n">${projs.length}</div><div class="k">Active projects</div></div><div class="card metric"><div class="n">${money(earnings)}</div><div class="k">Confirmed earnings</div></div></div>
    <div class="grid two" style="margin-top:16px"><div class="card pad"><div class="between"><div><div class="eyebrow">Incoming work</div><div class="section-title" style="font-size:30px">REQUEST INBOX</div></div><button class="btn btn-sm" onclick="navigate('artisan-requests')">Open inbox</button></div>${reqs.slice(0,4).map(r=>`<div class="card-soft pad" style="margin-top:10px"><div class="between"><div><b>${esc(r.title)}</b><div class="small muted">${money(r.budget)} · ${esc(r.timeline)}</div></div>${pill(r.status)}</div><button class="btn btn-sm" style="margin-top:8px" onclick="navigate('artisan-request/${r.id}')">View request →</button></div>`).join('')||'<div class="empty" style="margin-top:10px">No open requests.</div>'}</div>
      <div class="card pad"><div class="between"><div><div class="eyebrow">Production</div><div class="section-title" style="font-size:30px">ACTIVE PROJECTS</div></div><button class="btn btn-sm" onclick="navigate('artisan-projects')">View all</button></div>${projs.slice(0,3).map(p=>renderProjectCard(p,'artisan')).join('')||'<div class="empty" style="margin-top:10px">No active projects.</div>'}</div></div>
  </section>`;
}
function renderArtisanRequests(){
  const reqs=matchingRequests(); document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Artisan</div><div class="section-title">REQUEST INBOX</div></div></div>${reqs.length?reqs.map(r=>`<article class="card pad" style="margin-bottom:12px"><div class="between"><div><div class="wrap">${pill(r.status)}<span class="pill">${esc(r.style)}</span></div><div class="display" style="font-size:31px;text-transform:uppercase;margin-top:7px">${esc(r.title)}</div><div class="small muted">Budget ${money(r.budget)} · ${esc(r.timeline)} · Created ${dateOnly(r.createdAt)}</div></div><button class="btn btn-mint" onclick="navigate('artisan-request/${r.id}')">Review request →</button></div><p class="body" style="margin-top:12px">${esc(r.description)}</p></article>`).join(''):'<div class="empty">No matching requests.</div>'}</section>`;
}
function renderArtisanRequest(id){
  const r=requestById(id);const aid=state.user.artisanId||'A-001';const a=artisanById(aid);if(!r){document.getElementById('app').innerHTML='<section class="page"><div class="empty">Request not found.</div></section>';return;}
  const already=r.proposals.find(p=>p.artisanId===aid);const locked=!!already&&already.status!=='pending';const canChat=!!already||(r.creatorMode==='specific'&&r.preferredArtisanId===aid);
  document.getElementById('app').innerHTML=`<section class="page"><button class="btn btn-sm" onclick="navigate('artisan-requests')">← Inbox</button><div class="section-head"><div><div class="eyebrow">Customer brief · ${esc(r.id)}</div><div class="section-title">${esc(r.title)}</div><div class="wrap" style="margin-top:10px">${pill(r.status)}<span class="pill">${esc(r.style)}</span><span class="pill">${esc(r.size)}</span></div></div><div class="card pad"><div class="label">Budget</div><div class="display" style="font-size:34px">${money(r.budget)}</div><div class="small muted">Timeline ${esc(r.timeline)}</div></div></div>
    <div class="wrap" style="margin:-4px 0 16px"><button class="btn btn-danger btn-sm" onclick="openComplaint('commission_request','${esc(r.id)}','${esc(r.title)}')"><i data-lucide="shield-alert" style="width:14px"></i> Gửi khiếu nại</button>${canChat?`<button class="btn btn-mint btn-sm" onclick="openRequestConversation('${esc(r.id)}','${esc(aid)}')"><i data-lucide="message-circle" style="width:14px"></i> Nhắn khách hàng</button>`:''}</div>
    <div class="grid two"><div class="card pad"><div class="eyebrow">Brief</div><div class="section-title" style="font-size:29px">WHAT CUSTOMER NEEDS</div><p class="body" style="margin-top:10px">${esc(r.description)}</p>${r.attachments?.length?`<div class="divider"></div><div class="label">Reference images</div>${renderAttachmentList(r.attachments)}`:``}<div class="divider"></div><div class="label">Request routing</div><div class="small">${r.creatorMode==='specific'?'Direct request for specific artisan':'Open matching request'}</div><div class="divider"></div></div>
      <form class="card pad" data-autosave-key="artisan-proposal:${esc(r.id)}" onsubmit="submitArtisanProposal(event,'${r.id}')"><div class="eyebrow">Artisan response</div><div class="section-title" style="font-size:29px">${already?'CẬP NHẬT BÁO GIÁ':'TẠO BÁO GIÁ'}</div>${already&&!locked?'<div class="notice" style="margin-top:10px">Bạn có thể thay đổi giá, timeline, lời nhắn hoặc hạng mục rồi gửi revision mới cho khách.</div>':''}<div class="grid two" style="margin-top:12px"><div><div class="label">Your quote (VND)</div><input class="field" name="quote" type="number" min="500000" step="50000" value="${already?.quote||r.budget}" ${locked?'disabled':''} required></div><div><div class="label">Estimated timeline</div><input class="field" name="timeline" value="${esc(already?.timeline||r.timeline)}" ${locked?'disabled':''} required></div></div><div style="margin-top:12px"><div class="label">Message to customer</div><textarea class="field" name="message" ${locked?'disabled':''} required>${esc(already?.message||'Mình đã xem brief và có thể triển khai theo scope đã mô tả.')}</textarea></div><div style="margin-top:12px"><div class="label">Deliverables</div><div class="grid two">${['Concept refinement','Base structure','Sculpt & composition','Paint & resin','Final assembly'].map((x,i)=>`<label class="card-soft pad small"><input type="checkbox" name="deliverable" value="${x}" ${already?.deliverables?.includes(x)||(!already&&i<4)?'checked':''} ${locked?'disabled':''}> ${x}</label>`).join('')}</div></div>${locked?'<div class="notice" style="margin-top:12px">Báo giá đã được chốt và không còn chỉnh sửa.</div>':('<p class="tiny muted" data-autosave-status style="margin-top:12px">Tự động lưu đang bật.</p><button class="btn btn-mint" style="width:100%;margin-top:10px">'+(already?'Gửi báo giá điều chỉnh cho khách →':'Gửi báo giá cho khách →')+'</button>')}</form>
    </div></section>`;
}
async function submitArtisanProposal(e,requestId){
  if(!requireRole('artisan'))return;
  e.preventDefault();
  const r=requestById(requestId),aid=state.user.artisanId||'A-001';
  if(!r)return;
  if(r.status==='expired'){toast('Yêu cầu này đã tự động hủy sau 3 ngày.','warning');return;}
  const existing=r.proposals.find(p=>p.artisanId===aid);
  if(existing&&existing.status!=='pending'){toast('Báo giá đã được chốt nên không thể chỉnh sửa.','warning');return;}
  const fd=new FormData(e.target),deliverables=fd.getAll('deliverable');
  if(!deliverables.length){toast('Chọn ít nhất một hạng mục bàn giao.','error');return;}
  const payload={quote:Number(fd.get('quote')),timeline:String(fd.get('timeline')||'').trim(),message:String(fd.get('message')||'').trim(),deliverables};
  const button=e.target.querySelector('button[type="submit"],button:not([type])');if(button)button.disabled=true;
  try{
    if(CONFIG.demoMode){
      if(existing)Object.assign(existing,payload,{revisionNo:Number(existing.revisionNo||1)+1,updatedAt:new Date().toISOString()});
      else r.proposals.push({id:'PROP-'+Date.now(),requestId,artisanId:aid,...payload,status:'pending',revisionNo:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      r.status='proposal_received';save();
    }else{
      const data=await commissionApi('/requests/'+encodeURIComponent(requestId)+'/proposals',{method:'POST',body:JSON.stringify(payload)});
      await syncCommissionWorkspace({force:true});
      toast(data.message||'Đã gửi báo giá cho khách hàng.','success');
      clearFormDraft(e.target);navigate('artisan-proposals');return;
    }
    clearFormDraft(e.target);toast(existing?'Đã gửi báo giá điều chỉnh cho khách hàng.':'Đã gửi báo giá cho khách hàng.','success');navigate('artisan-proposals');
  }catch(err){toast(err.message||'Không thể gửi báo giá.','error');}
  finally{if(button)button.disabled=false;}
}
function renderArtisanProposals(){const aid=state.user.artisanId||'A-001';const props=state.requests.flatMap(r=>r.proposals.map(p=>({...p,request:r}))).filter(p=>p.artisanId===aid);document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Artisan</div><div class="section-title">MY PROPOSALS</div></div><button class="btn" onclick="navigate('artisan-requests')">Browse requests</button></div><div class="grid three"><div class="card metric"><div class="n">${props.length}</div><div class="k">Sent</div></div><div class="card metric"><div class="n">${props.filter(p=>p.status==='accepted').length}</div><div class="k">Accepted</div></div><div class="card metric"><div class="n">${props.filter(p=>p.status==='pending').length}</div><div class="k">Pending</div></div></div><div style="margin-top:16px">${props.length?props.map(p=>`<article class="card pad" style="margin-bottom:10px"><div class="between"><div><div class="display" style="font-size:29px;text-transform:uppercase">${esc(p.request.title)}</div><div class="small muted">Quote ${money(p.quote)} · ${esc(p.timeline)}</div></div>${pill(p.status)}</div><p class="body" style="margin-top:9px">${esc(p.message)}</p><button class="btn btn-sm" style="margin-top:10px" onclick="navigate('artisan-request/${p.request.id}')">Open request →</button></article>`).join(''):'<div class="empty">No proposals yet.</div>'}</div></section>`;}
function renderArtisanProjects(){const list=artisanProjects();document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Artisan</div><div class="section-title">MY PROJECTS</div></div></div>${list.length?`<div class="grid two">${list.map(p=>renderProjectCard(p,'artisan')).join('')}</div>`:'<div class="empty">No projects assigned yet.</div>'}</section>`;}
function renderArtisanProject(id){const p=projectById(id);const aid=state.user.artisanId||'A-001';if(!p||p.artisanId!==aid){document.getElementById('app').innerHTML='<section class="page"><div class="empty">Project unavailable.</div></section>';return;}const next=p.milestones.find(m=>m.status==='pending'||m.status==='in_progress');const cust=customerById(p.customerId);document.getElementById('app').innerHTML=`<section class="page"><button class="btn btn-sm" onclick="navigate('artisan-projects')">← Projects</button><div class="section-head"><div><div class="eyebrow">Artisan project workspace · ${esc(p.id)}</div><div class="section-title">${esc(p.title)}</div><div class="wrap" style="margin-top:10px">${pill(p.status)}<span class="pill">Customer: ${esc(cust.name)}</span></div></div><div class="card pad"><div class="label">Project value</div><div class="display" style="font-size:34px">${money(p.budget)}</div></div></div>
  <div class="wrap" style="margin:-4px 0 16px"><button class="btn btn-danger btn-sm" onclick="openComplaint('commission_project','${esc(p.id)}','${esc(p.title)}')"><i data-lucide="shield-alert" style="width:14px"></i> Gửi khiếu nại</button></div>
  <div class="grid two"><div class="card pad"><div class="between"><div><div class="eyebrow">Execution</div><div class="section-title" style="font-size:29px">MILESTONE CONTROL</div></div><span class="pill pill-mint">${p.progress}%</span></div><div class="progress" style="margin-top:11px"><div style="width:${p.progress}%"></div></div><div style="margin-top:15px">${p.milestones.map((m,i)=>`<div class="card-soft pad" style="margin-bottom:9px"><div class="between"><div><b>${esc(m.name)}</b><div class="small muted">${m.percentage}% · ${money(m.amount)}</div></div>${pill(m.status)}</div>${m.status==='pending'?`<button class="btn btn-sm" style="margin-top:9px" onclick="startMilestone('${p.id}','${m.id}')">Start milestone</button>`:''}${m.status==='in_progress'?`<div style="margin-top:9px"><div class="label">Evidence / progress note</div><input class="field" id="ev-${m.id}" placeholder="Progress note or file link"><button class="btn btn-sm btn-mint" style="margin-top:8px" onclick="submitMilestone('${p.id}','${m.id}')">Submit for customer approval</button></div>`:''}${m.status==='submitted'?`<div class="small muted" style="margin-top:9px">Awaiting customer approval.</div>`:''}</div>`).join('')}</div><div class="card-soft pad" style="margin-top:12px"><div class="label">Payments</div>${p.milestones.map(m=>{const pay=p.payments.find(x=>x.milestoneId===m.id);return `<div class="card-soft pad" style="margin-top:8px"><div class="between"><span class="small">${esc(m.name)}</span>${pill(pay?.status||'pending')}</div><div class="price-line"><span>Amount</span><b>${money(pay?.customerPaid||m.amount)}</b></div>${pay?.status==='customer_reported'?`<button class="btn btn-sm btn-mint" style="width:100%;margin-top:8px" onclick="confirmDirectPayment('${p.id}','${m.id}')">Confirm payment received</button>`:''}${pay?.transferReference?`<div class="tiny muted" style="margin-top:6px">Reference: ${esc(pay.transferReference)}</div>`:''}</div>`}).join('')}</div></div>
    <div class="grid" style="gap:16px"><div class="card pad"><div class="between"><div><div class="eyebrow">Communication</div><div class="section-title" style="font-size:29px">CUSTOMER CHAT</div></div></div><div class="chat" style="margin-top:12px">${p.messages.map(m=>`<div class="msg ${m.senderRole==='artisan'?'me':''}">${esc(m.text||'')}${renderMessageAttachments(m)}<div class="msg-meta">${m.senderRole==='artisan'?esc(state.user.name):'Customer'} · ${esc(m.time)}</div></div>`).join('')}</div><div class="chat-compose"><input id="project-msg" class="field" placeholder="Message"><button class="btn btn-mint" onclick="sendMessage('${p.id}','artisan')">Send</button></div><div class="chat-tools"><label class="file-input-label"><i data-lucide="paperclip" style="width:14px"></i> Attach files<input id="project-chat-files" type="file" multiple accept="image/*,application/pdf,.stl,.obj,.3mf,.blend,.fbx,.glb,.gltf,.step,.stp,.3ds,.dae,.ply" style="display:none" onchange="showSelectedFiles(this)"></label><span id="chat-file-summary" class="tiny muted"></span></div></div><div class="card pad"><div class="eyebrow">Files & activity</div><form onsubmit="addFile(event,'${p.id}','artisan')" style="margin-top:10px"><input type="file" name="file" class="field" required><button class="btn btn-sm" style="margin-top:8px">Upload file</button></form><div class="divider"></div>${p.files.map(f=>`<div class="card-soft pad" style="margin-bottom:7px"><div class="small">${esc(f.name)}</div><div class="tiny muted">${Math.round(f.size/1024)} KB · ${esc(f.uploader)}</div></div>`).join('')||'<div class="small muted">No files</div>'}<div class="divider"></div>${p.activity.map(x=>`<div class="small" style="margin-bottom:8px">${esc(x.text)}<div class="tiny muted">${esc(x.time)}</div></div>`).join('')}</div></div>
  </div></section>`;}
function startMilestone(projectId,milestoneId){const p=projectById(projectId);const m=p?.milestones.find(x=>x.id===milestoneId);if(!p||!m||m.status!=='pending')return;const idx=p.milestones.findIndex(x=>x.id===milestoneId);if(idx>0){const prev=p.milestones[idx-1];const prevPay=p.payments.find(x=>x.milestoneId===prev.id);if(prevPay?.status!=='confirmed'){toast('Confirm the previous milestone payment before starting this stage.','warning');return;}}m.status='in_progress';p.status='in_production';p.currentMilestone=p.milestones.findIndex(x=>x.id===m.id)+1;p.activity.unshift({text:`Artisan started ${m.id}`,time:dateTime(new Date())});save();toast('Milestone started.','success');render();}
function submitMilestone(projectId,milestoneId){const p=projectById(projectId);const m=p?.milestones.find(x=>x.id===milestoneId);const input=document.getElementById('ev-'+milestoneId);if(!p||!m||m.status!=='in_progress'||!input?.value.trim()){toast('Add progress evidence before submitting.','error');return;}m.status='submitted';m.evidence=input.value.trim();p.status='waiting_customer';p.activity.unshift({text:`Artisan submitted ${m.id} for approval`,time:dateTime(new Date())});addNotification({title:'Milestone submitted',body:`${m.name} đang chờ Customer approval.`,route:`project/${p.id}`});save();toast('Sent for review.','success');render();}
function addFile(e,projectId,uploader){e.preventDefault();const f=e.target.file.files[0];if(!f)return;const p=projectById(projectId);p.files.push({id:'FILE-'+Date.now(),name:f.name,size:f.size,uploader,time:new Date().toISOString()});p.activity.unshift({text:`File registered: ${f.name}`,time:dateTime(new Date())});save();toast('File uploaded.','success');render();}

function renderArtisanPortfolio(){const aid=state.user.artisanId||'A-001';const a=artisanById(aid);const prof=a||{};document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Public profile</div><div class="section-title">MY PORTFOLIO</div></div><span class="role-badge">${prof.verified?'Verified':'Not verified'}</span></div>
  <p class="notice seo-note">Bấm “Lưu và công khai” để hiển thị tên, thành phố, giới thiệu, chuyên môn, giá tham khảo và ảnh trên trang nghệ nhân. Email, số điện thoại và thông tin thanh toán không nằm trong hồ sơ công khai. Sau khi thêm hoặc xóa ảnh, hãy bấm lưu để cập nhật trang công khai.</p>${prof.slug?`<p class="seo-note"><a class="seo-link" href="/nghe-nhan/${esc(prof.slug)}">Xem hồ sơ công khai →</a> <button class="btn btn-sm" onclick="unpublishArtisanProfile()">Ẩn hồ sơ</button></p>`:''}<form class="grid two seo-section" onsubmit="saveArtisanProfile(event,'${aid}')"><div class="card pad"><div class="avatar-editor" style="margin-bottom:14px"><img id="artisan-avatar-preview" class="avatar" ${mediaAttrs(prof.avatar||state.user.avatar||GUEST_USER.avatar,prof.avatarFallback||state.user.avatarFallback||GUEST_USER.avatar)}><label class="file-input-label"><i data-lucide="camera" style="width:14px"></i> Change avatar<input name="avatarFile" type="file" accept="image/*" style="display:none" onchange="previewArtisanAvatar(this)"></label></div><div class="label">Display name</div><input class="field" name="name" value="${esc(prof.name||state.user.name)}" required><div style="margin-top:12px"><div class="label">Handle</div><input class="field" name="handle" value="${esc(prof.handle||'@yourstudio')}" required></div><div style="margin-top:12px"><div class="label">City</div><input class="field" name="city" value="${esc(prof.city||state.user.city||'')}" required></div><div style="margin-top:12px"><div class="label">Bio</div><textarea class="field" name="bio" required>${esc(prof.bio||'')}</textarea></div><div class="grid two" style="margin-top:12px"><div><div class="label">Starting price (VND)</div><input class="field" name="startingPrice" type="number" value="${prof.startingPrice||3000000}" min="0" step="50000" required></div><div><div class="label">Response time</div><input class="field" name="response" value="${esc(prof.response||'< 1d')}" required></div></div><div style="margin-top:12px"><div class="label">Specialties</div><input class="field" name="specialties" value="${esc((prof.specialties||[]).join(', '))}" required></div><div style="margin-top:12px"><div class="label">Cover image</div><input class="field" name="heroFile" type="file" accept="image/*"></div><button type="submit" class="btn btn-mint" style="margin-top:16px">Lưu và công khai</button></div>
    <div class="card pad"><div class="eyebrow">Preview</div><div class="card-soft" style="overflow:hidden;margin-top:10px"><img id="portfolio-preview-hero" ${mediaAttrs(prof.hero,prof.heroFallback||'')} style="width:100%;height:240px;object-fit:cover"><div class="pad"><div class="display" style="font-size:31px;text-transform:uppercase">${esc(prof.name||'Your Studio')}</div><div class="small muted">${esc(prof.handle||'@yourstudio')} · ${esc(prof.city||'')}</div><p class="body" style="margin-top:9px">${esc(prof.bio||'')}</p><div class="wrap" style="margin-top:10px">${(prof.specialties||[]).map(s=>`<span class="pill">${esc(s)}</span>`).join('')}</div></div></div><div style="margin-top:14px"><div class="between"><div><div class="eyebrow">Portfolio</div></div></div><input id="portfolio-upload" class="field" type="file" accept="image/*" style="margin-top:9px"><button type="button" class="btn btn-sm" style="margin-top:8px" onclick="addPortfolioImage('${aid}')">Add work</button><div class="grid three" style="margin-top:10px">${(prof.portfolio||[]).map((img,i)=>`<div class="card-soft" style="position:relative;overflow:hidden"><img ${mediaAttrs(img,prof.portfolioFallback?.[i]||'')} style="width:100%;height:110px;object-fit:cover"><button type="button" class="icon-btn" style="position:absolute;right:5px;top:5px;width:30px;height:30px;background:rgba(4,17,23,.62)" onclick="removePortfolioImage('${aid}',${i})"><i data-lucide="trash-2" style="width:14px"></i></button></div>`).join('')}</div></div><div class="card pad" style="grid-column:1/-1;margin-top:2px"><div class="between"><div><div class="eyebrow">Payment details</div><div class="section-title" style="font-size:29px">DIRECT PAYMENTS</div></div><span class="pill pill-mint">VietQR</span></div><p class="body" style="margin-top:8px">Customers pay directly to your bank account. Add the QR code and transfer details you want displayed at checkout.</p><div class="grid three" style="margin-top:12px"><div><div class="label">Bank</div><input class="field" name="paymentBankName" value="${esc(prof.paymentProfile?.bankName||'')}" placeholder="Bank name"></div><div><div class="label">Account holder</div><input class="field" name="paymentAccountName" value="${esc(prof.paymentProfile?.accountName||prof.name||'')}" placeholder="Account holder"></div><div><div class="label">Account number</div><input class="field" name="paymentAccountNumber" value="${esc(prof.paymentProfile?.accountNumber||'')}" inputmode="numeric" placeholder="Account number"></div></div><div style="margin-top:12px"><div class="label">Personal QR image</div><input class="field" name="paymentQRFile" type="file" accept="image/png,image/jpeg,image/webp"><div class="small muted" style="margin-top:5px">Upload the QR image generated by your banking app.</div></div><div style="margin-top:12px"><div class="label">QR image URL</div><input class="field" name="paymentQRUrl" type="url" value="${esc(prof.paymentProfile?.qrImage?.startsWith('http')?prof.paymentProfile.qrImage:'')}" placeholder="https://..."></div>${prof.paymentProfile?.qrImage?`<div class="card-soft pad" style="margin-top:10px;display:flex;align-items:center;gap:14px"><img ${mediaAttrs(prof.paymentProfile.qrImage,prof.paymentProfile.qrImageFallback||'')} alt="Payment QR" style="width:100px;height:100px;object-fit:contain;background:#fff;padding:6px"><div><b>QR connected</b><div class="small muted" style="margin-top:4px">Customers can scan this code at payment.</div><button type="button" class="btn btn-sm btn-danger" style="margin-top:8px" onclick="clearPaymentQR('${aid}')">Remove QR</button></div></div>`:''}<button type="button" class="btn btn-mint" style="margin-top:12px" onclick="savePaymentSettings('${aid}')">Save payment details</button></div>
  </form></section>`; const input=document.querySelector('[name="heroFile"]'); if(input) input.addEventListener('change', async()=>{const f=input.files[0];if(!f)return;if(f.size>1800000){toast('Ảnh cover tối đa 1.8MB trong Demo Mode.','error');input.value='';return;}const url=await readFileDataUrl(f);document.getElementById('portfolio-preview-hero').src=url;});}
function previewArtisanAvatar(input){const f=input?.files?.[0];if(!f)return;if(f.size>5*1024*1024){toast('Avatar must be 5MB or smaller.','error');input.value='';return;}readFileDataUrl(f).then(url=>{const el=document.getElementById('artisan-avatar-preview');if(el)el.src=url;});}
async function saveArtisanProfile(e,aid){e.preventDefault();const a=artisanById(aid);if(!a)return;const fd=new FormData(e.target);a.name=String(fd.get('name')).trim();a.handle=String(fd.get('handle')).trim();a.city=String(fd.get('city')).trim();a.bio=String(fd.get('bio')).trim();a.startingPrice=Number(fd.get('startingPrice'));a.response=String(fd.get('response')).trim();a.specialties=String(fd.get('specialties')).split(',').map(x=>x.trim()).filter(Boolean);const avatarFile=fd.get('avatarFile');const heroFile=fd.get('heroFile');try{if(avatarFile&&avatarFile.size){if(!avatarFile.type.startsWith('image/'))throw new Error('Avatar must be an image.');if(avatarFile.size>5*1024*1024)throw new Error('Avatar must be 5MB or smaller.');const oldAvatar=a.avatar;const rec=await storeBinaryFile(avatarFile,'artisan-avatar');a.avatar=`asset:${rec.id}`;a.avatarFallback=(typeof oldAvatar==='string'&&oldAvatar.startsWith('http'))?oldAvatar:GUEST_USER.avatar;}if(heroFile&&heroFile.size){if(heroFile.size>5*1024*1024)throw new Error('Cover image must be 5MB or smaller.');const oldHero=a.hero;const rec=await storeBinaryFile(heroFile,'artisan-hero');a.hero=`asset:${rec.id}`;a.heroFallback=(typeof oldHero==='string'&&oldHero.startsWith('http'))?oldHero:'';}state.user.name=a.name;state.user.city=a.city;state.user.bio=a.bio;state.user.avatar=a.avatar||state.user.avatar;state.user.avatarFallback=a.avatarFallback||state.user.avatarFallback||GUEST_USER.avatar;save();await publishArtisanProfile(a);toast('Profile published.','success');render();}catch(err){toast(err.message||'Unable to update profile.','error');}}
async function savePaymentSettings(aid){
  if(!requireRole('artisan'))return; const a=artisanById(aid); if(!a)return; const bank=document.querySelector('[name="paymentBankName"]')?.value.trim()||''; const holder=document.querySelector('[name="paymentAccountName"]')?.value.trim()||''; const number=document.querySelector('[name="paymentAccountNumber"]')?.value.trim()||''; const file=document.querySelector('[name="paymentQRFile"]')?.files?.[0]; const qrUrl=document.querySelector('[name="paymentQRUrl"]')?.value.trim()||'';
  if(!a.paymentProfile)a.paymentProfile={method:'vietqr',bankName:'',accountName:'',accountNumber:'',qrImage:''}; a.paymentProfile.bankName=bank;a.paymentProfile.accountName=holder;a.paymentProfile.accountNumber=number;
  if(file){if(file.size>5*1024*1024){toast('QR image must be 5MB or smaller.','error');return;}const oldQR=a.paymentProfile.qrImage;const rec=await storeBinaryFile(file,'artisan-qr');a.paymentProfile.qrImage=`asset:${rec.id}`;a.paymentProfile.qrImageFallback=(typeof oldQR==='string'&&oldQR.startsWith('http'))?oldQR:'';}else if(qrUrl)a.paymentProfile.qrImage=qrUrl;a.paymentProfile.qrImageFallback=a.paymentProfile.qrImageFallback||'';
  save();toast('Payment details saved.','success');render();
}
function clearPaymentQR(aid){if(!requireRole('artisan'))return;const a=artisanById(aid);if(!a?.paymentProfile)return;a.paymentProfile.qrImage='';save();toast('Payment QR removed.','success');render();}
function readFileDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
async function addPortfolioImage(aid){const input=document.getElementById('portfolio-upload');const f=input?.files?.[0];const a=artisanById(aid);if(!f||!a)return;if(f.size>5*1024*1024){toast('Portfolio image must be 5MB or smaller.','error');return;}const rec=await storeBinaryFile(f,'portfolio');a.portfolio=a.portfolio||[];a.portfolio.push(`asset:${rec.id}`);a.portfolioFallback=a.portfolioFallback||[];a.portfolioFallback.push('');save();toast('Portfolio updated.','success');render();}
function removePortfolioImage(aid,index){const a=artisanById(aid);if(!a)return;a.portfolio.splice(index,1);save();toast('Portfolio updated.','success');render();}
function renderArtisanEarnings(){const list=artisanProjects();const confirmed=list.flatMap(p=>p.payments||[]).filter(x=>x.status==='confirmed');const total=confirmed.reduce((s,x)=>s+(x.customerPaid||x.amount||0),0);const pending=list.flatMap(p=>p.milestones.map(m=>({m,pay:p.payments.find(x=>x.milestoneId===m.id)}))).filter(x=>x.m.status==='approved'&&x.pay?.status!=='confirmed').reduce((s,x)=>s+x.m.amount,0);document.getElementById('app').innerHTML=`<section class="page"><div class="section-head"><div><div class="eyebrow">Finance</div><div class="section-title">EARNINGS</div></div></div><div class="grid three"><div class="card metric"><div class="n">${money(total)}</div><div class="k">Released</div></div><div class="card metric"><div class="n">${money(pending)}</div><div class="k">Pending</div></div><div class="card metric"><div class="n">${list.length}</div><div class="k">Projects</div></div></div><div class="card pad" style="margin-top:16px"><div class="eyebrow">Transaction history</div><div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Project</th><th>Milestone</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${list.flatMap(p=>p.milestones.map(m=>{const pay=p.payments.find(x=>x.milestoneId===m.id);return `<tr><td>${esc(p.title)}</td><td>${esc(m.name)}</td><td>${money(m.amount)}</td><td>${pill(pay?.status||'pending')}</td><td>${pay?.confirmedAt?dateOnly(pay.confirmedAt):'—'}</td></tr>`})).join('')}</tbody></table></div></div></section>`;}


let googleInitialized=false;
const thirdPartyScriptLoads=new Map();
function loadThirdPartyScript(src,id){
  if(id){
    const existing=document.getElementById(id);
    if(existing){
      if(existing.dataset.loaded==='1')return Promise.resolve(existing);
      const existingPromise=thirdPartyScriptLoads.get(src);
      if(existingPromise)return existingPromise;
    }
  }
  if(thirdPartyScriptLoads.has(src))return thirdPartyScriptLoads.get(src);
  const promise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    if(id)script.id=id;
    script.async=true;
    script.defer=true;
    script.onload=()=>{script.dataset.loaded='1';resolve(script);};
    script.onerror=()=>reject(new Error('Không thể tải dịch vụ đăng nhập bên thứ ba.'));
    document.head.appendChild(script);
  });
  thirdPartyScriptLoads.set(src,promise);
  promise.catch(()=>thirdPartyScriptLoads.delete(src));
  return promise;
}
async function ensureGoogleIdentity(){
  if(window.google?.accounts?.id)return;
  await loadThirdPartyScript('https://accounts.google.com/gsi/client','dioralink-google-gsi');
  if(!window.google?.accounts?.id)throw new Error('Google Sign-In chưa sẵn sàng.');
}
async function ensureFacebookSdk(){
  if(window.FB)return;
  if(!CONFIG.facebookAppId||CONFIG.facebookAppId.includes('YOUR_FACEBOOK'))throw new Error('Chưa cấu hình Facebook App ID.');
  await loadThirdPartyScript('https://connect.facebook.net/en_US/sdk.js','dioralink-facebook-sdk');
  if(!window.FB)throw new Error('Facebook SDK chưa sẵn sàng.');
}
let authMode="login"; let authRegisterRole="customer"; let authLoginRole="customer";
function openAuthModal(mode="login"){authMode=mode;renderAuthModal();}
function switchAuthMode(mode){authMode=mode;renderAuthModal();}
function demoSignIn(role,provider,email,name){ if(role==='artisan'){const a=artisanById('A-001');state.user=authUserFromArtisan(a,provider);state.user.email=email||state.user.email;state.user.name=name||state.user.name;}else{state.user={...clone(SEED.user),role:'customer',authenticated:true,provider};if(email)state.user.email=email;if(name)state.user.name=name;}state.session={authenticated:true,userId:state.user.id};save();closeModal();toast(`Đăng nhập ${provider==='google'?'Google':provider==='facebook'?'Facebook':'Email'} thành công.`,'success');navigate(roleAfterLogin(state.user.role));}
function renderAuthModal(){
  const register=authMode==='register';
  const role=register?authRegisterRole:authLoginRole;
  const roleName=role==='artisan'?'Nghệ nhân':'Khách hàng';
  const roleCopy=role==='artisan'
    ? 'Đăng tác phẩm · nhận commission · quản lý đơn bán'
    : 'Khám phá creator · đặt commission · mua sản phẩm';

  document.getElementById('modal-root').innerHTML=`
    <div class="modal-backdrop auth-backdrop" onclick="closeModal(event)">
      <section class="auth-premium-modal" role="dialog" aria-modal="true" aria-label="${register?'Đăng ký DioraLink':'Đăng nhập DioraLink'}" onclick="event.stopPropagation()">
        <aside class="auth-premium-visual" aria-hidden="true">
          <div class="auth-space-grid"></div>
          <span class="auth-planet auth-planet-large"></span>
          <span class="auth-planet auth-planet-small"></span>
          <span class="auth-planet auth-planet-glow"></span>
          <span class="auth-orbit auth-orbit-one"></span>
          <span class="auth-orbit auth-orbit-two"></span>
          <span class="auth-star auth-star-one"></span>
          <span class="auth-star auth-star-two"></span>
          <span class="auth-star auth-star-three"></span>

          <div class="auth-visual-content">
            <div class="auth-visual-brand">
              <span class="auth-visual-mark"><i data-lucide="layers-3"></i></span>
              <div>
                <strong>DIORALINK</strong>
                <span>CONNECTING CREATIVE WORLDS</span>
              </div>
            </div>

            <div class="auth-visual-copy">
              <div class="auth-visual-kicker">${register?'CREATE YOUR SPACE':'WELCOME BACK'}</div>
              <h2>${register?'BUILD YOUR':'ENTER YOUR'}<br><span>CREATIVE WORLD.</span></h2>
              <p>${register
                ? 'Một tài khoản cho commission, marketplace và hành trình xây dựng studio của bạn.'
                : 'Quay lại nơi ý tưởng gặp đúng người có thể biến chúng thành hiện thực.'}</p>
            </div>

            <div class="auth-visual-foot">
              <span></span>
              <p>COMMISSION · MARKETPLACE · CREATOR NETWORK</p>
            </div>
          </div>
        </aside>

        <div class="auth-premium-panel">
          <div class="auth-premium-head">
            <div>
              <div class="auth-panel-kicker">${register?'BẮT ĐẦU VỚI DIORALINK':'CHÀO MỪNG TRỞ LẠI'}</div>
              <h3>${register?'Tạo tài khoản':'Đăng nhập'}</h3>
              <p>${register?'Chọn vai trò ban đầu. Bạn có thể bật vai trò còn lại sau.':'Tiếp tục với không gian làm việc bạn muốn sử dụng.'}</p>
            </div>
            <button class="auth-premium-close" type="button" onclick="closeModal()" aria-label="Đóng">
              <i data-lucide="x"></i>
            </button>
          </div>

          <div class="auth-role-section">
            <div class="auth-role-label">Tiếp tục với vai trò</div>
            <div class="auth-role-pills">
              <button type="button" class="auth-role-pill ${role==='customer'?'active':''}" onclick="${register?"authRegisterRole='customer'":"authLoginRole='customer'"};renderAuthModal()">
                <span class="auth-role-icon"><i data-lucide="shopping-bag"></i></span>
                <span><b>Khách hàng</b><small>Discover · Request · Buy</small></span>
              </button>
              <button type="button" class="auth-role-pill ${role==='artisan'?'active':''}" onclick="${register?"authRegisterRole='artisan'":"authLoginRole='artisan'"};renderAuthModal()">
                <span class="auth-role-icon"><i data-lucide="sparkles"></i></span>
                <span><b>Nghệ nhân</b><small>Publish · Propose · Sell</small></span>
              </button>
            </div>
            <div class="auth-role-summary"><span></span>${roleCopy}</div>
          </div>

          <div class="auth-mode-tabs" role="tablist">
            <button type="button" class="${authMode==='login'?'active':''}" onclick="switchAuthMode('login')">Đăng nhập</button>
            <button type="button" class="${authMode==='register'?'active':''}" onclick="switchAuthMode('register')">Đăng ký</button>
          </div>

          ${register?`
            <form class="auth-premium-form" onsubmit="registerEmail(event)">
              <label class="auth-premium-field">
                <span>Họ và tên</span>
                <div class="auth-premium-input">
                  <i data-lucide="user-round"></i>
                  <input id="register-name" type="text" autocomplete="name" minlength="2" maxlength="120" placeholder="Tên hiển thị của bạn" required>
                </div>
              </label>
              <label class="auth-premium-field">
                <span>Email</span>
                <div class="auth-premium-input">
                  <i data-lucide="mail"></i>
                  <input id="register-email" type="email" autocomplete="email" placeholder="you@example.com" required>
                </div>
              </label>
              <div class="auth-premium-two">
                <label class="auth-premium-field">
                  <span>Mật khẩu</span>
                  <div class="auth-premium-input">
                    <i data-lucide="lock-keyhole"></i>
                    <input id="register-password" type="password" autocomplete="new-password" minlength="8" placeholder="Tối thiểu 8 ký tự" required>
                  </div>
                </label>
                <label class="auth-premium-field">
                  <span>Xác nhận</span>
                  <div class="auth-premium-input">
                    <i data-lucide="shield-check"></i>
                    <input id="register-password-confirm" type="password" autocomplete="new-password" minlength="8" placeholder="Nhập lại mật khẩu" required>
                  </div>
                </label>
              </div>
              <label class="auth-premium-check">
                <input id="register-terms" type="checkbox" required>
                <span>Tôi đồng ý với <button type="button" onclick="openLegalModal('terms')">Điều khoản</button> và <button type="button" onclick="openLegalModal('privacy')">Chính sách riêng tư</button>.</span>
              </label>
              <button id="register-submit" class="auth-primary-submit" type="submit">
                Tạo tài khoản ${roleName}
                <i data-lucide="arrow-right"></i>
              </button>
            </form>
          `:`
            <form class="auth-premium-form" onsubmit="loginEmail(event)">
              <label class="auth-premium-field">
                <span>Email</span>
                <div class="auth-premium-input">
                  <i data-lucide="mail"></i>
                  <input id="login-email" type="email" autocomplete="email" placeholder="you@example.com" required>
                </div>
              </label>
              <label class="auth-premium-field">
                <span class="auth-field-between"><span>Mật khẩu</span><button type="button" onclick="openPasswordReset()">Quên mật khẩu?</button></span>
                <div class="auth-premium-input">
                  <i data-lucide="lock-keyhole"></i>
                  <input id="login-password" type="password" autocomplete="current-password" minlength="8" placeholder="••••••••" required>
                </div>
              </label>
              <label class="auth-premium-check auth-remember">
                <input type="checkbox">
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <button id="login-submit" class="auth-primary-submit" type="submit">
                Đăng nhập với tư cách ${roleName}
                <i data-lucide="arrow-right"></i>
              </button>
            </form>
          `}

          <div class="auth-premium-divider"><span>Hoặc tiếp tục với</span></div>

          <div class="auth-social-grid">
            <button type="button" class="auth-social-card auth-google" onclick="authSocial('google')">
              <span class="auth-social-logo">G</span>
              <span>Google</span>
            </button>
            <button type="button" class="auth-social-card auth-facebook" onclick="authSocial('facebook')">
              <span class="auth-social-logo">f</span>
              <span>Facebook</span>
            </button>
          </div>

          <p class="auth-switch-note">
            ${register
              ? `Đã có tài khoản? <button type="button" onclick="switchAuthMode('login')">Đăng nhập</button>`
              : `Chưa có tài khoản? <button type="button" onclick="switchAuthMode('register')">Đăng ký ngay</button>`}
          </p>
        </div>
      </section>
    </div>`;

  window.lucide?.createIcons();
}
function authSocial(provider){const role=authMode==='register'?authRegisterRole:authLoginRole;if(CONFIG.demoMode){demoSignIn(role,provider,role==='artisan'?'artisan@example.com':'quynhanh@example.com',role==='artisan'?'Đào Studio Owner':'Quỳnh Anh');return;} if(provider==='google')return loginGoogle(); if(provider==='facebook')return loginFacebook();}
async function loginEmail(event){event.preventDefault();const email=document.getElementById('login-email')?.value.trim().toLowerCase();const password=document.getElementById('login-password')?.value;if(!email||!password)return;const submit=document.getElementById('login-submit');if(submit){submit.disabled=true;submit.textContent='Signing in...';}try{if(CONFIG.demoMode){const saved=state.authPasswords?.[email];if(saved&&saved!==password)throw new Error('Invalid email or password.');demoSignIn(authLoginRole,'email',email,authLoginRole==='artisan'?'Đào Studio Owner':'Quỳnh Anh');return;}const res=await fetch(apiURL('/api/auth/login'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({email,password,role:authLoginRole})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||'Đăng nhập thất bại.');const u=data.session?.user||data.user||{};if(u.role&&u.role!==authLoginRole)throw new Error(`This account is registered as ${u.role}.`);applyAuthenticatedUser(u,'email');closeModal();toast('Signed in.','success');navigate(roleAfterLogin(state.user.role||authLoginRole));}catch(error){toast(error.message||'Không thể đăng nhập.','warning');}finally{if(submit){submit.disabled=false;submit.textContent=`Sign in as ${authLoginRole==='artisan'?'Artisan':'Customer'}`;}}}
async function registerEmail(event){
  event.preventDefault();

  const name=document.getElementById('register-name')?.value.trim();
  const email=document.getElementById('register-email')?.value.trim().toLowerCase();
  const password=document.getElementById('register-password')?.value;
  const confirm=document.getElementById('register-password-confirm')?.value;

  if(!name || !email || !password || !confirm) return;

  if(password.length<8){
    toast('Mật khẩu phải có ít nhất 8 ký tự.','warning');
    return;
  }

  if(password!==confirm){
    toast('Mật khẩu xác nhận không khớp.','warning');
    return;
  }

  const submit=document.getElementById('register-submit');

  if(submit){
    submit.disabled=true;
    submit.textContent='Creating...';
  }

  try{

    if(CONFIG.demoMode){

      const id='USR-'+authRegisterRole.toUpperCase()+'-'+Date.now();

      if(authRegisterRole==='artisan'){

        const aid='A-'+String(state.artisans.length+1).padStart(3,'0');

        state.artisans.push({
          id:aid,
          name,
          handle:'@'+(
            name
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g,'')
              .replace(/[^a-zA-Z0-9]+/g,'')
              .toLowerCase()
              .slice(0,18) || 'newartisan'
          ),
          city:'',
          verified:false,
          online:true,
          rating:0,
          reviews:0,
          completed:0,
          startingPrice:3000000,
          response:'< 1d',
          specialties:[],
          bio:'',
          avatar:GUEST_USER.avatar,
          hero:GUEST_USER.avatar,
          portfolio:[],
          paymentProfile:{
            method:'vietqr',
            bankName:'',
            accountName:name,
            accountNumber:'',
            qrImage:''
          }
        });

        state.user={
          id,
          name,
          email,
          phone:'',
          city:'',
          role:'artisan',
          avatar:GUEST_USER.avatar,
          bio:'',
          joined:String(new Date().getFullYear()),
          artisanId:aid,
          authenticated:true,
          provider:'email'
        };

      }else{

        state.user={
          ...clone(GUEST_USER),
          id,
          name,
          email,
          phone:'',
          city:'',
          role:'customer',
          avatar:GUEST_USER.avatar,
          bio:'',
          joined:String(new Date().getFullYear()),
          authenticated:true,
          provider:'email'
        };
      }

      state.session={
        authenticated:true,
        userId:state.user.id
      };

      save();
      closeModal();
      toast('Account created.','success');
      navigate(roleAfterLogin(state.user.role));
      return;
    }

    const res=await fetch(apiURL('/api/auth/register'),{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      credentials:'include',
      body:JSON.stringify({
        name,
        email,
        password,
        role:authRegisterRole
      })
    });

    const data=await res.json().catch(()=>({}));

    if(!res.ok){
      throw new Error(data.message||'Đăng ký thất bại.');
    }

    const u=data.session?.user||data.user||{};

    applyAuthenticatedUser(u,'email');

    closeModal();
    toast('Account created.','success');
    navigate(roleAfterLogin(state.user.role||authRegisterRole));

  }catch(error){

    toast(
      error.message||'Không thể tạo tài khoản.',
      'warning'
    );

  }finally{

    if(submit){
      submit.disabled=false;
      submit.textContent=
        `Create ${authRegisterRole==='artisan'?'Artisan':'Customer'} account`;
    }
  }
}
function openSupportModal(){document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><b>Help center</b><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body"><div class="grid two"><div class="card-soft pad"><div class="label">Commission</div><div class="small">Create a brief, compare proposals and manage your project.</div></div><div class="card-soft pad"><div class="label">Artisan</div><div class="small">Publish your studio profile, respond to requests and manage active work.</div></div><div class="card-soft pad"><div class="label">Payment</div><div class="small">Review milestone amounts, apply vouchers and complete payment.</div></div><div class="card-soft pad"><div class="label">Support</div><div class="small">For account or payment issues, contact DioraLink support.</div></div></div></div></div></div>`;window.lucide?.createIcons();}
function openLegalModal(type){const title=type==='terms'?'Terms of service':'Privacy';document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><b>${title}</b><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body"><div class="body">${type==='terms'?'Use of DioraLink is subject to the project scope, payment terms and platform rules agreed by the parties.':'DioraLink uses account and project information to provide authentication, communication, project management and payment services.'}</div></div></div></div>`;window.lucide?.createIcons();}
function openPasswordReset(){document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><b>Reset password</b><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body"><form onsubmit="submitPasswordReset(event)"><div class="label">Email</div><input name="email" class="field" type="email" required autocomplete="email" placeholder="you@example.com"><button class="btn btn-mint" style="width:100%;margin-top:14px">Send reset link</button></form></div></div></div>`;window.lucide?.createIcons();}
async function submitPasswordReset(e){e.preventDefault();const email=e.target.email.value.trim().toLowerCase();try{if(CONFIG.demoMode){closeModal();toast('Password reset link sent.','success');return;}const res=await fetch(apiURL('/api/auth/forgot-password'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({email})});if(!res.ok)throw new Error('Unable to send reset link.');closeModal();toast('Password reset link sent.','success');}catch(err){toast(err.message,'warning');}}


async function loginGoogle(){
  if(CONFIG.demoMode){
    authSocial('google');
    return;
  }

  const clientId = CONFIG.googleClientId;

  if(!clientId || clientId.includes('YOUR_GOOGLE')){
    toast('Google Client ID is missing.','error');
    console.error('GOOGLE CONFIG ERROR: missing client ID');
    return;
  }

  try{
    await ensureGoogleIdentity();
  }catch(error){
    console.error('GOOGLE GSI LOAD ERROR:',error);
    toast(error?.message||'Không thể tải Google Sign-In.','error');
    return;
  }

  try{
    if(!googleInitialized){
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      googleInitialized=true;
      console.log('Google GIS initialized.');
    }

    const oldButton=document.querySelector('.auth-google, .social-google');

    if(!oldButton){
      console.error('GOOGLE UI ERROR: .social-google button not found');
      toast('Google button was not found.','error');
      return;
    }

    let container=document.getElementById('google-signin-container');

    if(!container){
      container=document.createElement('div');
      container.id='google-signin-container';
      container.style.width='100%';
      container.style.display='flex';
      container.style.justifyContent='center';
      container.style.marginTop='8px';
      container.style.marginBottom='8px';
      oldButton.insertAdjacentElement('afterend',container);
    }

    container.innerHTML='';
    oldButton.style.display='none';

    window.google.accounts.id.renderButton(
      container,
      {
        type:'standard',
        theme:'outline',
        size:'large',
        text:'signin_with',
        shape:'rectangular',
        logo_alignment:'left',
        width:320
      }
    );

    console.log('Google button rendered.');

    window.google.accounts.id.prompt((notification)=>{
      try{
        if(notification.isNotDisplayed?.()){
          console.warn(
            'Google One Tap not displayed:',
            notification.getNotDisplayedReason?.()
          );
        }

        if(notification.isSkippedMoment?.()){
          console.warn(
            'Google One Tap skipped:',
            notification.getSkippedReason?.()
          );
        }

        if(notification.isDismissedMoment?.()){
          console.warn(
            'Google One Tap dismissed:',
            notification.getDismissedReason?.()
          );
        }
      }catch(error){
        console.warn('Google prompt diagnostic error:',error);
      }
    });

  }catch(error){
    console.error('GOOGLE LOGIN ERROR:',error);
    toast(
      'Google Login error: ' +
      (error?.message || 'unknown error'),
      'error'
    );
  }
}

async function handleGoogleCredential(response){try{const result=await fetch(apiURL('/api/auth/google'),{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:response.credential,role:authMode==='register'?authRegisterRole:authLoginRole})});const data=await result.json().catch(()=>({}));if(!result.ok)throw new Error(data.message||'Google authentication failed');const u=data.session?.user||data.user||{};applyAuthenticatedUser(u,'google');closeModal();toast('Signed in with Google.','success');navigate(roleAfterLogin(state.user.role||authRegisterRole));}catch(error){toast(error.message||'Google authentication failed','warning');}}
async function loginFacebook(){
  if(CONFIG.demoMode){authSocial('facebook');return;}
  if(!CONFIG.facebookAppId||CONFIG.facebookAppId.includes('YOUR_FACEBOOK')){toast('Chưa cấu hình Facebook App ID.','warning');return;}
  try{
    await ensureFacebookSdk();
  }catch(error){
    console.error('FACEBOOK SDK LOAD ERROR:',error);
    toast(error?.message||'Không thể tải Facebook SDK.','warning');
    return;
  }
  FB.login(async response=>{
    if(!response?.authResponse){toast('Facebook login đã bị huỷ.','warning');return;}
    try{
      const result=await fetch(apiURL('/api/auth/facebook'),{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:response.authResponse.accessToken,role:authMode==='register'?authRegisterRole:authLoginRole})});
      const data=await result.json().catch(()=>({}));
      if(!result.ok)throw new Error(data.message||'Facebook authentication failed');
      const u=data.session?.user||data.user||{};
      applyAuthenticatedUser(u,'facebook');
      closeModal();
      toast('Signed in with Facebook.','success');
      navigate(roleAfterLogin(state.user.role||authRegisterRole));
    }catch(error){
      toast(error.message||'Facebook authentication failed','warning');
    }
  },{scope:'public_profile,email'});
}
async function restoreSession(){

  if(CONFIG.demoMode) return;

  try{

    if(restoreAdminOnLoad){
      const ar=await adminApi('/api/admin/me');
      if(ar.ok){const d=await ar.json();if(d.admin){state.user={...d.admin,role:'admin',authenticated:true,provider:'admin'};state.session={authenticated:true,userId:d.admin.id};save();return;}}
    }
    const res=await fetch(
      apiURL('/api/auth/me'),
      {
        method:'GET',
        credentials:'include'
      }
    );

    if(res.ok){

      const data=await res.json();

      if(data.user){

        applyAuthenticatedUser(
          data.user,
          data.user?.provider||'email'
        );

      }

    }else if(res.status===401){

      setGuest();

    }

  }catch(e){

    console.warn(
      'Session restore failed:',
      e.message
    );

  }
}
async function logout(){
  if(isAdmin()){return adminLogout();}
  let serverError='';try{if(!CONFIG.demoMode){const res=await fetch(apiURL('/api/auth/logout'),{method:'POST',credentials:'include'});if(!res.ok){const data=await res.json().catch(()=>({}));serverError=data.message||`Logout failed (HTTP ${res.status}).`;}}}catch(error){serverError=error?.message||'Logout request failed.';}finally{if(window.google?.accounts?.id?.disableAutoSelect){window.google.accounts.id.disableAutoSelect();}setGuest();closeModal();navigate('home');toast(serverError?'Signed out on this device.':'Signed out.','success');}
}
function getVoucher(code){const normalized=String(code||'').trim().toUpperCase();return(state.vouchers||[]).find(v=>v.code===normalized);}
function voucherDiscount(voucher,amount){if(!voucher)return 0;let discount=voucher.type==='percent'?Math.round(amount*voucher.value/100):Number(voucher.value||0);if(voucher.maxDiscount)discount=Math.min(discount,voucher.maxDiscount);return Math.max(0,Math.min(discount,amount));}
function applyVoucher(projectId,milestoneId){if(!requireRole('customer'))return;const p=projectById(projectId);const input=document.getElementById(`voucher-${projectId}-${milestoneId}`);const m=p?.milestones.find(x=>x.id===milestoneId);const v=getVoucher(input?.value);if(!p||!m||!v){toast('Mã voucher không hợp lệ.','error');return;}if(m.amount<v.minSpend){toast(`Voucher yêu cầu tối thiểu ${money(v.minSpend)}.` ,'warning');return;}const discount=voucherDiscount(v,m.amount);p.appliedVoucher={code:v.code,milestoneId,discount,appliedAt:new Date().toISOString()};p.activity.unshift({text:`Voucher ${v.code} applied to ${milestoneId}`,time:dateTime(new Date())});save();toast(`Voucher applied: -${money(discount)}.`,'success');render();}
function removeVoucher(projectId){if(!requireRole('customer'))return;const p=projectById(projectId);if(!p)return;p.appliedVoucher=null;save();toast('Voucher removed.','success');render();}
function milestonePayable(p,m){const v=p.appliedVoucher?.milestoneId===m.id?getVoucher(p.appliedVoucher.code):null;const discount=v?voucherDiscount(v,m.amount):0;return{discount,total:Math.max(0,m.amount-discount),code:v?.code||null};}
function openVoucherInfo(){document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><div><div class="eyebrow">Promotions</div><b>Available vouchers</b></div><button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button></div><div class="modal-body">${(state.vouchers||[]).map(v=>`<div class="card-soft pad" style="margin-bottom:9px"><div class="between"><b class="voucher-code">${esc(v.code)}</b><span class="pill pill-mint">Voucher</span></div><div class="small" style="margin-top:6px">${esc(v.description)}</div><div class="tiny muted" style="margin-top:5px">Minimum spend: ${money(v.minSpend)}</div></div>`).join('')}</div></div></div>`;window.lucide?.createIcons();}

if(location.pathname!=='/ung-dung') render();
restoreSession().finally(()=>render());
if(location.pathname==='/ung-dung') migrateEmbeddedMedia().catch(e=>console.warn('Media migration skipped:',e.message));
setInterval(()=>{if(expireStaleCommissionRequests())render();},15*60*1000);

initI18N();

// Only explicit publication sends the selected public fields to the server.
async function publicImageValue(value){
  if(!value)return '';
  if(value.startsWith('https://') || value.startsWith('/media/nghe-nhan/'))return value;
  let blob;
  if(value.startsWith('asset:')){
    const db=await openFileDB();
    const record=await new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,'readonly');const req=tx.objectStore(FILE_STORE).get(value.slice(6));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    db.close();
    if(!record?.blob)throw new Error('Không tìm thấy ảnh trên thiết bị này. Vui lòng tải lại ảnh trước khi công khai.');
    blob=record.blob;
  }else if(value.startsWith('data:image/'))blob=await(await fetch(value)).blob();
  else throw new Error('Ảnh công khai cần dùng HTTPS hoặc tải từ thiết bị.');
  if(!blob.type.startsWith('image/'))throw new Error('Vui lòng chọn tệp ảnh.');
  const bitmap=await createImageBitmap(blob);
  const ratio=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let result=canvas.toDataURL('image/webp',0.8);
  if(result.length>900000)result=canvas.toDataURL('image/webp',0.55);
  if(result.length>900000)throw new Error('Ảnh quá lớn. Vui lòng chọn ảnh có kích thước nhỏ hơn.');
  return result;
}
async function publishArtisanProfile(a){
  if(!requireRole('artisan'))throw new Error('Vui lòng đăng nhập bằng tài khoản nghệ nhân.');
  if(a.portfolio?.length>12)throw new Error('Hồ sơ công khai hỗ trợ tối đa 12 ảnh tác phẩm.');
  const payload={name:a.name,handle:a.handle,city:a.city,bio:a.bio,startingPrice:a.startingPrice,response:a.response,specialties:a.specialties,avatar:await publicImageValue(a.avatar),hero:await publicImageValue(a.hero),portfolio:[]};
  for(const src of a.portfolio||[])payload.portfolio.push(await publicImageValue(src));
  const body=JSON.stringify(payload);
  if(new Blob([body]).size>5.5*1024*1024)throw new Error('Tổng ảnh quá lớn. Vui lòng giảm số lượng hoặc kích thước ảnh.');
  const res=await fetch(apiURL('/api/artisan/public-profile'),{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body});
  const data=await res.json();if(!res.ok)throw new Error(data.message||'Không thể công khai hồ sơ.');
  a.slug=data.artisan.slug;
  const index=publicArtisans.findIndex(p=>p.id===data.artisan.id);
  if(index<0)publicArtisans.push(data.artisan);else publicArtisans[index]=data.artisan;
  save();
}
async function unpublishArtisanProfile(){
  try{
    const res=await fetch(apiURL('/api/artisan/public-profile'),{method:'DELETE',credentials:'include'});
    const data=await res.json();if(!res.ok)throw new Error(data.message||'Không thể ẩn hồ sơ.');
    const a=artisanById(state.user.artisanId);if(a)delete a.slug;
    const index=publicArtisans.findIndex(p=>p.id===state.user.artisanId);if(index>=0)publicArtisans.splice(index,1);
    save();toast('Đã ẩn hồ sơ công khai.','success');render();
  }catch(error){toast(error.message,'error');}
}
