'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {unescapePg,decodeTable,readArchive}=require('../render-backup-stage');
test('Postgres COPY escapes and NULL are recovered',()=>{
 assert.equal(unescapePg('\\N'),null);
 assert.equal(unescapePg('line\\nnext'),'line\nnext');
 assert.equal(unescapePg('Diora\\\\Link'),'Diora\\Link');
});
test('COPY row decoding preserves column boundaries',()=>{
 const rows=decodeTable(Buffer.from('abc\tSample\\nBio\t\\N\n\\.\n'),['id','name','description']);
 assert.equal(rows.length,1);assert.equal(rows[0].name,'Sample\nBio');assert.equal(rows[0].description,null);
});
test('Nonverified or empty archives are rejected',()=>{
 assert.throws(()=>readArchive(Buffer.from('not-a-render-backup')),/trùng bản sao lưu/);
});
