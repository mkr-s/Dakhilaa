/* =====================================================================
   Dakhilaa — JEE Main January 2027 Crash Course (₹999, valid till 31 Jan 2027)
   Loaded by app.html BEFORE the main app script. Uses the app's globals
   (currentProfile, currentUser, USE_FIREBASE, fbAuth, fbDB, view, go, payToast,
   isOwnerUser) only at call time.
   Server: /api/crash (papers, scoring, rank) · /api/create-order + /api/verify-payment
   (plan "crash27") · /api/admin-import-crash (owner upload).
   ===================================================================== */
(function(){
var CR = window.CR = {
  key:"crash27", name:"JEE Main Jan 2027 Crash Course", price:"₹999", amount:99900,
  validUntil: Date.UTC(2027,0,31,18,29,59),   // 31 Jan 2027, 11:59:59 PM IST
  examFirstDay: "2027-01-20",
  list:null, tab:"mocks", wsub:"Physics", x:null, res:null, rfilter:"all", busy:false
};
var SUBS=["Physics","Chemistry","Mathematics"];
var CAT={ concept:["Concept gap","#ef4444"], formula:["Formula slip","#f59e0b"], calculation:["Calculation slip","#38bdf8"], sign:["Sign / convention","#a78bfa"], unit:["Unit slip","#2dd4bf"], reading:["Misread the question","#94a3b8"], other:["Other","#64748b"] };
var SILLY={calculation:1,sign:1,unit:1,reading:1};
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function E(s){ return typeof s==="string" ? s.replace(/</g,"&lt;").replace(/⏎/g,"<br>").replace(/«/g,"<b>").replace(/»/g,"</b>") : s; }
function typeset(el){ try{ if(window.renderMathInElement) renderMathInElement(el,{delimiters:[{left:"$",right:"$",display:false}],throwOnError:false}); }catch(e){} }
function toast(m,err){ if(typeof payToast==="function") payToast(m,err); else alert(m); }
function mid(n){ return "m"+(n<10?"0":"")+n; }
function mnum(id){ return parseInt(String(id).slice(1),10); }
function level(n){ return n<=40?["Medium","#4ade80"]:(n<=60?["Medium–hard","#fb923c"]:["Exam-level+","#c4b5fd"]); }
function fmt(ms){ if(ms<0) ms=0; var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60; return (h?h+":":"")+(m<10?"0":"")+m+":"+(x<10?"0":"")+x; }
function daysTo(iso){ var t=new Date(iso+"T00:00:00+05:30").getTime(); return Math.ceil((t-Date.now())/86400000); }
function uidKey(){ return (typeof currentUser!=="undefined" && currentUser) ? String(currentUser) : "guest"; }
function isOwner(){ try{ return typeof isOwnerUser==="function" && isOwnerUser(); }catch(e){ return false; } }

/* ---------------- percentile helpers (same curve as the rest of the app) ---------------- */
function estPct(marks){
  if(typeof mnEstPercentile==="function") return mnEstPercentile(Math.max(0,marks)/300*100);
  var pct=Math.max(0,marks)/300*100, pts=[[0,0],[3.3,5],[6.7,15],[10,28],[14.3,45],[16.7,55],[20,65],[24,75],[29.3,85],[33.3,90],[40,94.6],[46.7,96.9],[53.3,98.2],[66.7,99.42],[83.3,99.9],[95.3,99.99],[100,100]];
  for(var i=0;i<pts.length-1;i++){ if(pct<=pts[i+1][0]){ var a=pts[i],b=pts[i+1]; return a[1]+(pct-a[0])/(b[0]-a[0])*(b[1]-a[1]); } } return 100;
}
function estAIR(marks){ return Math.max(1, Math.round((100-estPct(marks))/100*1100000)); }
function marksForAIR(air){ for(var m=0;m<=300;m++){ if(estAIR(m)<=air) return m; } return 300; }

/* ---------------- DOM ---------------- */
function ensureDom(){
  var content=document.querySelector("#shell .content");
  if(content && !$("sec-crash")){ var s=document.createElement("section"); s.id="sec-crash"; s.className="hidden"; var bn=content.querySelector(".banner"); if(bn && bn.parentNode===content) content.insertBefore(s, bn.nextSibling); else content.insertBefore(s, content.firstChild); }
  if(!$("crashIntro")){
    var w=document.createElement("div");
    w.innerHTML='<div id="crashIntro" class="hidden"></div><div id="crashScreen" class="hidden cr-protect"></div><div id="crashResult" class="hidden cr-protect"></div>';
    while(w.firstChild) document.body.appendChild(w.firstChild);
  }
}
function show(id){
  ["crashIntro","crashScreen","crashResult"].forEach(function(s){ var el=$(s); if(el) el.classList.add("hidden"); });
  if(id==="shell"){ if(typeof view==="function") view("shell"); return; }
  if(typeof view==="function"){ try{ view(id); }catch(e){} }
  ["loadingScreen","authScreen","shell","testScreen","resultsScreen","advScreen","advResults","mainsScreen","mnResults","savedReviewScreen"].forEach(function(s){ var el=$(s); if(el) el.classList.add("hidden"); });
  $(id).classList.remove("hidden"); window.scrollTo(0,0);
}

/* ---------------- API (real server, or local demo for previews) ---------------- */
function api(action, data){
  if(window.CRASH_DEMO) return demoApi(action, data||{});
  data=data||{}; data.action=action;
  if(!(typeof USE_FIREBASE!=="undefined" && USE_FIREBASE && fbAuth && fbAuth.currentUser)) return Promise.reject(new Error("Please log in to use the Crash Course."));
  return fbAuth.currentUser.getIdToken().then(function(tok){
    return fetch("/api/crash",{ method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok}, body:JSON.stringify(data) });
  }).then(function(r){ return r.json().then(function(d){ if(!r.ok){ var e=new Error(d.error||"Something went wrong."); e.data=d; e.status=r.status; throw e; } return d; }); });
}

/* ---- shared scoring (mirror of /api/crash) — used only by the demo preview ---- */
function numEq(a,b){ var x=parseFloat(a),y=parseFloat(b); if(isNaN(x)||isNaN(y)) return false; return Math.abs(x-y)<=Math.max(0.011,0.002*Math.abs(y)); }
function mistakeOf(q,k,p){
  if(q.t==="MCQ"){ var tag=(k.tags||[])[p]; if(!tag) return {cat:"other",why:""}; var i=tag.indexOf("|"); return {cat:i>0?tag.slice(0,i):"other", why:i>0?tag.slice(i+1):tag}; }
  var tr=k.traps||[]; for(var j=0;j<tr.length;j++){ var m=tr[j].match(/\(([-\d.]+)\)\s*$/); if(m && numEq(p,m[1])){ var c=tr[j].indexOf("|"); return {cat:c>0?tr[j].slice(0,c):"other", why:c>0?tr[j].slice(c+1):tr[j]}; } }
  return {cat:"other",why:""};
}
function scoreLocal(paper,key,picks,times){
  var r={marks:0,correct:0,wrong:0,blank:0,subjects:{},chapters:{},mistakes:{},perQ:[]};
  paper.forEach(function(q,i){ var k=key[i],p=picks[i],t=Math.max(0,+(times&&times[i])||0);
    var s=r.subjects[q.s]||(r.subjects[q.s]={marks:0,correct:0,wrong:0,blank:0,time:0});
    var c=r.chapters[q.s+"|"+q.ch]||(r.chapters[q.s+"|"+q.ch]={s:q.s,ch:q.ch,lost:0,n:0}); c.n++; s.time+=t;
    var blank=(p===null||p===undefined||p===""), ok=false, mk=0, mis=null;
    if(blank){ r.blank++; s.blank++; c.lost+=4; }
    else { ok = q.t==="MCQ" ? (+p===+k.a) : numEq(p,k.a);
      if(ok){ mk=4; r.correct++; s.correct++; } else { mk=-1; r.wrong++; s.wrong++; c.lost+=5; mis=mistakeOf(q,k,p); r.mistakes[mis.cat]=(r.mistakes[mis.cat]||0)+1; } }
    r.marks+=mk; s.marks+=mk; r.perQ.push({p:blank?null:p,ok:ok,mk:mk,t:t,cat:mis?mis.cat:null,why:mis?mis.why:null,d:k.d});
  });
  return r;
}
var DEMO={attempts:{},progress:{}};
function demoHist(mock){ var h=new Array(376).fill(0),n=0,sum=0; for(var i=0;i<240;i++){ var m=Math.round(95+52*Math.sin(i*12.9898+mock.length)*Math.cos(i*4.1414)+(i%7)*6); m=Math.max(-20,Math.min(285,m)); h[m+75]++; n++; sum+=m; } return {n:n,sum:sum,hist:h}; }
function rankFromHist(st,marks){ var idx=Math.max(0,Math.min(375,Math.round(marks)+75)),above=0,below=0; for(var i=0;i<376;i++){ if(i>idx) above+=st.hist[i]||0; else if(i<idx) below+=st.hist[i]||0; } return {rank:above+1,of:st.n,pctile:st.n>1?Math.round(10000*below/(st.n-1))/100:100,avg:Math.round(10*st.sum/st.n)/10}; }
function demoApi(action,d){
  var D=window.CRASH_DEMO_DATA||{mocks:{},ids:[]};
  return new Promise(function(ok,bad){ setTimeout(function(){
    if(action==="content"){ var c=(D.content||{})[d.id]; return c?ok(c):bad(new Error("This part is not live yet.")); }
    if(action==="list") return ok({content:Object.keys(D.content||{}),enrolled:!!window.CRASH_DEMO_ENROLLED, bought:!!window.CRASH_DEMO_ENROLLED, expired:false, validUntil:CR.validUntil, total:100, ids:D.ids, attempts:DEMO.attempts, running:{}, free:[], now:Date.now()});
    var m=D.mocks[d.mock];
    if(action==="start"){ if(!m) return bad(Object.assign(new Error("This preview contains only a few sample mocks."),{status:404})); if(DEMO.attempts[d.mock]) return bad(Object.assign(new Error("You have already submitted this mock."),{status:409})); var st=DEMO.progress[d.mock]||(DEMO.progress[d.mock]=Date.now()); return ok({mock:d.mock,title:m.title,qs:m.paper,startedAt:st,endAt:st+10800000,now:Date.now()}); }
    if(action==="submit"){ var r=scoreLocal(m.paper,m.key,d.picks,d.times); var st2=demoHist(d.mock); st2.hist[r.marks+75]++; st2.n++; st2.sum+=r.marks; r.rank=rankFromHist(st2,r.marks); r.mock=d.mock; r.at=Date.now(); DEMO.attempts[d.mock]={marks:r.marks,correct:r.correct,wrong:r.wrong,blank:r.blank,at:r.at,subjects:r.subjects,mistakes:r.mistakes,full:r}; return ok({attempt:r,key:m.key,qs:m.paper}); }
    if(action==="review"){ var a=DEMO.attempts[d.mock]; if(!a) return bad(new Error("Attempt this mock first.")); return ok({attempt:a.full,key:m.key,qs:m.paper}); }
    bad(new Error("Unknown"));
  }, 250); });
}

/* ---------------- load + dashboard ---------------- */
function load(force){
  if(CR.list && !force) return Promise.resolve(CR.list);
  return api("list").then(function(d){ CR.list=d; return d; });
}
window.crashRender=function(){
  ensureDom(); var host=$("sec-crash"); if(!host) return;
  if(typeof curSec==="undefined" || curSec==="crash") host.classList.remove("hidden");
  if(!CR.list) host.innerHTML='<div class="coming"><div class="ic">⏳</div><b>Loading your Crash Course…</b></div>';
  load(true).then(renderDash).catch(function(e){ host.innerHTML='<div class="coming"><div class="ic">⚠️</div><b>'+esc(e.message)+'</b><p style="margin-top:8px"><button class="btn" onclick="crashRender()">Try again</button></p></div>'; });
};
function attemptsSorted(){ var a=CR.list.attempts||{}; return Object.keys(a).map(function(k){ var o=a[k]; o.mock=k; return o; }).sort(function(x,y){ return x.at-y.at; }); }
function todayIndex(){ var P=window.CRASH_PLAN; if(!P) return -1; var s=new Date(P.start+"T00:00:00+05:30").getTime(); return Math.floor((Date.now()-s)/86400000); }
function nextMock(){
  var L=CR.list, ids=L.ids||[], att=L.attempts||{};
  var run=Object.keys(L.running||{}); if(run.length) return {id:run[0], running:true};
  var P=window.CRASH_PLAN, ti=todayIndex();
  if(P){ for(var i=Math.max(0,ti);i<P.days.length;i++){ var dd=P.days[i]; if(dd.type==="mock"){ var id=mid(dd.mock); if(!att[id] && ids.indexOf(id)>=0) return {id:id, day:dd}; } } }
  for(var j=0;j<ids.length;j++){ if(!att[ids[j]]) return {id:ids[j]}; }
  return null;
}
function renderDash(){
  var host=$("sec-crash"), L=CR.list;
  if(!L.enrolled){ host.innerHTML=salesHTML(L); typeset(host); return; }
  var at=attemptsSorted(), done=at.length, ids=L.ids||[];
  var avg=done?Math.round(at.reduce(function(s,a){ return s+a.marks; },0)/done):null;
  var best=done?Math.max.apply(null,at.map(function(a){ return a.marks; })):null;
  var dExam=daysTo(CR.examFirstDay), dEnd=Math.ceil((CR.validUntil-Date.now())/86400000);
  var circ=2*Math.PI*48, frac=done/100;
  var nx=nextMock(), P=window.CRASH_PLAN, ti=todayIndex(), today=(P && ti>=0 && ti<P.days.length)?P.days[ti]:null;
  var h='<div class="cr-wrap">';
  if(window.CRASH_DEMO) h+='<div class="gate-banner" style="border-radius:12px">👀 Preview mode — sample data, nothing is saved.</div>';
  h+='<div class="cr-hero"><div class="cr-hero-in"><div><span class="cr-tag">🔥 JEE Main · January 2027 · Crash Course</span>'+
     '<h2>'+(today?('Day '+today.d+' of 60 — '+dayTitle(today)):(ti<0?'Your 60-day plan starts on 21 Nov':'Plan complete — exam time. You\'ve got this.'))+'</h2>'+
     '<p>'+(dExam>0?('<span class="cr-days">'+dExam+' days</span> to the first JEE Main paper (20 Jan, as per NTA). '):'')+'Access till <b>31 Jan 2027</b>'+(dEnd>0?(' · '+dEnd+' days left'):'')+'.</p></div>'+
     '<div class="cr-ring"><svg viewBox="0 0 116 116"><circle cx="58" cy="58" r="48" fill="none" stroke="#1b2333" stroke-width="10"/><circle cx="58" cy="58" r="48" fill="none" stroke="#f97316" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+circ+'" stroke-dashoffset="'+(circ*(1-frac))+'"/></svg><div class="t"><div><b>'+done+'</b><span>of 100 mocks</span></div></div></div></div></div>';
  h+='<div class="cr-stats">'+
     stat("Mocks taken",done,ids.length+" live now")+
     stat("Average score",avg==null?"—":avg,"out of 300")+
     stat("Best score",best==null?"—":best,"out of 300")+
     stat("Est. percentile",avg==null?"—":estPct(avg).toFixed(1),"from your average")+'</div>';
  if(nx){
    var n=mnum(nx.id);
    h+='<div class="cr-next"><div><h3>'+(nx.running?'⏸ Resume Mock '+n:'Next up: Mock '+n)+'</h3><p>'+(nx.running?'Your timer is still running — continue where you left off.':(nx.day?('Day '+nx.day.d+' of your plan · '+level(n)[0]):level(n)[0])+' · 75 questions · 3 hours · +4 / −1')+'</p></div>'+
       '<button class="btn" onclick="crashOpen(\''+nx.id+'\')">'+(nx.running?'Resume →':'Start Mock '+n+' →')+'</button></div>';
  }
  h+='<div class="cr-row2"><div class="cr-box"><h4>Your score trend <small>'+(done?done+' mock'+(done>1?'s':''):'')+'</small></h4>'+(done>=2?spark(at):'<div class="cr-empty">Take two mocks to see your trend line.</div>')+'</div>'+
     '<div class="cr-box"><h4>Why you lose marks <small>all mocks</small></h4>'+mistakeBars(at)+'</div></div>';
  h+='<div class="cr-tabs">'+tabBtn("mocks","📝 Mocks")+tabBtn("plan","🗓️ 60-day plan")+tabBtn("weight","📊 PYQ weightage")+tabBtn("more","⚡ Notes & strategy")+'</div><div id="crTab"></div>';
  if(isOwner()) h+=ownerHTML();
  h+='</div>';
  host.innerHTML=h; renderTab();
}
function dayTitle(dd){ if(dd.type==="mock") return dd.final?'Final full mock (Mock '+dd.mock+')':'Mock '+dd.mock+' + revision'; if(dd.type==="review") return 'Review day — fix this week\'s mistakes'; if(dd.type==="light") return 'Light revision only'; return 'Rest & exam prep'; }
function stat(k,v,s){ return '<div class="cr-stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="s">'+s+'</div></div>'; }
function tabBtn(k,l){ return '<button class="cr-tab'+(CR.tab===k?' on':'')+'" onclick="crashTab(\''+k+'\')">'+l+'</button>'; }
window.crashTab=function(k){ disarm(); CR.tab=k; var b=document.querySelectorAll(".cr-tab"); for(var i=0;i<b.length;i++) b[i].classList.toggle("on", b[i].getAttribute("onclick").indexOf("'"+k+"'")>0); renderTab(); };
function renderTab(){ var el=$("crTab"); if(!el) return; el.innerHTML = CR.tab==="plan"?planHTML():CR.tab==="weight"?weightHTML():CR.tab==="more"?moreHTML():mocksHTML(); typeset(el); }
function spark(at){
  var W=520,H=120,p=14, xs=at.map(function(_,i){ return p+i*(W-2*p)/Math.max(1,at.length-1); }), mx=300, mn=Math.min(0,Math.min.apply(null,at.map(function(a){ return a.marks; })));
  var y=function(v){ return H-p-(v-mn)/(mx-mn)*(H-2*p); };
  var pts=at.map(function(a,i){ return xs[i].toFixed(1)+","+y(a.marks).toFixed(1); }).join(" ");
  var dots=at.map(function(a,i){ return '<circle cx="'+xs[i].toFixed(1)+'" cy="'+y(a.marks).toFixed(1)+'" r="3.5" fill="#f97316"><title>Mock '+mnum(a.mock)+': '+a.marks+'</title></circle>'; }).join("");
  return '<svg class="cr-spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><line x1="'+p+'" x2="'+(W-p)+'" y1="'+y(150)+'" y2="'+y(150)+'" stroke="#293349" stroke-dasharray="4 4"/><text x="'+(W-p)+'" y="'+(y(150)-4)+'" fill="#64748b" font-size="10" text-anchor="end">150</text><polyline points="'+pts+'" fill="none" stroke="#f97316" stroke-width="2.5"/>'+dots+'</svg>';
}
function mistakeBars(at){
  var tot={}, n=0; at.forEach(function(a){ var m=a.mistakes||{}; Object.keys(m).forEach(function(k){ tot[k]=(tot[k]||0)+m[k]; n+=m[k]; }); });
  if(!n) return '<div class="cr-empty">After your first mock, this shows which kind of mistake costs you most.</div>';
  var ks=Object.keys(tot).sort(function(a,b){ return tot[b]-tot[a]; }), mx=tot[ks[0]];
  var h=ks.map(function(k){ var c=CAT[k]||CAT.other; return '<div class="cr-bar"><span>'+c[0]+'</span><span class="tr"><i style="width:'+Math.round(100*tot[k]/mx)+'%;background:'+c[1]+'"></i></span><span class="n">'+tot[k]+'</span></div>'; }).join("");
  var top=CAT[ks[0]]||CAT.other;
  return h+'<div class="rr-tip" style="margin-top:8px">Biggest leak: <b>'+top[0]+'</b> — '+tipFor(ks[0])+'</div>';
}
function tipFor(k){ return ({concept:"revise the chapter idea before practising more questions.",formula:"rewrite the formula sheet for that chapter and recall it daily.",calculation:"slow down on the last step and recheck arithmetic.",sign:"draw a diagram and fix a sign convention before solving.",unit:"convert all units to SI before substituting.",reading:"underline what is asked (NOT, except, ratio, in cm…) before solving.",other:"review these questions one by one."})[k]||""; }

/* ---------------- mocks grid ---------------- */
function mocksHTML(){
  var L=CR.list, ids=L.ids||[], at=L.attempts||{}, run=L.running||{}, f=CR.mfilter||"all";
  var h='<div class="cr-filter">'+["all","todo","done"].map(function(k){ return '<button class="cr-chip'+(f===k?' on':'')+'" onclick="CR.mfilter=\''+k+'\';renderCrTab()">'+({all:"All 100",todo:"Not attempted",done:"Attempted"})[k]+'</button>'; }).join("")+'</div><div class="cr-grid">';
  for(var n=1;n<=100;n++){
    var id=mid(n), live=ids.indexOf(id)>=0, a=at[id], lv=level(n);
    if(f==="todo" && (a||!live)) continue; if(f==="done" && !a) continue;
    if(a) h+='<div class="cr-mk done"><span class="lv" style="color:'+lv[1]+'">'+lv[0]+'</span><span class="no">Mock '+n+'</span><span class="sc"><b>'+a.marks+'</b> / 300</span><button class="btn btn-outline" onclick="crashReview(\''+id+'\')">View analysis</button></div>';
    else if(run[id]) h+='<div class="cr-mk run"><span class="lv" style="color:#fbbf24">In progress</span><span class="no">Mock '+n+'</span><span class="sc">'+fmt(run[id]-Date.now())+' left</span><button class="btn" onclick="crashOpen(\''+id+'\')">Resume</button></div>';
    else if(live) h+='<div class="cr-mk"><span class="lv" style="color:'+lv[1]+'">'+lv[0]+'</span><span class="no">Mock '+n+'</span><span class="sc">75 Q · 3 hrs</span><button class="btn" onclick="crashOpen(\''+id+'\')">Start</button></div>';
    else h+='<div class="cr-mk soon"><span class="lv" style="color:var(--dim)">'+lv[0]+'</span><span class="no">Mock '+n+' 🔒</span><span class="sc">Unlocks before the exam</span></div>';
  }
  return h+'</div>';
}
window.renderCrTab=renderTab;

/* ---------------- 60-day plan ---------------- */
function planDone(){ try{ return JSON.parse(localStorage.getItem("crplan_"+uidKey())||"[]"); }catch(e){ return []; } }
window.crashPlanTick=function(d,el){
  var a=planDone(), i=a.indexOf(d); if(el.checked && i<0) a.push(d); if(!el.checked && i>=0) a.splice(i,1);
  try{ localStorage.setItem("crplan_"+uidKey(), JSON.stringify(a)); }catch(e){}
  try{ if(typeof USE_FIREBASE!=="undefined" && USE_FIREBASE && fbDB && currentUser) fbDB.collection("users").doc(currentUser).set({crashPlanDone:a},{merge:true}).catch(function(){}); }catch(e){}
};
function planHTML(){
  var P=window.CRASH_PLAN; if(!P) return '<div class="coming">Plan unavailable.</div>';
  var ti=todayIndex(), dn=planDone(), at=CR.list.attempts||{}, ids=CR.list.ids||[];
  var h='<div class="cr-box" style="margin-bottom:12px"><h4>How the plan works</h4><p style="color:var(--muted);font-size:13.5px">One full mock a day at your exam shift time (9 AM or 3 PM), then 60–90 minutes fixing its mistakes, then one high-weightage chapter per subject. Every 7th day is a review day. The last two days are deliberately light. <b style="color:#fde68a">Joined late?</b> Start from today\'s row — don\'t try to clear old days; the mocks you skip become your extra mocks.</p></div>';
  var weeks={};
  P.days.forEach(function(dd){ var w=Math.ceil(dd.d/7); (weeks[w]=weeks[w]||[]).push(dd); });
  Object.keys(weeks).forEach(function(w){
    h+='<h4 style="margin:16px 0 8px;font-size:14px;color:var(--muted)">WEEK '+w+' · '+weeks[w][0].ph.toUpperCase()+'</h4><div style="display:grid;gap:8px">';
    weeks[w].forEach(function(dd){
      var isT=(dd.d-1===ti), dt=new Date(dd.date+"T00:00:00+05:30").toLocaleDateString("en-IN",{day:"numeric",month:"short",weekday:"short"});
      var body="", act="";
      if(dd.type==="mock"){
        var id=mid(dd.mock), a=at[id], live=ids.indexOf(id)>=0;
        body='<b>'+(dd.final?'Final full mock — take it at your exact exam shift time':'Mock '+dd.mock)+'</b> · '+level(dd.mock)[0]+'<br><span style="color:var(--muted)">Then fix every wrong &amp; skipped question. Revise: ⚡ '+esc(dd.rev[0])+' · ✏️ '+esc(dd.rev[1])+' · 📐 '+esc(dd.rev[2])+'</span>';
        act = a ? '<button class="btn btn-outline" style="padding:7px 12px;font-size:12.5px" onclick="crashReview(\''+id+'\')">'+a.marks+'/300 ✓</button>' : (live ? '<button class="btn" style="padding:7px 12px;font-size:12.5px" onclick="crashOpen(\''+id+'\')">Start</button>' : '<span style="font-size:12px;color:var(--dim)">Unlocks soon</span>');
      } else if(dd.type==="review"){ body='<b>Review day — no new mock</b><br><span style="color:var(--muted)">Re-solve every question you got wrong this week without looking at solutions. Check “Why you lose marks” and pick ONE mistake type to fix next week. Revise formula sheets of this week\'s chapters.</span>'; }
      else if(dd.type==="light"){ body='<b>Light revision only</b><br><span style="color:var(--muted)">Your own mistake list + formula sheets. No new hard questions after 6 PM.</span>'; }
      else { body='<b>Rest &amp; exam prep</b><br><span style="color:var(--muted)">Check admit card, centre route and documents. Sleep early. Your preparation is done.</span>'; }
      h+='<div class="cr-box" style="display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:12px 14px;'+(isT?'border-color:var(--orange);background:rgba(249,115,22,.07)':'')+'">'+
         '<input type="checkbox" '+(dn.indexOf(dd.d)>=0?'checked':'')+' onchange="crashPlanTick('+dd.d+',this)" style="width:18px;height:18px;accent-color:#f97316">'+
         '<div style="font-size:13.5px"><div style="font-size:11.5px;color:'+(isT?'#fb923c':'var(--dim)')+';font-weight:800">DAY '+dd.d+' · '+dt+(isT?' · TODAY':'')+'</div>'+body+'</div><div>'+act+'</div></div>';
    });
    h+='</div>';
  });
  h+='<div class="cr-box" style="margin-top:16px"><h4>Extra mocks <small>for spare time or the days between your plan and your exam</small></h4><p style="color:var(--muted);font-size:13.5px">'+P.extra.map(function(n){ return 'Mock '+n; }).join(" · ")+'</p></div>';
  return h;
}

/* ---------------- PYQ weightage ---------------- */
function weightHTML(){
  var W=window.CRASH_WEIGHT; if(!W) return '<div class="coming">Weightage unavailable.</div>';
  var rows=W.subjects[CR.wsub], tot=W.perSubject, mx=rows[0].n;
  var h='<div class="cr-filter">'+SUBS.map(function(s){ return '<button class="cr-chip'+(CR.wsub===s?' on':'')+'" onclick="CR.wsub=\''+s+'\';renderCrTab()">'+s+'</button>'; }).join("")+'</div>';
  h+='<div class="cr-box"><h4>'+CR.wsub+' — questions asked in JEE Main 2026 <small>'+tot+' questions · '+W.papers+' shifts</small></h4>';
  h+='<table class="rr-table"><tr><th>Chapter</th><th style="width:38%"></th><th>Questions</th><th>Per paper</th><th>Priority</th></tr>';
  rows.forEach(function(r){
    var pc=100*r.n/tot, pr=pc>=6?["Top","#f97316"]:pc>=4?["High","#fbbf24"]:pc>=2?["Medium","#38bdf8"]:["Low","#64748b"];
    h+='<tr title="'+esc(r.parts.map(function(p){ return p[0]+": "+p[1]; }).join(" · "))+'"><td>'+esc(r.ch)+(r.parts.length>1?'<div style="font-size:11px;color:var(--dim)">'+esc(r.parts.map(function(p){ return p[0]+" "+p[1]; }).join(" · "))+'</div>':'')+'</td>'+
       '<td><span class="tr" style="display:block;height:8px;border-radius:99px;background:#1b2333;overflow:hidden"><i style="display:block;height:100%;width:'+Math.round(100*r.n/mx)+'%;background:'+pr[1]+'"></i></span></td>'+
       '<td><b>'+r.n+'</b> <span style="color:var(--dim)">('+pc.toFixed(1)+'%)</span></td><td>≈'+(r.n/W.papers).toFixed(1)+'</td><td><span class="cr-cat" style="background:'+pr[1]+'22;color:'+pr[1]+'">'+pr[0]+'</span></td></tr>';
  });
  h+='</table><div class="rr-note">'+esc(W.source)+'. Counts are grouped into this course\'s chapters. Past weightage guides priority — it does not guarantee what will be asked.</div></div>';
  return h;
}

/* ---------------- notes & strategy ---------------- */
var NOTE_ID={Physics:"notes_physics",Chemistry:"notes_chemistry",Mathematics:"notes_mathematics"};
CR.content={}; CR.nsub="Physics";
function hasC(id){ return (CR.list && CR.list.content || []).indexOf(id)>=0; }
function getC(id){ if(CR.content[id]) return Promise.resolve(CR.content[id]); return api("content",{id:id}).then(function(d){ CR.content[id]=d; return d; }); }
function quickGuide(){
  return '<div class="cr-box" style="margin-top:12px"><h4>Quick strategy guide <small>use it from your next mock</small></h4><ol style="padding-left:20px;display:grid;gap:8px;font-size:14px;color:#cbd5e1">'+
    '<li><b>Three rounds, not one pass.</b> Round 1: everything you can solve in under 2 minutes. Round 2: the longer ones you know. Round 3: only if you can eliminate options.</li>'+
    '<li><b>Time split.</b> Start with your strongest subject, but cap each subject near 60 minutes on the first pass.</li>'+
    '<li><b>Negative marking.</b> Guess only after ruling out at least two options.</li>'+
    '<li><b>Numericals also carry −1.</b> Don\'t type a number you haven\'t worked out.</li>'+
    '<li><b>Last 10 minutes.</b> No new questions — recheck marked answers and numericals.</li></ol></div>';
}
function moreHTML(){
  var h='', L=hasC("lessons");
  h+='<div class="cr-box"><h4>🧠 Exam strategy lessons <small>'+(L?'8 short lessons · read in order':'unlocking soon')+'</small></h4>';
  if(L){ h+='<div id="crLessons" class="cr-empty">Loading…</div>'; } else h+='<div class="cr-empty">Lessons on attempt order, time split, guessing, numericals and recovery are being added.</div>';
  h+='</div>';
  var subs=SUBS.filter(function(s){ return hasC(NOTE_ID[s]); });
  h+='<div class="cr-box" style="margin-top:12px"><h4>⚡ Short notes &amp; formula sheets <small>ordered by PYQ weightage</small></h4>';
  if(subs.length){
    if(subs.indexOf(CR.nsub)<0) CR.nsub=subs[0];
    h+='<div class="cr-filter">'+SUBS.map(function(s){ var on=hasC(NOTE_ID[s]); return '<button class="cr-chip'+(CR.nsub===s?' on':'')+'"'+(on?' onclick="CR.nsub=\''+s+'\';renderCrTab()"':' disabled style="opacity:.45"')+'>'+s+(on?'':' · soon')+'</button>'; }).join("")+'</div><div id="crNotes" class="cr-empty">Loading…</div>';
  } else h+='<div class="cr-empty">Chapter-wise formulas, key results and traps for all three subjects are being added.</div>';
  h+='</div>';
  if(!L) h+=quickGuide();
  setTimeout(fillMore,0);
  return h;
}
function fillMore(){
  if(hasC("lessons") && $("crLessons")) getC("lessons").then(function(d){ var el=$("crLessons"); if(!el) return; el.className=""; el.innerHTML='<div class="cr-mat">'+d.items.map(function(l,i){ return '<div class="cr-mi" style="cursor:pointer" onclick="crashRead(\'lessons\','+i+')"><div class="ic">'+(i+1)+'</div><div><h5>'+esc(l.t)+'</h5><p>'+esc(l.why)+'</p><span class="st" style="color:var(--muted)">'+l.m+' min read →</span></div></div>'; }).join("")+'</div>'; }).catch(function(e){ var el=$("crLessons"); if(el) el.textContent=e.message; });
  var id=NOTE_ID[CR.nsub];
  if(hasC(id) && $("crNotes")) getC(id).then(function(d){ var el=$("crNotes"); if(!el) return;
    var W=(window.CRASH_WEIGHT&&CRASH_WEIGHT.subjects[CR.nsub])||[], rank={}; W.forEach(function(r,i){ rank[r.ch]=i; });
    var items=d.items.map(function(n,i){ return {n:n,i:i}; }).sort(function(a,b){ return (rank[a.n.ch]==null?99:rank[a.n.ch])-(rank[b.n.ch]==null?99:rank[b.n.ch]); });
    el.className=""; el.innerHTML='<div class="cr-grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">'+items.map(function(x,k){ var w=W[rank[x.n.ch]]; return '<div class="cr-mk" style="min-height:0;cursor:pointer" onclick="crashRead(\''+id+'\','+x.i+')"><span class="lv" style="color:'+(k<6?'#fb923c':'var(--dim)')+'">'+(k<6?'High weightage':'Chapter')+(w?' · '+w.n+' Qs in 2026':'')+'</span><span class="no">'+esc(x.n.ch)+'</span><span class="sc">'+x.n.f.length+' formulas · '+x.n.t.length+' traps</span></div>'; }).join("")+'</div>'; typeset(el);
  }).catch(function(e){ var el=$("crNotes"); if(el) el.textContent=e.message; });
}
window.crashRead=function(id,i){
  var el=$("crTab"); if(!el) return; el.innerHTML='<div class="cr-empty">Loading…</div>';
  getC(id).then(function(d){
    var it=d.items[i], h='<div class="cr-box" style="position:relative;overflow:hidden">'+wmHTML()+'<div style="position:relative;z-index:4">';
    var nav='<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn btn-outline" style="padding:7px 12px;font-size:13px" onclick="crashCloseRead()">← All notes &amp; lessons</button><span>'+
      (i>0?'<button class="btn btn-outline" style="padding:7px 12px;font-size:13px" onclick="crashRead(\''+id+'\','+(i-1)+')">‹ Prev</button> ':'')+
      (i<d.items.length-1?'<button class="btn" style="padding:7px 12px;font-size:13px" onclick="crashRead(\''+id+'\','+(i+1)+')">Next ›</button>':'')+'</span></div>';
    h+=nav;
    if(d.kind==="lessons"){
      h+='<div style="font-size:12px;color:var(--dim);font-weight:800">LESSON '+(i+1)+' OF '+d.items.length+' · '+it.m+' MIN</div><h3 style="font-size:22px;margin:6px 0 10px">'+esc(it.t)+'</h3><div class="rr-tip" style="margin:0 0 14px">'+it.why+'</div>'+
        it.secs.map(function(s){ return '<h4 style="font-size:15.5px;margin:14px 0 6px">'+esc(s.h)+'</h4><ul style="padding-left:20px;display:grid;gap:6px;color:#cbd5e1;font-size:14.5px">'+s.p.map(function(p){ return '<li>'+p+'</li>'; }).join("")+'</ul>'; }).join("")+
        '<div class="rr-tip" style="margin-top:16px;border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.08)">✍️ <b>Try this:</b> '+it.try+'</div>';
    } else {
      h+='<div style="font-size:12px;color:var(--dim);font-weight:800">'+esc(d.subject).toUpperCase()+' · SHORT NOTES</div><h3 style="font-size:22px;margin:6px 0 10px">'+esc(it.ch)+'</h3>'+
        '<h4 style="font-size:15.5px;margin:12px 0 6px">📌 Key formulas &amp; results</h4><ul style="padding-left:20px;display:grid;gap:8px;font-size:14.5px;line-height:1.75">'+it.f.map(function(x){ return '<li>'+x+'</li>'; }).join("")+'</ul>'+
        '<h4 style="font-size:15.5px;margin:16px 0 6px;color:#fca5a5">⚠️ Common traps</h4><ul style="padding-left:20px;display:grid;gap:6px;font-size:14.5px;color:#cbd5e1">'+it.t.map(function(x){ return '<li>'+x+'</li>'; }).join("")+'</ul>'+
        '<h4 style="font-size:15.5px;margin:16px 0 6px;color:#4ade80">🎯 JEE tips</h4><ul style="padding-left:20px;display:grid;gap:6px;font-size:14.5px;color:#cbd5e1">'+it.j.map(function(x){ return '<li>'+x+'</li>'; }).join("")+'</ul>';
    }
    h+='<div style="margin-top:16px">'+nav+'</div></div></div>';
    el.innerHTML=h; typeset(el); arm(false); el.scrollIntoView({behavior:"smooth",block:"start"});
  }).catch(function(e){ el.innerHTML='<div class="cr-empty">'+esc(e.message)+'</div>'; });
};
window.crashCloseRead=function(){ disarm(); renderTab(); var el=$("crTab"); if(el) el.scrollIntoView({block:"start"}); };

/* ---------------- sales (not enrolled) ---------------- */
function salesHTML(L){
  if(L.bought && L.expired) return '<div class="coming"><div class="ic">🏁</div><b>The JEE Main Jan 2027 Crash Course ended on 31 January 2027.</b><p style="margin-top:6px">Thank you for preparing with Dakhilaa. All the best for your results!</p></div>';
  var closed=Date.now()>CR.validUntil;
  return '<div class="cr-sales">'+
    '<div class="cr-hero"><div class="cr-hero-in" style="grid-template-columns:1fr"><div><span class="cr-tag">🔥 New · JEE Main January 2027</span><h2>Make exam day feel like your 101st attempt.</h2><p>100 full-length original mocks, analysis that shows why every mark slipped away, and a plan that already knows what you should do tomorrow.</p></div></div></div>'+
    '<div class="cr-bens">'+
      '<div class="cr-ben">🎯<b>The real paper stops scaring you</b><span>Same pattern, same clock, same pressure — 100 times.</span></div>'+
      '<div class="cr-ben">🔍<b>Stop repeating the same mistakes</b><span>Every wrong option tells you which mistake you made.</span></div>'+
      '<div class="cr-ben">🗓️<b>Never wonder what to study</b><span>A 60-day plan with one mock and three chapters a day.</span></div></div>'+
    '<div class="cr-box"><h4>What you get</h4><div style="display:grid;gap:6px;font-size:14px">'+
      '<div>✅ 100 full-length JEE Main mocks — 7,500 original questions <span style="color:var(--dim)">('+((L.ids||[]).length||60)+' live now, the rest unlock before the exam)</span></div>'+
      '<div>✅ Score, course rank, estimated percentile &amp; AIR, marks gap to the next rank band</div>'+
      '<div>✅ Mistake-reason analysis, chapter-wise marks lost, time analysis and full solutions</div>'+
      '<div>✅ 60-day study plan · ✅ PYQ chapter weightage (JEE Main 2026, all 19 shifts)</div>'+
      '<div>✅ Short notes &amp; formula sheets for all 67 chapters · ✅ 8 exam strategy lessons</div></div></div>'+
    '<div class="cr-buy"><div><div class="amt">'+CR.price+' <small>one-time</small></div><div style="color:var(--muted);font-size:13px">Access till 31 January 2027, 11:59 PM — then the course closes automatically.</div></div>'+
      (closed?'<button class="btn" disabled>Enrolment closed</button>':'<button class="btn" style="padding:14px 26px" onclick="crashBuy()">Join the Crash Course →</button>')+'</div></div>';
}

/* ---------------- payment ---------------- */
window.crashBuy=function(){
  if(window.CRASH_DEMO){ window.CRASH_DEMO_ENROLLED=true; CR.list=null; toast("🎉 (Preview) Crash Course unlocked."); crashRender(); return; }
  if(Date.now()>CR.validUntil){ toast("The Crash Course has ended.", true); return; }
  if(typeof currentProfile==="undefined" || !currentProfile){ window.pendingCourse=true; if(typeof view==="function") view("authScreen"); var n=$("auth_note"); if(n){ n.textContent="Create your account (or log in) to join the "+CR.name+" ("+CR.price+")."; n.classList.remove("hidden"); } if(typeof showSignup==="function") showSignup(); return; }
  if(typeof Razorpay==="undefined"){ toast("Payment system is still loading — please try again in a moment.", true); return; }
  if(CR.busy) return;
  if(typeof dkCheckout==="function"){ dkCheckout(CR.key, CR.name, 99900, crashPay); return; }
  var c0=""; try{ c0=localStorage.getItem("dk_coupon")||""; }catch(e){}
  crashPay(c0);
};
function crashPay(cpn){
  if(CR.busy) return; CR.busy=true;
  toast("Starting secure checkout…");
  var tokP=(typeof dkToken==="function")?dkToken():Promise.resolve("");
  tokP.then(function(tok){
    var h={"Content-Type":"application/json"}; if(tok) h["Authorization"]="Bearer "+tok;
    return fetch("/api/create-order",{ method:"POST", headers:h, body:JSON.stringify({ plan:CR.key, email:currentProfile.email, name:currentProfile.name, coupon:cpn||"" }) });
  })
   .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,d:d}; }); })
   .then(function(res){
     CR.busy=false;
     if(!res.ok){ toast((res.d&&res.d.error)||"Could not start payment. Please try again.", true); return; }
     var d=res.d;
     var rz=new Razorpay({ key:d.key_id, order_id:d.order_id, amount:d.amount, currency:d.currency||"INR", name:"Dakhilaa", description:CR.name,
       prefill:{ name:currentProfile.name||"", email:currentProfile.email||"", contact:(currentProfile.mobile||currentProfile.phone||"") }, theme:{ color:"#f97316" },
       handler:function(resp){ verifyBuy(resp); }, modal:{ ondismiss:function(){ toast("Payment cancelled — no money was charged.", true); } } });
     rz.on("payment.failed", function(e){ toast((e&&e.error&&e.error.description)||"Payment failed. No money was charged.", true); });
     rz.open();
   }).catch(function(){ CR.busy=false; toast("Network error starting payment. Please try again.", true); });
}
function verifyBuy(resp){
  toast("Verifying payment…");
  fbAuth.currentUser.getIdToken().then(function(tok){
    return fetch("/api/verify-payment",{ method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok}, body:JSON.stringify({ razorpay_order_id:resp.razorpay_order_id, razorpay_payment_id:resp.razorpay_payment_id, razorpay_signature:resp.razorpay_signature, plan:CR.key }) });
  }).then(function(r){ return r.json(); }).then(function(d){
    if(d && d.valid && d.planSet){
      CR.list=null; if(typeof go==="function") go("crash"); welcome();
    } else if(d && d.valid){ toast("Payment received ("+resp.razorpay_payment_id+") but activation is pending — please refresh in a minute or contact support@dakhilaa.com.", true); }
    else toast("Payment could not be verified. If money was deducted it will be auto-refunded — contact us with payment id "+resp.razorpay_payment_id, true);
  }).catch(function(){ toast("Couldn't verify payment. Please contact us with payment id "+(resp.razorpay_payment_id||""), true); });
}
function welcome(){
  var m=document.createElement("div"); m.className="cr-modal";
  m.innerHTML='<div class="in" style="text-align:center"><div style="font-size:44px">🎉</div><h3>You\'re in! Welcome to the Crash Course.</h3><p style="color:var(--muted);margin:8px 0 14px">Your 60-day plan is ready. Start with today\'s mock at your exam shift time, then open its analysis.</p><button class="btn" onclick="this.closest(\'.cr-modal\').remove()">Let\'s start →</button></div>';
  document.body.appendChild(m);
}

