export const WEEKDAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
export const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const rows = [
 ['JAN','FEB','MAR','APR','MAY','JUN'],
 ['SUN','JUL','AUG','SEP','OCT','NOV','DEC'],
 ['MON','1','2','3','4','5','6','7'],
 ['TUE','8','9','10','11','12','13','14'],
 ['WED','15','16','17','18','19','20','21'],
 ['THU','22','23','24','25','26','27'],
 ['FRI','SAT','28','29','30','31']
];
export const BOARD = rows.flatMap((row,r)=>row.map((label,i)=>({q:i+[0,-1,-2,-2,-3,-3,-3][r],r,label})));
export const key = (q,r)=>`${q},${r}`;
export const rotate = ([q,r])=>[-r,q+r];
export function turn(shape,n=1){return shape.map(c=>{for(let i=0;i<((n%6)+6)%6;i++)c=rotate(c);return c;});}
const norm = s=>{const a=[...s].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);return a.map(([q,r])=>[q-a[0][0],r-a[0][1]]);};
const signature = s=>JSON.stringify(norm(s));
export function orientations(shape){return [...new Map(Array.from({length:6},(_,n)=>[signature(turn(shape,n)),turn(shape,n)])).values()];}
// Traced from the twelve separate face-up silhouettes in IMG_1409.jpeg.
// Repeated shapes in the photo are intentional. J and K have different handedness.
// Every cell list is explicit: no generated catalog and no reflections.
export const GEOMETRY_VERSION = "photo-v2";
export const PIECES = [
  { cells: [[0,0],[0,1],[0,2],[1,0],[1,1]], reference: "top compact pentagon cluster" }, // A
  { cells: [[0,0],[0,1],[1,0]], reference: "upper-right triangle" }, // B
  { cells: [[0,0],[0,1],[0,2],[0,3]], reference: "upper diagonal straight strip" }, // C
  { cells: [[0,0],[0,1],[1,0],[2,-1],[2,0]], reference: "right-hand five-cell bow tie" }, // D
  { cells: [[0,0],[0,1],[1,-1]], reference: "far-right bent trihex" }, // E
  { cells: [[0,0],[0,1],[1,-1],[1,0]], reference: "right-middle compact rhombus" }, // F
  { cells: [[0,0],[0,1],[0,2],[1,1]], reference: "lower-right branched tetrahex" }, // G
  { cells: [[0,0],[0,1],[0,2],[1,1]], reference: "bottom-right branched tetrahex" }, // H
  { cells: [[0,0],[0,1],[1,-1]], reference: "bottom bent trihex" }, // I
  { cells: [[0,0],[0,1],[0,2],[1,2]], reference: "bottom central hooked strip" }, // J
  { cells: [[0,0],[0,1],[0,2],[1,-1]], reference: "bottom-left hooked strip" }, // K
  { cells: [[0,0],[0,1],[1,-1],[1,0]], reference: "bottom-left compact rhombus" }, // L
].map((piece,id)=>({...piece,id,name:String.fromCharCode(65+id)}));
export function localDate(d=new Date()){return `${String(d.getFullYear()).padStart(4,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function targets(date){const d=new Date(`${date}T12:00:00`);return [WEEKDAYS[d.getDay()],MONTHS[d.getMonth()],String(d.getDate())];}
// This corner cannot be tiled by the photographed faces without reflecting a tile.
export function isUnsolvableDate(labels){return ['TUE','FEB','1'].every(label=>labels.includes(label));}
export function occupied(piece,placement){return turn(piece.cells,placement.rotation).map(([q,r])=>[q+placement.q,r+placement.r]);}
export function canPlace(id,placement,placements,labels){
 const blocked=new Set(BOARD.filter(c=>labels.includes(c.label)).map(c=>key(c.q,c.r)));
 for(const [other,p]of placements.entries())if(p&&other!==id)for(const[q,r]of occupied(PIECES[other],p))blocked.add(key(q,r));
 const board=new Set(BOARD.map(c=>key(c.q,c.r)));
 return occupied(PIECES[id],placement).every(([q,r])=>board.has(key(q,r))&&!blocked.has(key(q,r)));
}
export function isWin(placements,labels){return placements.length===PIECES.length&&placements.every((p,i)=>p&&canPlace(i,p,placements,labels))&&PIECES.reduce((n,p)=>n+p.cells.length,0)===BOARD.length-3;}
export function roundAxial(q,r){let x=Math.round(q),z=Math.round(r),y=Math.round(-q-r);const dx=Math.abs(x-q),dz=Math.abs(z-r),dy=Math.abs(y+q+r);if(dx>dy&&dx>dz)x=-y-z;else if(dz>dy)z=-x-y;return [x,z];}
