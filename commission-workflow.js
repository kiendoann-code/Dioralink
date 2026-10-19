'use strict';

const express = require('express');
const crypto = require('node:crypto');
const {alias,assertCommunication,privateMessages,filenameText}=require('./communication-policy');
const {tx,settle}=require('./wallet');

const ACTIVE = new Set(['pending','proposal_received']);
const MAX_FILE = 8 * 1024 * 1024;
const MAX_MESSAGE_TOTAL = 12 * 1024 * 1024;

function text(v, n=500){ return String(v ?? '').trim().slice(0,n); }
function money(v, min=0){
  const n=Number(v);
  if(!Number.isFinite(n) || n<min || n>1e12) throw Object.assign(new Error('Số tiền không hợp lệ.'),{status:400});
  return Math.round(n);
}
function artisanUserId(v){ const s=text(v,180); return s.startsWith('ART-')?s.slice(4):s; }
function artisanPublicId(v){ return v?'ART-'+v:''; }
function id(prefix){ return prefix+'-'+new Date().getFullYear()+'-'+crypto.randomUUID().slice(0,8).toUpperCase(); }
function parseDataUrl(v,max=MAX_FILE){
  const m=String(v||'').match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/);
  if(!m) throw Object.assign(new Error('Tệp đính kèm không hợp lệ.'),{status:400});
  const mime=m[1].toLowerCase();
  if(mime==='image/svg+xml'||mime==='text/html'||mime.includes('javascript')) throw Object.assign(new Error('Định dạng tệp không được hỗ trợ.'),{status:400});
  const size=Buffer.byteLength(m[2],'base64');
  if(!size||size>max) throw Object.assign(new Error('Mỗi tệp tối đa 8 MB.'),{status:400});
  return {mime,size,dataUrl:v};
}
function milestones(b){
  let allocated=0;
  return [['M1','Concept & Scope',20],['M2','Base & Structure',20],['M3','Sculpt & Composition',20],['M4','Paint, Resin & Lighting',25],['M5','Final Assembly & Delivery',15]]
    .map((x,i)=>{const amount=i===4?b-allocated:Math.round(b*x[2]/100);allocated+=amount;return {id:x[0],name:x[1],percentage:x[2],amount,status:'pending',evidence:'',approvedAt:null};});
}
async function ensureCommissionWorkflowSchema(pool){
  await pool.query(
    "CREATE TABLE IF NOT EXISTS commission_workflows ("+
    "id TEXT PRIMARY KEY,"+
    "customer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,"+
    "creator_mode TEXT NOT NULL CHECK (creator_mode IN ('matching','specific')),"+
    "preferred_artisan_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,"+
    "participant_artisan_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],"+
    "status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','proposal_received','proposal_accepted','expired','cancelled')),"+
    "payload JSONB NOT NULL DEFAULT '{}'::jsonb,"+
    "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),"+
    "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"+
    ");"+
    "CREATE INDEX IF NOT EXISTS idx_commission_workflows_customer ON commission_workflows(customer_user_id,created_at DESC);"+
    "CREATE INDEX IF NOT EXISTS idx_commission_workflows_status ON commission_workflows(status,created_at DESC);"+
    "CREATE INDEX IF NOT EXISTS idx_commission_workflows_participants ON commission_workflows USING GIN(participant_artisan_ids);"
  );
}
async function expire(pool){
  await pool.query(
    "UPDATE commission_workflows SET status='expired', updated_at=NOW() "+
    "WHERE status IN ('pending','proposal_received') AND created_at < NOW()-INTERVAL '72 hours' "+
    "AND COALESCE(payload->'project','null'::jsonb)='null'::jsonb"
  );
}
async function isArtisan(pool,userId){
  const r=await pool.query(
    "SELECT 1 FROM users u WHERE u.id=$1 AND (u.role='artisan' OR EXISTS("+
    "SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role='artisan')) LIMIT 1",[userId]);
  return !!r.rows[0];
}
function proposalFor(payload,userId){
  return (payload.proposals||[]).find(p=>artisanUserId(p.artisanId)===userId);
}
function canArtistSee(row,userId){
  if(!row||!userId)return false;
  if(row.preferred_artisan_user_id===userId)return true;
  if(row.participant_artisan_ids?.includes(userId))return true;
  return row.creator_mode==='matching' && ACTIVE.has(row.status);
}
function normalizeRow(row,viewer){
  const p=row.payload&&typeof row.payload==='object'?structuredClone(row.payload):{};
  p.id=row.id;p.customerId=row.customer_user_id;p.creatorMode=row.creator_mode;
  p.preferredArtisanId=row.preferred_artisan_user_id?artisanPublicId(row.preferred_artisan_user_id):null;
  p.status=row.status;p.createdAt=row.created_at;p.updatedAt=row.updated_at;
  p.proposals=Array.isArray(p.proposals)?p.proposals:[];
  p.attachments=Array.isArray(p.attachments)?p.attachments:[];
  p.selectedProposal=p.proposals.find(x=>x.status==='accepted')?.id||null;
  delete p.threads;
  if(viewer?.role==='artisan'){
    p.customerId=alias(row.id);
    if(p.project){p.project.customerId=alias(row.id);p.project.messages=privateMessages(p.project.messages,row.id,viewer);}
    p.proposals=p.proposals.filter(x=>artisanUserId(x.artisanId)===viewer.id);
    if(p.project&&artisanUserId(p.project.artisanId)!==viewer.id) delete p.project;
  }
  return p;
}
function projectFrom(row,viewer){
  const req=normalizeRow(row,viewer);
  return req.project||null;
}
async function rowById(pool,requestId,lock=false,client=null){
  const db=client||pool;
  const q="SELECT * FROM commission_workflows WHERE id=$1 LIMIT 1"+(lock?" FOR UPDATE":"");
  return (await db.query(q,[requestId])).rows[0]||null;
}
function threadMessages(payload,artisanId){
  const t=payload.threads&&typeof payload.threads==='object'?payload.threads:{};
  return Array.isArray(t[artisanId])?t[artisanId]:[];
}
function conversationAllowed(row,user,artistId){
  if(!row)return false;
  const p=row.payload||{};
  const projectArtist=artisanUserId(p.project?.artisanId);
  const proposal=(p.proposals||[]).find(x=>artisanUserId(x.artisanId)===artistId);
  const directBeforeClose=row.preferred_artisan_user_id===artistId&&row.status!=='proposal_accepted';
  const linked=projectArtist===artistId || directBeforeClose || !!proposal&&['pending','accepted'].includes(proposal.status);
  if(!linked)return false;
  if(user.role==='customer')return row.customer_user_id===user.id;
  return user.role==='artisan'&&user.id===artistId;
}
async function profiles(pool,rows){
  const ids=[...new Set(rows.flatMap(r=>[
    r.customer_user_id,r.preferred_artisan_user_id,...(r.participant_artisan_ids||[])
  ]).filter(Boolean))];
  if(!ids.length)return {artisans:[],customers:{}};
  const result=(await pool.query(
    "SELECT u.id,u.name,u.email,u.avatar,u.city,u.bio,u.role,p.profile,EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role='artisan') AS is_artisan FROM users u "+
    "LEFT JOIN public_artisan_profiles p ON p.user_id=u.id AND p.published=TRUE "+
    "WHERE u.id=ANY($1::text[])",[ids])).rows;
  const customers={},artisans=[];
  for(const r of result){
    customers[r.id]={id:r.id,name:r.name||'Customer',avatar:r.avatar||''};
    const pr=r.profile&&typeof r.profile==='object'?r.profile:{};
    if(r.role==='artisan'||r.is_artisan) artisans.push({
      id:artisanPublicId(r.id),name:pr.name||r.name||'Artisan',handle:pr.handle||'',city:pr.city||r.city||'',
      bio:pr.bio||r.bio||'',avatar:r.avatar||'',hero:'',portfolio:[],specialties:Array.isArray(pr.specialties)?pr.specialties:[],
      startingPrice:Number(pr.startingPrice||0),response:pr.response||'',verified:false,rating:0,reviews:0,completed:0
    });
  }
  return {artisans,customers};
}
function createCommissionWorkflow({pool,requireAuth}){
  const router=express.Router();
  const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);

  router.get('/workspace',requireAuth,wrap(async(req,res)=>{
    await ensureCommissionWorkflowSchema(pool);await expire(pool);
    let rows;
    if(req.user.role==='customer'){
      rows=(await pool.query("SELECT * FROM commission_workflows WHERE customer_user_id=$1 ORDER BY created_at DESC LIMIT 250",[req.user.id])).rows;
    }else if(req.user.role==='artisan'){
      rows=(await pool.query(
        "SELECT * FROM commission_workflows WHERE "+
        "($1=preferred_artisan_user_id OR $1=ANY(participant_artisan_ids) OR (creator_mode='matching' AND status IN ('pending','proposal_received'))) "+
        "ORDER BY created_at DESC LIMIT 250",[req.user.id])).rows.filter(r=>canArtistSee(r,req.user.id));
    }else return res.status(403).json({message:'Không có quyền truy cập commission workspace.'});
    const participants=await profiles(pool,rows);
    const requests=rows.map(r=>normalizeRow(r,req.user));
    const projects=rows.map(r=>projectFrom(r,req.user)).filter(Boolean);
    const conversations=[];
    for(const r of rows){
      const payload=r.payload||{};
      const aids=[...new Set([
        r.preferred_artisan_user_id,...(r.participant_artisan_ids||[]),
        artisanUserId(payload.project?.artisanId)
      ].filter(Boolean))];
      for(const aid of aids){
        if(req.user.role==='artisan'&&aid!==req.user.id)continue;
        if(!conversationAllowed(r,req.user,aid))continue;
        const msgs=privateMessages(threadMessages(payload,aid),r.id,req.user);
        const a=participants.artisans.find(x=>x.id===artisanPublicId(aid));
        const c=participants.customers[r.customer_user_id];
        const prop=(payload.proposals||[]).find(x=>artisanUserId(x.artisanId)===aid);
        conversations.push({
          key:r.id+'|'+aid,requestId:r.id,artisanUserId:aid,artisanId:artisanPublicId(aid),
          projectId:artisanUserId(payload.project?.artisanId)===aid?payload.project?.id||null:null,
          title:payload.title||r.id,quote:Number(prop?.quote||payload.budget||0),proposalStatus:prop?.status||null,
          requestStatus:r.status,counterpart:req.user.role==='customer'?{name:a?.name||'Artisan',avatar:a?.avatar||''}:{name:alias(r.id),avatar:''},
          messages:msgs,lastMessage:msgs[msgs.length-1]||null
        });
      }
    }
    conversations.sort((a,b)=>new Date(b.lastMessage?.createdAt||0)-new Date(a.lastMessage?.createdAt||0));
    if(req.user.role==='artisan'){participants.customers=Object.fromEntries(rows.map(r=>[alias(r.id),{id:alias(r.id),name:alias(r.id),avatar:''}]));participants.artisans=participants.artisans.filter(a=>rows.some(r=>(r.participant_artisan_ids||[]).includes(artisanUserId(a.id))||r.preferred_artisan_user_id===artisanUserId(a.id)));}
    res.json({requests,projects,conversations,participants});
  }));

  router.post('/requests',requireAuth,wrap(async(req,res)=>{
    if(req.user.role!=='customer')return res.status(403).json({message:'Chỉ Customer có thể tạo yêu cầu.'});
    await ensureCommissionWorkflowSchema(pool);
    const body=req.body||{},mode=body.creatorMode==='specific'?'specific':'matching';
    const preferred=mode==='specific'?artisanUserId(body.preferredArtisanId):null;
    if(mode==='specific'&&(!preferred||!(await isArtisan(pool,preferred))))return res.status(400).json({message:'Nghệ nhân được chọn không hợp lệ.'});
    const payload={title:text(body.title,200),style:text(body.style,100),size:text(body.size,120),budget:money(body.budget,1),
      timeline:text(body.timeline,120),description:text(body.description,8000),attachments:[],proposals:[],project:null,threads:{}};
    assertCommunication(payload.title,payload.style,payload.size,payload.timeline,payload.description);
    if(!payload.title||!payload.size||!payload.timeline||!payload.description)return res.status(400).json({message:'Vui lòng điền đủ thông tin request.'});
    const rid=id('REQ');
    const row=(await pool.query(
      "INSERT INTO commission_workflows(id,customer_user_id,creator_mode,preferred_artisan_user_id,status,payload) "+
      "VALUES($1,$2,$3,$4,'pending',$5) RETURNING *",
      [rid,req.user.id,mode,preferred,JSON.stringify(payload)])).rows[0];
    res.status(201).json({request:normalizeRow(row,req.user)});
  }));

  router.post('/requests/:id/attachment',requireAuth,wrap(async(req,res)=>{
    if(req.user.role!=='customer')return res.status(403).json({message:'Forbidden'});
    const row=await rowById(pool,req.params.id);
    if(!row||row.customer_user_id!==req.user.id)return res.status(404).json({message:'Không tìm thấy request.'});
    if(!ACTIVE.has(row.status))return res.status(409).json({message:'Request không còn nhận chỉnh sửa.'});
    assertCommunication(filenameText(req.body?.name));
    const f=parseDataUrl(req.body?.dataUrl);
    if(!f.mime.startsWith('image/'))return res.status(400).json({message:'Reference phải là hình ảnh.'});
    const payload=row.payload||{};payload.attachments=Array.isArray(payload.attachments)?payload.attachments:[];
    payload.attachments.push({id:'ATT-'+crypto.randomUUID(),name:text(req.body?.name,240)||'reference',type:f.mime,size:f.size,dataUrl:f.dataUrl});
    await pool.query("UPDATE commission_workflows SET payload=$1,updated_at=NOW() WHERE id=$2",[JSON.stringify(payload),row.id]);
    res.status(201).json({ok:true});
  }));

  router.patch('/requests/:id',requireAuth,wrap(async(req,res)=>{
    if(req.user.role!=='customer')return res.status(403).json({message:'Chỉ Customer có thể tinh chỉnh brief.'});
    const row=await rowById(pool,req.params.id);
    if(!row||row.customer_user_id!==req.user.id)return res.status(404).json({message:'Không tìm thấy request.'});
    if(!ACTIVE.has(row.status))return res.status(409).json({message:'Request đã chốt hoặc hết hạn.'});
    const p=row.payload||{},b=req.body||{};
    p.title=text(b.title??p.title,200);p.style=text(b.style??p.style,100);p.size=text(b.size??p.size,120);
    p.budget=money(b.budget??p.budget,1);p.timeline=text(b.timeline??p.timeline,120);p.description=text(b.description??p.description,8000);
    assertCommunication(p.title,p.style,p.size,p.timeline,p.description);
    const updated=(await pool.query("UPDATE commission_workflows SET payload=$1,updated_at=NOW() WHERE id=$2 RETURNING *",[JSON.stringify(p),row.id])).rows[0];
    res.json({request:normalizeRow(updated,req.user),message:'Đã gửi brief cập nhật để nghệ nhân xem lại.'});
  }));

  router.delete('/requests/:id',requireAuth,wrap(async(req,res)=>{
    if(req.user.role!=='customer')return res.status(403).json({message:'Forbidden'});
    const row=await rowById(pool,req.params.id);
    if(!row||row.customer_user_id!==req.user.id)return res.status(404).json({message:'Không tìm thấy request.'});
    const p=row.payload||{};
    if((p.proposals||[]).length||p.project)return res.status(409).json({message:'Không thể xóa request đã có phản hồi.'});
    await pool.query("DELETE FROM commission_workflows WHERE id=$1",[row.id]);res.json({ok:true});
  }));

  router.post('/requests/:id/proposals',requireAuth,wrap(async(req,res)=>{
    if(req.user.role!=='artisan')return res.status(403).json({message:'Chỉ Artisan có thể gửi báo giá.'});
    await ensureCommissionWorkflowSchema(pool);await expire(pool);
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const row=await rowById(pool,req.params.id,true,client);
      if(!row||!canArtistSee(row,req.user.id)){await client.query('ROLLBACK');return res.status(403).json({message:'Request này không dành cho bạn.'});}
      if(!ACTIVE.has(row.status)){await client.query('ROLLBACK');return res.status(409).json({message:'Request không còn nhận báo giá.'});}
      const p=row.payload||{};p.proposals=Array.isArray(p.proposals)?p.proposals:[];
      let prop=proposalFor(p,req.user.id);
      const quote=money(req.body?.quote,1),timeline=text(req.body?.timeline,120),message=text(req.body?.message,4000);
      const deliverables=Array.isArray(req.body?.deliverables)?req.body.deliverables.slice(0,20).map(x=>text(x,160)).filter(Boolean):[];
      assertCommunication(timeline,message,...deliverables);
      if(!timeline||!message||!deliverables.length){await client.query('ROLLBACK');return res.status(400).json({message:'Thiếu timeline, lời nhắn hoặc hạng mục bàn giao.'});}
      if(prop&&prop.status!=='pending'){await client.query('ROLLBACK');return res.status(409).json({message:'Báo giá đã được chốt.'});}
      if(prop){
        Object.assign(prop,{quote,timeline,message,deliverables,revisionNo:Number(prop.revisionNo||1)+1,updatedAt:new Date().toISOString()});
      }else{
        prop={id:id('PROP'),requestId:row.id,artisanId:artisanPublicId(req.user.id),quote,timeline,message,deliverables,status:'pending',revisionNo:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
        p.proposals.push(prop);
      }
      p.threads=p.threads&&typeof p.threads==='object'?p.threads:{};
      if(!Array.isArray(p.threads[req.user.id]))p.threads[req.user.id]=[];
      const participants=[...new Set([...(row.participant_artisan_ids||[]),req.user.id])];
      const updated=(await client.query(
        "UPDATE commission_workflows SET payload=$1,participant_artisan_ids=$2,status='proposal_received',updated_at=NOW() WHERE id=$3 RETURNING *",
        [JSON.stringify(p),participants,row.id])).rows[0];
      await client.query('COMMIT');
      res.json({proposal:proposalFor(updated.payload,req.user.id),message:prop.revisionNo>1?'Đã gửi báo giá điều chỉnh cho khách hàng.':'Đã gửi báo giá cho khách hàng.'});
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }));

  router.post('/requests/:id/proposals/:proposalId/accept',requireAuth,wrap(async(req,res)=>{
    if(req.user.role!=='customer')return res.status(403).json({message:'Chỉ Customer có thể chấp nhận báo giá.'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const row=await rowById(pool,req.params.id,true,client);
      if(!row||row.customer_user_id!==req.user.id){await client.query('ROLLBACK');return res.status(404).json({message:'Không tìm thấy request.'});}
      if(!ACTIVE.has(row.status)){await client.query('ROLLBACK');return res.status(409).json({message:'Request đã được xử lý.'});}
      const p=row.payload||{},props=Array.isArray(p.proposals)?p.proposals:[];
      const prop=props.find(x=>x.id===req.params.proposalId&&x.status==='pending');
      if(!prop){await client.query('ROLLBACK');return res.status(404).json({message:'Không tìm thấy báo giá đang chờ.'});}
      props.forEach(x=>{if(x.status==='pending')x.status=x.id===prop.id?'accepted':'declined';});
      const aid=artisanUserId(prop.artisanId),budget=Number(prop.quote||0),pid=id('DL');
      p.project={id:pid,requestId:row.id,customerId:row.customer_user_id,artisanId:artisanPublicId(aid),title:p.title,budget,progress:0,status:'awaiting_production',
        walletRequired:true,currentMilestone:1,dueDate:'',milestones:milestones(budget),files:[],payments:[],activity:[{text:'Proposal accepted → Project created',time:new Date().toISOString()}],messages:[]};
      p.threads=p.threads&&typeof p.threads==='object'?p.threads:{};p.threads[aid]=Array.isArray(p.threads[aid])?p.threads[aid]:[];
      const hello={id:'MSG-'+crypto.randomUUID(),senderId:artisanPublicId(aid),senderRole:'artisan',text:'Cảm ơn bạn đã chọn báo giá. Hai bên có thể trao đổi trực tiếp tại đây.',attachments:[],createdAt:new Date().toISOString(),time:new Date().toLocaleString('vi-VN')};
      p.threads[aid].push(hello);p.project.messages=p.threads[aid];
      const participants=[...new Set([...(row.participant_artisan_ids||[]),aid])];
      const updated=(await client.query(
        "UPDATE commission_workflows SET payload=$1,participant_artisan_ids=$2,status='proposal_accepted',updated_at=NOW() WHERE id=$3 RETURNING *",
        [JSON.stringify(p),participants,row.id])).rows[0];
      await client.query('COMMIT');
      res.json({project:updated.payload.project,message:'Đã chấp nhận báo giá và tạo dự án.'});
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }));

  router.get('/conversations/:requestId/:artisanId/messages',requireAuth,wrap(async(req,res)=>{
    const row=await rowById(pool,req.params.requestId),aid=artisanUserId(req.params.artisanId);
    if(!conversationAllowed(row,req.user,aid))return res.status(403).json({message:'Bạn không thuộc cuộc trò chuyện này.'});
    res.json({messages:privateMessages(threadMessages(row.payload||{},aid),row.id,req.user)});
  }));

  router.post('/conversations/:requestId/:artisanId/messages',requireAuth,wrap(async(req,res)=>{
    const aid=artisanUserId(req.params.artisanId),client=await pool.connect();
    try{
      await client.query('BEGIN');
      const row=await rowById(pool,req.params.requestId,true,client);
      if(!conversationAllowed(row,req.user,aid)){await client.query('ROLLBACK');return res.status(403).json({message:'Bạn không thuộc cuộc trò chuyện này.'});}
      const body=req.body||{},msg=text(body.text,5000),raw=Array.isArray(body.attachments)?body.attachments.slice(0,5):[];
      assertCommunication(msg,...raw.map(f=>filenameText(f.name)));
      if(!msg&&!raw.length){await client.query('ROLLBACK');return res.status(400).json({message:'Hãy nhập tin nhắn hoặc đính kèm tệp.'});}
      let total=0;const attachments=raw.map(f=>{const parsed=parseDataUrl(f.dataUrl);total+=parsed.size;return {id:'ATT-'+crypto.randomUUID(),name:text(f.name,240)||'attachment',type:parsed.mime,size:parsed.size,dataUrl:parsed.dataUrl};});
      if(total>MAX_MESSAGE_TOTAL){await client.query('ROLLBACK');return res.status(400).json({message:'Tổng tệp trong một tin nhắn tối đa 12 MB.'});}
      const payload=row.payload||{};payload.threads=payload.threads&&typeof payload.threads==='object'?payload.threads:{};
      payload.threads[aid]=Array.isArray(payload.threads[aid])?payload.threads[aid]:[];
      const item={id:'MSG-'+crypto.randomUUID(),senderId:req.user.role==='artisan'?artisanPublicId(req.user.id):req.user.id,senderRole:req.user.role,text:msg,attachments,createdAt:new Date().toISOString(),time:new Date().toLocaleString('vi-VN')};
      payload.threads[aid].push(item);
      if(artisanUserId(payload.project?.artisanId)===aid)payload.project.messages=payload.threads[aid];
      await client.query("UPDATE commission_workflows SET payload=$1,updated_at=NOW() WHERE id=$2",[JSON.stringify(payload),row.id]);
      await client.query('COMMIT');res.status(201).json({message:item});
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }));

  router.put('/projects/:projectId',requireAuth,wrap(async(req,res)=>{
    const project=await tx(pool,async c=>{
      const row=(await c.query("SELECT * FROM commission_workflows WHERE payload->'project'->>'id'=$1 FOR UPDATE",[req.params.projectId])).rows[0];
      if(!row)throw Object.assign(new Error('Không tìm thấy dự án.'),{status:404});
      const p=row.payload,project=p.project,aid=artisanUserId(project.artisanId),buyer=req.user.id===row.customer_user_id,artist=req.user.id===aid;
      const deny=m=>{throw Object.assign(new Error(m),{status:409});};
      if(!buyer&&!artist)throw Object.assign(new Error('Không có quyền cập nhật.'),{status:403});
      const b=req.body||{};
      if(project.status==='cancelled_by_customer')deny('Dự án đã dừng.');
      const cancel=buyer&&b.status==='cancelled_by_customer';
      for(const [i,m] of project.milestones.entries()){
        const incoming=(b.milestones||[]).find(x=>x.id===m.id);if(!incoming||incoming.status===m.status)continue;
        if(cancel&&incoming.status==='cancelled'&&m.status!=='approved'){
          if(m.status==='pending')await settle(c,'commission:'+project.id+':'+m.id,true);
          m.status='cancelled';continue;
        }
        const allowed=(artist&&m.status==='pending'&&incoming.status==='in_progress')||(artist&&m.status==='in_progress'&&incoming.status==='submitted')||(buyer&&m.status==='submitted'&&incoming.status==='approved');
        if(!allowed)deny('Trạng thái milestone không hợp lệ. Tải lại dự án.');
        if(incoming.status==='in_progress'){
          if(i>0&&project.milestones[i-1].status!=='approved')deny('Hoàn tất mốc trước khi bắt đầu mốc tiếp theo.');
          if(project.walletRequired){const hold=(await c.query('SELECT status FROM diora_holds WHERE ref=$1',['commission:'+project.id+':'+m.id])).rows[0];if(hold?.status!=='held')deny('Khách hàng cần giữ tiền cho mốc này trong Ví Diora trước khi bắt đầu.');}
        }
        assertCommunication(incoming.evidence||'');m.status=incoming.status;
        if(artist)m.evidence=text(incoming.evidence,4000);
        if(m.status==='approved')m.approvedAt=new Date().toISOString();
      }
      if(artist&&b.dueDate!==undefined)project.dueDate=text(b.dueDate,50);
      if(Array.isArray(b.files)){b.files.forEach(f=>assertCommunication(filenameText(f.name)));project.files=b.files.slice(0,100).map(f=>({id:text(f.id,100),name:text(f.name,240),size:money(f.size),uploader:artist?'artisan':'customer'}));}
      project.progress=project.milestones.filter(m=>m.status==='approved').reduce((n,m)=>n+m.percentage,0);
      project.currentMilestone=Math.max(1,project.milestones.findIndex(m=>m.status!=='approved')+1);
      project.status=cancel?'cancelled_by_customer':project.progress===100?'completed':project.milestones.some(m=>m.status!=='pending')?'in_production':'awaiting_production';
      if(cancel){project.cancelledAt=new Date().toISOString();project.cancelledMilestoneId=text(b.cancelledMilestoneId,20);}
      project.messages=threadMessages(p,aid);
      await c.query('UPDATE commission_workflows SET payload=$2,updated_at=NOW() WHERE id=$1',[row.id,JSON.stringify(p)]);
      return normalizeRow({...row,payload:p},req.user).project;
    });res.json({project,message:'Đã đồng bộ trạng thái dự án.'});
  }));

  router.use((err,req,res,next)=>{
    if(!err.status)console.error('Commission workflow error:',err);
    if(res.headersSent)return next(err);
    res.status(err.status||500).json({message:err.message||'Không thể xử lý commission workflow.'});
  });
  return {router};
}
module.exports={createCommissionWorkflow,ensureCommissionWorkflowSchema};