/* ---------------- instructions ---------------- */
window.crashOpen=function(id){
  ensureDom(); var n=mnum(id), resume=CR.list && CR.list.running && CR.list.running[id];
  var el=$("crashIntro");
  el.innerHTML='<div class="cr-intro"><button class="btn btn-outline" style="padding:8px 14px" onclick="crashBack()">← Back</button>'+
   '<h2 style="margin-top:16px">Mock '+n+' · JEE Main pattern</h2><div style="color:var(--muted)">'+level(n)[0]+' · 75 questions · 300 marks · 3 hours</div>'+
   '<div class="card"><table><tr><th>Subject</th><th>Section A (MCQ)</th><th>Section B (Numerical)</th><th>Marks</th></tr><tr><td>Physics</td><td>20</td><td>5</td><td>100</td></tr><tr><td>Chemistry</td><td>20</td><td>5</td><td>100</td></tr><tr><td>Mathematics</td><td>20</td><td>5</td><td>100</td></tr></table></div>'+
   '<div class="card"><b>Rules</b><ul style="margin-top:8px"><li>+4 for a correct answer, −1 for a wrong answer in <b>both</b> sections. Unanswered: 0.</li><li>The timer runs on our server. Closing the page does not stop it — you can resume within the 3 hours.</li><li>The paper is auto-submitted when time ends. Each mock can be submitted <b>once</b>; your first attempt sets your course rank.</li><li>Use “Mark for review” freely — answered questions that are marked are still evaluated.</li></ul></div>'+
   '<div class="card"><b>Question palette</b><div class="cr-legend" style="margin-top:10px"><span><i class="st-nv" style="width:18px;height:18px;border-radius:4px;display:inline-block"></i>Not visited</span><span><i class="st-na" style="width:18px;height:18px;border-radius:4px;display:inline-block"></i>Not answered</span><span><i class="st-a" style="width:18px;height:18px;border-radius:4px;display:inline-block"></i>Answered</span><span><i class="st-m" style="width:18px;height:18px;display:inline-block"></i>Marked for review</span><span style="grid-column:1/-1"><i class="st-am" style="width:18px;height:18px;display:inline-block;position:relative"></i>Answered &amp; marked (will be evaluated)</span></div></div>'+
   '<div class="card" style="border-color:rgba(239,68,68,.4)"><b>🔒 Exam integrity</b><ul style="margin-top:8px"><li>Questions can\'t be downloaded, copied or printed. Each screen carries a Dakhilaa watermark with your account ID.</li><li>Switching tabs or apps pauses the screen and is <b>counted</b>, like a real CBT.</li><li>Sharing the paper may lead to your access being removed without refund.</li></ul></div>'+
   '<label class="cr-agree"><input type="checkbox" id="crAgree"> I have read the instructions and will attempt this mock honestly in one sitting.</label>'+
   '<button class="btn btn-block" style="padding:14px" onclick="crashBegin(\''+id+'\')">'+(resume?'Resume Mock '+n+' →':'I am ready — begin Mock '+n+' →')+'</button></div>';
  show("crashIntro");
};
window.crashBack=function(){ disarm(); show("shell"); if(typeof go==="function") go("crash"); };

