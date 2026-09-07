import test from 'node:test';
import assert from 'node:assert/strict';
import {newPreparation,sanitizeEntity,validateBackup} from '../src/schema.js';

test('sanitizeEntity constrains invalid sermon status',()=>{const s=sanitizeEntity('sermons',{id:'x',title:'T',status:'HACK',points:[]});assert.equal(s.status,'Rascunho');assert.equal(s.points.length,1)});
test('validateBackup rejects unknown format',()=>assert.throws(()=>validateBackup({format:'x'})));
test('newPreparation creates sermon-preparation study',()=>{const p=newPreparation();assert.match(p.id,/^preparation_/);assert.equal(p.title,'Novo estudo preparatório');assert.equal(p.genre,'')});
test('preparation sanitizes genre and purpose',()=>{const p=sanitizeEntity('preparations',{id:'p1',genre:'Epistolar',basicPurpose:'Pastoral',title:'Romanos'});assert.equal(p.genre,'Epistolar');assert.equal(p.basicPurpose,'Pastoral')});
test('old backups remain compatible without preparations collection',()=>{const data=validateBackup({format:'pulpit-backup',data:{sermons:[],studies:[],devotionals:[],translations:[],settings:{}}});assert.deepEqual(data.collections.preparations,[])});
