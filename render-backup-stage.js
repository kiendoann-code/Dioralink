'use strict';
const express=require('express');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const FINGERPRINT='b7fc52a1a7a245a41de1ecd7a2e3c233828bbf45b553e560469261882732714d';
const KB=1024,MAX_GZIP=30*1024*KB,MAX_EXPANDED=60*1024*KB;
const allowedTables=new Set(['users','user_roles','public_artisan_profiles','market_products','market_orders','market_order_events','market_seller_settings','commission_workflows','diora_accounts','diora_alerts','diora_banks','diora_holds','diora_ledger','diora_topups','diora_withdrawals','analytics_events','analytics_sessions','platform_admins','platform_commissions','platform_complaints','admin_notifications']);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
function tarEntries(bytes){
 const entries=new Map();let at=0;
 while(at+512<=bytes.length){
  const h=bytes.subarray(at,at+512);
  if(h.every(n=>n===0))break;
  const name=h.subarray(0,100).toString('utf8').split('\0')[0];
  const sizeText=h.subarray(124,136).toString('ascii').replace(/\0/g,'').trim();
  const size=parseInt(sizeText,8);
  if(!Number.isSafeInteger(size)||size<0||at+512+size>bytes.length)fail('Archive tar không hợp lệ.');
  const kind=h[156],path=name.replace(/^\.\//,'');
  const expected=/^[^/]+\/dioralink_db_euas\/(toc\.dat|\d{4}\.dat)$/;
  if(kind===48||kind===0){
   if(!expected.test(path)||entries.has(path))fail('Archive chứa file ngoài danh mục hoặc trùng file.');
   entries.set(path,bytes.subarray(at+512,at+512+size));
  }else if(kind!==53)fail('Archive tar chứa kiểu file không hỗ trợ.');
  at+=512+Math.ceil(size/512)*512;
 }
 return entries;
}
function unescapePg(s){
 if(s==='\\N')return null;
 return s.replace(/\\(\\|n|r|t|b|f|v|[0-7]{1,3}|x[0-9A-Fa-f]{1,2})/g,(_,c)=>{
  if(c==='\\')return '\\';
  const special={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v'};
  if(c in special)return special[c];
  return String.fromCharCode(parseInt(c[0]==='x'?c.slice(1):c,c[0]==='x'?16:8));
 });
}
function decodeTable(text,cols){
 const lines=text.toString('utf8').split('\n'),result=[];let terminated=false;
 for(const line of lines){
  if(line==='\\.') {terminated=true;break;}
  if(!line)continue;
  const cells=line.split('\t');
  if(cells.length!==cols.length)fail('Số cột COPY không khớp: '+cols.length+' / '+cells.length);
  const record={};
  cols.forEach((col,i)=>record[col]=unescapePg(cells[i]));
  result.push(record);
 }
 if(!terminated)fail('Không tìm thấy dấu kết thúc COPY.');
 return result;
}
function readArchive(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length>MAX_GZIP)fail('File sao lưu không hợp lệ hoặc vượt giới hạn.');
 const fingerprint=crypto.createHash('sha256').update(buffer).digest('hex');
 if(fingerprint!==FINGERPRINT)fail('File không trùng bản sao lưu Render đã xác minh. Không nhập để tránh trộn nhầm database.');
 const uncompressed=zlib.gunzipSync(buffer,{maxOutputLength:MAX_EXPANDED});
 const files=tarEntries(uncompressed);
 const toc=[...files].find(([name])=>name.endsWith('/toc.dat'))?.[1];
 if(!toc)fail('Không tìm thấy toc.dat trong bản sao lưu.');
 const tocText=toc.toString('latin1'),re=/COPY "public"\."([a-z_]+)" \(([^)]*)\) FROM stdin;[\s\S]{0,2200}?(\d{4})\.dat/g;
 const tables=new Map();let match;
 while((match=re.exec(tocText))!==null){
  const name=match[1],cols=[...match[2].matchAll(/"([a-z_]+)"/g)].map(m=>m[1]);
  if(!allowedTables.has(name)||tables.has(name)||!cols.length)fail('Danh mục bảng không hợp lệ.');
  const filename=[...files.keys()].find(x=>x.endsWith('/'+match[3]+'.dat'));
  if(!filename)fail('Thiếu file dữ liệu '+name+'.');
  tables.set(name,{cols,rows:decodeTable(files.get(filename),cols)});
 }
 if(tables.size!==21)fail('Bản sao lưu thiếu bảng (tìm thấy '+tables.size+'/21).');
 return {fingerprint,tables};
}
async function stage(pool,archive){
 const summary=Object.fromEntries([...archive.tables].map(([name,x])=>[name,x.rows.length]));
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[archive.fingerprint]);
  await client.query(`CREATE TABLE IF NOT EXISTS render_backup_imports(
   fingerprint TEXT PRIMARY KEY, database_name TEXT NOT NULL, table_counts JSONB NOT NULL,
   imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
   CREATE TABLE IF NOT EXISTS render_backup_rows(
   fingerprint TEXT NOT NULL REFERENCES render_backup_imports(fingerprint),
   table_name TEXT NOT NULL, record_no INTEGER NOT NULL, payload JSONB NOT NULL,
   PRIMARY KEY(fingerprint,table_name,record_no));
   CREATE INDEX IF NOT EXISTS render_backup_table_lookup ON render_backup_rows(fingerprint,table_name);
  `);
  const existing=(await client.query('SELECT fingerprint FROM render_backup_imports WHERE fingerprint=$1',[archive.fingerprint])).rowCount>0;
  if(!existing){
   await client.query('INSERT INTO render_backup_imports(fingerprint,database_name,table_counts) VALUES($1,$2,$3::jsonb)',[archive.fingerprint,'dioralink_db_euas',JSON.stringify(summary)]);
   for(const [table,entry] of archive.tables){
    let batch=[],bytes=0,index=0;
    const flush=async()=>{
     if(!batch.length)return;
     await client.query(`INSERT INTO render_backup_rows(fingerprint,table_name,record_no,payload)
     SELECT $1,$2,j.idx,j.payload FROM jsonb_to_recordset($3::jsonb) AS j(idx integer,payload jsonb)
     ON CONFLICT(fingerprint,table_name,record_no) DO NOTHING`,[archive.fingerprint,table,JSON.stringify(batch)]);
     batch=[];bytes=0;
    };
    for(const row of entry.rows){
     const item={idx:index++,payload:row},serialized=JSON.stringify(item);
     if(batch.length&&(batch.length>=40||bytes+serialized.length>250000))await flush();
     batch.push(item);bytes+=serialized.length;
    }
    await flush();
   }
  }
  await client.query('COMMIT');
  return {staged:!existing,alreadyImported:existing,totalRows:Object.values(summary).reduce((a,b)=>a+b,0),tables:summary};
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();}
}
function installRenderBackupStage({app,pool,requireAdmin}){
 const checkOrigin=(req,res,next)=>{
  const origin=req.get('origin');
  if(!origin||!['https://dioralink.xyz','https://www.dioralink.xyz','https://dioralink-1.onrender.com','https://dioralink.onrender.com'].includes(origin))return res.status(403).json({message:'Truy cập không đúng nguồn.'});
  next();
 };
 app.get('/api/admin/render-backup/summary',requireAdmin,async(req,res)=>{
  try{
   const exists=(await pool.query("SELECT to_regclass('public.render_backup_imports') AS t")).rows[0]?.t;
   if(!exists)return res.json({imports:[],mode:'staging_only'});
   const imports=(await pool.query('SELECT fingerprint,database_name,table_counts,imported_at FROM render_backup_imports ORDER BY imported_at DESC LIMIT 5')).rows;
   res.json({imports,mode:'staging_only'});
  }catch(e){console.error('Backup summary:',e.message);res.status(500).json({message:'Không đọc được trạng thái nhập sao lưu.'});}
 });
 app.post('/api/admin/render-backup/stage',requireAdmin,checkOrigin,
  express.raw({type:'application/octet-stream',limit:'30mb'}),async(req,res)=>{
  try{
   if(!Buffer.isBuffer(req.body))fail('Yêu cầu tải file không hợp lệ.');
   if(req.get('x-dioralink-stage-only')!=='true')fail('Chỉ cho phép nhập vào vùng đối soát riêng.');
   const archive=readArchive(req.body);
   const result=await stage(pool,archive);
   res.json({message:'Đã nhập an toàn vào vùng đối soát, chưa cập nhật tài khoản, Marketplace hoặc Ví Diora đang hoạt động.',...result});
  }catch(e){console.error('Backup staging:',e.message);res.status(e.status||500).json({message:e.status?e.message:'Nhập bản sao lưu không thành công. Dữ liệu hiện tại không bị thay đổi.'});}
 });
}
module.exports={installRenderBackupStage,readArchive,tarEntries,unescapePg,decodeTable,FINGERPRINT};
