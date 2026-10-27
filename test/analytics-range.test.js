const test=require('node:test'),assert=require('node:assert/strict');
const {buildSnapshot}=require('../analytics-reconstruction');
const {reportingRange,historicalSlice}=require('../analytics-range');
test('Vietnam calendar days include today and exclude future dates',()=>{
 const r=reportingRange(7,new Date('2026-10-27T17:01:00Z'));
 assert.equal(r.from,'2026-10-22');assert.equal(r.to,'2026-10-28');
 assert.equal(r.start,'2026-10-21T17:00:00.000Z');assert.equal(r.end,'2026-10-28T17:00:00.000Z');
});
test('full 30/90 periods match historical totals; slices partition counts without duplication',()=>{
 const h=buildSnapshot(),now=new Date('2026-10-28T03:00:00Z');
 for(const days of [30,90])assert.deepEqual(historicalSlice(h,reportingRange(days,now)).kpis,h.kpis);
 const slices=h.daily.map(d=>historicalSlice(h,{from:d.day,to:d.day}));
 assert.equal(slices.reduce((n,s)=>n+s.kpis.sessions,0),6000);
 assert.equal(slices.reduce((n,s)=>n+s.conversions.total,0),210);
 assert.equal(slices.reduce((n,s)=>n+s.topPages.reduce((m,p)=>m+p.views,0),0),57600);
 assert.equal(historicalSlice(h,{from:'2026-11-01',to:'2026-11-10'}),null);
});
