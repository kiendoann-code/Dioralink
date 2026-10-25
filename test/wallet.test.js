'use strict';
const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');const {fixture}=require('./marketplace-fixture');const {contactReason}=require('../communication-policy');let f;
before(async()=>{f=await fixture();});after(async()=>f?.close());
const bank={bank_name:'MB',account_name:'TEST CUSTOMER',account_number:'123456789'};
const post=(route,body,user='buyer',admin=false)=>f.api(route,{user,admin,method:'POST',body});
test('contact policy blocks variants, URLs, email and >8 digits; ordinary text remains valid',()=>{for(const text of ['zalo','Z A L O','z.a.l.o','dép lào','DALO','FB','f.b','Facebook','phở bò','mail','a@gmail.com','https://abc.test','example.vn','contact.dev','example.store','090 123 4567','１２３４５６７８９','za\u200blo'])assert.ok(contactReason(text),text);for(const text of ['Mô hình tỷ lệ 1:64','Báo giá 500.000đ','Mốc 2 hoàn thành','Ngày 14/10/26'])assert.equal(contactReason(text),'',text);});
test('topup pending does not credit, review replay credits once, bank snapshots remain immutable',async()=>{
 const balance=Number((await f.api('/api/wallet',{user:'buyer'})).data.account.balance);const request_key=randomUUID();const r=await post('/api/wallet/topups',{amount:100000,request_key});assert.equal(r.status,201);const t=r.data.topup;
 assert.equal(Number((await f.api('/api/wallet',{user:'buyer'})).data.account.balance),balance);
 assert.equal((await post('/api/wallet/topups',{amount:100000,request_key})).data.topup.id,t.id);
 assert.equal((await post('/api/wallet/topups',{amount:200000,request_key})).status,409);
 const qr='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';assert.equal((await post('/api/admin/wallet/banks',{...bank,qr},undefined,true)).status,200);
 const d=(await f.api('/api/wallet',{user:'buyer'})).data;assert.equal(d.topups.find(x=>x.id===t.id).bank_snapshot.account_number,'885098268888');
 const uri='/api/admin/wallet/topups/'+t.id+'/review';assert.equal((await post(uri,{action:'approve',bank_reference:'BANK001'})).status,401);
 const rs=await Promise.all([post(uri,{action:'approve',bank_reference:'BANK001'},undefined,true),post(uri,{action:'approve',bank_reference:'BANK001'},undefined,true)]);assert.ok(rs.every(r=>r.status===200),JSON.stringify(rs));
 assert.equal(Number((await f.api('/api/wallet',{user:'buyer'})).data.account.balance),balance+100000);
 assert.equal((await post(uri,{action:'reject',bank_reference:'changed'},undefined,true)).status,409);
});
test('withdrawal reserves immediately; concurrent overspend fails; rejection refunds once; admin notified',async()=>{
 const user='outsider';await f.pool.query('INSERT INTO diora_accounts(user_id,balance) VALUES($1,100000) ON CONFLICT(user_id) DO UPDATE SET balance=100000',[user]);
 const results=await Promise.all([post('/api/wallet/withdrawals',{...bank,amount:80000,request_key:randomUUID()},user),post('/api/wallet/withdrawals',{...bank,amount:80000,request_key:randomUUID()},user)]);assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);
 const w=results.find(x=>x.status===201).data.withdrawal;let d=(await f.api('/api/wallet',{user})).data;assert.equal(Number(d.account.balance),20000);assert.equal(Number(d.account.held),80000);
 assert.equal((await f.pool.query('SELECT * FROM admin_notifications')).rows.length,1);
 const uri='/api/admin/wallet/withdrawals/'+w.id+'/review';await post(uri,{action:'reject',bank_reference:'Sai thông tin ngân hàng'},undefined,true);await post(uri,{action:'reject',bank_reference:'Sai thông tin ngân hàng'},undefined,true);
 d=(await f.api('/api/wallet',{user})).data;assert.equal(Number(d.account.balance),100000);assert.equal(Number(d.account.held),0);
 const next=(await post('/api/wallet/withdrawals',{...bank,amount:50000,request_key:randomUUID()},user)).data.withdrawal;await post('/api/admin/wallet/withdrawals/'+next.id+'/review',{action:'approve',bank_reference:'OUT001'},undefined,true);d=(await f.api('/api/wallet',{user})).data;assert.equal(Number(d.account.balance),50000);assert.equal(Number(d.account.held),0);
});

test('commission amounts have no 500000 VND floor for creation, editing or artisan proposals',async()=>{
 const payload={title:'Mô hình phụ kiện nhỏ',size:'10 cm',timeline:'7 ngày',description:'Làm một mô hình phụ kiện bằng nhựa',budget:1,creatorMode:'specific',preferredArtisanId:'ART-seller'};
 const endpoint='/api/commission/requests';
 const created=await post(endpoint,payload);assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(created.data.request.budget,1);
 const rid=created.data.request.id;const requestUrl=endpoint+'/'+rid;
 assert.equal((await post(endpoint,{...payload,budget:0})).status,400);
 assert.equal((await post(endpoint,{...payload,budget:-1})).status,400);
 const updated=await f.api(requestUrl,{user:'buyer',method:'PATCH',body:{budget:1000}});
 assert.equal(updated.status,200,JSON.stringify(updated.data));assert.equal(updated.data.request.budget,1000);
 assert.equal((await f.api(requestUrl,{user:'buyer',method:'PATCH',body:{budget:0}})).status,400);
 const quote={quote:1,timeline:'7 ngày',message:'Tôi nhận làm mẫu này',deliverables:['Mô hình hoàn thiện']};
 const first=await post(requestUrl+'/proposals',quote,'seller');assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.proposal.quote,1);
 assert.equal((await post(requestUrl+'/proposals',{...quote,quote:0},'seller')).status,400);
 const revised=await post(requestUrl+'/proposals',{...quote,quote:15000},'seller');
 assert.equal(revised.status,200,JSON.stringify(revised.data));assert.equal(revised.data.proposal.quote,15000);
 const accepted=await post(requestUrl+'/proposals/'+revised.data.proposal.id+'/accept',{});
 assert.equal(accepted.status,200,JSON.stringify(accepted.data));assert.equal(accepted.data.project.budget,15000);
});

