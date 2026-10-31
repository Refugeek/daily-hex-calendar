// Development-only solver for validating the puzzle set. Never bundled into the player app.
import {BOARD,PIECES,key,occupied} from '../engine.js';
// Exact-cover search: choose the uncovered cell / unused piece with fewest legal options.
const indices=new Map(BOARD.map((c,i)=>[key(c.q,c.r),i]));
const allMask=(1n<<BigInt(BOARD.length))-1n;
const options=PIECES.map(piece=>{
 const found=new Map();
 for(let rotation=0;rotation<6;rotation++)for(const cell of BOARD){
  const p={q:cell.q,r:cell.r,rotation},cells=occupied(piece,p),ids=cells.map(([q,r])=>indices.get(key(q,r)));
  if(ids.some(i=>i===undefined))continue;
  const mask=ids.reduce((m,i)=>m|(1n<<BigInt(i)),0n);
  if(!found.has(String(mask)))found.set(String(mask),{id:piece.id,p,mask,ids});
 }
 return [...found.values()];
});
export function solve(labels,maxNodes=2000000){
 const excluded=BOARD.reduce((m,c,i)=>labels.includes(c.label)?m|(1n<<BigInt(i)):m,0n);
 const byCell=BOARD.map(()=>[]),byPiece=options.map(os=>os.filter(o=>!(o.mask&excluded)));
 byPiece.flat().forEach(o=>o.ids.forEach(i=>byCell[i].push(o)));
 let nodes=0,limited=false;const result=Array(PIECES.length).fill(null);
 function search(mask,used){
  if(++nodes>maxNodes){limited=true;return false;}
  if(mask===allMask)return used===(1<<PIECES.length)-1;
  let best=null;
  const choose=list=>{const legal=list.filter(o=>!(used&(1<<o.id))&&!(o.mask&mask));if(best===null||legal.length<best.length)best=legal;};
  for(let i=0;i<BOARD.length;i++)if(!(mask&(1n<<BigInt(i)))){choose(byCell[i]);if(!best.length)return false;}
  for(let i=0;i<PIECES.length;i++)if(!(used&(1<<i))){choose(byPiece[i]);if(!best.length)return false;}
  for(const o of best){result[o.id]=o.p;if(search(mask|o.mask,used|(1<<o.id)))return true;result[o.id]=null;}
  return false;
 }
 return search(excluded,0)?{placements:result,nodes,status:'solved'}:{placements:null,nodes,status:limited?'limit':'unsolvable'};
}
