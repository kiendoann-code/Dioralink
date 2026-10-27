'use strict';

// Owner-requested reconstruction, never inserted into measured sessions/events.
const ID='behavior-2026-10-19-27-v1';
function allocate(total,weights){
  const sum=weights.reduce((a,b)=>a+b,0);
  const values=weights.map(w=>Math.floor(total*w/sum));
  let remaining=total-values.reduce((a,b)=>a+b,0);
  for(let i=0;remaining>0;i++,remaining--)values[i%values.length]++;
  return values;
}
function buildSnapshot(){
  let seed=20261027;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const weights=Array.from({length:9},()=>70+Math.floor(random()*60));
  const sessions=allocate(6000,weights),bounced=allocate(4068,weights);
  const market=allocate(200,weights),commission=[0,1,0,2,1,2,1,1,2],submitted=[0,0,0,1,1,1,1,0,2];
  const daily=sessions.map((n,i)=>({day:`2026-10-${19+i}`,sessions:n,
    // Daily uniques overlap; the whole-period distinct visitor count is 300.
    visitors:180+Math.floor(random()*100),bounced:bounced[i],
    bounceRate:bounced[i]/n*100,avgSessionSeconds:383,
    marketplaceConversions:market[i],commissionConversions:commission[i],
    commissionSubmitted:submitted[i],convertingSessions:market[i]+commission[i]}));
  const paths=['/','/marketplace','/nghe-nhan','/ung-dung#commission','/dich-vu','/quy-trinh'];
  const views=allocate(57600,paths.map(()=>30+Math.floor(random()*70)));
  const topPages=paths.map((path,i)=>{
    const scrollDepth={25:98,50:94,75:80+Math.floor(random()*13),90:54+Math.floor(random()*13),100:29+Math.floor(random()*13)};
    const avgScrollDepth=.25*(scrollDepth[25]+scrollDepth[50]+scrollDepth[75])+.15*scrollDepth[90]+.1*scrollDepth[100];
    return {path,views:views[i],sessions:path==='/marketplace'?4800:1200+Math.floor(random()*600),
      avgScrollDepth,scrollDepth,source:'reconstructed'};
  })
    .sort((a,b)=>b.views-a.views);
  return {id:ID,source:'owner_requested_reconstruction',period:{from:'2026-10-19',to:'2026-10-27',timezone:'Asia/Ho_Chi_Minh'},rangeDays:9,
    kpis:{sessions:6000,visitors:300,bounceRate:67.8,avgSessionSeconds:383,pagesPerSession:9.6,avgScrollDepth:82,conversionRate:3.5},
    conversions:{total:210,convertingSessions:210,marketplace:200,commission:10,commissionSubmitted:6},
    scrollDepth:{25:98,50:94,75:86,90:60,100:35},
    roles:[{role:'guest',sessions:4100},{role:'customer',sessions:1640},{role:'artisan',sessions:260}],
    devices:[{device:'mobile',sessions:3720},{device:'desktop',sessions:1980},{device:'tablet',sessions:300}],
    topPages,daily,
    funnels:{marketplace:[{step:'Marketplace view',sessions:4800},{step:'Product view',sessions:3520},{step:'Begin checkout',sessions:420}],
      commission:[{step:'Start commission',sessions:10},{step:'Commission submitted',sessions:6}]}};
}
async function ensureReconstruction(pool){
  await pool.query(`CREATE TABLE IF NOT EXISTS analytics_report_snapshots (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`INSERT INTO analytics_report_snapshots(id,source,payload) VALUES($1,$2,$3::jsonb)
    ON CONFLICT(id) DO NOTHING`,[ID,'owner_requested_reconstruction',JSON.stringify(buildSnapshot())]);
}
async function loadReconstruction(pool){
  const row=(await pool.query('SELECT payload,created_at FROM analytics_report_snapshots WHERE id=$1',[ID])).rows[0];
  if(!row)throw new Error('Historical analytics snapshot is unavailable.');
  const report=JSON.parse(JSON.stringify(row.payload));
  const {buildMarketplaceFinanceReport}=require('./finance-report');
  const orders=(await pool.query(`SELECT o.id,o.created_at,o.status,o.dispute_open,o.goods_amount,
    o.commission_rate,o.platform_fee,o.fee_collected_amount,o.fee_returned_amount,
    jsonb_build_object('title',o.product_snapshot->>'title') AS product_snapshot,
    u.name AS seller_name FROM market_orders o
    JOIN users u ON u.id=o.seller_id
    WHERE o.created_at >= $1::timestamptz AND o.created_at < $2::timestamptz`,
    ['2026-10-19T00:00:00+07:00','2026-10-28T00:00:00+07:00'])).rows;
  const finance=buildMarketplaceFinanceReport({period:report.period,orders});
  report.marketplaceOrders={total:finance.transactions.length,
    actual:finance.transactions.filter(o=>o.dataType==='actual').length,
    simulated:finance.transactions.filter(o=>o.dataType==='simulated').length,
    recognizedGoods:finance.actual.gross,simulatedGoods:finance.simulated.goods,
    source:'marketplace_finance_report'};
  report.funnels.marketplace.push({step:'Order created',sessions:finance.transactions.length,unit:'orders',source:'marketplace_finance_report'});
  report.savedAt=row.created_at;
  report.generatedAt=new Date().toISOString();
  return report;
}
module.exports={ID,buildSnapshot,ensureReconstruction,loadReconstruction};