/* ---------------- exam engine ---------------- */
function saveKey(id){ return "crx_"+uidKey()+"_"+id; }
function persist(){ var X=CR.x; if(!X) return; try{ localStorage.setItem(saveKey(X.mock), JSON.stringify({picks:X.picks,mark:X.mark,vis:X.vis,times:X.times,cur:X.cur,flags:X.flags,endAt:X.endAt})); }catch(e){} }
window.crashBegin=function(id){
  var ag=$("crAgree"); if(ag && !ag.checked){ toast("Please tick the box to confirm you have read the instructions.", true); return; }
  toast("Loading your paper…");
  api("start",{mock:id}).then(function(d){
    var n=d.qs.length, sv=null; try{ sv=JSON.parse(localStorage.getItem(saveKey(id))||"null"); }catch(e){}
    if(sv && sv.endAt!==d.endAt) sv=null;
    CR.x={ mock:id, title:d.title||("Mock "+mnum(id)), qs:d.qs, endAt:d.endAt, skew:(d.now||Date.now())-Date.now(),
      picks:sv?sv.picks:new Array(n).fill(null), mark:sv?sv.mark:new Array(n).fill(false), vis:sv?sv.vis:new Array(n).fill(false), times:sv?sv.times:new Array(n).fill(0),
      cur:sv?sv.cur:0, flags:sv?sv.flags:{tabSwitch:0,blocked:0}, t0:Date.now(), submitting:false };
    buildExam(); arm(true); go2(CR.x.cur); tick(); CR.x.timer=setInterval(tick,1000); show("crashScreen");
  }).catch(function(e){
    if(e.status===409){ toast("You've already submitted this mock — opening your analysis."); crashReview(id); return; }
    if(e.data && e.data.expired && e.data.startedAt){ toast("Time for this attempt is over — submitting your saved answers."); var sv; try{ sv=JSON.parse(localStorage.getItem(saveKey(id))||"null"); }catch(x){} doSubmit(id, sv?sv.picks:[], sv?sv.times:[], sv?sv.flags:{}); return; }
    toast(e.message, true);
  });
};
function wmHTML(){
  // Brand + anonymous ID only — no name, email or phone on screen. The ID is the last
  // 6 characters of the student's account id, so a leaked screenshot can still be traced.
  var who="Dakhilaa · dakhilaa.com · ID "+uidKey().slice(-6).toUpperCase();
  var s=""; for(var r=0;r<9;r++) for(var c=0;c<3;c++) s+='<div style="top:'+(r*130+20)+'px;left:'+(c*340-60+(r%2)*150)+'px">'+esc(who)+'</div>';
  return '<div class="cr-wm">'+s+'</div>';
}
function buildExam(){
  var X=CR.x, p=(typeof currentProfile!=="undefined" && currentProfile)||{};
  $("crashScreen").innerHTML='<div class="cx"><div class="cx-top"><div><div class="tt">'+esc(X.title)+' · JEE Main (Jan 2027) Crash Course</div><div class="who">Candidate: '+esc(p.name||"Student")+'</div></div><div class="cx-timer" id="cxTimer">--:--</div></div>'+
    '<div class="cx-subs" id="cxSubs"></div><div class="cx-body"><div class="cx-main" id="cxMain"></div>'+
    '<div class="cx-side"><div class="cx-lg"><span><i class="st-nv"></i>Not visited</span><span><i class="st-na"></i>Not answered</span><span><i class="st-a"></i>Answered</span><span><i class="st-m" style="border-radius:50%"></i>Marked</span><span style="grid-column:1/-1"><i class="st-am" style="border-radius:50%"></i>Answered &amp; marked</span></div>'+
    '<h5 id="cxPalH">Physics</h5><div class="cx-pal" id="cxPal"></div><div class="cx-cnt" id="cxCnt"></div>'+
    '<button class="btn cx-submit" onclick="crashAskSubmit()">Submit test</button></div></div></div>';
}
function status(i){ var X=CR.x, a=X.picks[i]!==null&&X.picks[i]!=="", m=X.mark[i]; if(!X.vis[i]) return "nv"; if(a&&m) return "am"; if(m) return "m"; if(a) return "a"; return "na"; }
function subOf(i){ return CR.x.qs[i].s; }
function accrue(){ var X=CR.x; if(!X) return; var now=Date.now(); X.times[X.cur]=(X.times[X.cur]||0)+Math.round((now-X.t0)/1000); X.t0=now; }
function go2(i){
  var X=CR.x; if(!X) return; accrue(); X.cur=i; X.vis[i]=true; var q=X.qs[i], sub=q.s;
  var idxs=[]; X.qs.forEach(function(qq,k){ if(qq.s===sub) idxs.push(k); });
  var pos=idxs.indexOf(i)+1, secA=q.t==="MCQ";
  $("cxSubs").innerHTML=SUBS.map(function(s){ var ans=0,tot=0; X.qs.forEach(function(qq,k){ if(qq.s===s){ tot++; if(X.picks[k]!==null&&X.picks[k]!=="") ans++; } }); return '<button class="cx-sub'+(s===sub?' on':'')+'" onclick="crashSub(\''+s+'\')">'+s+' <span style="opacity:.7">'+ans+'/'+tot+'</span></button>'; }).join("");
  var opts="";
  if(secA){ opts='<div class="cx-opts">'+q.o.map(function(o,k){ return '<button class="cx-opt'+(X.picks[i]===k?' on':'')+'" onclick="crashPick('+k+')"><span class="l">'+"ABCD"[k]+'</span><span>'+E(o)+'</span></button>'; }).join("")+'</div>'; }
  else { opts='<div class="cx-num"><div style="color:var(--muted);font-size:13px;margin-bottom:6px">Enter your answer (numerical value):</div><input id="cxNum" inputmode="decimal" autocomplete="off" value="'+esc(X.picks[i]==null?"":X.picks[i])+'" oninput="crashNum(this.value)">'+
    '<div class="cx-pad">'+["7","8","9","⌫","4","5","6","−","1","2","3",".","0","Clear"].map(function(b){ return '<button onclick="crashKey(\''+b+'\')"'+(b==="Clear"?' style="grid-column:span 3"':'')+'>'+b+'</button>'; }).join("")+'</div></div>'; }
  $("cxMain").innerHTML=wmHTML()+'<div class="cx-qh"><span>Question <b>'+pos+'</b> of '+idxs.length+' · '+sub+' · '+(secA?'Section A (MCQ)':'Section B (Numerical)')+'</span><span>+4 / −1</span></div>'+
    '<div class="cx-q">'+E(q.q)+(q.fig?'<div>'+q.fig+'</div>':'')+'</div>'+opts+
    '<div class="cx-acts"><button class="b g" onclick="crashSaveNext()">Save &amp; Next</button><button class="b p" onclick="crashMarkNext()">Mark for Review &amp; Next</button><button class="b" onclick="crashClear()">Clear Response</button><button class="b" onclick="crashPrev()">← Back</button></div>';
  typeset($("cxMain")); palette(); persist();
}
function palette(){
  var X=CR.x, sub=X.qs[X.cur].s, h="", c={a:0,na:0,m:0,nv:0};
  X.qs.forEach(function(q,i){ var st=status(i); if(st==="am") c.a++, c.m++; else c[st]++;
    if(q.s===sub){ var n=0; for(var k=0;k<=i;k++) if(X.qs[k].s===sub) n++; h+='<button class="st-'+st+(i===X.cur?' cur':'')+'" onclick="crashGo('+i+')">'+n+'</button>'; } });
  $("cxPal").innerHTML=h; $("cxPalH").textContent=sub+" — palette";
  $("cxCnt").innerHTML='<div><b>'+c.a+'</b>Answered</div><div><b>'+c.na+'</b>Not ans.</div><div><b>'+c.m+'</b>Marked</div><div><b>'+c.nv+'</b>Not visited</div>';
}
window.crashGo=function(i){ go2(i); };
window.crashSub=function(s){ var X=CR.x; for(var i=0;i<X.qs.length;i++) if(X.qs[i].s===s){ go2(i); return; } };
window.crashPick=function(k){ var X=CR.x; X.picks[X.cur]=k; var b=document.querySelectorAll(".cx-opt"); for(var i=0;i<b.length;i++) b[i].classList.toggle("on", i===k); palette(); persist(); };
window.crashNum=function(v){ var X=CR.x; v=String(v).replace(/[^0-9.\-]/g,"").slice(0,12); X.picks[X.cur]=(v===""?null:v); var el=$("cxNum"); if(el && el.value!==v) el.value=v; palette(); persist(); };
window.crashKey=function(b){ var el=$("cxNum"), v=el?el.value:""; if(b==="⌫") v=v.slice(0,-1); else if(b==="Clear") v=""; else if(b==="−") v=(v.charAt(0)==="-"?v.slice(1):"-"+v); else v+=b; crashNum(v); };
window.crashSaveNext=function(){ var X=CR.x; if(X.cur<X.qs.length-1) go2(X.cur+1); else go2(0); };
window.crashMarkNext=function(){ var X=CR.x; X.mark[X.cur]=true; crashSaveNext(); };
window.crashClear=function(){ var X=CR.x; X.picks[X.cur]=null; X.mark[X.cur]=false; go2(X.cur); };
window.crashPrev=function(){ var X=CR.x; if(X.cur>0) go2(X.cur-1); };
function tick(){
  var X=CR.x; if(!X) return; var left=X.endAt-(Date.now()+X.skew), el=$("cxTimer");
  if(el){ el.textContent="⏱ "+fmt(left); el.classList.toggle("low", left<10*60000); }
  if(left<=0 && !X.submitting){ toast("Time is up — submitting your answers."); finalSubmit(); }
}
window.crashAskSubmit=function(){
  var X=CR.x; accrue();
  var rows=SUBS.map(function(s){ var c={t:0,a:0,na:0,m:0,nv:0}; X.qs.forEach(function(q,i){ if(q.s!==s) return; c.t++; var st=status(i); if(st==="am"){ c.a++; c.m++; } else c[st]++; }); return '<tr><td style="text-align:left">'+s+'</td><td>'+c.t+'</td><td>'+c.a+'</td><td>'+c.na+'</td><td>'+c.m+'</td><td>'+c.nv+'</td></tr>'; }).join("");
  var m=document.createElement("div"); m.className="cr-modal"; m.id="crSubModal";
  m.innerHTML='<div class="in"><h3>Submit '+esc(X.title)+'?</h3><p style="color:var(--muted);font-size:14px">Time left: <b>'+fmt(X.endAt-(Date.now()+X.skew))+'</b>. You can submit each mock only once.</p><table><tr><th style="text-align:left">Section</th><th>Qs</th><th>Answered</th><th>Not ans.</th><th>Marked</th><th>Not visited</th></tr>'+rows+'</table><div class="row"><button class="btn btn-outline" onclick="this.closest(\'.cr-modal\').remove()">Keep working</button><button class="btn" onclick="this.closest(\'.cr-modal\').remove();crashFinal()">Yes, submit</button></div></div>';
  document.body.appendChild(m);
};
window.crashFinal=function(){ finalSubmit(); };
function finalSubmit(){ var X=CR.x; if(!X||X.submitting) return; X.submitting=true; accrue(); persist(); clearInterval(X.timer); doSubmit(X.mock, X.picks, X.times, X.flags); }
function doSubmit(id,picks,times,flags){
  toast("Submitting… checking your answers.");
  api("submit",{mock:id,picks:picks||[],times:times||[],flags:flags||{}}).then(function(d){
    try{ localStorage.removeItem(saveKey(id)); }catch(e){}
    CR.x=null; disarm(); CR.list=null; CR.rfilter="all"; renderResult(d);
  }).catch(function(e){
    if(e.status===409){ try{ localStorage.removeItem(saveKey(id)); }catch(x){} CR.x=null; disarm(); crashReview(id); return; }
    if(CR.x) CR.x.submitting=false;
    var m=document.createElement("div"); m.className="cr-modal";
    m.innerHTML='<div class="in"><h3>Couldn\'t submit — your answers are safe</h3><p style="color:var(--muted)">'+esc(e.message)+' Your answers are saved on this device. Check your internet and try again.</p><div class="row"><button class="btn" onclick="this.closest(\'.cr-modal\').remove();crashRetry(\''+id+'\')">Try again</button></div></div>';
    document.body.appendChild(m);
  });
}
window.crashRetry=function(id){ var sv=null; try{ sv=JSON.parse(localStorage.getItem(saveKey(id))||"null"); }catch(e){} var X=CR.x; doSubmit(id, X?X.picks:(sv?sv.picks:[]), X?X.times:(sv?sv.times:[]), X?X.flags:(sv?sv.flags:{})); };

