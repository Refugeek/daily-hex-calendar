import {solve} from '../tools/solver.js';
import {MONTHS,WEEKDAYS,isWin,isUnsolvableDate} from '../engine.js';
const failures=[],unavailable=[];let count=0,maxNodes=0;const start=Date.now();
for(let month=0;month<12;month++)for(let day=1;day<=[31,29,31,30,31,30,31,31,30,31,30,31][month];day++)for(const weekday of WEEKDAYS){
 const labels=[weekday,MONTHS[month],String(day)],result=solve(labels);count++;maxNodes=Math.max(maxNodes,result.nodes);if(isUnsolvableDate(labels)&&result.status==='unsolvable')unavailable.push(labels);else if(!result.placements||!isWin(result.placements,labels))failures.push(labels);
 if(count%100===0)console.log(JSON.stringify({checked:count,failures:failures.length,seconds:Math.round((Date.now()-start)/1000)}));
}
console.log(JSON.stringify({checked:count,solvable:count-unavailable.length,unavailable,failures,maxNodes,seconds:(Date.now()-start)/1000}));if(failures.length)process.exitCode=1;
