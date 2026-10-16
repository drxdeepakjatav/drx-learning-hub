// Cashfree Payments API helpers for Cloudflare Pages Functions.
import { HttpError } from "./http.js";
const API_VERSION = "2025-01-01";
const encoder = new TextEncoder();
export function cashfreeBase(env) {
 return env.CASHFREE_ENV === "sandbox" ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg";
}
export async function cashfree(env,path,method="GET",body) {
 if(!env.CASHFREE_APP_ID||!env.CASHFREE_SECRET)throw new HttpError(500,"Cashfree is not configured.");
 const response=await fetch(cashfreeBase(env)+path,{method,headers:{"x-client-id":env.CASHFREE_APP_ID,"x-client-secret":env.CASHFREE_SECRET,"x-api-version":API_VERSION,"Accept":"application/json","Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){console.error("Cashfree API error:",response.status,JSON.stringify(data).slice(0,300));throw new HttpError(502,"Cashfree payment request failed. Please try again.");}
 return data;
}
// Cashfree webhook signature: Base64(HMAC-SHA256(timestamp + raw request body)).
export async function webhookSignature(secret,timestamp,rawBody) {
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signature=await crypto.subtle.sign("HMAC",key,encoder.encode(timestamp+rawBody));
 let binary="";new Uint8Array(signature).forEach(byte=>{binary+=String.fromCharCode(byte);});return btoa(binary);
}
export function safeEqual(a,b) {
 if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;
 let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;
}