/* ---------------- integrity / anti-capture ---------------- */
var armed=false, armedExam=false;
function shield(on,msg){
  var s=$("crShield"); if(!on){ if(s) s.remove(); return; }
  if(!s){ s=document.createElement("div"); s.id="crShield"; s.className="cr-shield"; document.body.appendChild(s); }
  s.innerHTML='<div><b>🔒 Screen hidden</b><p>'+msg+'</p><button class="btn" style="margin-top:14px" onclick="crashUnshield()">Continue</button></div>';
}
window.crashUnshield=function(){ shield(false); };
function guarded(){ var s=$("crashScreen"), r=$("crashResult"), c=$("sec-crash");
  return (s && !s.classList.contains("hidden")) || (r && !r.classList.contains("hidden")) || (c && !c.classList.contains("hidden") && !!document.querySelector("#crTab .cr-wm")); }
function onVis(){ if(!guarded()) return; if(document.hidden || !document.hasFocus()){ if(armedExam && CR.x){ CR.x.flags.tabSwitch++; persist(); } shield(true, armedExam?("You left the test window. This is counted like a real CBT ("+(CR.x?CR.x.flags.tabSwitch:0)+" so far). The timer keeps running."):"Content is hidden while this window is not in focus."); } }
function onKey(e){
  if(!guarded()) return;
  var k=(e.key||"").toLowerCase();
  if(k==="printscreen"){ e.preventDefault(); try{ navigator.clipboard && navigator.clipboard.writeText("Screenshots of Dakhilaa tests are not allowed."); }catch(x){} if(CR.x){ CR.x.flags.blocked++; persist(); } shield(true,"Screenshots are not allowed during Dakhilaa tests."); return; }
  if((e.ctrlKey||e.metaKey) && ["c","x","s","p","u","a"].indexOf(k)>=0 && !(k==="a" && e.target && e.target.id==="cxNum")){ e.preventDefault(); if(CR.x){ CR.x.flags.blocked++; } }
  if(k==="f12" || ((e.ctrlKey||e.metaKey) && e.shiftKey && ["i","j","c","s"].indexOf(k)>=0)){ e.preventDefault(); }
}
function block(e){ if(!guarded()) return; if(e.target && e.target.id==="cxNum" && e.type!=="contextmenu") return; e.preventDefault(); }
function unload(e){ if(armedExam && CR.x){ e.preventDefault(); e.returnValue=""; return ""; } }
function arm(exam){
  armedExam=!!exam; if(armed) return; armed=true;
  document.addEventListener("visibilitychange",onVis); window.addEventListener("blur",onVis);
  document.addEventListener("keydown",onKey,true); document.addEventListener("keyup",onKey,true);
  ["contextmenu","copy","cut","dragstart","selectstart"].forEach(function(t){ document.addEventListener(t,block,true); });
  window.addEventListener("beforeunload",unload);
}
function disarm(){
  armedExam=false; if(!armed) return; armed=false; shield(false);
  document.removeEventListener("visibilitychange",onVis); window.removeEventListener("blur",onVis);
  document.removeEventListener("keydown",onKey,true); document.removeEventListener("keyup",onKey,true);
  ["contextmenu","copy","cut","dragstart","selectstart"].forEach(function(t){ document.removeEventListener(t,block,true); });
  window.removeEventListener("beforeunload",unload);
}

