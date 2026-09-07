import test from 'node:test'; import assert from 'node:assert/strict'; import {parseReference,getPassage} from '../src/bible.js';
test('parseReference parses same chapter range',()=>assert.deepEqual(parseReference('João 3:16-18'),{book:'João',chapter:3,verseStart:16,endChapter:3,verseEnd:18}));
test('parseReference parses cross chapter range',()=>assert.deepEqual(parseReference('João 3:18-4:2'),{book:'João',chapter:3,verseStart:18,endChapter:4,verseEnd:2}));
test('getPassage resolves accent-insensitive book',()=>{const t={books:{'João':{'1':['a','b','c']}}};assert.equal(getPassage(t,'Joao 1:2')[0].text,'b')});
