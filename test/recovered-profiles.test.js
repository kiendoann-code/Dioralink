'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pageFor,recoveredPublicProfile}=require('../seo');
const published={
 old_user_id:'e17f2bd1-9d74-41d4-ab25-79e918f71c6f',
 cached_published:true,exported_at:'2026-10-25T19:36:49Z',
 snapshot:{id:'ART-e17f2bd1-9d74-41d4-ab25-79e918f71c6f',slug:'made-by-anthony-bd882baaa11e',name:'Made by Anthony',
  published:true,city:'Thành phố Hồ Chí Minh',bio:'Sáng tạo mô hình',specialties:['Gundam'],startingPrice:3000000}
};
test('Public recovered listing is read-only, with genuine static image URLs',()=>{
 const profile=recoveredPublicProfile(published);
 assert.ok(profile);
 assert.equal(profile.readOnly,true);
 assert.equal(profile.recovered,true);
 assert.equal(profile.id,published.snapshot.id);
 assert.equal(profile.avatar,'/assets/recovered-public/made-by-anthony-avatar.jpg');
 assert.equal(profile.hero,'/assets/recovered-public/made-by-anthony-hero.jpg');
});
test('Unpublished and unknown profiles are never exposed',()=>{
 assert.equal(recoveredPublicProfile({...published,cached_published:false}),null);
 assert.equal(recoveredPublicProfile({...published,snapshot:{...published.snapshot,published:false}}),null);
 assert.equal(recoveredPublicProfile({...published,snapshot:{...published.snapshot,slug:'unrecognized-profile'}}),null);
});
test('Recovered public profile page cannot route new direct commissions',()=>{
 const p=recoveredPublicProfile(published);
 const page=pageFor('/nghe-nhan/'+p.slug,[p]);
 assert.equal(page.status,200);
 assert.ok(page.html.includes('Hồ sơ công khai được khôi phục'));
 assert.ok(page.html.includes('Chưa nhận yêu cầu trực tiếp'));
 assert.ok(!page.html.includes("sessionStorage.setItem('dioralink_preferred_artisan'"));
 assert.ok(page.html.includes(p.hero));
 assert.ok(page.html.includes(p.avatar));
});
test('Normal published artisan retains commission button',()=>{
 const regular={...recoveredPublicProfile(published),readOnly:false,recovered:false};
 const page=pageFor('/nghe-nhan/'+regular.slug,[regular]);
 assert.ok(page.html.includes('Gửi yêu cầu đặt làm'));
});
test('Client selectors exclude read-only recovered profiles from commission routing',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../Public/app.js'),'utf8');
 const matches=s.match(/publicArtisans\.filter\(a=>!a\.readOnly\)\.map/g)||[];
 assert.equal(matches.length,2);
 assert.ok(s.includes("state.artisans.find(a=>a.id===id)?.readOnly"));
});
