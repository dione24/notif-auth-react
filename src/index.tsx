'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
export type Callback=(code:string,verifier:string)=>void|Promise<void>;
type Transaction={state:string;verifier:string;redirectUri:string;createdAt:number};
const storageKey='notif-auth:transaction';
const base64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function beginLogin(clientId:string,redirectUri:string,issuer='https://auth.notif.ml'){
  const authority=new URL(issuer);
  if(authority.protocol!=='https:' && !(authority.protocol==='http:' && authority.hostname==='localhost'))throw new Error('issuer must use HTTPS');
  if(authority.pathname!=='/' || authority.search || authority.hash || authority.username || authority.password)throw new Error('issuer must be an origin');
  const callback=new URL(redirectUri);
  if(callback.origin!==window.location.origin)throw new Error('redirectUri must use the application origin');
  const state=base64(crypto.getRandomValues(new Uint8Array(32)));
  const verifier=base64(crypto.getRandomValues(new Uint8Array(32)));
  const challenge=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  sessionStorage.setItem(storageKey,JSON.stringify({state,verifier,redirectUri,createdAt:Date.now()}));
  const query=new URLSearchParams({response_type:'code',client_id:clientId,redirect_uri:redirectUri,state,code_challenge_method:'S256',code_challenge:challenge});
  window.location.assign(`${authority.origin}/authorize?${query}`);
}
export function consumeCallback():{code:string;verifier:string}|null{
  const url=new URL(window.location.href),code=url.searchParams.get('code'),state=url.searchParams.get('state');
  if(!code)return null;
  const stored=sessionStorage.getItem(storageKey);sessionStorage.removeItem(storageKey);
  url.searchParams.delete('code');url.searchParams.delete('state');window.history.replaceState({},'',url);
  if(!stored)throw new Error('Missing login session. Restart the sign-in.');
  const tx=JSON.parse(stored) as Transaction;
  if(!state || state!==tx.state || !/^[A-Za-z0-9_-]{43}$/.test(tx.verifier) || !Number.isFinite(tx.createdAt) || tx.createdAt>Date.now() || Date.now()-tx.createdAt>600000)throw new Error('Invalid or expired state');
  const callback=new URL(tx.redirectUri);
  if(callback.origin!==url.origin || callback.pathname!==url.pathname)throw new Error('Invalid callback URL');
  return {code,verifier:tx.verifier};
}
export function useNotifCallback(onCode:Callback,onError?:(error:Error)=>void){
  const done=useRef(false);
  useEffect(()=>{if(done.current)return;done.current=true;
    try {const callback=consumeCallback();if(callback)Promise.resolve(onCode(callback.code,callback.verifier)).catch(e=>onError?.(e));}catch(e){onError?.(e instanceof Error?e:new Error('Sign-in failed'));}
  },[onCode,onError]);
}
export function NotifAuthCallback({onCode,onError}:{onCode:Callback;onError?:(error:Error)=>void}){
  useNotifCallback(onCode,onError);return <p role="status">Vérification de votre connexion…</p>;
}
export interface ButtonProps {clientId:string;redirectUri:string;issuer?:string;variant?:'filled'|'outline'|'dark';pending?:boolean;onCode:Callback;onError?:(error:Error)=>void;className?:string}
export function WhatsAppLoginButton({clientId,redirectUri,issuer,variant='filled',pending=false,onCode,onError,className}:ButtonProps){
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useNotifCallback(onCode,e=>{setError(e.message);onError?.(e)});
  const style:CSSProperties={height:46,borderRadius:8,padding:'0 18px',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit',fontSize:14,fontWeight:600,cursor:'pointer',border:variant==='outline'?'1px solid #8faaa0':'1px solid transparent',background:variant==='filled'?'#25D366':variant==='dark'?'#075E54':'transparent',color:variant==='filled'?'#04342C':variant==='dark'?'#fff':'inherit',opacity:(busy||pending)?0.65:1};
  return <><button type="button" className={className} style={style} disabled={busy||pending} onClick={async()=>{setBusy(true);setError('');try{await beginLogin(clientId,redirectUri,issuer)}catch(e){setBusy(false);const err=e instanceof Error?e:new Error('Sign-in failed');setError(err.message);onError?.(err)}}}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.5 4.1 1.6 6L0 24l6.2-1.6A12 12 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5ZM12 22a10 10 0 0 1-5.1-1.4l-.4-.2-3.7 1 1-3.6-.3-.4A10 10 0 1 1 12 22Zm5.5-7.4-1.8-.9c-.2-.1-.4-.1-.6.2l-.8 1c-.1.2-.3.2-.5.1-1.3-.6-2.4-1.5-3.2-2.7-.2-.3.2-.5.6-1 .1-.2.1-.4 0-.6l-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.7.7-1 1.3-1 2.1 0 1.1.8 2.3 1 2.4.1.2 1.7 2.7 4.2 3.7 1.6.7 2.2.7 3 .6.5-.1 1.5-.6 1.8-1.3.2-.6.2-1.2.1-1.3-.1-.1-.2-.1-.5-.2Z"/></svg>
    {busy||pending?'Connexion en cours…':'Continuer avec WhatsApp'}</button>{error&&<p role="alert">{error}</p>}</>;
}
