const express=require('express');

const CONVERSION_EVENTS=new Set([
  'signup_complete','commission_submitted','order_created','payment_reported',
  'payment_confirmed','artisan_profile_published'
]);

function text(value,max=240){
  return String(value??'').trim().slice(0,max);
}
function safeId(value,max=80){
  const s=text(value,max);
  return /^[A-Za-z0-9_-]{8,80}$/.test(s)?s:'';
}
function safePath(value){
  const s=text(value,500);
  if(!s.startsWith('/'))return '/';
  return s.replace(/[\r\n\t]/g,'').slice(0,500);
}
function safeRole(value){
  const v=text(value,20).toLowerCase();
  return ['guest','customer','artisan','admin'].includes(v)?v:'guest';
}
function safeDevice(value){
  const v=text(value,20).toLowerCase();
  return ['mobile','tablet','desktop'].includes(v)?v:'desktop';
}
function safeEventName(value){
  const v=text(value,80).toLowerCase();
  return /^[a-z][a-z0-9_]{1,79}$/.test(v)?v:'';
}
function safeInt(value,min,max){
  const n=Math.round(Number(value)||0);
  return Math.min(max,Math.max(min,n));
}
function safeProps(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  const out={};
  for(const [key,val] of Object.entries(value).slice(0,30)){
    const k=text(key,60);
    if(!k)continue;
    if(typeof val==='string')out[k]=text(val,240);
    else if(typeof val==='number'&&Number.isFinite(val))out[k]=val;
    else if(typeof val==='boolean')out[k]=val;
    else if(Array.isArray(val))out[k]=val.slice(0,10).map(x=>typeof x==='string'?text(x,120):x).filter(x=>['string','number','boolean'].includes(typeof x));
  }
  return out;
}
function pct(part,total){
  return total?Math.round((Number(part||0)*10000)/Number(total))/100:0;
}

