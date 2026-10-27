'use strict';
const {allocate}=require('./analytics-reconstruction');
const START='2026-10-19T00:00:00+07:00',END='2026-10-28T00:00:00+07:00';
function reportingRange(days,now=new Date()){
 const to=new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
 const end=new Date(to+'T00:00:00+07:00');end.setUTCDate(end.getUTCDate()+1);
 const start=new Date(end);start.setUTCDate(start.getUTCDate()-days);
 return {from:new Date(start.getTime()+7*3600000).toISOString().slice(0,10),to,start:start.toISOString(),end:end.toISOString(),timezone:'Asia/Ho_Chi_Minh'};
}
function historicalSlice(snapshot,period){
 const all=snapshot.daily,weights=all.map(d=>d.sessions);
 const indices=all.map((d,i)=>d.day>=period.from&&d.day<=period.to?i:-1).filter(i=>i>=0);
 if(!indices.length)return null;
 const part=total=>{const values=allocate(total,weights);return indices.reduce((n,i)=>n+values[i],0);};
 const daily=indices.map(i=>({...all[i]})),sessions=daily.reduce((n,d)=>n+d.sessions,0);
 // Reconstructed visitors have no identifiers. Stable synthetic overlapping cohorts
 // support partial windows; cross-source visitor counts remain estimates.
 const visitorIds=new Set();for(const i of indices)for(let j=0;j<all[i].visitors;j++)visitorIds.add((i*37+j)%snapshot.kpis.visitors);
 const conversions={};for(const [key,field] of Object.entries({marketplace:'marketplaceConversions',commission:'commissionConversions',commissionSubmitted:'commissionSubmitted',total:'convertingSessions',convertingSessions:'convertingSessions'}))conversions[key]=daily.reduce((n,d)=>n+d[field],0);
 const views=part(Math.round(snapshot.kpis.sessions*snapshot.kpis.pagesPerSession));
 const h={...snapshot,daily,conversions,kpis:{...snapshot.kpis,sessions,visitors:indices.length===all.length?snapshot.kpis.visitors:visitorIds.size,
  pagesPerSession:views/sessions,bounceRate:daily.reduce((n,d)=>n+d.bounced,0)/sessions*100,conversionRate:conversions.total/sessions*100},
  roles:snapshot.roles.map(r=>({...r,sessions:part(r.sessions)})),devices:snapshot.devices.map(r=>({...r,sessions:part(r.sessions)})),
  topPages:snapshot.topPages.map(p=>({...p,views:part(p.views),sessions:part(p.sessions)})),
  funnels:Object.fromEntries(Object.entries(snapshot.funnels).map(([key,steps])=>[key,steps.map(s=>({...s,sessions:part(s.sessions)}))]))};
 // Allocate page totals first so all pages add up exactly for every subrange.
 const pageViews=h.topPages.reduce((n,p)=>n+p.views,0);h.kpis.pagesPerSession=pageViews/sessions;
  if(indices.length===all.length)h.kpis={...snapshot.kpis};
 h.funnels.commission=[{step:'Start commission',sessions:conversions.commission},{step:'Commission submitted',sessions:conversions.commissionSubmitted}];
 return h;
}
function mergeReports(live,historical,period){
 if(!historical)return {...live,period};
 const h=historical,a=live.kpis.sessions,b=h.kpis.sessions,total=a+b;
 const avg=(x,y,n=a,m=b)=>(n*x+m*y)/(n+m||1);
 const kpis={sessions:total,visitors:live.kpis.visitors+h.kpis.visitors};
 for(const key of ['bounceRate','avgSessionSeconds','pagesPerSession','avgScrollDepth','conversionRate'])kpis[key]=avg(live.kpis[key],h.kpis[key]);
 kpis.avgSessionSeconds=Math.round(kpis.avgSessionSeconds);kpis.pagesPerSession=Math.round(kpis.pagesPerSession*100)/100;
 const buckets=(key,label)=>{const map=new Map();for(const row of [...live[key],...h[key]]){const prior=map.get(row[label]);map.set(row[label],{...row,sessions:(prior?.sessions||0)+row.sessions});}return [...map.values()].sort((x,y)=>y.sessions-x.sessions);};
 const pages=new Map(live.topPages.map(p=>[p.path,p]));
 for(const p of h.topPages){const q=pages.get(p.path);pages.set(p.path,q?{...p,views:q.views+p.views,sessions:q.sessions+p.sessions,avgScrollDepth:avg(q.avgScrollDepth,p.avgScrollDepth,q.sessions,p.sessions),scrollDepth:Object.fromEntries(Object.keys(p.scrollDepth).map(k=>[k,avg(q.scrollDepth[k],p.scrollDepth[k],q.sessions,p.sessions)]))}:p);}
 const funnels={...live.funnels};for(const key of ['marketplace','commission'])funnels[key]=h.funnels[key].map((step,i)=>({...step,sessions:step.sessions+(live.funnels[key]?.[i]?.sessions||0)}));
 // Orders are business records, reconciled for the entire selected period, not
 // added to event counts or proportionally allocated like reconstructed traffic.
 funnels.marketplace[funnels.marketplace.length-1]={step:'Order created',sessions:h.marketplaceOrders.total,unit:'orders',source:'marketplace_finance_report'};
 const events={...live.events};
 for(const [key,count] of Object.entries({view_marketplace:h.funnels.marketplace[0].sessions,view_product:h.funnels.marketplace[1].sessions,begin_checkout:h.funnels.marketplace[2].sessions,start_commission:h.conversions.commission,commission_submitted:h.conversions.commissionSubmitted})){
  const prior=events[key]||{sessions:0,events:0};events[key]={sessions:prior.sessions+count,events:prior.events+count,source:'combined'};
 }
 return {...live,source:'combined',period,kpis,marketplaceOrders:h.marketplaceOrders,
  reconstruction:{from:h.daily[0].day,to:h.daily.at(-1).day,sessions:b,visitors:h.kpis.visitors,conversions:h.conversions,measuredSessions:a,visitorsEstimated:a>0||b!==6000},
  roles:buckets('roles','role'),devices:buckets('devices','device'),funnels,events,
  scrollDepth:Object.fromEntries(Object.keys(h.scrollDepth).map(k=>[k,avg(live.scrollDepth[k],h.scrollDepth[k])])),
  topPages:[...pages.values()].sort((x,y)=>y.views-x.views).slice(0,12),
  daily:[...live.daily,...h.daily].sort((x,y)=>x.day.localeCompare(y.day))};
}
module.exports={START,END,reportingRange,historicalSlice,mergeReports};
