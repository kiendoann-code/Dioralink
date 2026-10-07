/* DioraLink behavior analytics.
   Anonymous first-party measurement; no email, name, phone, address or message content is collected. */
(()=>{
  'use strict';

  const ENDPOINT='/api/analytics/events';
  const CONFIG_ENDPOINT='/api/analytics/config';
  const VISITOR_KEY='dioralink_analytics_visitor_v1';
  const SESSION_KEY='dioralink_analytics_session_v1';
  const OPTOUT_KEY='dioralink_analytics_optout';
  const SESSION_TIMEOUT=30*60*1000;
  const FLUSH_MS=2500;
  const HEARTBEAT_MS=15000;
  const MAX_QUEUE=20;

  const disabled=()=>{
    try{return localStorage.getItem(OPTOUT_KEY)==='1'||navigator.globalPrivacyControl===true;}catch{return navigator.globalPrivacyControl===true;}
  };

  function id(){
    try{return crypto.randomUUID();}catch{return 'dl_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,14);}
  }
  function clean(value,max=160){
    return String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
  }
  function scrub(value,max=200){
    return clean(value,max)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]')
      .replace(/\b\d{9,16}\b/g,'[number]');
  }
  function pathOnly(value){
    try{
      const u=new URL(value||location.href,location.href);
      if(u.origin!==location.origin)return u.hostname;
      return (u.pathname+(u.hash||'')).slice(0,500);
    }catch{return location.pathname+location.hash;}
  }
  function currentPath(){return (location.pathname+(location.hash||'')).slice(0,500);}
  function device(){
    const w=Math.min(screen?.width||innerWidth||1440,innerWidth||1440);
    if(w<=600)return 'mobile';
    if(w<=1024)return 'tablet';
    return 'desktop';
  }
  function roleFromStorage(){
    try{
      const state=JSON.parse(localStorage.getItem('dioralink_state_v25_directpay')||'null');
      if(state?.user?.role==='admin')return 'admin';
      if(state?.session?.authenticated===true&&['customer','artisan'].includes(state?.user?.role))return state.user.role;
    }catch{}
    return 'guest';
  }
  let context={user_role:roleFromStorage(),device:device()};

  function getVisitor(){
    try{
      let v=localStorage.getItem(VISITOR_KEY);
      if(!v){v=id();localStorage.setItem(VISITOR_KEY,v);}
      return v;
    }catch{return id();}
  }
  const visitorId=getVisitor();

  function acquisition(){
    const q=new URLSearchParams(location.search);
    let referrerHost='';
    try{referrerHost=document.referrer?new URL(document.referrer).hostname:'';}catch{}
    const source=clean(q.get('utm_source')||(referrerHost&&referrerHost!==location.hostname?referrerHost:'direct'),120)||'direct';
    const medium=clean(q.get('utm_medium')||(source==='direct'?'none':'referral'),120)||'none';
    return {
      source,
      medium,
      campaign:clean(q.get('utm_campaign'),160),
      referrer_host:clean(referrerHost,180)
    };
  }

  function getSession(){
    const now=Date.now();
    try{
      const raw=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
      if(raw?.id&&Number(raw.lastAt)>now-SESSION_TIMEOUT){
        raw.lastAt=now;
        localStorage.setItem(SESSION_KEY,JSON.stringify(raw));
        return {id:raw.id,isNew:false,acquisition:raw.acquisition||acquisition()};
      }
      const next={id:id(),lastAt:now,acquisition:acquisition()};
      localStorage.setItem(SESSION_KEY,JSON.stringify(next));
      return {id:next.id,isNew:true,acquisition:next.acquisition};
    }catch{
      return {id:id(),isNew:true,acquisition:acquisition()};
    }
  }
  let session=getSession();

  function touchSession(){
    try{
      const raw=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
      if(raw?.id===session.id){
        raw.lastAt=Date.now();
        localStorage.setItem(SESSION_KEY,JSON.stringify(raw));
      }
    }catch{}
  }

  let queue=[];
  let flushTimer=null;
  let externalReady={ga4:false,gtm:false,clarity:false};
  let externalQueue=[];
  let lastActiveAt=Date.now();
  let currentPageKey=currentPath();
  let scrollSeen=new Set();
  const formSeen=new WeakSet();

  function externalPayload(name,props){
    const p={...props,user_role:context.user_role,device_category:context.device,page_path:currentPath()};
    for(const key of Object.keys(p)){
      if(p[key]===undefined||p[key]===null||typeof p[key]==='object')delete p[key];
      if(typeof p[key]==='string')p[key]=clean(p[key],160);
    }
    return {name,props:p};
  }

  function emitExternal(name,props={}){
    const item=externalPayload(name,props);
    if(!externalReady.ga4&&!externalReady.gtm&&!externalReady.clarity){
      externalQueue.push(item);
      if(externalQueue.length>60)externalQueue.shift();
      return;
    }
    if(externalReady.gtm&&Array.isArray(window.dataLayer)){
      window.dataLayer.push({event:name,...item.props});
    }
    if(externalReady.ga4&&typeof window.gtag==='function'){
      window.gtag('event',name,item.props);
    }
    if(externalReady.clarity&&typeof window.clarity==='function'){
      try{
        window.clarity('event',name);
        window.clarity('set','user_role',context.user_role);
        window.clarity('set','device_category',context.device);
      }catch{}
    }
  }
  function flushExternalQueue(){
    const items=externalQueue.splice(0);
    for(const item of items)emitExternal(item.name,item.props);
  }

  function track(name,props={},options={}){
    if(disabled())return;
    touchSession();
    const event={
      eventId:id(),
      name:clean(name,80).toLowerCase().replace(/[^a-z0-9_]/g,'_'),
      path:currentPath(),
      role:context.user_role||'guest',
      device:context.device||device(),
      activeMs:Math.max(0,Math.min(60000,Math.round(Number(options.activeMs)||0))),
      scrollDepth:Math.max(0,Math.min(100,Math.round(Number(options.scrollDepth)||0))),
      props:{}
    };
    const safe={...props};
    for(const [key,val] of Object.entries(safe).slice(0,25)){
      const k=clean(key,60);
      if(!k)continue;
      if(typeof val==='string')event.props[k]=scrub(val,200);
      else if(typeof val==='number'&&Number.isFinite(val))event.props[k]=val;
      else if(typeof val==='boolean')event.props[k]=val;
      else if(Array.isArray(val))event.props[k]=val.slice(0,8).map(x=>typeof x==='string'?scrub(x,100):x).filter(x=>['string','number','boolean'].includes(typeof x));
    }
    if(options.acquisition)Object.assign(event.props,session.acquisition);
    queue.push(event);
    emitExternal(event.name,event.props);
    if(queue.length>=MAX_QUEUE)flush(false);
    else scheduleFlush();
  }

  function scheduleFlush(){
    clearTimeout(flushTimer);
    flushTimer=setTimeout(()=>flush(false),FLUSH_MS);
  }
  function payload(){
    if(!queue.length)return null;
    const events=queue.splice(0,MAX_QUEUE);
    return {sessionId:session.id,visitorId,events};
  }
  function flush(beacon=false){
    clearTimeout(flushTimer);
    flushTimer=null;
    if(disabled()){queue=[];return Promise.resolve();}
    const body=payload();
    if(!body)return Promise.resolve();
    const data=JSON.stringify(body);
    if(beacon&&navigator.sendBeacon){
      try{
        if(navigator.sendBeacon(ENDPOINT,new Blob([data],{type:'application/json'}))){
          if(queue.length)scheduleFlush();
          return Promise.resolve();
        }
      }catch{}
    }
    return fetch(ENDPOINT,{
      method:'POST',
      credentials:'omit',
      keepalive:true,
      headers:{'Content-Type':'application/json'},
      body:data
    }).catch(()=>{
      queue.unshift(...body.events);
      if(queue.length>60)queue=queue.slice(-60);
    }).finally(()=>{if(queue.length)scheduleFlush();});
  }

  function specializedPageEvents(p){
    if(p==='/marketplace'||p.startsWith('/marketplace#'))track('view_marketplace');
    if(/^\/marketplace\/[^/]+/.test(p))track('view_product',{product_path:p});
    if(/^\/nghe-nhan\/[^/]+/.test(p))track('view_creator',{creator_path:p});
    if(p.includes('#market-checkout'))track('begin_checkout');
    if(p.includes('#commission'))track('start_commission');
  }
  function pageView(reason='navigation'){
    const next=currentPath();
    currentPageKey=next;
    scrollSeen=new Set();
    track('page_view',{
      reason,
      title:clean(document.title,160),
      source:session.acquisition.source,
      medium:session.acquisition.medium,
      campaign:session.acquisition.campaign,
      referrer_host:session.acquisition.referrer_host
    },{acquisition:session.isNew});
    session.isNew=false;
    specializedPageEvents(next);
  }

  function scrollDepth(){
    const doc=document.documentElement;
    const scrollable=doc.scrollHeight-innerHeight;
    const max=Math.max(1,scrollable);
    const depth=scrollable<=1?100:Math.min(100,Math.round((scrollY/max)*100));
    for(const threshold of [25,50,75,90,100]){
      if(depth>=threshold&&!scrollSeen.has(threshold)){
        scrollSeen.add(threshold);
        track('scroll_depth',{threshold},{scrollDepth:threshold});
      }
    }
  }

  function activeTick(final=false,force=false){
    const now=Date.now();
    const delta=Math.max(0,Math.min(HEARTBEAT_MS,now-lastActiveAt));
    lastActiveAt=now;
    if((force||(document.visibilityState==='visible'&&document.hasFocus()))&&delta>0){
      track('engagement',{final},{activeMs:delta});
    }
  }

  function areaFor(el){
    if(el.closest('header'))return 'header';
    if(el.closest('footer'))return 'footer';
    if(el.closest('.modal,.modal-backdrop'))return 'modal';
    return 'main';
  }
  function clickLabel(el){
    return scrub(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'',80);
  }
  function formName(form){
    return clean(form.id||form.dataset?.autosaveKey||form.getAttribute('name')||form.className||'form',100);
  }

  function requestMeta(input,init){
    try{
      const url=typeof input==='string'?input:input?.url;
      const u=new URL(url,location.href);
      const method=String(init?.method||(typeof input!=='string'&&input?.method)||'GET').toUpperCase();
      return {u,method,body:init?.body};
    }catch{return null;}
  }
  function trackSuccessfulRequest(meta,status){
    if(!meta||status<200||status>=400||meta.u.origin!==location.origin)return;
    const p=meta.u.pathname;
    if(p===ENDPOINT||p===CONFIG_ENDPOINT)return;
    let props={status};
    if(p==='/api/auth/register'&&meta.method==='POST')track('signup_complete',props);
    else if(['/api/auth/login','/api/auth/google','/api/auth/facebook'].includes(p)&&meta.method==='POST')track('login',props);
    else if(p==='/api/market/orders'&&meta.method==='POST'){
      try{
        const body=typeof meta.body==='string'?JSON.parse(meta.body):{};
        props={...props,product_id:clean(body.product_id,100),payment_method:clean(body.payment_method,30),quantity:Number(body.quantity)||1};
      }catch{}
      track('order_created',props);
    }else if(p==='/api/artisan/public-profile'&&meta.method==='POST')track('artisan_profile_published',props);
    else if(p==='/api/complaints'&&meta.method==='POST')track('complaint_submitted',props);
    else if(p==='/api/finance/commission/confirm'&&meta.method==='POST')track('payment_confirmed',props);
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    const meta=requestMeta(input,init);
    return nativeFetch(input,init).then(response=>{
      trackSuccessfulRequest(meta,response.status);
      return response;
    });
  };

  function loadScript(src,id,onload){
    if(id&&document.getElementById(id))return;
    const s=document.createElement('script');
    if(id)s.id=id;
    s.async=true;
    s.src=src;
    if(onload)s.onload=onload;
    document.head.appendChild(s);
  }
  function loadExternalProviders(){
    if(disabled())return;
    nativeFetch(CONFIG_ENDPOINT,{credentials:'omit'}).then(r=>r.ok?r.json():{}).then(cfg=>{
      if(cfg.externalEnabled===false)return;
      const gtm=clean(cfg.gtmContainerId,40);
      const ga4=clean(cfg.ga4MeasurementId,40);
      const clarity=clean(cfg.clarityProjectId,80);

      if(/^GTM-[A-Z0-9]+$/i.test(gtm)){
        window.dataLayer=window.dataLayer||[];
        window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
        loadScript('https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(gtm),'dioralink-gtm',()=>{
          externalReady.gtm=true;flushExternalQueue();
        });
      }
      if(/^G-[A-Z0-9]+$/i.test(ga4)){
        window.dataLayer=window.dataLayer||[];
        window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
        window.gtag('js',new Date());
        window.gtag('config',ga4,{send_page_view:false,anonymize_ip:true});
        loadScript('https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ga4),'dioralink-ga4',()=>{
          externalReady.ga4=true;flushExternalQueue();
        });
      }
      if(/^[A-Za-z0-9]+$/.test(clarity)){
        window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments);};
        loadScript('https://www.clarity.ms/tag/'+encodeURIComponent(clarity),'dioralink-clarity',()=>{
          externalReady.clarity=true;flushExternalQueue();
        });
      }
    }).catch(()=>{});
  }

  function init(){
    if(disabled())return;
    if(session.isNew)track('session_start',{
      source:session.acquisition.source,
      medium:session.acquisition.medium,
      campaign:session.acquisition.campaign,
      referrer_host:session.acquisition.referrer_host
    },{acquisition:true});
    pageView('initial');

    let scrollScheduled=false;
    window.addEventListener('scroll',()=>{
      if(scrollScheduled)return;
      scrollScheduled=true;
      requestAnimationFrame(()=>{scrollScheduled=false;scrollDepth();});
    },{passive:true});

    document.addEventListener('click',event=>{
      const el=event.target?.closest?.('a,button');
      if(!el)return;
      const href=el.tagName==='A'?pathOnly(el.getAttribute('href')||''):'';
      const important=el.tagName==='A'||el.classList.contains('btn')||el.className.toString().includes('nav')||href.includes('/marketplace')||href.includes('/nghe-nhan');
      if(!important)return;
      track('cta_click',{label:clickLabel(el),href,area:areaFor(el)});
    },true);

    document.addEventListener('focusin',event=>{
      const form=event.target?.closest?.('form');
      if(!form||formSeen.has(form))return;
      formSeen.add(form);
      track('form_start',{form:formName(form)});
    },true);
    document.addEventListener('submit',event=>{
      const form=event.target?.closest?.('form');
      if(form)track('form_submit',{form:formName(form)});
    },true);

    const originalPush=history.pushState.bind(history);
    history.pushState=function(...args){const r=originalPush(...args);setTimeout(()=>pageView('pushState'),0);return r;};
    const originalReplace=history.replaceState.bind(history);
    history.replaceState=function(...args){const before=currentPath();const r=originalReplace(...args);if(currentPath()!==before)setTimeout(()=>pageView('replaceState'),0);return r;};
    window.addEventListener('popstate',()=>pageView('popstate'));
    window.addEventListener('hashchange',()=>{
      if(currentPath()!==currentPageKey)pageView('hashchange');
    });

    window.addEventListener('error',e=>track('js_error',{message:scrub(e.message||'script error'),source:pathOnly(e.filename||'')}));
    window.addEventListener('unhandledrejection',e=>track('js_error',{message:scrub(e.reason?.message||e.reason||'unhandled rejection')}));

    setInterval(()=>activeTick(false),HEARTBEAT_MS);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden'){activeTick(true,true);track('page_hide');flush(true);}
      else lastActiveAt=Date.now();
    });
    window.addEventListener('pagehide',()=>{activeTick(true,true);flush(true);});

    const providerStart=()=>loadExternalProviders();
    if(document.readyState==='complete')setTimeout(providerStart,4000);
    else window.addEventListener('load',()=>setTimeout(providerStart,4000),{once:true});
  }

  window.DioraAnalytics={
    track,
    flush:()=>flush(false),
    setContext(next={}){
      if(next.user_role&&['guest','customer','artisan','admin'].includes(next.user_role))context.user_role=next.user_role;
      context.device=device();
      emitExternal('user_context',{user_role:context.user_role,device_category:context.device});
    },
    optOut(){
      try{localStorage.setItem(OPTOUT_KEY,'1');}catch{}
      queue=[];
      externalQueue=[];
    },
    optIn(){
      try{localStorage.removeItem(OPTOUT_KEY);}catch{}
      location.reload();
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
