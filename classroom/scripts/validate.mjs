import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { project, splitRoute, routePath, fitBounds, distanceScale } from '../js/geo.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = async path => JSON.parse(await readFile(resolve(root,path),'utf8'));
const books = await json('data/curriculum.json');
assert.deepEqual(books.map(b=>b.id),['7a','7b','8a','8b','9a','9b']);
const expected=[21,22,22,24,22,22], ids=new Set();let events=0, lessons=0;
const unique=id=>{assert.equal(ids.has(id),false,`重复ID: ${id}`);ids.add(id);};
function coords(p){assert.ok(Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));assert.ok(p[0]>=-180&&p[0]<=180&&p[1]>=-90&&p[1]<=90,`坐标超界: ${p}`);}
for(const [bi,b] of books.entries()){
  unique(b.id);assert.ok(b.source.status);const list=b.units.flatMap(u=>u.lessons);assert.equal(list.length,expected[bi]);
  assert.deepEqual(list.map(l=>l.number),Array.from({length:expected[bi]},(_,i)=>i+1));
  for(const u of b.units){unique(u.id);for(const l of u.lessons){
    lessons++;unique(l.id);assert.ok(l.title&&l.overview&&l.knowledge.length);assert.equal(l.goals.length,2);assert.equal(l.inquiry.hints.length,2);assert.ok(l.inquiry.answer);
    assert.ok(l.kind==='activity'?l.events.length===0:l.events.length>=1);
    for(const e of l.events){events++;unique(e.id);assert.ok(e.title&&e.summary&&e.background&&e.process&&e.impact&&e.place&&e.dateLabel);assert.ok(e.year===null||Number.isInteger(e.year));assert.notEqual(e.year,0);if(e.endYear!==undefined)assert.ok(e.endYear>=e.year);coords(e.coords);e.route?.forEach(coords);}
  }}
}
assert.equal(lessons,133);assert.equal(events,357);
const voyages=books[4].units.flatMap(u=>u.lessons).find(l=>l.id==='9a-14').events;
assert.deepEqual(voyages.map(e=>e.year),[1488,1492,1498,1519]);assert.equal(voyages[3].endYear,1522);
assert.ok(voyages[1].route.at(-1)[0]<voyages[1].route[0][0],'哥伦布航线应向西');
assert.ok(voyages[2].route.some(p=>p[0]>=26&&p[0]<=30&&p[1]<=-34),'达·伽马航线须沿非洲南端绕行，不得直穿南非内陆');
const parts=splitRoute(voyages[3].route);assert.ok(parts.length>=2,'环球航行跨180°经线应分段');
for(const p of parts)for(let i=1;i<p.length;i++)assert.ok(Math.abs(p[i][0]-p[i-1][0])<=180,'航线不可横穿整幅地图');
assert.ok(!/NaN|Infinity/.test(routePath(voyages[3].route)));assert.deepEqual(project([0,0]),[500,500]);assert.ok(fitBounds([[116.4,39.9]],1.2).every(Number.isFinite));
const equator=distanceScale([0,0,1000,1000],1000,1000),north=distanceScale([0,project([0,60])[1]-500,1000,1000],1000,1000),zoom=distanceScale([250,250,500,500],1000,1000);
assert.ok(Math.abs(north.km/north.pixels/(equator.km/equator.pixels)-.5)<1e-6,'比例尺必须随参照纬度变化');
assert.ok(Math.abs(zoom.km/zoom.pixels/(equator.km/equator.pixels)-.5)<1e-6,'比例尺必须随缩放变化');
const borderIndex=await json('data/borders/index.json');for(const p of borderIndex){const data=await json('data/borders/'+p.file);assert.ok(data.features.length);assert.ok(data.features.every(f=>f.properties.layer==='polity'),'公开包只能包含GPL政权图层');}
const raw=await readFile(resolve(root,'data/curriculum.json'),'utf8');assert.ok(!raw.includes('/Users/'),'公开数据不得含本机个人路径');
for(const f of ['index.html','css/classroom.css','js/app.js','js/map.js','assets/paper.png','assets/world-land.json','assets/fonts/heading.woff2','assets/fonts/serif.woff2'])await access(resolve(root,f));
const names=await readdir(root,{recursive:true});assert.ok(!names.some(n=>/\.(pdf|tif|zip)$/i.test(n)),'站点目录不得附带教材扫描或原始压缩包');
console.log(`通过：${books.length}册，${lessons}课，${events}节点，${borderIndex.length}个课程相关政权快照；ID、日期、坐标、环球航线分段与发布边界已校验。`);
