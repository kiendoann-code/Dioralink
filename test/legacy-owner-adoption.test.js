'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../artisan-recovery.js'),'utf8');
test('Archived profile ownership requires explicit authenticated admin approval',()=>{
 assert.ok(code.includes("'/api/admin/artisan-recovery/claims/:id/review',requireAdmin,guard"));
 assert.ok(code.includes("verification_method"));
 assert.ok(code.includes("SELECT old_user_id FROM legacy_restore_control"));
 assert.ok(code.includes("access_verified=FALSE"));
});
test('Archived profile and restored drafts only move after approval',()=>{
 assert.ok(code.includes("UPDATE public_artisan_profiles SET user_id=$2,published=$3"));
 assert.ok(code.includes("UPDATE market_products SET seller_id=$2"));
 assert.ok(code.includes("legacy_restored_product_status"));
 assert.ok(code.includes("status='draft'"));
});
test('Does not change historical orders, commissions or wallets during linkage',()=>{
 const approval=code.slice(code.indexOf("r.post('/api/admin/artisan-recovery/claims/:id/review'"),code.indexOf("r.get('/media/recovered-artisan/"));
 for(const unsafe of ['UPDATE diora_accounts','UPDATE diora_ledger','UPDATE diora_holds','UPDATE market_orders','UPDATE commission_workflows'])assert.ok(!approval.includes(unsafe),unsafe);
});
