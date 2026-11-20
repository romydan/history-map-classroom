import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dest=resolve(source,'../classroom-dist');
await rm(dest,{recursive:true,force:true});
await mkdir(dest,{recursive:true});
// Explicit publication boundary: never publish the upstream CHGIS layer or textbooks.
const files=['index.html','css','js','data','ATTRIBUTION.md','LICENSE','assets/favicon.svg','assets/paper.png','assets/world-land.json','assets/world-rivers.json','assets/world-color-mercator.jpg','assets/world-color-sources.json','assets/fonts/heading.woff2','assets/fonts/serif.woff2','assets/fonts/OFL.txt','assets/fonts/NotoSerifSC-OFL.txt','assets/fonts/source.json'];
for(const file of files){await mkdir(dirname(resolve(dest,file)),{recursive:true});await cp(resolve(source,file),resolve(dest,file),{recursive:true});}
await writeFile(resolve(dest,'.nojekyll'),'');
const manifest={builtAt:new Date().toISOString(),source:'classroom/',scope:'Only classroom app, curated curriculum, Natural Earth assets and GPL polity exports; no textbook pages or CHGIS prefectures.'};
await writeFile(resolve(dest,'build.json'),JSON.stringify(manifest,null,2));
console.log('GitHub Pages artifact: '+dest);
