import {BOARD,PIECES,GEOMETRY_VERSION,key,turn,targets,localDate,occupied,canPlace,isWin,roundAxial,isUnsolvableDate} from './engine.js';
import {createLeaderboard,eligible,scoreKey,groupFromSearch} from './leaderboard.js';
import {hexOutlinePath} from './geometry.js';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',SIZE=28,ROOT3=Math.sqrt(3);
let storageAvailable=true;
const store={get(k,f=null){try{const value=localStorage.getItem(k);return value===null?f:JSON.parse(value);}catch{return f;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{storageAvailable=false;return false;}}};
try{localStorage.setItem('hex.check','1');localStorage.removeItem('hex.check');}catch{storageAvailable=false;}
const config=window.HEX_CONFIG?.leaderboard||{mode:'mock'};
const api=createLeaderboard(config,store);
let profile=store.get('hex.profile',{player:'',group:''});
const linkedGroup=groupFromSearch(window.location.search);
if(linkedGroup){profile={...profile,group:linkedGroup};store.set('hex.profile',profile);}
let clientId=store.get('hex.clientId');if(!clientId){clientId=(crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''));store.set('hex.clientId',clientId);}
let date=localDate(),labels=targets(date),placements=PIECES.map(()=>null),rotations=PIECES.map(()=>0),selected=null,drag=null,hover=null,moves=0,started=null,elapsedBase=0,won=false,practice=false,paused=false,knownToday=localDate(),pendingConfirm=null;
const board=$('board');
const CENTER_X=SIZE*ROOT3*2.5;
const xy=([q,r])=>[SIZE*ROOT3*(q+r/2)-CENTER_X,SIZE*1.5*r-126];
const polygon=([x,y],radius=SIZE)=>Array.from({length:6},(_,i)=>{const angle=(i*60-30)*Math.PI/180;return [x+radius*Math.cos(angle),y+radius*Math.sin(angle)];});
const points=ps=>ps.map(p=>p.join(',')).join(' ');
function svg(tag,attrs={},text){const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;return el;}
const outline=(cells,project=xy)=>hexOutlinePath(cells,project);
const woodColors=['#9e7147','#a77b50','#966b43','#ac8051','#9a6d45','#a3774a','#936a43','#a87a4d','#a07248','#996c42','#ab7d4e','#9f744a'];
function tileGraphic(id,cells,project=xy,ghost=false){
 const g=svg('g',{'class':ghost?'ghost':'wood-tile','data-piece':id});
 g.append(svg('path',{d:outline(cells,project),fill:woodColors[id]}));
 if(!ghost){g.append(svg('path',{d:outline(cells,project),class:'tile-texture',fill:'url(#grain)',stroke:'none',opacity:'.14','pointer-events':'none'}));const [x,y]=project(cells[0]);g.append(svg('text',{x,y:y+3,'text-anchor':'middle'},PIECES[id].name));}return g;
}
function elapsed(){return elapsedBase+(started===null?0:performance.now()-started);}
function formatTime(ms){const ds=Math.floor(ms/100),sec=Math.floor(ds/10)%60,min=Math.floor(ds/600);return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${ds%10}`;}
function say(message){$('status').textContent=message;}
function timerStart(){if(started===null&&!won&&!paused){started=performance.now();save();}}
function save(){store.set('hex.session',{geometry:GEOMETRY_VERSION,date,placements,rotations,moves,elapsed:elapsed(),savedAt:Date.now(),running:started!==null,paused,won,practice});}
function restore(){const s=store.get('hex.session');if(!s||s.geometry!==GEOMETRY_VERSION||s.date!==date||s.placements?.length!==PIECES.length)return;
 try{const p=s.placements;if(!p.every((v,i)=>v===null||(Number.isInteger(v.q)&&Number.isInteger(v.r)&&Number.isInteger(v.rotation)&&canPlace(i,v,p,labels))))return;
 placements=p;rotations=p.map((v,i)=>v?.rotation||s.rotations?.[i]||0);moves=Number(s.moves)||0;won=!!s.won&&isWin(p,labels);practice=!!s.practice;paused=!!s.paused&&!won;elapsedBase=Math.max(0,Number(s.elapsed)||0)+(s.running&&!won&&!paused?Math.max(0,Date.now()-s.savedAt):0);started=s.running&&!won&&!paused?performance.now():null;
 }catch{/* A malformed session must not prevent a new game. */}}
function updateMode(){const completed=!!store.get(scoreKey(date),false),official=storageAvailable&&eligible(date,localDate(),completed,practice||isUnsolvableDate(labels));$('mode').classList.toggle('practice',!official);$('mode').querySelector('span').textContent=isUnsolvableDate(labels)?'No rotation-only solution for this date':official?'Today’s official daily challenge':completed&&date===localDate()?'Daily score recorded · unranked practice':!storageAvailable?'Practice mode · storage unavailable':date===localDate()?'Practice mode · unranked attempt':'Practice mode · past date';return official;}
function render(){
 document.body.classList.toggle('is-paused',paused);
 document.body.classList.toggle('is-complete',won);
 const active=document.activeElement, focusPiece=active?.closest?.('[data-piece]'), focusCell=active?.closest?.('[data-cell]');
 const restoreFocus=focusPiece?{type:'piece',id:focusPiece.dataset.piece,tray:!!focusPiece.closest('#tray')}:focusCell?{type:'cell',id:focusCell.dataset.cell}:null;
 board.replaceChildren();
 const defs=svg('defs');defs.innerHTML='<pattern id="grain" width="31" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(-13)"><path d="M0 2Q9 0 31 3M0 8Q20 5 31 9M0 12L31 11" fill="none" stroke="#78512b" stroke-width=".45"/></pattern><filter id="shadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#775f3b" flood-opacity=".22"/></filter>';
 board.append(defs);
 const frame=svg('g',{filter:'url(#shadow)'});
 // The reference has a straight six-sided wooden frame, not a scalloped edge.
 const framePoints='-260,0 -154,-184 154,-184 260,0 154,184 -154,184';
 frame.append(svg('polygon',{points:framePoints,fill:'#9c7746',stroke:'#98703e','stroke-width':3,transform:'translate(0 5)'}));
 frame.append(svg('polygon',{points:framePoints,fill:'#d0ac76',stroke:'#ae8751','stroke-width':1.5}));
 frame.append(svg('polygon',{points:framePoints,fill:'url(#grain)',opacity:'.3'}));
 frame.append(svg('path',{d:outline(BOARD.map(c=>[c.q,c.r])),fill:'#b18955',stroke:'#765732','stroke-width':3,'stroke-linejoin':'round'}));
 frame.append(svg('text',{x:0,y:-166,'text-anchor':'middle',fill:'#765934','font-size':9,'letter-spacing':2.4},'1 DAY · 1 PUZZLE'));
 frame.append(svg('text',{x:0,y:173,'text-anchor':'middle',fill:'#8a6a42','font-size':6.5,'letter-spacing':2},'DAILY HEX'));
 board.append(frame);
 BOARD.forEach((c,i)=>{const [x,y]=xy([c.q,c.r]),target=labels.includes(c.label);const g=svg('g',{class:`cell${target?' target':''}`,'data-cell':i,tabindex:!won&&i===0?'0':'-1',role:won?'img':'button','aria-label':`${c.label}${target?', leave uncovered':''}`});g.append(svg('polygon',{points:points(polygon([x,y],SIZE-.7))}));g.append(svg('text',{x,y:y+3.5,'text-anchor':'middle'},c.label));board.append(g);});
 placements.forEach((p,i)=>{if(!p||drag?.id===i)return;const g=tileGraphic(i,occupied(PIECES[i],p));if(!won&&selected===i)g.classList.add('selected');g.setAttribute('role',won?'img':'button');if(!won)g.setAttribute('tabindex','0');g.setAttribute('aria-label',`Placed tile ${PIECES[i].name}.${won?'':' Select to move or rotate.'}`);board.append(g);});
 if(selected!==null&&hover&&!won){const p={q:hover[0],r:hover[1],rotation:rotations[selected]};const ghost=tileGraphic(selected,occupied(PIECES[selected],p),xy,true);if(!canPlace(selected,p,placements,labels))ghost.classList.add('invalid');board.append(ghost);}
 $('tray').replaceChildren();
 PIECES.forEach(piece=>{const button=document.createElement('button');button.className=`tile-slot${selected===piece.id?' selected':''}${placements[piece.id]?' placed':''}`;button.dataset.piece=piece.id;button.disabled=won;button.setAttribute('aria-label',`Tile ${piece.name}, ${piece.cells.length} hexagons${placements[piece.id]?', on board':''}`);button.setAttribute('aria-pressed',selected===piece.id?'true':'false');const cells=turn(piece.cells,rotations[piece.id]);const coords=cells.map(xy),xs=coords.map(c=>c[0]),ys=coords.map(c=>c[1]);const minX=Math.min(...xs)-SIZE-4,minY=Math.min(...ys)-SIZE-4,w=Math.max(...xs)-minX+SIZE+4,h=Math.max(...ys)-minY+SIZE+4;const s=svg('svg',{viewBox:`${minX} ${minY} ${w} ${h}`});s.append(tileGraphic(piece.id,cells));button.append(s);const name=document.createElement('span');name.className='tile-name';name.textContent=piece.name;button.append(name);$('tray').append(button);});
 const count=placements.filter(Boolean).length;$('remaining').textContent=12-count;$('progress-text').textContent=`${count} of 12 pieces placed`;$('progress-fill').style.width=`${count/12*100}%`;$('moves').textContent=moves;$('return-button').disabled=selected===null||!placements[selected]||won;$('rotate-button').disabled=selected===null||won;
 updateDateLeaderboard();
 updateDateLimits();$('pause-button').disabled=won||started===null;
 $('date-input').value=date;$('date-title').textContent=new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});$('target-chips').replaceChildren(...labels.map(label=>{const el=document.createElement('span');el.textContent=label;return el;}));updateMode();
 if(restoreFocus&&!won){const root=restoreFocus.tray?$('tray'):board;root.querySelector(`[data-${restoreFocus.type}="${restoreFocus.id}"]`)?.focus({preventScroll:true});}
}
function boardPosition(event){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(board.getScreenCTM().inverse());const r=(p.y+126)/(SIZE*1.5),q=(p.x+CENTER_X)/(SIZE*ROOT3)-r/2;return roundAxial(q,r);}
function pick(id){
 if(won||paused)return;
 timerStart();selected=id;hover=null;rotations[id]=placements[id]?.rotation??rotations[id];
 say(`Tile ${PIECES[id].name} selected. Rotate, then choose its place.`);render();
 // Pointer pickup prevents the browser's default focus change. Explicitly leave
 // the date field so the first R key reaches the game's shortcut handler.
 const root=placements[id]?board:$('tray');
 root.querySelector(`[data-piece="${id}"]`)?.focus({preventScroll:true});
}
function cancelDrag(){if(!drag)return;drag=null;$('drag-preview').style.display='none';document.body.classList.remove('dragging');hover=null;render();}
function rotateSelected(){if(selected===null||won||paused)return;timerStart();rotations[selected]=(rotations[selected]+1)%6;
 if(placements[selected]&&!drag){const candidate={...placements[selected],rotation:rotations[selected]};if(canPlace(selected,candidate,placements,labels)){placements[selected]=candidate;moves++;}else{rotations[selected]=placements[selected].rotation;say('That rotation does not fit. Pick up the tile to rotate it elsewhere.');}}
 save();render();if(drag)drawDrag(drag.lastX,drag.lastY);
}
function place(id,p){if(won||paused)return false;if(!canPlace(id,p,placements,labels)){say('That tile needs a little more room. Avoid edges, other tiles and your date.');return false;}timerStart();const old=placements[id];if(!old||old.q!==p.q||old.r!==p.r||old.rotation!==p.rotation)moves++;placements[id]=p;selected=null;hover=null;save();render();say('A good fit. Keep going.');if(isWin(placements,labels))victory();return true;}
function returnSelected(){if(selected===null||!placements[selected]||won||paused)return;placements[selected]=null;moves++;hover=null;save();render();say('Tile returned to the tray.');}
function drawDrag(x,y){if(!drag)return;const preview=$('drag-preview');preview.replaceChildren();const scale=board.getBoundingClientRect().width/570;const c=turn(PIECES[drag.id].cells,rotations[drag.id]);const g=tileGraphic(drag.id,c,([q,r])=>[x+SIZE*ROOT3*(q+r/2)*scale,y+SIZE*1.5*r*scale]);
 preview.append(g);preview.style.display='block';}
let lastTap={id:null,time:0};
function pointerDown(event){const target=event.target.closest('[data-piece]');if(!target||event.button!==0||won||paused)return;event.preventDefault();const id=Number(target.dataset.piece),t=performance.now();if(lastTap.id===id&&t-lastTap.time<320){pick(id);rotateSelected();lastTap={id:null,time:0};return;}lastTap={id,time:t};pick(id);drag={id,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false,pointerId:event.pointerId};}
$('tray').addEventListener('pointerdown',pointerDown);board.addEventListener('pointerdown',pointerDown);
document.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.pointerId)return;drag.lastX=event.clientX;drag.lastY=event.clientY;if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5)drag.moved=true;if(!drag.moved)return;event.preventDefault();document.body.classList.add('dragging');const box=board.getBoundingClientRect();hover=event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom?boardPosition(event):null;render();drawDrag(event.clientX,event.clientY);},{passive:false});
document.addEventListener('pointerup',event=>{if(!drag||event.pointerId!==drag.pointerId)return;const d=drag;drag=null;$('drag-preview').style.display='none';document.body.classList.remove('dragging');if(d.moved){const rect=$('tray').getBoundingClientRect();if(hover){place(d.id,{q:hover[0],r:hover[1],rotation:rotations[d.id]});}else if(event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom&&placements[d.id])returnSelected();else say('Drop on the board to place a tile.');}hover=null;render();});
document.addEventListener('pointercancel',cancelDrag);window.addEventListener('blur',cancelDrag);
board.addEventListener('click',event=>{if(selected===null||won||paused||event.target.closest('[data-piece]'))return;const target=event.target.closest('[data-cell]');if(!target)return;const c=BOARD[Number(target.dataset.cell)];place(selected,{q:c.q,r:c.r,rotation:rotations[selected]});});
$('tray').addEventListener('click',event=>{if(event.detail===0){const p=event.target.closest('[data-piece]');if(p){pick(Number(p.dataset.piece));board.querySelector('[data-cell="0"]').focus();}}});
board.addEventListener('contextmenu',e=>{if(selected!==null){e.preventDefault();rotateSelected();}});$('tray').addEventListener('contextmenu',e=>{if(selected!==null){e.preventDefault();rotateSelected();}});
let lastWheel=0;
for(const el of[board,$('tray')])el.addEventListener('wheel',e=>{if(selected===null)return;e.preventDefault();if(performance.now()-lastWheel<160)return;lastWheel=performance.now();rotateSelected();},{passive:false});
document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]')||event.target.matches('input'))return;
 if(event.key.toLowerCase()==='r'){event.preventDefault();rotateSelected();}
 if(event.key==='Escape'){cancelDrag();selected=null;hover=null;render();}
 if(event.key==='Delete'||event.key==='Backspace'){if(selected!==null){event.preventDefault();returnSelected();}}
 if(event.target.closest('#board')){
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const cell=BOARD[Number(event.target.closest('[data-cell]')?.dataset.cell)||0];const changes={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const[dq,dr]=changes[event.key];const next=BOARD.findIndex(c=>c.q===cell.q+dq&&c.r===cell.r+dr);if(next>=0){hover=[BOARD[next].q,BOARD[next].r];render();board.querySelector(`[data-cell="${next}"]`).focus();}}
  if(event.key==='Enter'||event.key===' '){event.preventDefault();const piece=event.target.closest('[data-piece]'),cell=event.target.closest('[data-cell]');if(piece)pick(Number(piece.dataset.piece));else if(cell&&selected!==null){const c=BOARD[Number(cell.dataset.cell)];place(selected,{q:c.q,r:c.r,rotation:rotations[selected]});}}
 }
});
function updateDateLimits(){const today=localDate();$('date-input').max=today;$('next-day').disabled=date>=today;}
function showPause(){
 $('pause-time').textContent=formatTime(elapsedBase);
 if(!$('pause-dialog').open)$('pause-dialog').showModal();
}
function pauseGame(){
 if(paused||won||started===null)return;
 elapsedBase=elapsed();started=null;paused=true;
 cancelDrag();selected=null;hover=null;save();render();showPause();
}
function resumeGame(){
 if(!paused)return;
 paused=false;started=performance.now();$('pause-dialog').close();save();render();say('Welcome back. Your timer is running.');
}
$('pause-button').onclick=pauseGame;$('resume-button').onclick=resumeGame;
$('pause-dialog').addEventListener('cancel',event=>event.preventDefault());
$('rotate-button').onclick=rotateSelected;$('return-button').onclick=returnSelected;
function confirmAction(title,copy,callback){$('confirm-title').textContent=title;$('confirm-copy').textContent=copy;pendingConfirm=callback;$('confirm-dialog').showModal();}
$('confirm-cancel').onclick=()=>$('confirm-dialog').close();$('confirm-yes').onclick=()=>{$('confirm-dialog').close();const callback=pendingConfirm;pendingConfirm=null;callback?.();};
function newGame(nextDate,isPractice=false){if(nextDate>localDate()||paused)return;cancelDrag();date=nextDate;labels=targets(date);placements=PIECES.map(()=>null);rotations=PIECES.map(()=>0);selected=null;hover=null;moves=0;started=null;elapsedBase=0;won=false;practice=isPractice;save();render();say(isUnsolvableDate(labels)?'Tuesday, February 1 cannot be solved with the photographed pieces without flipping. Choose another date.':'Take your time. The clock starts with your first tile.');}
function changeDate(next){if(paused)return;if(next>localDate()){$('date-input').value=date;say('Future puzzles unlock on their day. Choose today or an earlier date.');return;}if(!/^\d{4}-\d{2}-\d{2}$/.test(next)||!Number.isFinite(new Date(`${next}T12:00:00`).getTime())||next===date){$('date-input').value=date;return;}const proceed=()=>newGame(next,next!==localDate()||started!==null||elapsedBase>0);if(started!==null&&!won)confirmAction('Try another day?','Your current board will be cleared. Returning to today after starting another puzzle is an unranked practice attempt.',proceed);else proceed();$('date-input').value=date;}
$('date-input').onchange=e=>changeDate(e.target.value);$('today-button').onclick=()=>changeDate(localDate());
$('random-date-button').onclick=()=>{
 if(paused)return;
 const today=new Date(`${localDate()}T12:00:00`);
 // Sample whole calendar days in UTC so daylight-saving changes cannot
 // produce today, a future date, or a partial day at either boundary.
 const end=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
 const start=Date.UTC(today.getFullYear()-10,today.getMonth(),today.getDate());
 const dayCount=Math.round((end-start)/86400000);let next;
 do{
  const daysAgo=1+Math.floor(Math.random()*dayCount);
  next=new Date(end-daysAgo*86400000).toISOString().slice(0,10);
 }while(next===date||isUnsolvableDate(targets(next)));
 changeDate(next);
};
for(const [id,diff]of[['previous-day',-1],['next-day',1]])$(id).onclick=()=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+diff);if(d.getFullYear()>0&&d.getFullYear()<10000)changeDate(localDate(d));};
$('reset-button').onclick=()=>confirmAction('Begin again?','The tiles return to the tray and the timer resets. This attempt will be unranked practice.',()=>newGame(date,true));
function openGroup(){ $('player-input').value=profile.player;$('group-input').value=profile.group;$('group-dialog').showModal();}
$('help-button').onclick=()=>$('help-dialog').showModal();$('group-button').onclick=openGroup;
document.querySelectorAll('.dialog-close,.dialog-done').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('group-form').onsubmit=e=>{e.preventDefault();const player=$('player-input').value.trim(),group=$('group-input').value.trim().toUpperCase();if(!player||!group)return;profile={player,group};store.set('hex.profile',profile);updateDateLeaderboard(true);$('group-dialog').close();say(`You’re playing as ${player} in ${group}.`);retryPending();};
async function withLock(name,action){
 if(!navigator.locks)return action();
 try{return await navigator.locks.request(name,action);}catch(error){if(error.name==='SecurityError'||error.name==='NotSupportedError')return action();throw error;}
}
async function victory(){
 // Freeze the stopwatch before any rendering, storage, dialogs, or network work.
 elapsedBase=elapsed();started=null;won=true;selected=null;hover=null;const score=Math.round(elapsedBase),wonDate=date,wasPractice=practice;save();render();
 $('win-summary').textContent=`${labels.join(' · ')} — solved in ${formatTime(score)} with ${moves} moves.`;$('score-status').textContent='Unranked practice. A lovely fit, all the same.';$('win-dialog').showModal();
 await withLock(`hex.complete.${wonDate}`,async()=>{
  if(!storageAvailable||!eligible(wonDate,localDate(),!!store.get(scoreKey(wonDate)),wasPractice))return;
  const record={submission_id:`${clientId}:${wonDate}`,player_name:profile.player,score,date:wonDate,metadata:{group:profile.group,moves},submitted:false};
  // Persist result before locking: a failed POST can retry the same immutable score.
  if(!store.set(`hex.result.${wonDate}`,record)||!store.set(scoreKey(wonDate),true)){$('score-status').textContent='Solved! Browser storage is unavailable, so this result could not be officially recorded.';return;}
  updateMode();await submitRecord(record);
 });
}
async function submitRecord(record){
 if(!record.player_name||!record.metadata.group){$('score-status').textContent='Your first result is saved. Add your name and group in My group to register it.';return;}
 try{await api.submit(record);record.submitted=true;store.set(`hex.result.${record.date}`,record);updateDateLeaderboard(true);$('score-status').textContent=config.mode==='mock'?'Your first completion is recorded in the local mock leaderboard.':'Your first completion is registered with your group.';}
 catch(error){$('score-status').textContent=`Your score is saved on this device. Submission failed: ${error.message} Retry from Leaderboard.`;}
}
async function retryPending(){await withLock(`hex.submit.${localDate()}`,async()=>{const record=store.get(`hex.result.${localDate()}`);if(!record||record.submitted)return;if(!record.player_name||!record.metadata.group){if(!profile.player||!profile.group)return;record.player_name=profile.player;record.metadata.group=profile.group;store.set(`hex.result.${record.date}`,record);}await submitRecord(record);});if($('leaderboard-dialog').open)loadRankings();}
let leaderboardRequest=0,leaderboardDate=localDate(),availabilityKey='',availabilityVersion=0;
const availabilityCache=new Map();
async function updateDateLeaderboard(force=false){
 const group=profile.group,viewDate=date,key=group+':'+viewDate;
 if(key===availabilityKey&&!force)return;
 availabilityKey=key;const version=++availabilityVersion,button=$('date-leaderboard');button.hidden=true;
 if(!group)return;
 let entry=availabilityCache.get(key);
 if(force||!entry||Date.now()-entry.at>60000){
  entry={at:Date.now(),promise:api.list(group,viewDate)};availabilityCache.set(key,entry);
  if(availabilityCache.size>50)availabilityCache.delete(availabilityCache.keys().next().value);
 }
 try{const scores=await entry.promise;if(version!==availabilityVersion)return;button.hidden=!scores.length;button.setAttribute('aria-label', 'View leaderboard for '+new Date(viewDate+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}));}
 catch{if(availabilityCache.get(key)===entry)availabilityCache.delete(key);}
}
async function loadRankings(){const request=++leaderboardRequest;$('leaderboard-title').textContent=leaderboardDate===localDate()?'Today’s little victories.':'This day’s little victories.';$('rankings').replaceChildren();$('leaderboard-group').textContent=profile.group||'YOUR DAILY CIRCLE';$('leaderboard-caption').textContent=`${new Date(leaderboardDate+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · ${config.mode==='mock'?'Local mock · this browser only':'Your group’s fastest solves'} · lower is better`;
 const record=store.get(`hex.result.${localDate()}`);$('retry-score').hidden=leaderboardDate!==localDate()||!record||record.submitted;
 if(!profile.group){$('rankings').textContent='Add your name and a group code in My group to see your circle’s scores.';return;}
 $('rankings').textContent='Finding today’s little victories…';
 try{const scores=await api.list(profile.group,leaderboardDate);if(request!==leaderboardRequest)return;$('rankings').replaceChildren();if(!scores.length){$('rankings').textContent=leaderboardDate===localDate()?'A fresh page. Complete today’s puzzle to add the first score.':'No scores were recorded for this group on this date.';return;}
 const table=document.createElement('table');table.className='rank-table';const head=document.createElement('thead');head.innerHTML='<tr><th>Rank</th><th>Player</th><th>Time</th></tr>';table.append(head);const body=document.createElement('tbody');scores.forEach((s,i)=>{const row=document.createElement('tr');if(s.submission_id===`${clientId}:${leaderboardDate}`)row.className='self';[String(i+1),s.player_name,formatTime(s.score)].forEach(t=>{const cell=document.createElement('td');cell.textContent=t;row.append(cell);});body.append(row);});table.append(body);$('rankings').append(table);
 }catch(error){if(request===leaderboardRequest)$('rankings').textContent=`Couldn’t load the leaderboard. ${error.message} Your puzzle is still available.`;}}
function openRankings(){leaderboardDate=date;if(!$('leaderboard-dialog').open)$('leaderboard-dialog').showModal();loadRankings();}
$('leaderboard-button').onclick=openRankings;$('date-leaderboard').onclick=openRankings;$('win-rankings').onclick=()=>{$('win-dialog').close();openRankings();};$('refresh-rankings').onclick=loadRankings;$('retry-score').onclick=()=>{if(!profile.player||!profile.group){$('leaderboard-dialog').close();openGroup();}else retryPending();};
window.addEventListener('storage',event=>{if(event.key===scoreKey(date))updateMode();if(event.key==='hex.profile'){profile=store.get('hex.profile',profile);updateDateLeaderboard(true);}});
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
setInterval(()=>{save();const today=localDate();if(today!==knownToday){knownToday=today;updateDateLimits();updateMode();say('A new day has arrived. Choose Today for the new daily challenge.');}},1000);
function tick(){const time=formatTime(elapsed()),[whole,fraction]=time.split('.');$('timer').replaceChildren(document.createTextNode(whole));const span=document.createElement('span');span.textContent=`.${fraction}`;$('timer').append(span);requestAnimationFrame(tick);}
restore();render();if(paused)showPause();tick();
$('storage-note').textContent=config.mode==='mock'?'LOCAL MOCK LEADERBOARD · NO ACCOUNT NEEDED':'GROUP LEADERBOARD · ONE DAILY RESULT';
if(linkedGroup&&!profile.player&&!paused)openGroup();
if(isUnsolvableDate(labels))say('Tuesday, February 1 cannot be solved without flipping a photographed tile. Choose another date.');else if(!storageAvailable)say('Browser storage is unavailable. You can play, but official scores cannot be saved.');else if(started!==null)say('Welcome back. Your board and running timer have been restored.');else if(store.get(scoreKey(date)))say('Your official result for today is saved. Further attempts are unranked practice.');
