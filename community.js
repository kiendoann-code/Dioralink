'use strict';
const express = require('express');
const {randomUUID} = require('node:crypto');
const GROUPS = [
  {id:'questions',name:'Hỏi đáp',description:'Cùng gỡ rối về vật liệu, kỹ thuật và cách bắt đầu.'},
  {id:'showcase',name:'Góc tác phẩm',description:'Chia sẻ thế giới nhỏ bạn đang tạo nên.'},
  {id:'guides',name:'Hướng dẫn',description:'Kỹ thuật, quy trình và những bài học từ bàn làm việc.'},
  {id:'reviews',name:'Đánh giá',description:'Trải nghiệm thực tế về dụng cụ và sản phẩm.'},
  {id:'general',name:'Chuyện trong xưởng',description:'Ý tưởng, cảm hứng và chuyện của người yêu mô hình.'}
];
const TAGS = ['Hỏi đáp','Showcase','Hướng dẫn','Review','Thảo luận'];
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
function text(value,min,max){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(`Nội dung cần từ ${min} đến ${max} ký tự.`);return value.trim();}
function id(value){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value||''))fail('Không tìm thấy nội dung.',404);return value;}
const offset=q=>Math.min(10000,Math.max(0,Math.trunc(Number(q.offset)||0)));
function attachmentsInput(value=[]){
  if(!Array.isArray(value)||value.length>3)fail('Mỗi bình luận tối đa 3 tệp.');
  return value.map(file=>{
    const name=text(file?.name,1,120).replace(/[\r\n\/\\]/g,'_');
    if(typeof file.data!=='string'||file.data.length>2800000||file.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(file.data))fail('Dữ liệu tệp không hợp lệ.');
    const bytes=Buffer.from(file.data,'base64');if(!bytes.length||bytes.length>2*1024*1024)fail('Mỗi tệp tối đa 2 MB.');
    const mime=file.type;
    const valid=mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):
      mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
      mime==='image/webp'?bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP':
      mime==='application/pdf'?bytes.toString('ascii',0,5)==='%PDF-':
      mime==='text/plain'?!bytes.includes(0):false;
    if(!valid)fail('Chỉ hỗ trợ ảnh JPG, PNG, WebP, PDF hoặc TXT hợp lệ.');
    return {id:randomUUID(),name,mime,bytes};
  });
}
async function ensureCommunitySchema(pool){
  await tx(pool,async c=>{
  await c.query('SELECT pg_advisory_xact_lock(80423031)');
  await c.query(`CREATE TABLE IF NOT EXISTS community_entries (
    id UUID PRIMARY KEY, author_id TEXT NOT NULL REFERENCES users(id),
    thread_id UUID REFERENCES community_entries(id),parent_id UUID REFERENCES community_entries(id),
    group_id TEXT NOT NULL,title TEXT NOT NULL DEFAULT '',body TEXT NOT NULL,tag TEXT NOT NULL DEFAULT '',
    hidden BOOLEAN NOT NULL DEFAULT FALSE,locked BOOLEAN NOT NULL DEFAULT FALSE,
    accepted_id UUID REFERENCES community_entries(id),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS community_feed ON community_entries(group_id,created_at DESC) WHERE thread_id IS NULL AND hidden=FALSE;
    CREATE INDEX IF NOT EXISTS community_thread ON community_entries(thread_id,created_at,id);
    CREATE INDEX IF NOT EXISTS community_author ON community_entries(author_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS community_votes(entry_id UUID REFERENCES community_entries(id),user_id TEXT REFERENCES users(id),value SMALLINT NOT NULL CHECK(value IN (-1,1)),PRIMARY KEY(entry_id,user_id));
    CREATE TABLE IF NOT EXISTS community_saves(entry_id UUID REFERENCES community_entries(id),user_id TEXT REFERENCES users(id),PRIMARY KEY(entry_id,user_id));
    CREATE TABLE IF NOT EXISTS community_reports(id UUID PRIMARY KEY,entry_id UUID NOT NULL REFERENCES community_entries(id),user_id TEXT NOT NULL REFERENCES users(id),reason TEXT NOT NULL,resolved BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(entry_id,user_id));
    CREATE TABLE IF NOT EXISTS community_moderation(id UUID PRIMARY KEY,entry_id UUID NOT NULL REFERENCES community_entries(id),admin_id TEXT NOT NULL,action TEXT NOT NULL,reason TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS community_attachments(id UUID PRIMARY KEY,entry_id UUID NOT NULL REFERENCES community_entries(id),name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL CHECK(size BETWEEN 1 AND 2097152),data BYTEA NOT NULL);
    CREATE INDEX IF NOT EXISTS community_attachments_entry ON community_attachments(entry_id);`);
  });
}
async function tx(pool,fn){const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
function createCommunity({pool,requireAuth,requireAdmin,getUserFromRequest=async()=>null}){
  const router=express.Router();
  const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(e=>{if(e.status)return res.status(e.status).json({message:e.message});next(e);});
  router.use(['/api/community','/api/admin/community'],(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(!['GET','HEAD'].includes(req.method)&&(!req.is('application/json')||req.get('sec-fetch-site')==='cross-site'))return res.status(403).json({message:'Yêu cầu không hợp lệ.'});
    next();
  });
  const viewer=async req=>(await getUserFromRequest(req))?.id||null;
  const fields=`e.id,e.author_id,e.thread_id,e.parent_id,e.group_id,e.title,e.tag,e.hidden,e.locked,e.accepted_id,e.created_at,u.name AS author_name,
    CASE WHEN e.hidden THEN '[Nội dung đã được gỡ]' ELSE e.body END AS body,
    CASE WHEN e.created_at < NOW()-INTERVAL '1 hour' THEN COALESCE((SELECT SUM(value) FROM community_votes WHERE entry_id=e.id),0)::int ELSE NULL END AS score,
    COALESCE((SELECT value FROM community_votes WHERE entry_id=e.id AND user_id=$1),0) AS my_vote,
    EXISTS(SELECT 1 FROM community_saves WHERE entry_id=e.id AND user_id=$1) AS saved`;
  async function entry(c,key){const e=(await c.query('SELECT * FROM community_entries WHERE id=$1 FOR UPDATE',[id(key)])).rows[0];if(!e||e.hidden)fail('Nội dung không còn hiển thị.',404);return e;}
  async function writable(c,key){const target=await entry(c,key);const root=target.thread_id?await entry(c,target.thread_id):target;if(root.locked)fail('Thảo luận đã khóa.',409);return {target,root};}
  async function throttle(c,user,seconds){await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user]);const recent=await c.query("SELECT 1 FROM community_entries WHERE author_id=$1 AND created_at>NOW()-($2*INTERVAL '1 second') LIMIT 1",[user,seconds]);if(recent.rows.length)fail(`Bạn đăng quá nhanh. Vui lòng chờ ${seconds} giây.`,429);}
  router.get('/api/community/groups',(_req,res)=>res.json({groups:GROUPS,tags:TAGS}));
  router.get('/api/community/attachments/:id',wrap(async(req,res)=>{
    const file=(await pool.query(`SELECT a.name,a.mime,a.data FROM community_attachments a JOIN community_entries e ON e.id=a.entry_id JOIN community_entries root ON root.id=COALESCE(e.thread_id,e.id) WHERE a.id=$1 AND NOT e.hidden AND NOT root.hidden`,[id(req.params.id)])).rows[0];
    if(!file)fail('Tệp không còn hiển thị.',404);
    res.set('Content-Type',file.mime).set('X-Content-Type-Options','nosniff').set('Content-Security-Policy',"default-src 'none'; sandbox");
    res.set('Content-Disposition',`${file.mime.startsWith('image/')?'inline':'attachment'}; filename="attachment"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g,'%27')}`);
    res.send(Buffer.from(file.data));
  }));
  router.get('/api/community/posts',wrap(async(req,res)=>{
    const user=await viewer(req),saved=req.query.saved==='1';if(saved&&!user)fail('Vui lòng đăng nhập để xem bài đã lưu.',401);
    const sort=['new','top','hot'].includes(req.query.sort)?req.query.sort:'hot';
    const order=sort==='new'?'e.created_at DESC':sort==='top'?'rank_score DESC,e.created_at DESC':"(rank_score / POWER(2+EXTRACT(EPOCH FROM (NOW()-e.created_at))/3600,1.5)) DESC,e.created_at DESC";
    const days={week:7,month:30,all:36500}[req.query.period]||7;
    const result=await pool.query(`WITH feed AS (SELECT ${fields.replace('ELSE e.body END', 'ELSE LEFT(e.body,280) END')},
      LEFT(e.body,280) AS excerpt,(SELECT COUNT(*)::int FROM community_entries WHERE thread_id=e.id AND NOT hidden) AS comments,
      COALESCE((SELECT SUM(value) FROM community_votes WHERE entry_id=e.id),0)::float AS rank_score
      FROM community_entries e JOIN users u ON u.id=e.author_id WHERE e.thread_id IS NULL AND NOT e.hidden
      AND ($2='' OR e.group_id=$2) AND ($3='' OR e.title ILIKE '%'||$3||'%' OR e.body ILIKE '%'||$3||'%')
      AND (NOT $4::boolean OR EXISTS(SELECT 1 FROM community_saves WHERE entry_id=e.id AND user_id=$1))
      AND ($5<>'top' OR e.created_at>NOW()-($6*INTERVAL '1 day')))
      SELECT e.* FROM feed e ORDER BY ${order} ,e.id LIMIT 21 OFFSET $7`,[user,String(req.query.group||'').slice(0,30),String(req.query.q||'').slice(0,120),saved,sort,days,offset(req.query)]);
    res.json({posts:result.rows.slice(0,20).map(({body,rank_score,...p})=>p),hasMore:result.rows.length>20});
  }));
  router.get('/api/community/posts/:id',wrap(async(req,res)=>{
    const user=await viewer(req),key=id(req.params.id);
    const post=(await pool.query(`SELECT ${fields} FROM community_entries e JOIN users u ON u.id=e.author_id WHERE e.id=$2 AND e.thread_id IS NULL AND NOT e.hidden`,[user,key])).rows[0];
    if(!post)fail('Không tìm thấy bài viết.',404);
    const comments=await pool.query(`SELECT ${fields} FROM community_entries e JOIN users u ON u.id=e.author_id WHERE e.thread_id=$2 ORDER BY e.created_at,e.id LIMIT 51 OFFSET $3`,[user,key,offset(req.query)]);
    const visible=comments.rows.slice(0,50);
    const files=visible.length?(await pool.query('SELECT id,entry_id,name,mime,size FROM community_attachments WHERE entry_id=ANY($1::uuid[])',[visible.filter(c=>!c.hidden).map(c=>c.id)])).rows:[];
    res.json({post,comments:visible.map(c=>({...c,attachments:files.filter(f=>f.entry_id===c.id).map(f=>({...f,url:'/api/community/attachments/'+f.id}))})),hasMore:comments.rows.length>50,viewerId:user});
  }));
  router.post('/api/community/posts',requireAuth,wrap(async(req,res)=>{
    const b=req.body||{};if(!GROUPS.some(g=>g.id===b.group)||!TAGS.includes(b.tag))fail('Chọn nhóm và nhãn phù hợp.');
    const title=text(b.title,6,180),body=text(b.body,20,10000),key=randomUUID();
    await tx(pool,async c=>{await throttle(c,req.user.id,30);await c.query('INSERT INTO community_entries(id,author_id,group_id,title,body,tag) VALUES($1,$2,$3,$4,$5,$6)',[key,req.user.id,b.group,title,body,b.tag]);});res.status(201).json({id:key});
  }));
  router.post('/api/community/posts/:id/comments',requireAuth,wrap(async(req,res)=>{
    const files=attachmentsInput(req.body?.attachments),body=text(req.body?.body||'',files.length?0:1,4000),key=randomUUID();
    await tx(pool,async c=>{await throttle(c,req.user.id,5);const {root}=await writable(c,req.params.id);if(root.id!==req.params.id)fail('Bài viết không hợp lệ.');
      const parent=req.body.parent?id(req.body.parent):null;
      if(parent){const p=await entry(c,parent);if(p.thread_id!==root.id)fail('Bình luận thuộc bài viết khác.');}
      await c.query('INSERT INTO community_entries(id,author_id,thread_id,parent_id,group_id,body) VALUES($1,$2,$3,$4,$5,$6)',[key,req.user.id,root.id,parent,root.group_id,body]);
      for(const f of files)await c.query('INSERT INTO community_attachments(id,entry_id,name,mime,size,data) VALUES($1,$2,$3,$4,$5,$6)',[f.id,key,f.name,f.mime,f.bytes.length,f.bytes]);
    });res.status(201).json({id:key});
  }));
  router.post('/api/community/entries/:id/vote',requireAuth,wrap(async(req,res)=>{
    const value=req.body?.value;if(![-1,0,1].includes(value))fail('Phiếu không hợp lệ.');
    await tx(pool,async c=>{const {target}=await writable(c,req.params.id);if(target.author_id===req.user.id)fail('Bạn không thể bình chọn nội dung của mình.');
      if(value===0)await c.query('DELETE FROM community_votes WHERE entry_id=$1 AND user_id=$2',[target.id,req.user.id]);
      else await c.query('INSERT INTO community_votes(entry_id,user_id,value) VALUES($1,$2,$3) ON CONFLICT(entry_id,user_id) DO UPDATE SET value=EXCLUDED.value',[target.id,req.user.id,value]);
    });res.json({ok:true});
  }));
  router.post('/api/community/posts/:id/save',requireAuth,wrap(async(req,res)=>{
    if(typeof req.body?.saved!=='boolean')fail('Trạng thái lưu không hợp lệ.');
    await tx(pool,async c=>{const e=await entry(c,req.params.id);if(e.thread_id)fail('Chỉ lưu bài viết.');
      if(req.body.saved)await c.query('INSERT INTO community_saves VALUES($1,$2) ON CONFLICT DO NOTHING',[e.id,req.user.id]);
      else await c.query('DELETE FROM community_saves WHERE entry_id=$1 AND user_id=$2',[e.id,req.user.id]);
    });res.json({ok:true});
  }));
  router.post('/api/community/posts/:id/answer',requireAuth,wrap(async(req,res)=>{
    await tx(pool,async c=>{const {root}=await writable(c,req.params.id);if(root.id!==req.params.id||root.author_id!==req.user.id||root.tag!=='Hỏi đáp')fail('Chỉ tác giả bài hỏi đáp được chọn lời giải.',403);
      const key=req.body?.comment?id(req.body.comment):null;if(key){const answer=await entry(c,key);if(answer.thread_id!==root.id)fail('Lời giải phải thuộc bài viết này.');}
      await c.query('UPDATE community_entries SET accepted_id=$2 WHERE id=$1',[root.id,key]);
    });res.json({ok:true});
  }));
  router.post('/api/community/entries/:id/report',requireAuth,wrap(async(req,res)=>{
    const reason=text(req.body?.reason,10,1000);
    await tx(pool,async c=>{await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);const n=(await c.query("SELECT COUNT(*)::int AS n FROM community_reports WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 hour'",[req.user.id])).rows[0].n;if(n>=10)fail('Bạn đã gửi 10 báo cáo trong giờ qua. Vui lòng chờ.',429);const target=await entry(c,req.params.id);if(target.thread_id)await entry(c,target.thread_id);await c.query('INSERT INTO community_reports(id,entry_id,user_id,reason) VALUES($1,$2,$3,$4) ON CONFLICT(entry_id,user_id) DO NOTHING',[randomUUID(),target.id,req.user.id,reason]);});res.json({ok:true});
  }));
  router.get('/api/admin/community',requireAdmin,wrap(async(req,res)=>{
    const reports=await pool.query(`SELECT r.id,r.entry_id,r.reason,r.created_at,e.title,LEFT(e.body,2000) AS body,e.thread_id,e.hidden,e.locked,u.name AS author_name FROM community_reports r JOIN community_entries e ON e.id=r.entry_id JOIN users u ON u.id=e.author_id WHERE NOT r.resolved ORDER BY r.created_at,r.id LIMIT 21 OFFSET $1`,[offset(req.query)]);
    const posts=await pool.query('SELECT id,title,hidden,locked,created_at FROM community_entries WHERE thread_id IS NULL ORDER BY created_at DESC LIMIT 21 OFFSET $1',[offset(req.query)]);
    res.json({reports:reports.rows.slice(0,20),posts:posts.rows.slice(0,20),hasMore:reports.rows.length>20||posts.rows.length>20});
  }));
  router.post('/api/admin/community/:id',requireAdmin,wrap(async(req,res)=>{
    const action=req.body?.action,reason=text(req.body?.reason,10,1000);if(!['hide','restore','lock','unlock','resolve'].includes(action))fail('Thao tác không hợp lệ.');
    await tx(pool,async c=>{const key=id(req.params.id);const e=(await c.query('SELECT id,thread_id FROM community_entries WHERE id=$1 FOR UPDATE',[key])).rows[0];if(!e)fail('Không tìm thấy nội dung.',404);
      if(['lock','unlock'].includes(action)&&e.thread_id)fail('Chỉ khóa toàn bộ bài thảo luận.');
      if(action==='hide'||action==='restore')await c.query('UPDATE community_entries SET hidden=$2 WHERE id=$1',[key,action==='hide']);
      if(action==='hide')await c.query('UPDATE community_entries SET accepted_id=NULL WHERE accepted_id=$1',[key]);
      if(action==='lock'||action==='unlock')await c.query('UPDATE community_entries SET locked=$2 WHERE id=$1',[key,action==='lock']);
      await c.query('INSERT INTO community_moderation VALUES($1,$2,$3,$4,$5,NOW())',[randomUUID(),key,req.admin.id,action,reason]);
      await c.query('UPDATE community_reports SET resolved=TRUE WHERE entry_id=$1',[key]);
    });res.json({ok:true});
  }));
  return router;
}
module.exports={ensureCommunitySchema,createCommunity,GROUPS,TAGS,attachmentsInput};
