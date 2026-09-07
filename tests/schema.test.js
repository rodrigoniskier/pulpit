import test from 'node:test'; import assert from 'node:assert/strict'; import {sanitizeEntity,validateBackup} from '../src/schema.js';
test('sanitizeEntity constrains invalid sermon status',()=>{const s=sanitizeEntity('sermons',{id:'x',title:'T',status:'HACK',points:[]});assert.equal(s.status,'Rascunho');assert.equal(s.points.length,1)});
test('validateBackup rejects unknown format',()=>assert.throws(()=>validateBackup({format:'x'})));
