const express = require('express');
const path = require('node:path');
const {createSeoRouter} = require('../seo');
function fixture({withProfile=true}={}) {
  const row={user_id:'user-123',slug:'xuong-thu-nho-abc123',profile:{name:'Xưởng Thu Nhỏ',handle:'@xuong',city:'Hà Nội',bio:'Thiết kế và chế tác mô hình kiến trúc thu nhỏ theo ý tưởng riêng của khách hàng.',specialties:['Architecture','Miniature'],startingPrice:3000000,response:'1 ngày',avatar:'',hero:'',portfolio:[]},updated_at:new Date('2026-10-04T00:00:00Z'),published:true};
  const rows=withProfile?[row]:[];
  const pool={async query(sql,values=[]){
    sql=sql.trim();
    if(sql.startsWith('SELECT') && sql.includes('WHERE user_id=$1'))return {rows:rows.filter(r=>r.user_id===values[0])};
    if(sql.startsWith('SELECT') && sql.includes('WHERE slug=$1'))return {rows:rows.filter(r=>r.slug===values[0] && r.published)};
    if(sql.startsWith('SELECT'))return {rows:rows.filter(r=>r.published)};
    if(sql.startsWith('INSERT')){
      let r=rows.find(r=>r.user_id===values[0]);
      if(!r){r={user_id:values[0],slug:values[1]};rows.push(r);}
      Object.assign(r,{profile:JSON.parse(values[2]),published:true,updated_at:new Date()});return {rows:[r]};
    }
    if(sql.startsWith('UPDATE')){const r=rows.find(r=>r.user_id===values[0]);if(r)r.published=false;return {rows:[]};}
    return {rows:[]};
  }};
  const app=express();app.use(express.json({limit:'6mb'}));
  app.get('/api/auth/me',(req,res)=>res.status(401).json({message:'Authentication required.'}));
  app.get('/index.html',(req,res)=>res.redirect(301,'/'));
  app.use(express.static(path.join(__dirname,'../Public'),{index:false}));
  app.use(createSeoRouter({pool,indexFile:path.join(__dirname,'../Public/index.html'),requireAuth(req,res,next){
    if(!req.headers['x-test-user'])return res.status(401).json({message:'Authentication required'});
    req.user={id:req.headers['x-test-user'],role:req.headers['x-test-role']||'artisan'};next();
  }}));
  app.use('/api',(req,res)=>res.status(404).json({message:'API endpoint not found.'}));
  return {app,pool,rows};
}
module.exports={fixture};
if(require.main===module){const {app}=fixture({withProfile:process.env.EMPTY_CATALOG!=='1'});app.listen(3100,'0.0.0.0',()=>console.log('SEO fixture http://localhost:3100'));}