test('commission protects identity, financial fields and sequential funded milestones',async()=>{
 const payload={title:'Mô hình nhà nhỏ',size:'20 cm',timeline:'Một tuần',description:'Một căn nhà bằng gỗ',budget:500000,creatorMode:'specific',preferredArtisanId:'ART-seller'};
 const created=await post('/api/commission/requests',payload);assert.equal(created.status,201,JSON.stringify(created.data));const rid=created.data.request.id;
 const proposal=await post('/api/commission/requests/'+rid+'/proposals',{quote:500000,timeline:'Một tuần',message:'Tôi có thể làm mẫu nhà này',deliverables:['Mô hình hoàn thiện']},'seller');assert.equal(proposal.status,200,JSON.stringify(proposal.data));
 const accepted=await post('/api/commission/requests/'+rid+'/proposals/'+proposal.data.proposal.id+'/accept',{});assert.equal(accepted.status,200);let p=accepted.data.project;
 const ws=(await f.api('/api/commission/workspace',{user:'seller'})).data;assert.match(ws.projects[0].customerId,/^KH-/);assert.ok(!JSON.stringify(ws).includes('Khách An'));assert.ok(!Object.keys(ws.participants.customers).includes('buyer'));assert.equal(ws.requests[0].threads,undefined);
 assert.equal((await post('/api/commission/conversations/'+rid+'/seller/messages',{text:'Nhắn z.a.l.o nhé'})).status,400);
 async function update(user,changes){return f.api('/api/commission/projects/'+p.id,{user,method:'PUT',body:{...p,...changes}});}
 let ms=structuredClone(p.milestones);ms[0].status='in_progress';assert.equal((await update('seller',{milestones:ms})).status,409);
 let uri='/api/wallet/projects/'+p.id+'/milestones/M1/';assert.equal((await post(uri+'fund',{})).status,200);assert.equal((await post(uri+'fund',{})).status,200);
 assert.equal((await post(uri+'pay',{})).status,409);
 assert.equal((await update('seller',{milestones:ms,payments:[{status:'confirmed',amount:1}]})).status,200);
 p=(await f.api('/api/commission/workspace',{user:'buyer'})).data.projects[0];assert.equal(p.payments.length,0);assert.equal(p.milestones[0].amount,100000);
 ms=structuredClone(p.milestones);ms[0].status='submitted';ms[0].amount=1;assert.equal((await update('seller',{milestones:ms})).status,200);
 p=(await f.api('/api/commission/workspace',{user:'buyer'})).data.projects[0];assert.equal(p.milestones[0].amount,100000);ms=structuredClone(p.milestones);ms[0].status='approved';assert.equal((await update('seller',{milestones:ms})).status,409);assert.equal((await update('buyer',{milestones:ms})).status,200);
 assert.equal((await post(uri+'pay',{})).status,200);assert.equal((await post(uri+'pay',{})).status,200);const ledger=(await f.pool.query("SELECT * FROM diora_ledger WHERE ref=$1",['commission:'+p.id+':M1'])).rows;assert.equal(ledger.filter(x=>x.kind==='sale').length,1);assert.equal(Number(ledger.find(x=>x.kind==='sale').delta),90000);
});
test('duplicate bank receipt is rejected without changing balance; replacement bank persists across migration',async()=>{
 const a=(await post('/api/wallet/topups',{amount:50000,request_key:randomUUID()})).data.topup;const b=(await post('/api/wallet/topups',{amount:50000,request_key:randomUUID()})).data.topup;
 assert.equal((await post('/api/admin/wallet/topups/'+a.id+'/review',{action:'approve',bank_reference:'UNIQUE-RECEIPT'},undefined,true)).status,200);
 const before=Number((await f.api('/api/wallet',{user:'buyer'})).data.account.balance);
 assert.equal((await post('/api/admin/wallet/topups/'+b.id+'/review',{action:'approve',bank_reference:'UNIQUE-RECEIPT'},undefined,true)).status,409);
 assert.equal(Number((await f.api('/api/wallet',{user:'buyer'})).data.account.balance),before);
 await require('../wallet').ensureWalletSchema(f.pool);assert.equal((await f.pool.query('SELECT account_number FROM diora_banks WHERE active')).rows[0].account_number,'123456789');
});
test('available and held balances reconcile with immutable transaction entries',async()=>{for(const user of ['buyer','buyer2','seller','@platform']){const a=(await f.pool.query('SELECT * FROM diora_accounts WHERE user_id=$1',[user])).rows[0];if(!a)continue;const l=(await f.pool.query('SELECT COALESCE(SUM(delta),0) AS balance,COALESCE(SUM(held_delta),0) AS held FROM diora_ledger WHERE user_id=$1',[user])).rows[0];assert.equal(Number(a.balance),Number(l.balance),user);assert.equal(Number(a.held),Number(l.held),user);assert.ok(Number(a.balance)>=0&&Number(a.held)>=0);}});