/* ---------------- result + analysis ---------------- */
window.crashReview=function(id){ toast("Opening your analysis…"); api("review",{mock:id}).then(function(d){ CR.rfilter="all"; renderResult(d); }).catch(function(e){ toast(e.message,true); }); };
function renderResult(d){
  ensureDom(); CR.res=d; var A=d.attempt, qs=d.qs, key=d.key, n=qs.length, mk=A.marks;
  var att=A.correct+A.wrong, acc=att?Math.round(100*A.correct/att):0, tUsed=A.perQ.reduce(function(s,q){ return s+(q.t||0); },0);
  var R=A.rank||{rank:1,of:1,pctile:100}, pct=estPct(mk), air=estAIR(mk);
  var h='<div class="rr">'+wmHTML().replace('class="cr-wm"','class="cr-wm" style="position:fixed"')+
   '<div class="rr-top"><button class="btn btn-outline" style="padding:8px 14px" onclick="crashBack()">← Crash Course</button><div style="color:var(--muted);font-size:13px">'+esc(qs.length?("Mock "+mnum(A.mock||d.mock||"m0")):"")+(A.late?' · submitted after time':'')+'</div></div>'+
   '<div class="rr-hero"><div class="in"><div class="rr-score"><b>'+mk+'</b><span>out of 300</span></div><div class="rr-kpis">'+
     kpi(A.correct,"Correct (+4)","#4ade80")+kpi(A.wrong,"Wrong (−1)","#f87171")+kpi(A.blank,"Skipped","#94a3b8")+kpi(acc+"%","Accuracy","#fbbf24")+'</div></div></div>';
  // rank
  h+='<div class="rr-two"><div class="rr-card"><h4>🏆 Your rank in this mock</h4><div class="sub">Among Dakhilaa Crash Course students who took Mock '+mnum(A.mock||"m0")+'</div><div class="rr-big">#'+R.rank+' <span style="font-size:15px;color:var(--muted);font-weight:600">of '+R.of+'</span></div>'+
     '<div style="margin-top:6px">Better than <b>'+(R.of>1?R.pctile.toFixed(1):"—")+'%</b> of students · class average <b>'+(R.avg!=null?R.avg:"—")+'</b></div>'+(R.of<20?'<div class="rr-note">Only '+R.of+' student'+(R.of>1?'s':'')+' so far — your rank updates live as more students take this mock.</div>':'<div class="rr-note">Live rank — updates as more students take this mock.</div>')+'</div>'+
   '<div class="rr-card"><h4>📈 Estimated JEE Main standing</h4><div class="sub">If you scored '+mk+'/300 in the real exam</div><div class="rr-big">'+pct.toFixed(2)+' <span style="font-size:15px;color:var(--muted);font-weight:600">percentile</span></div><div style="margin-top:6px">Estimated All-India Rank <b>~'+air.toLocaleString("en-IN")+'</b></div><div class="rr-note">Approximate, based on recent JEE Main marks-vs-percentile trends — not an official NTA figure.</div></div></div>';
  // gap
  var targets=[[100000,"AIR 1 lakh"],[50000,"AIR 50,000"],[25000,"AIR 25,000"],[10000,"AIR 10,000"],[2500,"AIR 2,500"]].filter(function(t){ return t[0]<air; }).slice(0,3);
  var silly=0, sillyN=0; Object.keys(A.mistakes||{}).forEach(function(k){ if(SILLY[k]){ silly+=5*A.mistakes[k]; sillyN+=A.mistakes[k]; } });
  h+='<div class="rr-card"><h4>🪜 Your gap to the next rank band</h4><div class="sub">Marks you need, and where they can come from</div><div class="rr-gap">'+
     (targets.length?targets.map(function(t){ var need=marksForAIR(t[0]); return '<div><span>'+t[1]+'</span><span>~'+need+'/300</span><b>+'+Math.max(0,need-mk)+' marks</b></div>'; }).join(""):'<div><span>You are in the top band for this mock 🔥</span></div>')+'</div>'+
     (sillyN?'<div class="rr-tip">⚡ <b>Fastest marks:</b> '+sillyN+' of your wrong answers were careless slips (calculation, sign, unit or misreading). Fixing just those would have given you <b>+'+silly+' marks</b> → '+(mk+silly)+'/300 ≈ '+estPct(mk+silly).toFixed(1)+' percentile.</div>':'')+'</div>';
  // why you lost marks (USP)
  var ms=A.mistakes||{}, mks=Object.keys(ms).sort(function(a,b){ return ms[b]-ms[a]; });
  h+='<div class="rr-card"><h4>🔍 Why you lost marks</h4><div class="sub">Each wrong option is tagged with the mistake behind it. '+A.wrong+' wrong answers cost you '+(A.wrong*5)+' marks compared with getting them right.</div>'+
     (mks.length?mks.map(function(k){ var c=CAT[k]||CAT.other; return '<div class="cr-bar"><span>'+c[0]+'</span><span class="tr"><i style="width:'+Math.round(100*ms[k]/ms[mks[0]])+'%;background:'+c[1]+'"></i></span><span class="n">'+ms[k]+'</span></div>'; }).join("")+'<div class="rr-tip">Focus for your next mock: <b>'+(CAT[mks[0]]||CAT.other)[0]+'</b> — '+tipFor(mks[0])+'</div>':'<div class="cr-empty">No wrong answers — nothing to fix here. 🔥</div>')+'</div>';
  // subjects + time
  h+='<div class="rr-card"><h4>📚 Subject-wise</h4><table class="rr-table"><tr><th>Subject</th><th>Marks</th><th>✓</th><th>✗</th><th>Skipped</th><th>Accuracy</th><th>Time spent</th></tr>'+
     SUBS.map(function(s){ var x=A.subjects[s]||{marks:0,correct:0,wrong:0,blank:0,time:0}, a2=x.correct+x.wrong; return '<tr><td>'+s+'</td><td><b>'+x.marks+'</b>/100</td><td>'+x.correct+'</td><td>'+x.wrong+'</td><td>'+x.blank+'</td><td>'+(a2?Math.round(100*x.correct/a2)+'%':'—')+'</td><td>'+Math.round((x.time||0)/60)+' min</td></tr>'; }).join("")+'</table>'+
     '<div class="rr-note">Total time on questions: '+Math.round(tUsed/60)+' min of 180.</div></div>';
  // chapters
  var ch=Object.keys(A.chapters||{}).map(function(k){ return A.chapters[k]; }).filter(function(c){ return c.lost>0; }).sort(function(a,b){ return b.lost-a.lost; }).slice(0,8);
  h+='<div class="rr-two"><div class="rr-card"><h4>🎯 Chapters that cost you most</h4><div class="sub">Marks lost compared with full marks (wrong = 5, skipped = 4)</div>'+
     (ch.length?ch.map(function(c){ return '<div class="cr-bar"><span>'+esc(c.ch)+' <span style="color:var(--dim);font-size:11px">'+c.s.slice(0,4)+'</span></span><span class="tr"><i style="width:'+Math.round(100*c.lost/ch[0].lost)+'%;background:#f97316"></i></span><span class="n">−'+c.lost+'</span></div>'; }).join(""):'<div class="cr-empty">Perfect paper!</div>')+'</div>';
  // difficulty & time sinks
  var dd={E:[0,0],M:[0,0],H:[0,0]}; A.perQ.forEach(function(q){ var d2=q.d||"M"; if(q.p!==null){ dd[d2][1]++; if(q.ok) dd[d2][0]++; } });
  var sinks=A.perQ.map(function(q,i){ return {i:i,t:q.t,ok:q.ok,p:q.p}; }).filter(function(q){ return q.t>=240 && !q.ok; }).sort(function(a,b){ return b.t-a.t; }).slice(0,5);
  var okT=[],badT=[]; A.perQ.forEach(function(q){ if(q.p!==null){ (q.ok?okT:badT).push(q.t||0); } }); var av=function(a){ return a.length?Math.round(a.reduce(function(s,x){ return s+x; },0)/a.length):0; };
  h+='<div class="rr-card"><h4>⏱ Time &amp; difficulty</h4><div class="sub">Accuracy by difficulty (attempted questions)</div>'+
     [["E","Easy","#4ade80"],["M","Medium","#fbbf24"],["H","Hard","#f87171"]].map(function(x){ var v=dd[x[0]]; return '<div class="cr-bar"><span>'+x[1]+' <span style="color:var(--dim);font-size:11px">'+v[0]+'/'+v[1]+'</span></span><span class="tr"><i style="width:'+(v[1]?Math.round(100*v[0]/v[1]):0)+'%;background:'+x[2]+'"></i></span><span class="n">'+(v[1]?Math.round(100*v[0]/v[1])+'%':'—')+'</span></div>'; }).join("")+
     '<div style="font-size:13px;margin-top:8px">Average time — correct: <b>'+fmt(av(okT)*1000)+'</b> · wrong: <b>'+fmt(av(badT)*1000)+'</b></div>'+
     (sinks.length?'<div class="rr-tip">🕳️ Time sinks: '+sinks.map(function(s){ return '<a style="color:var(--orange-l);cursor:pointer" onclick="crashJump('+s.i+')">Q'+(s.i+1)+'</a> ('+fmt(s.t*1000)+')'; }).join(", ")+' — over 4 minutes each and still not correct. Next time, mark &amp; move after 3 minutes.</div>':'')+'</div></div>';
  // review
  h+='<div class="rr-card"><h4>📝 Question-by-question review</h4><div class="cr-filter" style="margin-top:8px">'+[["all","All 75"],["wrong","Wrong"],["blank","Skipped"],["right","Correct"]].map(function(f){ return '<button class="cr-chip'+(CR.rfilter===f[0]?' on':'')+'" onclick="crashRF(\''+f[0]+'\')">'+f[1]+'</button>'; }).join("")+'</div><div id="crRev"></div></div>';
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn btn-outline" onclick="crashBack()">← Back to Crash Course</button></div></div>';
  $("crashResult").innerHTML=h; renderReview(); typeset($("crashResult")); arm(false); show("crashResult");
}
function kpi(v,l,c){ return '<div class="rr-kpi"><b style="color:'+c+'">'+v+'</b><span>'+l+'</span></div>'; }
window.crashRF=function(f){ CR.rfilter=f; var b=document.querySelectorAll("#crashResult .cr-chip"); for(var i=0;i<b.length;i++) b[i].classList.toggle("on", b[i].getAttribute("onclick").indexOf("'"+f+"'")>0); renderReview(); typeset($("crRev")); };
window.crashJump=function(i){ CR.rfilter="all"; renderReview(); typeset($("crRev")); var el=$("crq"+i); if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); };
function renderReview(){
  var d=CR.res, A=d.attempt, f=CR.rfilter, h="";
  d.qs.forEach(function(q,i){
    var r=A.perQ[i], k=d.key[i], blank=r.p===null;
    if(f==="wrong" && (blank||r.ok)) return; if(f==="blank" && !blank) return; if(f==="right" && !r.ok) return;
    var cls=blank?"z":(r.ok?"p":"n"), lab=blank?"0":(r.ok?"+4":"−1");
    var body="";
    if(q.t==="MCQ"){
      body=q.o.map(function(o,j){ var isC=(j===+k.a), isP=(!blank && +r.p===j); var tag=(k.tags||[])[j], why="";
        if(!isC && tag){ var c=tag.indexOf("|"), cat=c>0?tag.slice(0,c):"other", cc=CAT[cat]||CAT.other; why='<span class="why"><span class="cr-cat" style="background:'+cc[1]+'22;color:'+cc[1]+'">'+cc[0]+'</span>'+E(c>0?tag.slice(c+1):tag)+'</span>'; }
        return '<div class="cr-ro'+(isC?' ok':(isP?' bad':''))+'"><b>'+"ABCD"[j]+'</b><div>'+E(o)+(isC?' <b style="color:#4ade80">✓ correct</b>':'')+(isP&&!isC?' <b style="color:#f87171">← your answer</b>':'')+((isP&&!isC)||(!isC&&f!=="right")?why:'')+'</div></div>'; }).join("");
    } else {
      body='<div class="cr-ro '+(blank?'':(r.ok?'ok':'bad'))+'"><div>Your answer: <b>'+(blank?'—':esc(r.p))+'</b> · Correct answer: <b style="color:#4ade80">'+esc(k.a)+'</b>'+(r.why?'<span class="why"><span class="cr-cat" style="background:'+(CAT[r.cat]||CAT.other)[1]+'22;color:'+(CAT[r.cat]||CAT.other)[1]+'">'+(CAT[r.cat]||CAT.other)[0]+'</span>'+E(r.why)+'</span>':'')+'</div></div>'+
        ((k.traps&&k.traps.length)?'<div style="font-size:12.5px;color:var(--muted);margin-top:6px">Common wrong answers: '+k.traps.map(function(t){ var c=t.indexOf("|"); return E(c>0?t.slice(c+1):t); }).join(" · ")+'</div>':'');
    }
    h+='<div class="cr-rq" id="crq'+i+'"><div class="h"><span>Q'+(i+1)+' · '+q.s+' · '+esc(q.ch)+' · '+({E:"Easy",M:"Medium",H:"Hard"})[k.d||"M"]+' · '+fmt((r.t||0)*1000)+'</span><span class="mk '+cls+'">'+lab+'</span></div><div class="q">'+E(q.q)+(q.fig?'<div>'+q.fig+'</div>':'')+'</div>'+body+'<div class="cr-sol"><b>Solution:</b> '+E(k.sol)+'</div></div>';
  });
  $("crRev").innerHTML=h||'<div class="cr-empty">Nothing in this filter.</div>';
}

