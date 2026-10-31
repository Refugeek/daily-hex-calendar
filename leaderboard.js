export function scoreKey(date){return `hasCompletedToday_${date}`;}
export function eligible(date,today,completed,practice){return date===today&&!completed&&!practice;}
export function topTen(rows,group,date){return rows.filter(r=>r&&r.date===date&&r.metadata?.group===group&&typeof r.player_name==='string'&&Number.isFinite(r.score)&&r.score>=0).sort((a,b)=>a.score-b.score).slice(0,10);}
export function createLeaderboard(config,storage,fetcher=globalThis.fetch){
 const expand=(url,group,date)=>url.replaceAll('{group}',encodeURIComponent(group)).replaceAll('{date}',encodeURIComponent(date));
 async function request(url,options={}){
  if(!url)throw new Error('The leaderboard endpoint has not been configured.');
  const parsed=new URL(url,globalThis.location?.href||'https://localhost');
  if(parsed.protocol!=='https:'&&parsed.hostname!=='localhost'&&parsed.hostname!=='127.0.0.1')throw new Error('Use an HTTPS leaderboard endpoint.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),config.timeoutMs||10000);
  try{const response=await fetcher(parsed.href,{...options,signal:controller.signal});if(!response.ok)throw new Error(`Leaderboard request failed (${response.status}).`);return response.status===204?null:await response.json();}finally{clearTimeout(timeout);}
 }
 return {
  async list(group,date){
   if(config.mode==='mock')return topTen(storage.get('hex.mockScores',[]),group,date);
   const data=await request(expand(config.readUrl,group,date));
   const rows=Array.isArray(data)?data:data?.scores;
   if(!Array.isArray(rows))throw new Error('Expected an array of scores from the leaderboard.');
   return topTen(rows,group,date);
  },
  async submit(record){
   const {submitted, ...payload}=record;
   if(config.mode==='mock'){
    const rows=storage.get('hex.mockScores',[]);
    if(!rows.some(r=>r.submission_id===payload.submission_id))rows.push(payload);
    if(!storage.set('hex.mockScores',rows))throw new Error('Browser storage is unavailable.');return;
   }
   await request(expand(config.submitUrl,payload.metadata.group,payload.date),{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':payload.submission_id},body:JSON.stringify(payload)});
  }
 };
}
