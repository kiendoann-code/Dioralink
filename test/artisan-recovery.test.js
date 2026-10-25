'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {restoredProfile,norm,validBytes}=require('../artisan-recovery');
test('normalizes display names',()=>assert.equal(norm('Naisu Toys Shop'),norm('naisu toys shop')));
test('recovered profile preserves public fields',()=>{const p=restoredProfile({name:'Naisu Toys Shop',bio:'Artist profile',startingPrice:300000},['avatar'],'ART-3ddbd528-ee5d-4c99-b9fb-12e85ae6f918');assert.equal(p.name,'Naisu Toys Shop');assert.equal(p.startingPrice,300000);assert.equal(p.hero,'');assert.ok(p.avatar.includes('/avatar'));});
test('checks actual image signatures',()=>{const b=Buffer.alloc(50);b[0]=255;b[1]=216;b[2]=255;assert.equal(validBytes('image/jpeg',b),true);assert.equal(validBytes('image/png',b),false);});
