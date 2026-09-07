import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReference,getPassage,toUsfmReference,buildYouVersionUrl,YOUVERSION_NVI_ID} from '../src/bible.js';

test('parseReference parses same chapter range',()=>assert.deepEqual(parseReference('João 3:16-18'),{book:'João',chapter:3,verseStart:16,endChapter:3,verseEnd:18}));
test('parseReference parses cross chapter range',()=>assert.deepEqual(parseReference('João 3:18-4:2'),{book:'João',chapter:3,verseStart:18,endChapter:4,verseEnd:2}));
test('getPassage resolves accent-insensitive book',()=>{const t={books:{'João':{'1':['a','b','c']}}};assert.equal(getPassage(t,'Joao 1:2')[0].text,'b')});
test('toUsfmReference maps Portuguese NVI references',()=>assert.equal(toUsfmReference('João 3:16-21'),'JHN.3.16-21'));
test('toUsfmReference maps cross-chapter ranges',()=>assert.equal(toUsfmReference('Romanos 8:38-9:2'),'ROM.8.38-9.2'));
test('toUsfmReference distinguishes Job from John',()=>assert.equal(toUsfmReference('Jó 1:1'),'JOB.1.1'));
test('YouVersion NVI link uses licensed version id',()=>{assert.equal(YOUVERSION_NVI_ID,129);assert.equal(buildYouVersionUrl('João 3:16'),'https://www.bible.com/pt/bible/129/JHN.3.16.NVI')});
