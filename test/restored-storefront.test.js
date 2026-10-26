'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {productCard,productPage}=require('../marketplace-pages');
const {homeProducts}=require('../home');
const {publicProduct}=require('../marketplace');
function sample(restore_preview=true){return {id:'a0673670-8bfe-4b42-9351-640d54dbd8e6',slug:'sample-figure',title:'Một tác phẩm DioraLink đã đăng bán',description:'Tác phẩm nghệ nhân từng đăng trước thời điểm sự cố, đang được kiểm tra.',category:'Miniature',condition:'new',price:250000,shipping_fee:25000,stock:4,version:1,status:'draft',seller_name:'Naisu Toys Shop',seller_city:'Hà Nội',seller_id:'old-user-id',restore_preview,images:['data:image/png;base64,AAA='],updated_at:'2026-10-25T01:00:00Z'};}
test('serializer exposes historical draft only as read-only preview',()=>{const p=publicProduct(sample());assert.equal(p.preview,true);assert.equal(p.status,'draft');assert.match(p.images[0],/^\/media\/market\//);});
test('market product card clearly identifies pending seller',()=>{assert.match(productCard(publicProduct(sample())),/Chờ xác minh người bán/);});
test('preview detail has no checkout or live offer',()=>{const p=productPage(publicProduct(sample()));assert.equal(p.index,false);assert.ok(!p.html.includes('href="/ung-dung#market-checkout'));assert.match(p.html,/chưa cho phép đặt hàng/);assert.deepEqual(p.structuredData,[]);});
test('home shows featured archive without implying checkout',()=>{const s=homeProducts([publicProduct(sample())]);assert.match(s,/Tác phẩm tiêu biểu/);assert.match(s,/Chờ xác minh/);assert.match(s,/Naisu Toys Shop/);});
test('normal active product keeps checkout',()=>{const p=productPage({...publicProduct(sample(false)),status:'active'});assert.ok(p.html.includes('href="/ung-dung#market-checkout'));});
