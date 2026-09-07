import test from 'node:test'; import assert from 'node:assert/strict'; import {normalizeTags,slugify,escapeHtml} from '../src/utils.js';
test('normalizeTags trims, lowercases and deduplicates',()=>assert.deepEqual(normalizeTags(' Graça, graça, Cristo '),['graça','cristo']));
test('slugify removes accents and punctuation',()=>assert.equal(slugify('Graça & Redenção!'),'graca-redencao'));
test('escapeHtml escapes executable markup',()=>assert.equal(escapeHtml('<img src=x onerror="x">'),'&lt;img src=x onerror=&quot;x&quot;&gt;'));
