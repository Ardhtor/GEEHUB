(()=>{
  "use strict";
  const root=document.getElementById("geeLocalRuntime");
  if(!root)return;
  const $=selector=>root.querySelector(selector);
  const state=$(".local-runtime-state");
  const feed=$(".local-runtime-feed");
  const language=$(".local-runtime-language");
  const fmt=value=>{
    if(!Number.isFinite(value)||value<0)return "—";
    const units=["B","KB","MB","GB","TB"];
    let unit=0;
    while(value>=1024&&unit<units.length-1){value/=1024;unit++}
    return value.toFixed(unit?1:0)+" "+units[unit];
  };
  let lastSignature="";
  let running=false;
  let timer=null;
  let lastGoodSample=0;
  const emptyFeed=message=>{
    feed.replaceChildren();
    const item=document.createElement("li");
    item.className="local-runtime-feed-empty";
    item.textContent=message;
    feed.append(item);
  };
  const renderFeed=events=>{
    const signature=JSON.stringify(events.map(event=>[event.id,event.at,event.title,event.type,event.body]));
    if(signature===lastSignature)return;
    lastSignature=signature;
    feed.replaceChildren();
    $(".local-runtime-feed-count").textContent=events.length+" RECORDS";
    if(!events.length){emptyFeed("No inscriptions yet. New world events will accumulate here.");return}
    for(const event of events){
      const item=document.createElement("li");
      item.className="local-runtime-feed-item";
      const meta=document.createElement("span");
      meta.className="local-runtime-feed-meta";
      const timestamp=event.at||event.occurred_at||event.timestamp;
      const date=timestamp?new Date(timestamp):null;
      meta.textContent=(event.type||"EVENT")+" · "+(date&&!Number.isNaN(date.valueOf())?date.toLocaleString():"TIME UNRECORDED");
      const title=document.createElement("strong");
      title.textContent=event.title||event.id||"UNTITLED EVENT";
      item.append(meta,title);
      const bodyText=event.body||event.text||event.description||"";
      if(bodyText){
        const body=document.createElement("p");
        body.textContent=bodyText;
        item.append(body);
      }
      feed.append(item);
    }
  };
  async function getJSON(path){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),7000);
    try{
      const response=await fetch(path,{cache:"no-store",headers:{accept:"application/json"},signal:controller.signal});
      if(!response.ok)throw new Error(path+" returned HTTP "+response.status);
      return await response.json();
    }finally{clearTimeout(timeout)}
  }
  function setOffline(error){
    state.textContent="LOCAL RUNTIME / NOT CONNECTED";
    state.dataset.state="error";
    $(".local-runtime-latest").textContent="LATEST INSCRIPTION / LOCAL SERVER REQUIRED";
    $(".local-runtime-foot").textContent="Runtime sample unavailable. "+(error&&error.name==="AbortError"?"The local service did not respond within seven seconds.":"Open this page through http://127.0.0.1:8788 and check the local server.");
    if(!lastSignature){
      $(".local-runtime-feed-count").textContent="OFFLINE";
      emptyFeed("Activity history appears when the local GEEHUB server is running.");
    }
  }
  async function sample(){
    if(running||document.hidden)return;
    running=true;
    try{
      const data=await getJSON("/api/geehub/system");
      if(!data||data.ok!==true||!data.runtime||!data.process_memory_bytes||!data.host_memory_bytes)throw new Error("Runtime response is incomplete.");
      const processMemory=data.process_memory_bytes;
      const hostMemory=data.host_memory_bytes;
      const total=Number(hostMemory.total);
      const free=Number(hostMemory.free);
      const used=total-free;
      const percent=total>0?Math.max(0,Math.min(100,used/total*100)):0;
      $(".local-runtime-process").textContent=fmt(Number(processMemory.rss));
      $(".local-runtime-heap").textContent=fmt(Number(processMemory.heap_used))+" / "+fmt(Number(processMemory.heap_total));
      $(".local-runtime-host").textContent=fmt(used)+" / "+fmt(total);
      $(".local-runtime-fill").style.width=percent.toFixed(1)+"%";
      const activity=data.world_activity||{};
      $(".local-runtime-records").textContent=Number(activity.record_count||0).toLocaleString();
      const latest=activity.latest;
      const latestDate=latest&&latest.at?new Date(latest.at):null;
      $(".local-runtime-latest").textContent=latest
        ?"LATEST INSCRIPTION / "+(latest.type||"EVENT")+" · "+(latest.title||latest.id||"UNTITLED")+(latestDate&&!Number.isNaN(latestDate.valueOf())?" · "+latestDate.toLocaleString():"")
        :"LATEST INSCRIPTION / NO RECORDS YET";
      const sampled=data.sampled_at?new Date(data.sampled_at):new Date();
      const cpu=data.host_cpu||{};
      const uptime=Number(data.runtime.uptime_seconds||0);
      const uptimeLabel=uptime>=86400?Math.floor(uptime/86400)+"d "+Math.floor(uptime%86400/3600)+"h":uptime>=3600?Math.floor(uptime/3600)+"h "+Math.floor(uptime%3600/60)+"m":Math.floor(uptime/60)+"m";
      $(".local-runtime-foot").textContent="PID "+data.runtime.pid+" · "+data.runtime.platform+"/"+data.runtime.arch+" · "+(cpu.logical_cores||"—")+" logical CPU cores · 1m load "+(Number.isFinite(cpu.load_average_1m)?cpu.load_average_1m:"—")+" · uptime "+uptimeLabel+" · Node "+(data.runtime.node||"unknown")+" · sampled "+sampled.toLocaleTimeString();
      state.textContent="LOCAL RUNTIME / LIVE";
      state.dataset.state="live";
      lastGoodSample=Date.now();

      try{
        const activityData=await getJSON("/api/geehub/activity?limit=24");
        renderFeed(Array.isArray(activityData.events)?activityData.events:[]);
      }catch(activityError){
        $(".local-runtime-feed-count").textContent="LEDGER UNAVAILABLE";
        emptyFeed("The compute service is connected, but the activity ledger could not be read: "+String(activityError.message||activityError));
      }

      try{
        const report=await getJSON("/api/geehub/language");
        const errors=Array.isArray(report.errors)?report.errors:[];
        const warnings=Array.isArray(report.warnings)?report.warnings:[];
        const checks=Array.isArray(report.checks)?report.checks:[];
        const status=String(report.status||"unknown").toLowerCase();
        language.dataset.state=status==="pass"?"pass":status==="warning"?"warning":status==="fail"?"fail":"error";
        language.textContent="TRACTUS LANGUAGE / "+status.toUpperCase()+" · "+checks.length+" VALIDATION CHECKS · "+errors.length+" ERRORS · "+warnings.length+" WARNINGS";
        language.title=errors.concat(warnings).join("\n")||"No reported issues";
      }catch(error){
        language.dataset.state="error";
        language.textContent="TRACTUS LANGUAGE / AUDIT UNAVAILABLE";
        language.title=String(error.message||error);
      }
    }catch(error){setOffline(error)}
    finally{running=false}
  }
  function schedule(){
    if(timer!==null)clearInterval(timer);
    timer=setInterval(()=>{
      if(lastGoodSample&&Date.now()-lastGoodSample>15000&&state.dataset.state==="live"){
        state.textContent="LOCAL RUNTIME / SAMPLE STALE";
        state.dataset.state="error";
      }
      sample();
    },5000);
  }
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)sample();
  });
  sample();
  schedule();
})();