/* ---------------- owner: upload mocks ---------------- */
function ownerHTML(){ return '<div class="cr-owner"><b>Owner · upload mocks</b><div>Select <code>crash_mNN.json</code> mock files and/or the notes &amp; lessons files (<code>crash_lessons.json</code>, <code>crash_notes_*.json</code>) from your computer. They go straight to the server (never into the website files).</div><input type="file" id="crUp" accept=".json" multiple><button class="btn" style="padding:8px 14px" onclick="crashUpload()">Upload</button><div id="crUpLog" style="margin-top:8px;font-size:12.5px"></div></div>'; }
window.crashUpload=function(){
  var files=Array.prototype.slice.call(($("crUp")||{}).files||[]), log=$("crUpLog"); if(!files.length){ toast("Choose files first.",true); return; }
  var i=0; log.innerHTML="";
  (function next(){
    if(i>=files.length){ log.innerHTML+="<div>✅ Done.</div>"; CR.list=null; setTimeout(crashRender,800); return; }
    var f=files[i++]; f.text().then(function(txt){ return fbAuth.currentUser.getIdToken().then(function(tok){ return fetch("/api/admin-import-crash",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok},body:txt}); }); })
     .then(function(r){ return r.json(); }).then(function(d){ log.innerHTML+='<div>'+(d.ok?'✅ '+d.id+' ('+(typeof d.questions==="string"?d.questions:d.questions+' Q')+')':'❌ '+esc(f.name)+': '+esc(d.error))+'</div>'; next(); })
     .catch(function(e){ log.innerHTML+='<div>❌ '+esc(f.name)+': '+esc(e.message)+'</div>'; next(); });
  })();
};

