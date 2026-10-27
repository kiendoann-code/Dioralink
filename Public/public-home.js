/* Lightweight bootstrap for the server-rendered public homepage.
   The full workspace bundle is loaded only when the visitor needs an interactive account feature. */
(()=>{
  const APP='/app.js?v=admin-finance-combined-20261027-3';
  const MARKET='/marketplace.js?v=finance-combined-20261027-3';
  let fullPromise=null;
  const proxies={};

  function loadScript(src){
    const existing=[...document.scripts].find(s=>s.src&&new URL(s.src,location.href).pathname===new URL(src,location.href).pathname);
    if(existing){
      if(existing.dataset.ready==='1')return Promise.resolve();
      return new Promise((resolve,reject)=>{
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
      });
    }
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.defer=true;
      s.onload=()=>{s.dataset.ready='1';resolve();};
      s.onerror=reject;
      document.body.appendChild(s);
    });
  }

  function loadFull(){
    if(fullPromise)return fullPromise;
    fullPromise=loadScript(MARKET).then(()=>loadScript('/admin-finance-demo.js?v=20261027-2')).then(()=>loadScript(APP));
    fullPromise.catch(()=>{fullPromise=null;});
    return fullPromise;
  }

  function proxy(name){
    const fn=function(...args){
      return loadFull().then(()=>{
        const real=window[name];
        if(typeof real==='function'&&real!==fn)return real(...args);
      });
    };
    proxies[name]=fn;
    window[name]=fn;
  }

  ['openAuthModal','openSupportModal','openLegalModal','openAdminLogin','toggleMobileNav','setLanguage'].forEach(proxy);

  let needsFull=false;
  try{
    if(localStorage.getItem('dioralink_language')==='en')needsFull=true;
    const raw=localStorage.getItem('dioralink_state_v25_directpay');
    if(raw){
      const saved=JSON.parse(raw);
      if(saved?.session?.authenticated===true||saved?.user?.role==='admin')needsFull=true;
    }
  }catch(e){}

  if(needsFull){
    loadFull().then(()=>window.ensureLucide?.()).catch(()=>{});
  }else{
    const warm=()=>loadFull().catch(()=>{});
    window.addEventListener('pointerdown',warm,{once:true,passive:true});
    window.addEventListener('keydown',warm,{once:true});
    window.addEventListener('load',()=>{
      fetch('/api/auth/me',{method:'GET',credentials:'include'})
        .then(res=>res.ok?loadFull().then(()=>window.ensureLucide?.()):null)
        .catch(()=>{});
    },{once:true});
  }
})();
