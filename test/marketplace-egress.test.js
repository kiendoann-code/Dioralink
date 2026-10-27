'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {publicProduct}=require('../marketplace');
test('public catalog transfers media URLs, media reads one image, seller retains originals',async()=>{
 const f=await require('./marketplace-fixture').fixture();
 try{
  await f.db.exec(`CREATE TABLE legacy_restore_control(old_user_id TEXT,access_verified BOOLEAN);
    CREATE TABLE legacy_restored_product_status(product_id UUID,old_status TEXT);`);
  const images=['data:image/png;base64,'+Buffer.alloc(200000,1).toString('base64'),'data:image/png;base64,'+Buffer.alloc(300000,2).toString('base64'),'https://example.test/image.png'];
  const pid='a0673670-8bfe-4b42-9351-640d54dbd8e6';
  await f.pool.query(`INSERT INTO market_products(id,seller_id,slug,title,description,category,condition,price,shipping_fee,stock,images,status)
    VALUES($1,'seller','egress-product','Product','A sufficiently detailed product description','Miniature','New',100000,0,2,$2,'active')`,[pid,JSON.stringify(images)]);
  const raw=(await f.pool.query('SELECT p.*,u.name AS seller_name,u.city AS seller_city FROM market_products p JOIN users u ON u.id=p.seller_id WHERE p.id=$1',[pid])).rows[0];
  const query=f.pool.query;let catalogBytes=0;let mediaFields;
  f.pool.query=async(sql,params)=>{const result=await query(sql,params);if(sql.includes('jsonb_agg(CASE'))catalogBytes=Buffer.byteLength(JSON.stringify(result.rows));if(sql.includes('AS image,p.status'))mediaFields=Object.keys(result.rows[0]);return result;};
  const listing=await f.api('/api/market/products');assert.equal(listing.status,200);
  assert.deepEqual(listing.data.products[0],JSON.parse(JSON.stringify(publicProduct(raw))));
  assert.ok(catalogBytes<2000,`catalog bytes ${catalogBytes}`);
  assert.ok(Buffer.byteLength(JSON.stringify(raw))>600000);
  const media=await fetch(f.url+'/media/market/'+pid+'/1');assert.equal(media.status,200);
  assert.deepEqual(Buffer.from(await media.arrayBuffer()),Buffer.alloc(300000,2));
  assert.deepEqual(mediaFields.sort(),['image','preview','status']);
  const seller=await f.api('/api/market/seller/products',{user:'seller'});assert.deepEqual(seller.data.products[0].images,images);
  const detail=await f.api('/marketplace/egress-product');assert.equal(detail.status,200);assert.ok(!detail.data.includes(images[0]));
  await f.pool.query("UPDATE market_products SET status='hidden' WHERE id=$1",[pid]);
  assert.equal((await f.api('/media/market/'+pid+'/1')).status,404);
 }finally{await f.close();}
});
