'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {restoredProfile,norm,validBytes}=require('../artisan-recovery');
test('normalizes display names',()=>assert.equal(norm('Naisu Toys Shop'),norm('naisu toys shop')));
test('recovered profile preserves public fields',()=>{const p=restoredProfile({name:'Naisu Toys Shop',bio:'Artist profile',startingPrice:300000},['avatar'],'ART-3ddbd528-ee5d-4c99-b9fb-12e85ae6f918');assert.equal(p.name,'Naisu Toys Shop');assert.equal(p.startingPrice,300000);assert.equal(p.hero,'');assert.ok(p.avatar.includes('/avatar'));});
test('checks actual image signatures',()=>{const b=Buffer.alloc(50);b[0]=255;b[1]=216;b[2]=255;assert.equal(validBytes('image/jpeg',b),true);assert.equal(validBytes('image/png',b),false);});


test('admin can approve an existing customer account after switching on Artisan mode',async()=>{
 const {PGlite}=require('@electric-sql/pglite');
 const express=require('express');
 const {randomUUID}=require('node:crypto');
 const {createArtisanRecoveryRouter,ensureArtisanRecoverySchema}=require('../artisan-recovery');
 const db=new PGlite();await db.waitReady;
 const query=(sql,params)=>!params&&sql.includes(';')?db.exec(sql).then(x=>x.at(-1)):db.query(sql,params);
 const pool={query,async connect(){return {query,release(){}};}};
 const adminId=randomUUID(),artisanSource=randomUUID(),customerSource=randomUUID();
 const validUser='original-customer-now-artisan',invalidUser='customer-only';
 let server;
 try{
  await pool.query("CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,role TEXT);CREATE TABLE user_roles(user_id TEXT NOT NULL REFERENCES users(id),role TEXT NOT NULL,PRIMARY KEY(user_id,role));CREATE TABLE platform_admins(id UUID PRIMARY KEY,active BOOLEAN NOT NULL DEFAULT TRUE);CREATE TABLE public_artisan_profiles(user_id TEXT PRIMARY KEY,slug TEXT UNIQUE NOT NULL,profile JSONB NOT NULL,published BOOLEAN NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());CREATE TABLE legacy_restore_control(old_user_id TEXT PRIMARY KEY,access_verified BOOLEAN NOT NULL DEFAULT FALSE);CREATE TABLE admin_notifications(admin_id UUID,title TEXT,body TEXT,route TEXT);");
  await ensureArtisanRecoverySchema(pool);
  await pool.query("INSERT INTO users(id,name,role) VALUES($1,$2,'customer'),($3,$4,'customer')",[validUser,'Artisan account',invalidUser,'Customer']);
  await pool.query("INSERT INTO user_roles(user_id,role) VALUES($1,'customer'),($1,'artisan'),($2,'customer')",[validUser,invalidUser]);
  await pool.query("INSERT INTO platform_admins(id,active) VALUES($1,TRUE)",[adminId]);
  await pool.query("INSERT INTO recovered_artisan_staging(source_profile_id,old_user_id,name,snapshot,exported_at,cached_published) VALUES($1,$2,'Recovered studio',$3,NOW(),TRUE),($4,$5,'Other studio',$6,NOW(),TRUE)",[
    'ART-'+artisanSource,artisanSource,JSON.stringify({name:'Recovered studio',slug:'recovered-studio',avatar:'',hero:''}),
    'ART-'+customerSource,customerSource,JSON.stringify({name:'Other studio',slug:'other-studio',avatar:'',hero:''})
  ]);
  await pool.query("INSERT INTO recovered_artisan_claims(id,source_profile_id,claimant_user_id,evidence) VALUES($1,$2,$3,$4),($5,$6,$7,$8)",[
   randomUUID(),'ART-'+artisanSource,validUser,'Previously controlled this artisan studio.',
   randomUUID(),'ART-'+customerSource,invalidUser,'No artist role enabled for this account.'
  ]);
  const app=express();app.use(express.json());
  const auth=(req,res,next)=>{
   if(req.get('x-test-user')===validUser){req.user={id:validUser,name:'Artisan account',role:'artisan',roles:['customer','artisan']};return next();}
   if(req.get('x-test-user')===invalidUser){req.user={id:invalidUser,name:'Customer',role:'customer',roles:['customer']};return next();}
   res.status(401).end();
  };
  const admin=(req,res,next)=>req.get('x-test-admin')==='yes'?(req.admin={id:adminId},next()):res.status(401).end();
  app.use(createArtisanRecoveryRouter({pool,requireAuth:auth,requireAdmin:admin}));
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});
  const request=async(claimantUser)=>{
   const q=await pool.query("SELECT id FROM recovered_artisan_claims WHERE claimant_user_id=$1",[claimantUser]);
   const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/admin/artisan-recovery/claims/'+q.rows[0].id+'/review',{
    method:'POST',headers:{'content-type':'application/json','x-test-admin':'yes'},
    body:JSON.stringify({action:'approve',note:'Ownership verified independently against original studio paperwork.',verification_method:'other_document'})
   });
   return {status:response.status,data:await response.json()};
  };
  const denied=await request(invalidUser);
  assert.equal(denied.status,409,JSON.stringify(denied.data));
  assert.match(denied.data.message,/Nghệ nhân/);
  const accepted=await request(validUser);
  assert.equal(accepted.status,200,JSON.stringify(accepted.data));
  assert.equal(accepted.data.claim.status,'approved');
  const profile=(await pool.query('SELECT slug FROM public_artisan_profiles WHERE user_id=$1',[validUser])).rows[0];
  assert.equal(profile.slug,'recovered-studio');
  const rejectedClaim=(await pool.query('SELECT status FROM recovered_artisan_claims WHERE claimant_user_id=$1',[invalidUser])).rows[0];
  assert.equal(rejectedClaim.status,'pending');
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  await db.close();
 }
});
