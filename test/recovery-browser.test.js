'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../Public/recovery-export.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'standalone browser recovery script must be present');
const script=match[1];

test('Recovery page JavaScript parses',()=>assert.doesNotThrow(()=>new vm.Script(script,{filename:'recovery-export.html'})));

test('Standalone page cannot exfiltrate data; no network APIs or cookies',()=>{
 for(const forbidden of ['fetch(','XMLHttpRequest','WebSocket','sendBeacon','document.cookie','navigator.clipboard','http://','https://']){
  assert.ok(!script.includes(forbidden),forbidden);
 }
 assert.ok(!html.includes('<script src='));
});

test('Export picks real cached artist information, not seeded demos or bank details',()=>{
 const data=new Map();
 data.set('dioralink_state_v25_directpay',JSON.stringify({artisans:[
  {id:'A-001',name:'Demo only',slug:null,avatar:'data:demo'},
  {id:'ART-seller',slug:'real-artist',name:'Artist Real',city:'Hà Nội',bio:'Tác phẩm thật',avatar:'data:image/png;base64,AA==',paymentProfile:{bank_name:'SECRET',account_number:'123456'}},
 ]}));
 data.set('dioralink_form_draft_v1:ART-seller:market-product:new',JSON.stringify({savedAt:'2026-10-24',values:{title:'Old product',price:'120000',description:'Made by artist',account_number:'SHOULD_NOT_EXPORT'}}));
 data.set('dioralink_market_product_media_v1:ART-seller:market-product:new',JSON.stringify({images:['asset:img1'],savedAt:'2026-10-24'}));
 const elements={export:{addEventListener:()=>{}},result:{}};
 const context=vm.createContext({document:{getElementById:key=>elements[key]},localStorage:{
  getItem:key=>data.get(key)||null,key:index=>[...data.keys()][index],get length(){return data.size}
 }});
 vm.runInContext(script,context);
 const result=JSON.parse(JSON.stringify(vm.runInContext('localContent()',context)));
 assert.equal(result.artists.length,1);
 assert.equal(result.artists[0].name,'Artist Real');
 assert.ok(!('paymentProfile' in result.artists[0]));
 assert.equal(result.drafts.length,1);
 assert.equal(result.drafts[0].fields.title,'Old product');
 assert.ok(!('account_number' in result.drafts[0].fields));
 assert.equal(result.imageDrafts.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('referencedAssetIds(localContent())',context))),['img1']);
});
