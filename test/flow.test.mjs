import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {beginLogin,consumeCallback} from '../dist/index.js';
let storage,assigned;
beforeEach(()=>{
 storage=new Map();assigned='';
 globalThis.sessionStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 globalThis.window={location:{origin:'https://app.example',href:'https://app.example/login',assign:url=>{assigned=url;}},history:{replaceState:(_,__,url)=>{window.location.href=String(url);}}};
});
async function prepare(){await beginLogin('pk_live_example','https://app.example/callback');const tx=JSON.parse(storage.get('notif-auth:transaction'));window.location.href=`https://app.example/callback?code=example-code&state=${tx.state}`;return tx;}
test('generates S256 PKCE without a client secret',async()=>{
 const tx=await prepare(),url=new URL(assigned);
 assert.equal(url.origin,'https://auth.notif.ml');assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(tx.verifier).digest('base64url'));
 assert.equal(url.searchParams.has('client_secret'),false);
});
test('rejects cross-origin callbacks and insecure issuers',async()=>{
 await assert.rejects(beginLogin('example','https://other.example/callback'));
 for(const issuer of ['http://untrusted.example','https://auth.example/path','https://user:password@auth.example'])await assert.rejects(beginLogin('example','https://app.example/callback',issuer));
 assert.equal(storage.size,0);
});
test('consumes the transaction once and removes callback credentials from the address bar',async()=>{
 const tx=await prepare();assert.deepEqual(consumeCallback(),{code:'example-code',verifier:tx.verifier});assert.equal(storage.size,0);assert.equal(window.location.href,'https://app.example/callback');
 window.location.href=`https://app.example/callback?code=example-code&state=${tx.state}`;assert.throws(()=>consumeCallback());
});
test('rejects mismatched state',async()=>{await prepare();window.location.href='https://app.example/callback?code=example-code&state=wrong';assert.throws(()=>consumeCallback());});
test('rejects expired or malformed transactions',async()=>{
 for(const createdAt of [Date.now()-700000,undefined,Date.now()+60000]){
  const tx=await prepare();storage.set('notif-auth:transaction',JSON.stringify({...tx,createdAt}));assert.throws(()=>consumeCallback());
 }
});
test('rejects callback path mismatch',async()=>{const tx=await prepare();window.location.href=`https://app.example/other?code=example-code&state=${tx.state}`;assert.throws(()=>consumeCallback());});
test('preserves the Next.js client component directive in the package',()=>{assert.match(readFileSync(new URL('../dist/index.js',import.meta.url),'utf8'),/["']use client["']/);});
