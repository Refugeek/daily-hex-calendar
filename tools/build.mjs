import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');
const [template,css,engine,leaderboard,geometry,config,app]=await Promise.all(['index.template.html','style.css','engine.js','leaderboard.js','geometry.js','config.js','app.js'].map(read));
function scope(source){
 const names=[...source.matchAll(/^export (?:const|function) (\w+)/gm)].map(m=>m[1]);
 return `const {${names.join(',')}} = (()=>{\n${source.replaceAll(/^export /gm,'')}\nreturn {${names.join(',')}};\n})();`;
}
const runtime=`${config}\n(()=>{'use strict';\n${scope(engine)}\n${scope(leaderboard)}\n${scope(geometry)}\n${app.replaceAll(/^import .*;\n/gm,'')}\n})();`;
// Escape embedded script terminators even if a later comment or config contains one.
const safe=source=>source.replaceAll(/<\/script/gi,'<\\/script');
const html=template.replace('<!-- INLINE_STYLES -->',`<style>\n${css}\n</style>`).replace('<!-- INLINE_SCRIPTS -->',`<script>\n${safe(runtime)}\n</script>`);
await writeFile(new URL('index.html',root),html);
console.log(`Built self-contained index.html (${Buffer.byteLength(html).toLocaleString()} bytes). No runtime files, network, or server required for local play.`);
