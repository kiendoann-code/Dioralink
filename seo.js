'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const {homePage}=require('./home');
const ORIGIN = 'https://dioralink.xyz';
const SERVICES = [
  {slug:'diorama-theo-yeu-cau', name:'Diorama theo yêu cầu', description:'Kết nối nghệ nhân làm diorama theo ý tưởng riêng: bối cảnh, tỷ lệ, chất liệu, ánh sáng và ngân sách được trao đổi trước khi thực hiện.', detail:'Diorama tái hiện một bối cảnh trong không gian thu nhỏ. Bạn có thể bắt đầu từ một địa điểm, câu chuyện, khung cảnh fantasy hoặc ý tưởng trưng bày bộ sưu tập.', brief:['Ảnh tham khảo và câu chuyện muốn tái hiện','Kích thước đế, tỷ lệ mô hình và vị trí trưng bày','Chất liệu, hiệu ứng nước resin hoặc đèn nếu cần','Ngân sách dự kiến và thời điểm cần nhận'], tags:['Fantasy','Resin','Architecture','Lighting']},
  {slug:'mo-hinh-thu-nho', name:'Mô hình thu nhỏ theo yêu cầu', description:'Tìm nghệ nhân miniature và model making để thực hiện mô hình kiến trúc, không gian kỷ niệm và vật thể thu nhỏ theo yêu cầu.', detail:'Mô hình thu nhỏ có thể lưu giữ một căn phòng, góc phố hoặc công trình có ý nghĩa với bạn. Tỷ lệ và mức độ chi tiết cần được thống nhất để phù hợp với diện tích trưng bày.', brief:['Hình ảnh nhiều góc hoặc bản vẽ của đối tượng','Tỷ lệ và kích thước thành phẩm mong muốn','Những chi tiết cần giữ chính xác','Ngân sách, phương án đóng gói và lịch nhận'], tags:['Miniature','Architecture']},
  {slug:'custom-figure', name:'Custom figure theo yêu cầu', description:'Kết nối creator thực hiện custom figure: trao đổi tạo hình, tư thế, màu sơn, phụ kiện và đế trưng bày theo ý tưởng của bạn.', detail:'Custom figure tập trung vào nhân vật và cách thể hiện riêng. Brief rõ về tạo hình, tư thế, màu sắc và phụ kiện giúp hai bên xác định phạm vi công việc trước khi báo giá.', brief:['Ảnh nhân vật hoặc bản phác thảo bạn có quyền sử dụng','Chiều cao, tỷ lệ và tư thế mong muốn','Phụ kiện, màu sơn và yêu cầu đế trưng bày','Ngân sách cùng thời gian thực hiện dự kiến'], tags:['Figure','Mecha','Gunpla']},
  {slug:'thiet-ke-mo-hinh-3d', name:'Thiết kế mô hình 3D theo yêu cầu', description:'Tìm creator thiết kế mô hình 3D phục vụ tạo mẫu và chế tác; thống nhất kích thước, định dạng bàn giao và yêu cầu in trước khi bắt đầu.', detail:'Thiết kế 3D cần xuất phát từ mục đích sử dụng: hình ảnh trình bày, mô hình để in hoặc chi tiết lắp ráp. Với sản phẩm cần chế tác, hãy trao đổi thêm về vật liệu, độ dày và dung sai.', brief:['Bản vẽ, ảnh tham khảo và kích thước chính','Mục đích sử dụng: trình bày, tạo mẫu hay in 3D','Định dạng tệp cần bàn giao và quyền sử dụng','Yêu cầu chỉnh sửa, ngân sách và thời hạn'], tags:['3D','Fabrication']}
];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const slugify = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65).replace(/-$/,'') || 'nghe-nhan';
const money = n => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
function safeImage(value) {
  if (!value) return '';
  if (typeof value !== 'string') throw new Error('Ảnh không hợp lệ.');
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) {
    if (value.length > 950000) throw new Error('Mỗi ảnh công khai cần nhỏ hơn 700 KB.');
    const bytes=Buffer.from(value.split(',')[1],'base64');
    const valid = value.startsWith('data:image/jpeg') ? bytes[0]===0xff && bytes[1]===0xd8 : value.startsWith('data:image/png') ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP';
    if (!valid) throw new Error('Định dạng ảnh không hợp lệ.');
    return value;
  }
  try { const u=new URL(value,ORIGIN); if(u.protocol==='https:' && !u.username && !u.password && (value.startsWith('https://') || value.startsWith('/media/nghe-nhan/'))) return u.href; } catch {}
  throw new Error('Ảnh công khai phải là JPEG, PNG, WebP hoặc đường dẫn HTTPS.');
}
function sanitizeProfile(body) {
  const p={name:text(body.name,150),handle:text(body.handle,60),city:text(body.city,150),bio:text(body.bio,3000),response:text(body.response,80),specialties:Array.isArray(body.specialties)?body.specialties.slice(0,12).map(s=>text(s,60)).filter(Boolean):[],startingPrice:Number(body.startingPrice),avatar:safeImage(body.avatar),hero:safeImage(body.hero),portfolio:Array.isArray(body.portfolio)?body.portfolio.slice(0,12).map(safeImage).filter(Boolean):[]};
  if(!p.name || !p.city || p.bio.length<30 || !p.specialties.length) throw new Error('Vui lòng điền tên, thành phố, chuyên môn và giới thiệu ít nhất 30 ký tự.');
  if(!Number.isFinite(p.startingPrice) || p.startingPrice<0 || p.startingPrice>1e12) throw new Error('Giá khởi điểm không hợp lệ.');
  return p;
}
function publicProfile(row) {
  const p={...row.profile,id:`ART-${row.user_id}`,slug:row.slug,updatedAt:row.updated_at,published:true,salesAmount:Number(row.sales_amount||0),completedOrders:Number(row.completed_orders||0)};
  const source=(value,slot)=>value?.startsWith('data:')?`/media/nghe-nhan/${row.slug}/${slot}?v=${new Date(row.updated_at).getTime()}`:value||'';
  p.avatar=source(p.avatar,'avatar'); p.hero=source(p.hero,'hero'); p.portfolio=(p.portfolio||[]).map((v,i)=>source(v,`portfolio-${i}`));
  return p;
}
function directoryProfile(row){
  if(row.profile && row.slug)return publicProfile(row);
  const slug='artist-'+crypto.createHash('sha256').update(String(row.user_id)).digest('hex').slice(0,12);
  const baseName=text(row.user_name,150)||'DioraLink Artist';
  const handle='@'+slug.replace(/[^a-z0-9]/g,'').slice(0,18);
  const avatar=typeof row.user_avatar==='string'?row.user_avatar:'';
  const productCover=typeof row.product_cover==='string'?row.product_cover:'';
  return {
    id:`ART-${row.user_id}`,
    slug,
    name:baseName,
    handle,
    city:text(row.user_city,150),
    bio:text(row.user_bio,3000)||'Hồ sơ nghệ nhân DioraLink. Portfolio và thông tin chuyên môn đang được cập nhật.',
    response:'',
    specialties:[],
    startingPrice:0,
    avatar,
    hero:productCover||avatar,
    portfolio:[],
    updatedAt:row.updated_at,
    published:false,
    salesAmount:Number(row.sales_amount||0),
    completedOrders:Number(row.completed_orders||0)
  };
}
async function ensureSeoSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS public_artisan_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    profile JSONB NOT NULL,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
const serviceCards=()=>SERVICES.map(s=>`<article class="card pad"><h2 class="seo-card-title"><a href="/dich-vu/${s.slug}">${escapeHtml(s.name)}</a></h2><p class="body">${escapeHtml(s.description)}</p><a class="seo-link" href="/dich-vu/${s.slug}">Tìm hiểu dịch vụ →</a></article>`).join('');
function creatorCard(a) {
  return `<article class="card creator-card">${a.hero?`<a href="/nghe-nhan/${a.slug}" tabindex="-1" aria-hidden="true"><img class="seo-cover" src="${escapeHtml(a.hero)}" alt="" width="640" height="400" loading="lazy" decoding="async"></a>`:''}<div class="creator-body"><h2 class="seo-card-title"><a href="/nghe-nhan/${a.slug}">${escapeHtml(a.name)}</a></h2><p class="small muted">${escapeHtml(a.city)} · ${escapeHtml(a.specialties.join(', '))}</p><p class="body">${escapeHtml(a.bio.slice(0,210))}</p><p class="small">${a.startingPrice>0?`Giá tham khảo từ ${money(a.startingPrice)}`:'Báo giá theo brief'}</p><a class="seo-link" href="/nghe-nhan/${a.slug}">Xem hồ sơ →</a></div></article>`;
}
const processHtml=()=>`<section class="seo-section"><h2 class="section-title">Từ ý tưởng đến thành phẩm</h2><div class="grid four">${[['01','Gửi brief','Mô tả ý tưởng, ảnh tham khảo, kích thước, ngân sách và thời hạn.'],['02','Trao đổi báo giá','Làm rõ phạm vi, vật liệu, các mốc công việc và chi phí với nghệ nhân.'],['03','Theo dõi chế tác','Trao đổi hình ảnh tiến độ và nghiệm thu theo mốc đã thống nhất.'],['04','Nhận thành phẩm','Thống nhất đóng gói, vận chuyển và kiểm tra sản phẩm khi nhận.']].map(([n,t,d])=>`<div class="card pad"><span class="eyebrow">${n}</span><h3>${t}</h3><p class="body">${d}</p></div>`).join('')}</div><p class="notice seo-note">Khách hàng thanh toán trực tiếp cho nghệ nhân. DioraLink không giữ tiền ký quỹ; hãy thống nhất rõ chi phí, tiến độ và điều kiện dừng dự án trước khi chuyển khoản.</p></section>`;
function pageFor(pathname, artisans) {
  const base={path:pathname,status:200,index:true,route:'home',title:'DioraLink – Đặt làm diorama và mô hình theo yêu cầu',description:'Kết nối nghệ nhân diorama, miniature, custom figure và thiết kế 3D. Gửi ý tưởng, trao đổi báo giá và theo dõi quá trình chế tác cùng DioraLink.',breadcrumbs:[['Trang chủ','/']]};
  if(pathname==='/') return {...base,html:homePage(artisans)};
  if(pathname==='/dich-vu') return {...base,route:'services',title:'Dịch vụ diorama, miniature, custom figure và 3D | DioraLink',description:'Khám phá các nhu cầu đặt làm tại DioraLink: diorama, mô hình thu nhỏ, custom figure và thiết kế 3D. Chuẩn bị brief để trao đổi cùng creator.',breadcrumbs:[...base.breadcrumbs,['Dịch vụ',pathname]],html:`<section class="page"><h1 class="section-title">Đặt làm theo ý tưởng của bạn</h1><p class="hero-copy">Chọn lĩnh vực phù hợp và chuẩn bị brief trước khi trao đổi với nghệ nhân.</p><div class="grid two">${serviceCards()}</div>${processHtml()}</section>`};
  const service=SERVICES.find(s=>pathname===`/dich-vu/${s.slug}`);
  if(service) {
    const matching=artisans.filter(a=>a.specialties.some(t=>service.tags.some(tag=>t.toLowerCase().includes(tag.toLowerCase()))));
    return {...base,route:`service/${service.slug}`,title:`${service.name} | DioraLink`,description:service.description,breadcrumbs:[...base.breadcrumbs,['Dịch vụ','/dich-vu'],[service.name,pathname]],service,html:`<article class="page"><div class="eyebrow">Dịch vụ sáng tạo</div><h1 class="hero-title display seo-title">${service.name}</h1><p class="hero-copy">${service.description}</p><p class="body">${service.detail}</p><section class="seo-section card pad"><h2 class="seo-card-title">Bạn nên chuẩn bị gì trong brief?</h2><ul class="seo-list">${service.brief.map(t=>`<li>${t}</li>`).join('')}</ul><p class="body">Chi phí và thời gian được báo theo phạm vi thực tế, độ phức tạp và chuyên môn của nghệ nhân. Giá khởi điểm trên hồ sơ chỉ mang tính tham khảo.</p><a class="btn btn-mint" href="/ung-dung#commission">Gửi brief của bạn</a></section>${processHtml()}${matching.length?`<section class="seo-section"><h2 class="section-title">Nghệ nhân có chuyên môn liên quan</h2><div class="creator-grid">${matching.slice(0,6).map(creatorCard).join('')}</div></section>`:''}<a class="seo-link" href="/nghe-nhan">Khám phá nghệ nhân →</a><section class="seo-section"><h2 class="section-title">Khám phá thêm</h2><div class="wrap">${SERVICES.filter(s=>s!==service).map(s=>`<a class="pill" href="/dich-vu/${s.slug}">${s.name}</a>`).join('')}</div></section></article>`};
  }
  if(pathname==='/nghe-nhan') return {...base,route:'explore',title:'Nghệ nhân diorama, miniature và custom figure | DioraLink',description:'Khám phá hồ sơ nghệ nhân đã công khai trên DioraLink: chuyên môn, giới thiệu, tác phẩm và giá tham khảo để chuẩn bị yêu cầu đặt làm.',breadcrumbs:[...base.breadcrumbs,['Nghệ nhân',pathname]],html:`<section class="page"><h1 class="section-title">Khám phá nghệ nhân</h1><p class="hero-copy">Tìm hiểu chuyên môn, tác phẩm và phong cách trước khi trao đổi brief.</p>${artisans.length?`<label class="label" for="public-creator-search">Tìm theo tên, thành phố hoặc chuyên môn</label><input id="public-creator-search" class="field" type="search" placeholder="Nhập tên hoặc chuyên môn" oninput="filterPublicCreators(this.value)"><div class="creator-grid seo-section">${artisans.map(a=>`<div data-creator-search="${escapeHtml([a.name,a.city,...a.specialties].join(' ').toLocaleLowerCase('vi'))}">${creatorCard(a)}</div>`).join('')}</div><p id="public-search-empty" class="body" hidden>Không tìm thấy nghệ nhân phù hợp.</p>`:'<div class="card pad"><h2 class="seo-card-title">Cộng đồng đang được xây dựng</h2><p class="body">Chưa có hồ sơ nghệ nhân được công khai. Nếu bạn là creator, hãy đăng ký và bổ sung hồ sơ để khách hàng có thể tìm hiểu tác phẩm của bạn.</p><a class="btn btn-mint" href="/ung-dung#account">Tham gia DioraLink</a></div>'}<a class="seo-link" href="/dich-vu">Tìm hiểu các lĩnh vực đặt làm →</a></section>`};
  const a=artisans.find(a=>pathname===`/nghe-nhan/${a.slug}`);
  if(a) return {...base,route:`creator/${a.id}`,title:`${a.name}${a.specialties.length?' – '+a.specialties.slice(0,2).join(', '):''} | DioraLink`,description:`${a.name} tại ${a.city}. ${a.bio}`.slice(0,165),image:a.hero||a.avatar,breadcrumbs:[...base.breadcrumbs,['Nghệ nhân','/nghe-nhan'],[a.name,pathname]],html:`<article class="page"><div class="grid two">${a.hero?`<img class="seo-profile-cover card" src="${escapeHtml(a.hero)}" alt="Ảnh giới thiệu của ${escapeHtml(a.name)}" width="800" height="600" fetchpriority="high">`:''}<section class="card pad"><h1 class="section-title">${escapeHtml(a.name)}</h1><p class="small muted">${escapeHtml(a.handle)} · ${escapeHtml(a.city)}</p><p class="body seo-bio">${escapeHtml(a.bio)}</p><h2 class="seo-card-title">Chuyên môn</h2>${a.specialties.length?`<div class="wrap">${a.specialties.map(t=>`<span class="pill pill-mint">${escapeHtml(t)}</span>`).join('')}</div>`:'<p class="small muted">Nghệ nhân chưa cập nhật chuyên môn công khai.</p>'}<p class="body">${a.startingPrice>0?`Giá tham khảo từ <strong>${money(a.startingPrice)}</strong>. Báo giá cuối cùng theo brief.`:'Liên hệ để trao đổi báo giá theo brief.'}</p>${a.response?`<p class="small muted">Thời gian phản hồi do nghệ nhân cung cấp: ${escapeHtml(a.response)}</p>`:''}<div class="wrap seo-note"><a class="btn btn-mint" href="/ung-dung#commission" onclick="sessionStorage.setItem('dioralink_preferred_artisan', '${escapeHtml(a.id)}')">Gửi yêu cầu đặt làm</a><a class="btn" href="/marketplace?q=${encodeURIComponent(a.name)}">Xem sản phẩm đang bán</a></div></section></div>${a.portfolio.length?`<section class="seo-section"><h2 class="section-title">Tác phẩm của nghệ nhân</h2><div class="grid three">${a.portfolio.map((src,i)=>`<img class="seo-cover card" src="${escapeHtml(src)}" alt="Tác phẩm ${i+1} trong portfolio của ${escapeHtml(a.name)}" width="640" height="400" loading="lazy" decoding="async">`).join('')}</div></section>`:''}<p class="small muted seo-note">Thông tin và hình ảnh do nghệ nhân cung cấp. Hãy trao đổi trực tiếp về năng lực, phạm vi công việc và điều khoản thanh toán.</p><a class="seo-link" href="/nghe-nhan">← Xem các nghệ nhân khác</a></article>`};
  if(pathname==='/quy-trinh') return {...base,route:'trust',title:'Quy trình đặt làm và thanh toán trực tiếp | DioraLink',description:'Tìm hiểu cách gửi brief, trao đổi báo giá, theo dõi tiến độ và nghiệm thu trên DioraLink. Khách hàng thanh toán trực tiếp cho nghệ nhân.',breadcrumbs:[...base.breadcrumbs,['Quy trình',pathname]],html:`<article class="page"><h1 class="section-title">Quy trình làm việc trên DioraLink</h1><p class="hero-copy">Làm rõ ý tưởng và trách nhiệm của mỗi bên trước khi bắt đầu chế tác.</p>${processHtml()}<section class="card pad"><h2 class="seo-card-title">Trước khi đặt làm</h2><ul class="seo-list"><li>Xem portfolio, hỏi về chất liệu và các sản phẩm tương tự nghệ nhân đã thực hiện.</li><li>Thống nhất phạm vi, số lần chỉnh sửa, lịch nghiệm thu và chi phí vận chuyển.</li><li>Lưu lại thỏa thuận thanh toán, điều kiện dừng dự án và cách xử lý phát sinh.</li></ul><a class="btn btn-mint" href="/ung-dung#commission">Bắt đầu với brief của bạn</a></section></article>`};
  if(pathname==='/ung-dung') return {...base,index:false,route:'account',title:'Tài khoản và quản lý dự án | DioraLink',description:'Đăng nhập DioraLink để quản lý yêu cầu đặt làm, hồ sơ nghệ nhân và dự án.',html:'<section class="page"><h1 class="section-title">Tài khoản DioraLink</h1><p class="body">Đang tải không gian làm việc…</p><noscript>Vui lòng bật JavaScript để đăng nhập và quản lý dự án.</noscript></section>'};
  return {...base,status:404,index:false,route:'not-found',title:'Không tìm thấy trang | DioraLink',description:'Trang bạn tìm không tồn tại hoặc đã được gỡ.',html:'<section class="page"><div class="eyebrow">404</div><h1 class="section-title">Không tìm thấy trang</h1><p class="body">Kiểm tra lại địa chỉ hoặc tiếp tục khám phá DioraLink.</p><a class="btn btn-mint" href="/">Về trang chủ</a> <a class="btn" href="/nghe-nhan">Tìm nghệ nhân</a></section>'};
}
function renderDocument(template,page,artisans) {
  const url=ORIGIN+page.path;
  const preload=page.path==='/'?'<link rel="preload" href="/assets/art/hero-960.webp" as="image" type="image/webp" imagesrcset="/assets/art/hero-640.webp 640w, /assets/art/hero-768.webp 768w, /assets/art/hero-960.webp 960w, /assets/art/hero.webp 1229w" imagesizes="(max-width: 780px) calc(100vw - 36px), 55vw" fetchpriority="high">':'';
  const schemas=page.index?[{'@type':'Organization','@id':ORIGIN+'/#organization',name:'DioraLink',url:ORIGIN+'/',description:'Nền tảng kết nối khách hàng và creator trong lĩnh vực diorama, miniature, custom figure và 3D creation.'},{'@type':'WebSite','@id':ORIGIN+'/#website',url:ORIGIN+'/',name:'DioraLink',inLanguage:'vi-VN',publisher:{'@id':ORIGIN+'/#organization'}},{'@type':'WebPage','@id':url+'#webpage',url,name:page.title,description:page.description,inLanguage:'vi-VN',isPartOf:{'@id':ORIGIN+'/#website'}},{'@type':'BreadcrumbList',itemListElement:page.breadcrumbs.map(([name,path],i)=>({'@type':'ListItem',position:i+1,name,item:ORIGIN+path}))}]:[];
  if(page.index && page.structuredData)schemas.push(...page.structuredData);
  const head=`<title>${escapeHtml(page.title)}</title>\n<meta name="description" content="${escapeHtml(page.description)}">\n<meta name="robots" content="${page.index?'index,follow,max-image-preview:large':'noindex,follow'}">\n<link rel="canonical" href="${escapeHtml(url)}">\n<meta property="og:type" content="website"><meta property="og:locale" content="vi_VN"><meta property="og:site_name" content="DioraLink"><meta property="og:title" content="${escapeHtml(page.title)}"><meta property="og:description" content="${escapeHtml(page.description)}"><meta property="og:url" content="${escapeHtml(url)}">${page.image?`<meta property="og:image" content="${escapeHtml(new URL(page.image,ORIGIN).href)}">`:''}\n<meta name="twitter:card" content="summary">${schemas.length?`<script type="application/ld+json">${json({'@context':'https://schema.org','@graph':schemas})}</script>`:''}\n<script>window.DIORALINK_PUBLIC_PAGE=${json({route:page.route,path:page.path,status:page.status,artisans})};</script>`;
  const breadcrumb=page.index && page.path!=='/'?`<nav class="seo-breadcrumb" aria-label="Đường dẫn">${page.breadcrumbs.map(([name,path],i)=>i===page.breadcrumbs.length-1?`<span aria-current="page">${escapeHtml(name)}</span>`:`<a href="${path}">${escapeHtml(name)}</a><span aria-hidden="true"> / </span>`).join('')}</nav>`:'';
  let document=template.replace('<head>',`<head>${preload}`).replace('<body>',page.path==='/'?'<body class="art-site">':'<body>').replace(/<title>[\s\S]*?<\/title>/,'').replace(/<meta name="description"[^>]*>/,'').replace('</head>',`${head}\n</head>`).replace('<main id="app" class="shell"></main>',()=>`<main id="app" class="shell">${breadcrumb}${page.html}</main>`);
  if(page.path==='/'){
    document=document.replace(
      /<script src="\/marketplace\.js\?v=[^"]+" defer><\/script>\s*<script src="\/app\.js\?v=[^"]+" defer><\/script>/,
      '<script src="/public-home.js?v=perf-mobile-20261007-2" defer></script>'
    );
  }
  return document;
}
function createSeoRouter({pool,indexFile,requireAuth,getHomeSection,getSitemapEntries}) {
  const router=express.Router();
  const template=fs.readFileSync(indexFile,'utf8');
  const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
  const list=async()=> (await pool.query(`
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      u.city AS user_city,
      u.bio AS user_bio,
      u.avatar AS user_avatar,
      p.slug,
      p.profile,
      COALESCE(p.updated_at,u.updated_at) AS updated_at,
      COALESCE(SUM(o.goods_amount) FILTER (WHERE o.status='completed' AND o.dispute_open=FALSE),0)::bigint AS sales_amount,
      COUNT(o.id) FILTER (WHERE o.status='completed' AND o.dispute_open=FALSE)::int AS completed_orders,
      (
        SELECT mp.images->>0
        FROM market_products mp
        WHERE mp.seller_id=u.id AND mp.status='active' AND jsonb_array_length(mp.images)>0
        ORDER BY mp.created_at DESC
        LIMIT 1
      ) AS product_cover
    FROM users u
    LEFT JOIN public_artisan_profiles p
      ON p.user_id=u.id AND p.published=TRUE
    LEFT JOIN market_orders o
      ON o.seller_id=u.id
    WHERE (
      u.role='artisan'
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id=u.id AND ur.role='artisan'
      )
    )
      AND NOT (LOWER(BTRIM(u.name))='anh' AND p.user_id IS NULL)
    GROUP BY u.id,u.name,u.city,u.bio,u.avatar,u.updated_at,p.slug,p.profile,p.updated_at
    ORDER BY sales_amount DESC, RANDOM()
  `)).rows.map(directoryProfile);
  router.get('/api/public/artisans',wrap(async(req,res)=>res.json({artisans:await list()})));
  router.post('/api/artisan/public-profile',requireAuth,wrap(async(req,res)=>{
    if(req.user.role!=='artisan') return res.status(403).json({message:'Chỉ nghệ nhân được công khai hồ sơ.'});
    let profile;try{profile=sanitizeProfile(req.body||{});}catch(e){return res.status(400).json({message:e.message});}
    // Preserve stored image bytes when an owner republishes an existing media URL.
    const previous=(await pool.query('SELECT user_id,slug,profile,updated_at FROM public_artisan_profiles WHERE user_id=$1',[req.user.id])).rows[0];
    const keepImage=value=>{
      if(!previous || !value)return value;
      const u=new URL(value,ORIGIN);
      const prefix='/media/nghe-nhan/'+previous.slug+'/';
      if(u.origin!==ORIGIN || !u.pathname.startsWith(prefix))return value;
      const slot=u.pathname.slice(prefix.length);
      const stored=slot==='avatar'||slot==='hero'?previous.profile[slot]:/^portfolio-\d+$/.test(slot)?previous.profile.portfolio?.[Number(slot.split('-')[1])]:null;
      return stored||'';
    };
    profile.avatar=keepImage(profile.avatar);profile.hero=keepImage(profile.hero);profile.portfolio=profile.portfolio.map(keepImage).filter(Boolean);
    const slug=slugify(profile.name)+'-'+crypto.createHash('sha256').update(String(req.user.id)).digest('hex').slice(0,12);
    const result=await pool.query(`INSERT INTO public_artisan_profiles (user_id,slug,profile,published) VALUES ($1,$2,$3,TRUE) ON CONFLICT (user_id) DO UPDATE SET profile=EXCLUDED.profile,published=TRUE,updated_at=NOW() RETURNING user_id,slug,profile,updated_at`,[req.user.id,slug,JSON.stringify(profile)]);
    res.json({artisan:publicProfile(result.rows[0]),message:'Đã công khai hồ sơ.'});
  }));
  router.delete('/api/artisan/public-profile',requireAuth,wrap(async(req,res)=>{
    if(req.user.role!=='artisan') return res.status(403).json({message:'Forbidden'});
    await pool.query('UPDATE public_artisan_profiles SET published=FALSE,updated_at=NOW() WHERE user_id=$1',[req.user.id]);
    res.json({message:'Đã ẩn hồ sơ công khai.'});
  }));
  router.get('/media/nghe-nhan/:slug/:slot',wrap(async(req,res)=>{
    const result=await pool.query('SELECT profile FROM public_artisan_profiles WHERE slug=$1 AND published=TRUE',[req.params.slug]);
    const p=result.rows[0]?.profile; const slot=req.params.slot;
    const value=p&&(slot==='avatar'||slot==='hero'?p[slot]:/^portfolio-\d+$/.test(slot)?p.portfolio?.[Number(slot.split('-')[1])]:null);
    if(!value?.startsWith('data:image/')) return res.status(404).end();
    const [prefix,encoded]=value.split(',');
    res.set('Cache-Control','public, max-age=300').set('X-Content-Type-Options','nosniff').type(prefix.slice(5).split(';')[0]).send(Buffer.from(encoded,'base64'));
  }));
  router.get('/robots.txt',(req,res)=>res.type('text/plain').send(`User-agent: *\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  router.get('/sitemap.xml',wrap(async(req,res)=>{
    const artisans=await list();
    const paths=['/','/dich-vu','/nghe-nhan','/quy-trinh',...SERVICES.map(s=>'/dich-vu/'+s.slug)];
    const entries=paths.map(p=>`<url><loc>${ORIGIN+p}</loc></url>`).concat(artisans.map(a=>`<url><loc>${ORIGIN}/nghe-nhan/${a.slug}</loc><lastmod>${new Date(a.updatedAt).toISOString()}</lastmod></url>`));
    if(getSitemapEntries)for(const item of await getSitemapEntries())entries.push(`<url><loc>${ORIGIN+escapeHtml(item.path)}</loc>${item.lastmod?`<lastmod>${new Date(item.lastmod).toISOString()}</lastmod>`:''}</url>`);
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`);
  }));
  router.get(['/index.html','/home','/explore','/trust'],(req,res)=>res.redirect(301,({'/index.html':'/','/home':'/','/explore':'/nghe-nhan','/trust':'/quy-trinh'})[req.path]));
  router.get('/creator/:id',wrap(async(req,res)=>{
    const artisans=await list();const a=artisans.find(a=>a.id===req.params.id);
    if(a)return res.redirect(301,'/nghe-nhan/'+a.slug);
    const page=pageFor(req.path,artisans);res.status(404).set('X-Robots-Tag','noindex').type('html').send(renderDocument(template,page,artisans));
  }));
  router.get(/.*/,wrap(async(req,res,next)=>{
    if(req.path==='/api'||req.path.startsWith('/api/'))return next();
    if(req.path.length>1 && !req.path.startsWith('//') && req.path.endsWith('/')) return res.redirect(301,req.path.replace(/\/+$/,'')+(req.url.includes('?')?req.url.slice(req.url.indexOf('?')):''));
    let artisans;try{artisans=await list();}catch(error){console.error('Public catalog unavailable:',error.message);return res.status(503).set('Retry-After','120').set('X-Robots-Tag','noindex').type('html').send('<!doctype html><html lang="vi"><meta charset="utf-8"><title>DioraLink tạm thời gián đoạn</title><h1>Vui lòng thử lại sau ít phút.</h1></html>');}
    const page=pageFor(req.path,artisans);
    if(req.path==='/' && getHomeSection){const block=await getHomeSection();page.html=page.html.replace('<!-- ART_MARKETPLACE -->',()=>block);}
    if(!page.index)res.set('X-Robots-Tag','noindex');
    res.set('Cache-Control','no-cache').status(page.status).type('html').send(renderDocument(template,page,artisans));
  }));
  router.use((err,req,res,next)=>{console.error('SEO route error:',err.message);res.status(503).set('Retry-After','120').json({message:'Không thể tải hoặc lưu hồ sơ. Vui lòng thử lại.'});});
  return router;
}
module.exports={createSeoRouter,ensureSeoSchema,pageFor,renderDocument,sanitizeProfile,publicProfile,slugify,SERVICES,safeImage};
