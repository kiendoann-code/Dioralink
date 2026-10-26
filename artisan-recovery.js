'use strict';
const express=require('express');
const {randomUUID}=require('node:crypto');
const PROFILE=/^ART-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i, UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
function err(message,status=400){throw Object.assign(new Error(message),{status});}
const clean=(s,n=200)=>typeof s==='string'?s.trim().slice(0,n):'';
const norm=s=>clean(s).toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]/g,'');
async function tx(pool,fn){const c=await pool.connect();try{await c.query('BEGIN');const out=await fn(c);await c.query('COMMIT');return out;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function ensureArtisanRecoverySchema(pool){
 await pool.query(`
 CREATE TABLE IF NOT EXISTS recovered_artisan_staging (
 source_profile_id TEXT PRIMARY KEY,old_user_id UUID NOT NULL,name TEXT NOT NULL,snapshot JSONB NOT NULL,
 exported_at TIMESTAMPTZ NOT NULL,cached_published BOOLEAN NOT NULL DEFAULT FALSE,
 verification_status TEXT NOT NULL DEFAULT 'pending_owner_verification',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(verification_status IN ('pending_owner_verification','owner_verified','rejected')));
 CREATE TABLE IF NOT EXISTS recovered_artisan_media (
 source_profile_id TEXT NOT NULL REFERENCES recovered_artisan_staging(source_profile_id) ON DELETE RESTRICT,
 slot TEXT NOT NULL CHECK(slot IN ('avatar','hero')),
 mime TEXT NOT NULL CHECK(mime IN ('image/jpeg','image/png','image/webp')),
 bytes BYTEA NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(source_profile_id,slot));
 CREATE TABLE IF NOT EXISTS recovered_artisan_claims (
 id UUID PRIMARY KEY,source_profile_id TEXT NOT NULL REFERENCES recovered_artisan_staging(source_profile_id),
 claimant_user_id TEXT NOT NULL REFERENCES users(id),evidence TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 admin_note TEXT NOT NULL DEFAULT '',verification_method TEXT NOT NULL DEFAULT '',
 reviewed_by UUID REFERENCES platform_admins(id),reviewed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(source_profile_id,claimant_user_id));
 CREATE UNIQUE INDEX IF NOT EXISTS recovered_one_approved_owner ON recovered_artisan_claims(source_profile_id) WHERE status='approved';
 CREATE UNIQUE INDEX IF NOT EXISTS recovered_one_approved_per_user ON recovered_artisan_claims(claimant_user_id) WHERE status='approved';
 CREATE INDEX IF NOT EXISTS recovered_claim_status ON recovered_artisan_claims(status,created_at DESC);
 `);
}
function restoredProfile(src,slots,sourceId){
 const p={};for(const key of ['name','handle','city','bio','response','specialties','startingPrice'])if(Object.hasOwn(src,key))p[key]=src[key];
 p.avatar=slots.includes('avatar')?'https://dioralink.xyz/media/recovered-artisan/'+sourceId+'/avatar':'';
 p.hero=slots.includes('hero')?'https://dioralink.xyz/media/recovered-artisan/'+sourceId+'/hero':'';
 p.portfolio=Array.isArray(src.portfolio)?src.portfolio.filter(x=>typeof x==='string'&&x.startsWith('https://')):[];
 p.recoveredFrom=sourceId;return p;
}
function validBytes(mime,buf){
 if(buf.length<32||buf.length>2*1024*1024)return false;
 if(mime==='image/jpeg')return buf[0]===255&&buf[1]===216&&buf[2]===255;
 if(mime==='image/png')return buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(mime==='image/webp')return buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';
 return false;
}
function createArtisanRecoveryRouter({pool,requireAuth,requireAdmin}){
 const r=express.Router(),wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
 const isArtisan=req=>req.user?.role==='artisan'||req.user?.roles?.includes('artisan');
 const guard=(req,res,next)=>{
  if(!req.is('application/json'))return res.status(415).json({message:'JSON required.'});
  const o=req.get('origin');if(o){let u;try{u=new URL(o);}catch{return res.status(403).end();}
   if(u.protocol!=='https:'||!['dioralink.xyz','www.dioralink.xyz','dioralink.onrender.com','dioralink-1.onrender.com'].includes(u.hostname))return res.status(403).end();}
  next();
 };
 r.use(['/api/artisan/recovery','/api/admin/artisan-recovery'],(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 r.get('/api/artisan/recovery',requireAuth,wrap(async(req,res)=>{
  if(!isArtisan(req))err('Chỉ dành cho nghệ nhân.',403);
  const profiles=(await pool.query('SELECT source_profile_id,name,cached_published FROM recovered_artisan_staging ORDER BY name')).rows
    .filter(p=>p.cached_published||norm(p.name)===norm(req.user.name))
    .map(p=>({id:p.source_profile_id,name:p.name,published:p.cached_published}));
  const claims=(await pool.query(`SELECT c.id,c.source_profile_id,c.status,c.created_at,c.reviewed_at,c.admin_note,s.name
   FROM recovered_artisan_claims c JOIN recovered_artisan_staging s ON s.source_profile_id=c.source_profile_id
   WHERE claimant_user_id=$1 ORDER BY c.created_at DESC`,[req.user.id])).rows;
  res.json({profiles,claims});
 }));
 r.post('/api/artisan/recovery/claims',requireAuth,guard,wrap(async(req,res)=>{
  if(!isArtisan(req))err('Chỉ dành cho nghệ nhân.',403);
  const id=clean(req.body?.profile_id,45),evidence=clean(req.body?.evidence,2000);
  if(!PROFILE.test(id)||evidence.length<20)err('Chọn hồ sơ và cung cấp căn cứ xác minh tối thiểu 20 ký tự.');
  const claim=await tx(pool,async c=>{
   const old=(await c.query('SELECT * FROM recovered_artisan_staging WHERE source_profile_id=$1 FOR UPDATE',[id])).rows[0];
   if(!old)err('Hồ sơ không tồn tại.',404);
   if(!old.cached_published&&norm(old.name)!==norm(req.user.name))err('Hồ sơ này chưa công khai.',403);
   if((await c.query("SELECT 1 FROM recovered_artisan_claims WHERE source_profile_id=$1 AND status='approved'",[id])).rows[0])err('Hồ sơ đã có chủ sở hữu.',409);
   if((await c.query("SELECT 1 FROM recovered_artisan_claims WHERE claimant_user_id=$1 AND status='approved'",[req.user.id])).rows[0])err('Bạn đã liên kết một hồ sơ.',409);
   const existing=(await c.query('SELECT id,status FROM recovered_artisan_claims WHERE source_profile_id=$1 AND claimant_user_id=$2',[id,req.user.id])).rows[0];
   if(existing){if(existing.status==='rejected')err('Yêu cầu trước bị từ chối, liên hệ quản trị viên.',409);return existing;}
   const created=(await c.query('INSERT INTO recovered_artisan_claims(id,source_profile_id,claimant_user_id,evidence) VALUES($1,$2,$3,$4) RETURNING id,status',[randomUUID(),id,req.user.id,evidence])).rows[0];
   await c.query("INSERT INTO admin_notifications(admin_id,title,body,route) SELECT id,$1,$2,'admin-artisan-recovery' FROM platform_admins WHERE active=TRUE",['Xác minh khôi phục nghệ nhân',req.user.name+' · '+old.name+' · '+created.id]);
   return created;
  });res.status(201).json({claim});
 }));
 r.get('/api/admin/artisan-recovery/claims',requireAdmin,wrap(async(req,res)=>{
  const claims=(await pool.query(`SELECT c.id,c.status,c.source_profile_id,c.evidence,c.admin_note,c.created_at,
    s.name AS profile_name,s.cached_published,u.name AS claimant_name,u.email AS claimant_email,
    (SELECT COUNT(*)::integer FROM recovered_artisan_media m WHERE m.source_profile_id=s.source_profile_id) AS image_count
   FROM recovered_artisan_claims c JOIN recovered_artisan_staging s ON s.source_profile_id=c.source_profile_id
   JOIN users u ON u.id=c.claimant_user_id ORDER BY (c.status='pending') DESC,c.created_at DESC LIMIT 200`)).rows;
  res.json({claims});
 }));
 r.post('/api/admin/artisan-recovery/media/import',requireAdmin,guard,wrap(async(req,res)=>{
  const images=req.body?.images;
  if(!Array.isArray(images)||!images.length||images.length>24)err('File ảnh khôi phục không hợp lệ.');
  const inserted=await tx(pool,async c=>{
   let count=0;
   for(const img of images){
    const key=clean(img?.id,120),url=img?.image;
    if(typeof url!=='string'||url.length>3*1024*1024)err('Ảnh không hợp lệ.');
    const split=url.indexOf(',');
    const header=url.slice(0,split),payload=url.slice(split+1);
    if(!['data:image/jpeg;base64','data:image/png;base64','data:image/webp;base64'].includes(header))err('Định dạng ảnh không hợp lệ.');
    const match=[null,header.slice(5,-7),payload];
    if(!match)err('Chỉ hỗ trợ JPEG, PNG, WebP.');
    const buffer=Buffer.from(match[2],'base64');
    if(!validBytes(match[1],buffer))err('Ảnh sai định dạng hoặc quá lớn.');
    const rows=(await c.query('SELECT source_profile_id,snapshot FROM recovered_artisan_staging WHERE snapshot->>\'avatar\'=$1 OR snapshot->>\'hero\'=$1',['asset:'+key])).rows;
    for(const row of rows){
     const slot=row.snapshot.avatar==='asset:'+key?'avatar':'hero';
     const v=await c.query('INSERT INTO recovered_artisan_media(source_profile_id,slot,mime,bytes) VALUES($1,$2,$3,$4) ON CONFLICT (source_profile_id,slot) DO NOTHING RETURNING source_profile_id',[row.source_profile_id,slot,match[1],buffer]);
     count+=v.rowCount||0;
    }
   }return count;
  });res.json({imported:inserted});
 }));
 r.post('/api/admin/artisan-recovery/claims/:id/review',requireAdmin,guard,wrap(async(req,res)=>{
  const id=clean(req.params.id,50),action=clean(req.body?.action,10),note=clean(req.body?.note,2000),method=clean(req.body?.verification_method,90);
  if(!UUID.test(id)||!['approve','reject'].includes(action))err('Yêu cầu không hợp lệ.');
  if(note.length<20)err('Cần ghi rõ căn cứ tối thiểu 20 ký tự.');
  if(action==='approve'&&!['direct_artist_contact','social_profile_message','existing_invoice','other_document'].includes(method))err('Cần phương thức xác minh độc lập.');
  const result=await tx(pool,async c=>{
   const claim=(await c.query('SELECT * FROM recovered_artisan_claims WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!claim)err('Không có yêu cầu.',404);
   if(claim.status!=='pending')err('Yêu cầu đã được xử lý.',409);
   if(action==='approve'){
    const old=(await c.query('SELECT * FROM recovered_artisan_staging WHERE source_profile_id=$1 FOR UPDATE',[claim.source_profile_id])).rows[0];
    const owner=(await c.query('SELECT id,role FROM users WHERE id=$1 FOR UPDATE',[claim.claimant_user_id])).rows[0];
    if(!owner||owner.role!=='artisan')err('Tài khoản phải là nghệ nhân.',409);
    if((await c.query("SELECT 1 FROM recovered_artisan_claims WHERE source_profile_id=$1 AND status='approved' OR claimant_user_id=$2 AND status='approved'",[claim.source_profile_id,owner.id])).rows[0])err('Hồ sơ hoặc chủ sở hữu đã được liên kết.',409);
    const originalId=old.source_profile_id.replace(/^ART-/,'');
    const legacy=(await c.query('SELECT old_user_id FROM legacy_restore_control WHERE old_user_id=$1 AND access_verified=FALSE FOR UPDATE',[originalId])).rows[0];
    const archived=(legacy?(await c.query('SELECT user_id,slug,profile FROM public_artisan_profiles WHERE user_id=$1 AND slug=$2 FOR UPDATE',[originalId,old.snapshot.slug])).rows[0]:null);
    const occupied=(await c.query('SELECT user_id FROM public_artisan_profiles WHERE user_id=$1 OR slug=$2 FOR UPDATE',[owner.id,old.snapshot.slug])).rows;
    if(archived){
      if(occupied.some(x=>x.user_id!==originalId))err('Đã có người sở hữu hồ sơ này, không thể chuyển tự động.',409);
      const source=(await c.query("SELECT payload->>'published' AS was_published FROM render_backup_rows WHERE table_name='public_artisan_profiles' AND payload->>'user_id'=$1 AND payload->>'slug'=$2 LIMIT 1",[originalId,old.snapshot.slug])).rows[0];
      if(!source)err('Không tìm được hồ sơ trong bản sao lưu gốc.',409);
      const published=['t','true'].includes(String(source.was_published));
      await c.query('UPDATE public_artisan_profiles SET user_id=$2,published=$3,updated_at=NOW() WHERE user_id=$1 AND slug=$4',[originalId,owner.id,published,old.snapshot.slug]);
      // Only move recovered draft goods after independent proof of ownership.
      // Financial ledgers, historical orders and commission participants stay untouched.
      await c.query("UPDATE market_products SET seller_id=$2,updated_at=NOW() WHERE seller_id=$1 AND status='draft' AND id IN (SELECT product_id FROM legacy_restored_product_status)",[originalId,owner.id]);
    }else{
      if(occupied.length)err('Đã tồn tại hồ sơ hoặc đường dẫn tương ứng; cần xử lý thủ công.',409);
      const media=(await c.query('SELECT slot FROM recovered_artisan_media WHERE source_profile_id=$1',[old.source_profile_id])).rows.map(x=>x.slot);
      if((old.snapshot.avatar?.startsWith('asset:')&&!media.includes('avatar'))||(old.snapshot.hero?.startsWith('asset:')&&!media.includes('hero')))err('Chưa nhập đủ ảnh từ bản sao trình duyệt.',409);
      const profile=restoredProfile(old.snapshot,media,old.source_profile_id);
      await c.query('INSERT INTO public_artisan_profiles(user_id,slug,profile,published) VALUES($1,$2,$3,$4)',[owner.id,old.snapshot.slug,JSON.stringify(profile),old.cached_published]);
    }
    await c.query("UPDATE recovered_artisan_staging SET verification_status='owner_verified' WHERE source_profile_id=$1",[old.source_profile_id]);
   }
   const status=action==='approve'?'approved':'rejected';
   return (await c.query('UPDATE recovered_artisan_claims SET status=$2,admin_note=$3,verification_method=$4,reviewed_by=$5,reviewed_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING id,status,source_profile_id',[claim.id,status,note,method,req.admin.id])).rows[0];
  });res.json({claim:result});
 }));
 r.get('/media/recovered-artisan/:id/:slot',wrap(async(req,res)=>{
  const id=clean(req.params.id,45),slot=req.params.slot;
  if(!PROFILE.test(id)||!['avatar','hero'].includes(slot))return res.status(404).end();
  const file=(await pool.query(`SELECT m.mime,m.bytes FROM recovered_artisan_media m
    JOIN recovered_artisan_claims c ON c.source_profile_id=m.source_profile_id AND c.status='approved'
    JOIN public_artisan_profiles p ON p.user_id=c.claimant_user_id AND p.published=TRUE
    WHERE m.source_profile_id=$1 AND m.slot=$2 LIMIT 1`,[id,slot])).rows[0];
  if(!file)return res.status(404).end();
  res.set('Cache-Control','public,max-age=300').set('X-Content-Type-Options','nosniff').type(file.mime).send(file.bytes);
 }));
 r.use((error,req,res,next)=>{
  if(!req.path.startsWith('/api/artisan/recovery')&&!req.path.startsWith('/api/admin/artisan-recovery')&&!req.path.startsWith('/media/recovered-artisan'))return next(error);
  if(!error.status)console.error('Artisan recovery:',error);
  res.status(error.status||500).json({message:error.status?error.message:'Không thể xử lý yêu cầu.'});
 });return r;
}
module.exports={ensureArtisanRecoverySchema,createArtisanRecoveryRouter,restoredProfile,norm,validBytes};
