'use strict';
const {PGlite}=require('@electric-sql/pglite');
const express=require('express');
const path=require('node:path');
const {ensureSeoSchema,createSeoRouter}=require('../seo');
const {ensureMarketplaceSchema,createMarketplace}=require('../marketplace');
async function fixture(){
 const db=new PGlite();await db.waitReady;
 let tail=Promise.resolve();
 async function lock(){const before=tail;let release;tail=new Promise(r=>release=r);await before;return release;}
 const query=async(sql,params)=>!params&&sql.includes(';')?(await db.exec(sql)).at(-1):db.query(sql,params);
 const pool={async query(sql,params){const release=await lock();try{return await query(sql,params);}finally{release();}},async connect(){const release=await lock();return {query,release};}};
 await pool.query('CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,email TEXT,city TEXT,role TEXT)');
 const users={seller:{id:'seller',name:'Xưởng Mộc',email:'seller@example.test',city:'Hà Nội',role:'artisan'},buyer:{id:'buyer',name:'Khách An',email:'buyer@example.test',role:'customer'},buyer2:{id:'buyer2',name:'Khách Bình',role:'customer'},outsider:{id:'outsider',name:'Xưởng khác',role:'artisan'}};
 for(const u of Object.values(users))await pool.query('INSERT INTO users(id,name,email,city,role) VALUES($1,$2,$3,$4,$5)',[u.id,u.name,u.email||'',u.city||'',u.role]);
 await ensureSeoSchema(pool);await ensureMarketplaceSchema(pool);
 const app=express();app.use(express.json({limit:'6mb'}));
 const requireAuth=(req,res,next)=>{req.user=users[req.headers['x-test-user']];if(!req.user)return res.status(401).json({message:'Authentication required'});next();};
 const requireAdmin=(req,res,next)=>{if(req.headers['x-test-admin']!=='yes')return res.status(401).json({message:'Admin required'});req.admin={id:'admin',name:'Admin',email:'admin@example.test'};next();};
 app.get('/api/auth/me',requireAuth,(req,res)=>res.json({user:req.user}));
 app.get('/api/admin/me',requireAdmin,(req,res)=>res.json({admin:req.admin}));
 const indexFile=path.join(__dirname,'../Public/index.html');
 app.use(express.static(path.dirname(indexFile),{index:false}));
 const market=createMarketplace({pool,indexFile,requireAuth,requireAdmin});app.use(market.router);app.use(createSeoRouter({pool,indexFile,requireAuth,getHomeSection:market.getHomeSection,getSitemapEntries:market.getSitemapEntries}));
 app.use('/api',(req,res)=>res.status(404).json({message:'Not found'}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const url='http://127.0.0.1:'+server.address().port;
 async function api(route,{user,admin=false,method='GET',body}={}){const response=await fetch(url+route,{method,headers:{'Content-Type':'application/json',...(user?{'x-test-user':user}:{}),...(admin?{'x-test-admin':'yes'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{data=raw;}return {status:response.status,data,headers:response.headers};}
 return {app,db,pool,server,url,api,async close(){await new Promise(r=>server.close(r));await db.close();}};
}
module.exports={fixture};
