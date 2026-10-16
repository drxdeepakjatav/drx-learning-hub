/* DRx Learning Hub - Cashfree-only online payments. */
window.DRX_PAY = (function () {
 async function api(path, body, token) {
  var response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify(body)});
  var data={}; try{data=await response.json();}catch(e){}
  if(!response.ok&&response.status!==202) throw new Error(data.error||"Payment request failed ("+response.status+").");
  return data;
 }
 function loadCashfree(){return new Promise(function(resolve,reject){if(window.Cashfree){resolve();return;}var s=document.createElement("script");s.src="https://sdk.cashfree.com/js/v3/cashfree.js";s.onload=resolve;s.onerror=function(){reject(new Error("Could not load Cashfree. Check your internet connection."));};document.head.appendChild(s);});}
 async function verify(orderId,user){return api("/api/cashfree-verify",{orderId:orderId},await user.getIdToken(true));}
 async function startCashfree(course,user,token,say){
  var order=await api("/api/cashfree-create-order",{courseId:course.id},token);
  if(!order.paymentSessionId||!order.orderId)throw new Error("Cashfree did not return a valid payment session.");
  await loadCashfree();
  var cf=window.Cashfree({mode:order.mode==="sandbox"?"sandbox":"production"});
  say("Opening Cashfree payment window...");
  await cf.checkout({paymentSessionId:order.paymentSessionId,redirectTarget:"_modal"});
  say("Checking your payment...");
  var result=await verify(order.orderId,user);
  if(!result.paid)throw new Error("Payment is not confirmed yet. If money was deducted, wait a few minutes and contact support with order ID: "+order.orderId);
 }
 async function resumeAfterRedirect(){
  var orderId=new URLSearchParams(window.location.search).get("cforder");
  if(!orderId||typeof auth==="undefined")return;
  auth.onAuthStateChanged(async function(user){
   if(!user||window.__drxResumed)return;window.__drxResumed=true;
   var bar=document.createElement("div");bar.className="filter-banner";bar.style.cssText="position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:9999;max-width:90%;";bar.textContent="Checking your Cashfree payment...";document.body.appendChild(bar);
   try{var result=await verify(orderId,user);if(result.paid){bar.textContent="Payment successful! Your course is now unlocked.";setTimeout(function(){var clean=new URL(window.location.href);clean.searchParams.delete("cforder");window.location.href=clean.toString();},1200);}else{bar.textContent="Payment not confirmed yet. If money was deducted, contact support with order ID: "+orderId;}}
   catch(e){bar.textContent="We could not confirm the payment yet. Contact support with order ID: "+orderId;}
  });
 }
 document.addEventListener("DOMContentLoaded",resumeAfterRedirect);
 async function start(course,button,statusEl){
  function say(t,bad){if(statusEl){statusEl.textContent=t;statusEl.style.color=bad?"#b02a37":"#0f5132";}}
  var user=typeof auth!=="undefined"?auth.currentUser:null;
  if(!user){window.location.href="login.html?next="+encodeURIComponent("learn.html?course="+course.id);return;}
  button.disabled=true;say("Starting secure Cashfree payment...");
  try{await startCashfree(course,user,await user.getIdToken(),say);say("Payment successful! Your course is now unlocked.");setTimeout(function(){window.location.href="learn.html?course="+encodeURIComponent(course.id);},1200);}
  catch(e){button.disabled=false;say(e&&e.message?e.message:"Payment could not be completed.",true);}
 }
 return {start:start};
})();