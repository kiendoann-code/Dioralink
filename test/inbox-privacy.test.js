'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {canArtistSee,collectInboxUpdates}=require('../commission-workflow');

test('direct requests are private to the named artisan even if participants contain another artist',()=>{
  const direct={creator_mode:'specific',preferred_artisan_user_id:'artist-a',
    participant_artisan_ids:['artist-b'],status:'pending'};
  assert.equal(canArtistSee(direct,'artist-a'),true);
  assert.equal(canArtistSee(direct,'artist-b'),false);
  assert.equal(canArtistSee(direct,'artist-c'),false);
});

test('public matching requests are visible while open and disappear for nonparticipants when closed',()=>{
  const open={creator_mode:'matching',preferred_artisan_user_id:null,
    participant_artisan_ids:['artist-a'],status:'pending'};
  assert.equal(canArtistSee(open,'artist-a'),true);
  assert.equal(canArtistSee(open,'artist-b'),true);
  const closed={...open,status:'proposal_accepted'};
  assert.equal(canArtistSee(closed,'artist-a'),true);
  assert.equal(canArtistSee(closed,'artist-b'),false);
  assert.equal(canArtistSee({...open,preferred_artisan_user_id:'artist-a'},'artist-b'),false);
});

test('inbox notifications only contain incoming messages of authorized conversation',()=>{
  const timestamp='2026-10-22T05:00:00.000Z';
  const common={id:'REQ-DIRECT',title:'Đặt diorama riêng',creator_mode:'specific',status:'pending',
    customer_user_id:'customer-a',preferred_artisan_user_id:'artist-a',
    participant_artisan_ids:['artist-b'],threads:{
      'artist-a':[
        {id:'MSG-1',senderRole:'customer',text:'Bản mẫu mới',createdAt:timestamp},
        {id:'MSG-2',senderRole:'artisan',text:'Đã nhận yêu cầu',createdAt:timestamp}],
      'artist-b':[{id:'MSG-SECRET',senderRole:'customer',text:'Private',createdAt:timestamp}]
    }};
  const since=Date.parse(timestamp)-1000,until=Date.parse(timestamp)+1000;
  assert.deepEqual(collectInboxUpdates([common],{id:'artist-a',role:'artisan'},since,until).map(x=>x.id),['MSG-1']);
  assert.deepEqual(collectInboxUpdates([common],{id:'artist-b',role:'artisan'},since,until),[]);
  assert.deepEqual(collectInboxUpdates([common],{id:'customer-a',role:'customer'},since,until).map(x=>x.id),['MSG-2']);
  assert.deepEqual(collectInboxUpdates([common],{id:'customer-b',role:'customer'},since,until),[]);
  assert.deepEqual(collectInboxUpdates([common],{id:'artist-a',role:'artisan'},until,until+1000),[]);
});

test('open matching notifications are only delivered to artists with active threads',()=>{
  const createdAt='2026-10-22T05:00:00.000Z';
  const r={id:'REQ-OPEN',title:'Nhà mô hình',creator_mode:'matching',status:'proposal_received',
    customer_user_id:'customer-a',preferred_artisan_user_id:null,
    participant_artisan_ids:['artist-a'],threads:{
      'artist-a':[{id:'MSG-MATCH',senderRole:'customer',text:'Chào bạn',createdAt}]
    }};
  assert.equal(collectInboxUpdates([r],{role:'artisan',id:'artist-b'},Date.parse(createdAt)-1,Date.parse(createdAt)+1).length,0);
  assert.equal(collectInboxUpdates([r],{role:'artisan',id:'artist-a'},Date.parse(createdAt)-1,Date.parse(createdAt)+1).length,1);
});
