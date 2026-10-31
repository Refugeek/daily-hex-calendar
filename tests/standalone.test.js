import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('distributed HTML is self-contained and its classic scripts parse without a server',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert(!/<script\b[^>]*\bsrc\s*=/i.test(html));
 assert(!/<link\b[^>]*rel="stylesheet"/i.test(html));
 assert(!/@import\b/.test(html));
 assert(!/type="module"/.test(html));
 assert(!/import\.meta/.test(html));
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
 assert(!html.includes('id="solution-button"'));
 assert(!html.includes('id="solver-source"'));
 assert(!/function solve\s*\(/.test(html));
 for(const[,attributes,source]of scripts)new vm.Script(source,{filename:'embedded-app.js'});
});
