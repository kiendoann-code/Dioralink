const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {fixture}=require('./fixture');
const {sanitizeProfile,slugify,publicProfile}=require('../seo');
let server,origin,rows;
before(async()=>{const f=fixture();rows=f.rows;server=f.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));origin='http://127.0.0.1:'+server.address().port;});
after(()=>new Promise(r=>server.close(r)));
const get=p=>fetch(origin+p,{redirect:'manual'});
test('Public content, distinct metadata and crawlable links are present without JavaScript',async()=>{
  const pages=['/','/dich-vu','/nghe-nhan','/quy-trinh','/dich-vu/diorama-theo-yeu-cau','/dich-vu/mo-hinh-thu-nho','/dich-vu/custom-figure','/dich-vu/thiet-ke-mo-hinh-3d','/nghe-nhan/xuong-thu-nho-abc123'];
  const titles=new Set();
  for(const p of pages){
    const r=await get(p);assert.equal(r.status,200,p);const html=await r.text();
    const title=html.match(/<title>(.*?)<\/title>/)[1];assert(!titles.has(title),p);titles.add(title);
    assert.equal((html.match(/<h1\b/g)||[]).length,1,p);assert(html.includes(`rel="canonical" href="https://dioralink.xyz${p}"`));
    assert.match(html,/<a[^>]+href="\/nghe-nhan/);assert.match(html,/<meta name="robots" content="index,follow/);
    const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert(schema['@graph'].some(s=>s['@type']==='Organization'));assert(schema['@graph'].some(s=>s['@type']==='BreadcrumbList'));
    assert(!schema['@graph'].some(s=>['Product','AggregateRating','Review'].includes(s['@type'])));
    assert(!html.includes('A-001'));assert(!html.includes('quynhanh@example.com'));
  }
});
test('Robots and sitemap have correct types and only canonical public URLs',async()=>{
  const robots=await get('/robots.txt');assert.match(robots.headers.get('content-type'),/text\/plain/);assert.match(await robots.text(),/Sitemap: https:\/\/dioralink.xyz\/sitemap.xml/);
  const r=await get('/sitemap.xml');assert.match(r.headers.get('content-type'),/application\/xml/);const xml=await r.text();assert(xml.startsWith('<?xml'));assert(!xml.includes('/ung-dung'));assert(!xml.includes('A-001'));
  for(const [,url] of xml.matchAll(/<loc>(.*?)<\/loc>/g))assert.equal((await get(new URL(url).pathname)).status,200,url);
});
test('Unknown URLs return real 404, private workspace is noindex, old path aliases redirect',async()=>{
  for(const p of ['/not-a-page','/dich-vu/khong-co','/nghe-nhan/missing','/creator/missing']){const r=await get(p);assert.equal(r.status,404);assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.match(await r.text(),/Không tìm thấy trang/);}
  const r=await get('/ung-dung');assert.equal(r.status,200);assert.match(r.headers.get('x-robots-tag'),/noindex/);
  for(const [p,to] of [['/index.html','/'],['/home','/'],['/explore','/nghe-nhan'],['/trust','/quy-trinh'],['/creator/ART-user-123','/nghe-nhan/xuong-thu-nho-abc123'],['/nghe-nhan/','/nghe-nhan']]){const r=await get(p);assert.equal(r.status,301);assert.equal(r.headers.get('location'),to);}
  assert.equal((await get('/api/missing')).status,404);
});
test('Profile writes require artisan authentication and reject invalid public data',async()=>{
  const body=JSON.stringify(rows[0].profile);
  const write=headers=>fetch(origin+'/api/artisan/public-profile',{method:'POST',headers:{'content-type':'application/json',...headers},body});
  assert.equal((await write({})).status,401);assert.equal((await write({'x-test-user':'customer','x-test-role':'customer'})).status,403);
  assert.throws(()=>sanitizeProfile({...rows[0].profile,hero:'javascript:alert(1)'}));
  assert.throws(()=>sanitizeProfile({...rows[0].profile,hero:'data:image/svg+xml;base64,PHN2Zz4='}));
  assert.throws(()=>sanitizeProfile({...rows[0].profile,startingPrice:-1}));
  assert.throws(()=>sanitizeProfile({...rows[0].profile,bio:'short'}));
  const p=sanitizeProfile({...rows[0].profile,email:'private@example.com',phone:'secret',paymentProfile:{accountNumber:'secret'},verified:true,rating:5});
  for(const key of ['email','phone','paymentProfile','verified','rating'])assert(!Object.hasOwn(p,key));
  assert.equal(slugify('Đào Studio – Hà Nội'),'dao-studio-ha-noi');
});
test('Publish, update, media persistence and unpublish work without leaking private fields',async()=>{
  const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfLkAAAAASUVORK5CYII=';
  const payload={...rows[0].profile,name:'<script>alert("x")</script>',hero:pixel,portfolio:[pixel],email:'secret@example.com',paymentProfile:{accountNumber:'private-bank'}};
  const headers={'content-type':'application/json','x-test-user':'owner-new'};
  let r=await fetch(origin+'/api/artisan/public-profile',{method:'POST',headers,body:JSON.stringify(payload)});assert.equal(r.status,200);let {artisan}=await r.json();const slug=artisan.slug;
  assert(!artisan.hero.includes('base64'));assert(!artisan.email);assert(!artisan.paymentProfile);
  const html=await(await get('/nghe-nhan/'+slug)).text();assert(!html.includes('<script>alert('));assert(html.includes('&lt;script&gt;'));assert(!html.includes('secret@example.com'));assert(!html.includes('private-bank'));
  assert.equal((await get(artisan.hero)).status,200);
  r=await fetch(origin+'/api/artisan/public-profile',{method:'POST',headers,body:JSON.stringify({...artisan,name:'Tên mới'})});assert.equal(r.status,200);artisan=(await r.json()).artisan;assert.equal(artisan.slug,slug);assert.equal((await get(artisan.hero)).status,200);assert.equal((await get(artisan.portfolio[0])).status,200);
  await fetch(origin+'/api/artisan/public-profile',{method:'DELETE',headers});
  assert.equal((await get('/nghe-nhan/'+slug)).status,404);assert(!(await(await get('/sitemap.xml')).text()).includes(slug));assert.equal((await get(artisan.hero)).status,404);
});
test('Empty catalog does not publish demo creators, ratings or invented offers',()=>{
  const {pageFor,renderDocument}=require('../seo');const fs=require('node:fs');const path=require('node:path');
  const html=renderDocument(fs.readFileSync(path.join(__dirname,'../Public/index.html'),'utf8'),pageFor('/nghe-nhan',[]),[]);
  assert.match(html,/Chưa có hồ sơ nghệ nhân được công khai/);assert(!html.includes('DaoStudio'));assert(!html.includes('AggregateRating'));
});
