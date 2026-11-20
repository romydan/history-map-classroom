import { cp, mkdir, rm, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dest=resolve(source,'../classroom-dist');
await rm(dest,{recursive:true,force:true});
await mkdir(dest,{recursive:true});
// Explicit publication boundary: never publish the upstream CHGIS layer or textbooks.
const files=['index.html','css','js','data','ATTRIBUTION.md','MAP-LEARNING.md','LICENSE','assets/favicon.svg','assets/paper.png','assets/world-land.json','assets/teaching-regions.json','assets/world-rivers.json','assets/world-color-mercator.jpg','assets/world-color-sources.json','assets/fonts/heading.woff2','assets/fonts/serif.woff2','assets/fonts/OFL.txt','assets/fonts/NotoSerifSC-OFL.txt','assets/fonts/source.json'];
for(const file of files){await mkdir(dirname(resolve(dest,file)),{recursive:true});await cp(resolve(source,file),resolve(dest,file),{recursive:true});}
await writeFile(resolve(dest,'.nojekyll'),'');
// One content fingerprint keeps HTML, modules, data and font revisions together
// on Pages. A reload must not mix the new map model with a cached old module.
const publishedFiles=[];
for(const name of (await readdir(dest,{recursive:true})).sort())if((await stat(resolve(dest,name))).isFile())publishedFiles.push(name);
const hash=createHash('sha256');
for(const name of publishedFiles){hash.update(name+'\0');hash.update(await readFile(resolve(dest,name)));}
const release=hash.digest('hex').slice(0,12);
for(const name of publishedFiles.filter(n=>/\.(html|css|js)$/.test(n))){
 const path=resolve(dest,name),text=await readFile(path,'utf8');
 await writeFile(path,text.replace(/(['"(])(\.{1,2}\/[^'"\s()<>]+?\.(?:js|json|css|woff2|jpg|png|svg))(?=['")])/g,`$1$2?v=${release}`));
}
const manifest={builtAt:new Date().toISOString(),release,source:'classroom/',scope:'Only classroom app, curated curriculum, Natural Earth assets and GPL polity exports; no textbook pages or CHGIS prefectures.'};
await writeFile(resolve(dest,'build.json'),JSON.stringify(manifest,null,2));
console.log('GitHub Pages artifact: '+dest);