/* ---------------- hooks used by app.html ---------------- */
window.crashOverviewCard=function(){
  ensureDom(); var ov=$("sec-overview"); if(!ov) return;
  var c=$("crOvCard"); if(!c){ c=document.createElement("div"); c.id="crOvCard"; c.style.marginBottom="18px"; ov.insertBefore(c, ov.firstChild); }
  load(false).then(function(L){
    if(L.enrolled){ var nx=nextMock(); c.innerHTML='<div class="cr-next"><div><h3>🔥 Crash Course'+(nx?' — next: Mock '+mnum(nx.id):'')+'</h3><p>'+Object.keys(L.attempts||{}).length+' of 100 mocks done · access till 31 Jan 2027</p></div><button class="btn" onclick="go(\'crash\')">Open →</button></div>'; }
    else if(!(L.bought&&L.expired) && Date.now()<CR.validUntil){ c.innerHTML='<div class="cr-next"><div><h3>🔥 New: JEE Main Jan 2027 Crash Course</h3><p>100 full mocks · mistake-reason analysis · 60-day plan — '+CR.price+', till 31 Jan 2027</p></div><button class="btn" onclick="go(\'crash\')">See it →</button></div>'; }
    else c.innerHTML="";
  }).catch(function(){ c.innerHTML=""; });
};
window.crashAfterEnter=function(){
  var q=null; try{ q=new URLSearchParams(location.search); }catch(e){}
  var wantBuy=window.pendingCourse || (q && q.get("course")===CR.key), wantView=q && q.get("go")==="crash";
  if(!wantBuy && !wantView) return;
  window.pendingCourse=false;
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  if(typeof go==="function") go("crash");
  if(wantBuy) load(true).then(function(L){ if(!L.enrolled && !(L.bought&&L.expired)) setTimeout(crashBuy,400); }).catch(function(){});
};
})();