async function ensureAnalyticsSchema(pool){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_sessions (
      session_id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      landing_path TEXT NOT NULL DEFAULT '/',
      exit_path TEXT NOT NULL DEFAULT '/',
      page_views INTEGER NOT NULL DEFAULT 0,
      active_ms BIGINT NOT NULL DEFAULT 0,
      max_scroll SMALLINT NOT NULL DEFAULT 0,
      engaged BOOLEAN NOT NULL DEFAULT FALSE,
      conversion BOOLEAN NOT NULL DEFAULT FALSE,
      role TEXT NOT NULL DEFAULT 'guest',
      device TEXT NOT NULL DEFAULT 'desktop',
      source TEXT NOT NULL DEFAULT 'direct',
      medium TEXT NOT NULL DEFAULT 'none',
      campaign TEXT NOT NULL DEFAULT '',
      referrer_host TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
      event_name TEXT NOT NULL,
      page_path TEXT NOT NULL DEFAULT '/',
      role TEXT NOT NULL DEFAULT 'guest',
      device TEXT NOT NULL DEFAULT 'desktop',
      active_ms INTEGER NOT NULL DEFAULT 0,
      scroll_depth SMALLINT NOT NULL DEFAULT 0,
      props JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS analytics_sessions_started_idx ON analytics_sessions(started_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS analytics_sessions_visitor_idx ON analytics_sessions(visitor_id,started_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON analytics_events(session_id,created_at)');
  await pool.query('CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events(event_name,created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS analytics_events_page_idx ON analytics_events(page_path,created_at DESC)');
}

function createAnalyticsRouter({pool,requireAdmin}){
  const router=express.Router();

  router.get('/api/analytics/config',(req,res)=>{
    res.set('Cache-Control','public, max-age=300');
    res.json({
      ga4MeasurementId:text(process.env.GA4_MEASUREMENT_ID,40),
      gtmContainerId:text(process.env.GTM_CONTAINER_ID,40),
      clarityProjectId:text(process.env.CLARITY_PROJECT_ID,80),
      externalEnabled:String(process.env.ANALYTICS_EXTERNAL_ENABLED||'true').toLowerCase()!=='false'
    });
  });

  router.post('/api/analytics/events',async(req,res,next)=>{
    try{
      const sessionId=safeId(req.body?.sessionId);
      const visitorId=safeId(req.body?.visitorId);
      const incoming=Array.isArray(req.body?.events)?req.body.events.slice(0,20):[];
      if(!sessionId||!visitorId||!incoming.length){
        return res.status(400).json({message:'Invalid analytics payload.'});
      }

      const events=incoming.map(raw=>({
        eventId:safeId(raw?.eventId),
        name:safeEventName(raw?.name),
        path:safePath(raw?.path),
        role:safeRole(raw?.role),
        device:safeDevice(raw?.device),
        activeMs:safeInt(raw?.activeMs,0,60000),
        scrollDepth:safeInt(raw?.scrollDepth,0,100),
        props:safeProps(raw?.props)
      })).filter(e=>e.eventId&&e.name);

      if(!events.length)return res.status(400).json({message:'No valid analytics events.'});

      const client=await pool.connect();
      try{
        await client.query('BEGIN');

        const first=events[0];
        const acquisition=first.props?.acquisition&&typeof first.props.acquisition==='object'?first.props.acquisition:{};
        const source=text(acquisition.source||first.props?.source||'direct',120)||'direct';
        const medium=text(acquisition.medium||first.props?.medium||'none',120)||'none';
        const campaign=text(acquisition.campaign||first.props?.campaign||'',160);
        const referrerHost=text(acquisition.referrer_host||first.props?.referrer_host||'',180);

        await client.query(`
          INSERT INTO analytics_sessions(
            session_id,visitor_id,landing_path,exit_path,role,device,source,medium,campaign,referrer_host
          )
          VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT(session_id) DO NOTHING
        `,[sessionId,visitorId,first.path,first.role,first.device,source,medium,campaign,referrerHost]);

        const inserted=[];
        for(const event of events){
          const result=await client.query(`
            INSERT INTO analytics_events(
              event_id,session_id,event_name,page_path,role,device,active_ms,scroll_depth,props
            )
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
            ON CONFLICT(event_id) DO NOTHING
            RETURNING event_name,page_path,role,device,active_ms,scroll_depth,props
          `,[
            event.eventId,sessionId,event.name,event.path,event.role,event.device,
            event.activeMs,event.scrollDepth,JSON.stringify(event.props)
          ]);
          if(result.rows[0])inserted.push(result.rows[0]);
        }

        if(inserted.length){
          const pageViews=inserted.filter(e=>e.event_name==='page_view').length;
          const activeMs=inserted.reduce((n,e)=>n+Number(e.active_ms||0),0);
          const maxScroll=inserted.reduce((n,e)=>Math.max(n,Number(e.scroll_depth||0)),0);
          const conversion=inserted.some(e=>CONVERSION_EVENTS.has(e.event_name));
          const last=inserted[inserted.length-1];
          const latestRole=[...inserted].reverse().map(e=>safeRole(e.role)).find(r=>r!=='guest')||safeRole(last.role);
          const latestDevice=safeDevice(last.device);

          await client.query(`
            UPDATE analytics_sessions
            SET
              last_seen_at=NOW(),
              exit_path=$2,
              page_views=page_views+$3,
              active_ms=active_ms+$4,
              max_scroll=GREATEST(max_scroll,$5),
              conversion=conversion OR $6,
              engaged=engaged OR conversion OR $6
                OR (active_ms+$4)>=10000
                OR (page_views+$3)>=2,
              role=CASE WHEN $7<>'guest' THEN $7 ELSE role END,
              device=$8,
              updated_at=NOW()
            WHERE session_id=$1
          `,[sessionId,last.page_path,pageViews,activeMs,maxScroll,conversion,latestRole,latestDevice]);
        }

        await client.query('COMMIT');
        res.status(202).json({accepted:inserted.length});
      }catch(error){
        await client.query('ROLLBACK');
        throw error;
      }finally{
        client.release();
      }
    }catch(error){
      next(error);
    }
  });

  router.get('/api/admin/analytics/summary',requireAdmin,async(req,res,next)=>{
    try{
      const days=Math.min(90,Math.max(1,Number(req.query?.days)||7));
      const [summaryR,scrollR,roleR,deviceR,pagesR,eventsR,dailyR]=await Promise.all([
        pool.query(`
          SELECT
            COUNT(*)::int AS sessions,
            COUNT(DISTINCT visitor_id)::int AS visitors,
            COALESCE(AVG(EXTRACT(EPOCH FROM (last_seen_at-started_at))),0) AS avg_session_seconds,
            COALESCE(AVG(page_views),0) AS pages_per_session,
            COALESCE(AVG(max_scroll),0) AS avg_scroll_depth,
            COUNT(*) FILTER (WHERE NOT engaged)::int AS bounced,
            COUNT(*) FILTER (WHERE conversion)::int AS converting_sessions
          FROM analytics_sessions
          WHERE started_at>=NOW()-($1::text||' days')::interval
        `,[days]),
        pool.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE max_scroll>=25)::int AS s25,
            COUNT(*) FILTER (WHERE max_scroll>=50)::int AS s50,
            COUNT(*) FILTER (WHERE max_scroll>=75)::int AS s75,
            COUNT(*) FILTER (WHERE max_scroll>=90)::int AS s90,
            COUNT(*) FILTER (WHERE max_scroll>=100)::int AS s100
          FROM analytics_sessions
          WHERE started_at>=NOW()-($1::text||' days')::interval
        `,[days]),
        pool.query(`
          SELECT role,COUNT(*)::int AS sessions
          FROM analytics_sessions
          WHERE started_at>=NOW()-($1::text||' days')::interval
          GROUP BY role ORDER BY sessions DESC
        `,[days]),
        pool.query(`
          SELECT device,COUNT(*)::int AS sessions
          FROM analytics_sessions
          WHERE started_at>=NOW()-($1::text||' days')::interval
          GROUP BY device ORDER BY sessions DESC
        `,[days]),
        pool.query(`
          WITH viewed AS (
            SELECT page_path,session_id,COUNT(*)::int AS views
            FROM analytics_events
            WHERE event_name='page_view' AND created_at>=NOW()-($1::text||' days')::interval
            GROUP BY page_path,session_id
          ), depth AS (
            SELECT page_path,session_id,MAX(scroll_depth)::int AS max_depth
            FROM analytics_events
            WHERE event_name='scroll_depth' AND created_at>=NOW()-($1::text||' days')::interval
            GROUP BY page_path,session_id
          )
          SELECT v.page_path,SUM(v.views)::int AS views,COUNT(*)::int AS sessions,
            ROUND(AVG(COALESCE(d.max_depth,0))::numeric,1) AS avg_scroll_depth,
            COUNT(*) FILTER (WHERE COALESCE(d.max_depth,0)>=25)::int AS s25,
            COUNT(*) FILTER (WHERE COALESCE(d.max_depth,0)>=50)::int AS s50,
            COUNT(*) FILTER (WHERE COALESCE(d.max_depth,0)>=75)::int AS s75,
            COUNT(*) FILTER (WHERE COALESCE(d.max_depth,0)>=90)::int AS s90,
            COUNT(*) FILTER (WHERE COALESCE(d.max_depth,0)>=100)::int AS s100
          FROM viewed v LEFT JOIN depth d USING(page_path,session_id)
          GROUP BY v.page_path ORDER BY views DESC LIMIT 12
        `,[days]),
        pool.query(`
          SELECT event_name,COUNT(*)::int AS events,COUNT(DISTINCT session_id)::int AS sessions
          FROM analytics_events
          WHERE created_at>=NOW()-($1::text||' days')::interval
            AND event_name IN (
              'view_marketplace','view_creator','view_product','start_commission',
              'commission_submitted','begin_checkout','order_created','signup_complete',
              'login','cta_click','form_start','form_submit'
            )
          GROUP BY event_name ORDER BY events DESC
        `,[days]),
        pool.query(`
          SELECT
            TO_CHAR(DATE_TRUNC('day',started_at),'YYYY-MM-DD') AS day,
            COUNT(*)::int AS sessions,
            COUNT(DISTINCT visitor_id)::int AS visitors,
            COUNT(*) FILTER (WHERE NOT engaged)::int AS bounced,
            COALESCE(AVG(EXTRACT(EPOCH FROM (last_seen_at-started_at))),0) AS avg_session_seconds
          FROM analytics_sessions
          WHERE started_at>=NOW()-($1::text||' days')::interval
          GROUP BY DATE_TRUNC('day',started_at)
          ORDER BY DATE_TRUNC('day',started_at)
        `,[days])
      ]);

      const s=summaryR.rows[0]||{};
      const scroll=scrollR.rows[0]||{};
      const sessions=Number(s.sessions||0);
      const eventMap=Object.fromEntries(eventsR.rows.map(r=>[r.event_name,{events:Number(r.events),sessions:Number(r.sessions)}]));
      const sessionCount=name=>Number(eventMap[name]?.sessions||0);

      res.json({
        rangeDays:days,
        generatedAt:new Date().toISOString(),
        kpis:{
          sessions,
          visitors:Number(s.visitors||0),
          bounceRate:pct(s.bounced,sessions),
          avgSessionSeconds:Math.round(Number(s.avg_session_seconds||0)),
          pagesPerSession:Math.round(Number(s.pages_per_session||0)*100)/100,
          avgScrollDepth:Math.round(Number(s.avg_scroll_depth||0)*10)/10,
          conversionRate:pct(s.converting_sessions,sessions)
        },
        scrollDepth:{
          '25':pct(scroll.s25,scroll.total),
          '50':pct(scroll.s50,scroll.total),
          '75':pct(scroll.s75,scroll.total),
          '90':pct(scroll.s90,scroll.total),
          '100':pct(scroll.s100,scroll.total)
        },
        roles:roleR.rows.map(r=>({role:r.role,sessions:Number(r.sessions)})),
        devices:deviceR.rows.map(r=>({device:r.device,sessions:Number(r.sessions)})),
        topPages:pagesR.rows.map(r=>({
          path:r.page_path,
          views:Number(r.views),
          sessions:Number(r.sessions),
          avgScrollDepth:Number(r.avg_scroll_depth||0),
          scrollDepth:{
            '25':pct(r.s25,r.sessions),
            '50':pct(r.s50,r.sessions),
            '75':pct(r.s75,r.sessions),
            '90':pct(r.s90,r.sessions),
            '100':pct(r.s100,r.sessions)
          }
        })),
        events:eventMap,
        funnels:{
          marketplace:[
            {step:'Marketplace view',sessions:sessionCount('view_marketplace')},
            {step:'Product view',sessions:sessionCount('view_product')},
            {step:'Begin checkout',sessions:sessionCount('begin_checkout')},
            {step:'Order created',sessions:sessionCount('order_created')}
          ],
          commission:[
            {step:'Start commission',sessions:sessionCount('start_commission')},
            {step:'Commission submitted',sessions:sessionCount('commission_submitted')}
          ],
          signup:[
            {step:'Signup completed',sessions:sessionCount('signup_complete')},
            {step:'Login',sessions:sessionCount('login')}
          ]
        },
        daily:dailyR.rows.map(r=>({
          day:r.day,
          sessions:Number(r.sessions),
          visitors:Number(r.visitors),
          bounceRate:pct(r.bounced,r.sessions),
          avgSessionSeconds:Math.round(Number(r.avg_session_seconds||0))
        }))
      });
    }catch(error){
      next(error);
    }
  });

  return router;
}

module.exports={ensureAnalyticsSchema,createAnalyticsRouter};
