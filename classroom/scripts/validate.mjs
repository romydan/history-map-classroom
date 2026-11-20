import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { project, splitRoute, routePath, fitBounds, distanceScale } from '../js/geo.js';
import {routeState} from '../js/learning-map.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = async path => JSON.parse(await readFile(resolve(root,path),'utf8'));
const books = await json('data/curriculum.json');
const mapData=await json('data/map-learning.json'),mapPlans=new Map(mapData.lessonMaps.map(m=>[m.lessonId,m])),mapAudit=new Map(mapData.lessons.map(m=>[m.lessonId,m]));
assert.equal(mapPlans.size,133);assert.equal(mapAudit.size,133);
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
    for(const e of l.events){events++;unique(e.id);assert.ok(e.title&&e.summary&&e.background&&e.process&&e.impact&&e.place&&e.dateLabel);assert.ok(e.year===null||Number.isInteger(e.year));assert.notEqual(e.year,0);if(e.endYear!==undefined)assert.ok(e.endYear>=e.year);if(e.coords!==null)coords(e.coords);else assert.ok(/多地|多地区|不设唯一|不强定|同时爆发|战区/.test(e.place),'非单点事件必须说明地理含义');e.route?.forEach(coords);}
  }}
}
assert.equal(lessons,133);assert.equal(events,358);
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
let routeCount=0,areaCount=0;
const regionIds=new Set((await json('assets/teaching-regions.json')).features.map(f=>f.properties.id));
for(const book of books)for(const unit of book.units)for(const lesson of unit.lessons){
 const m=mapPlans.get(lesson.id),a=mapAudit.get(lesson.id);assert.ok(m&&a&&a.spatialSkill&&a.rationale&&m.scopeNote&&m.sources.length,'每课必须有用途、精度与来源');
 const eventIds=new Set(lesson.events.map(e=>e.id));
 const checkRefs=feature=>{assert.ok(feature.eventIds?.length||feature.contextOnly||feature.kind==='reference','图层需绑定阶段或声明背景');for(const id of feature.eventIds || [])assert.ok(eventIds.has(id),'图层阶段不可指向其他课');};
 if(['route','network'].includes(a.mode))assert.ok(m.routes.length,'路线或路网课不能仅有点');
 if(a.mode==='area')assert.ok(m.areas.length||m.historicalContext||m.historicalPolitySnapshot,'区域课必须有区域或有据的历史政权快照');
 const featureIds=new Set();
 for(const r of m.routes){routeCount++;assert.ok(!featureIds.has(r.id));featureIds.add(r.id);checkRefs(r);assert.ok(r.waypoints.length>=2&&r.note&&r.group&&/^#[0-9a-f]{6}$/i.test(r.color));r.waypoints.forEach(p=>coords(p.coords));assert.ok(!/NaN|Infinity/.test(routePath(r.waypoints.map(p=>p.coords))));if(['alliance','front','canal','river-connection'].includes(r.kind))assert.equal(r.directional,false,'关系、战线和运河不能冒充单向行军');}
 for(const a of m.areas){areaCount++;checkRefs(a);if(a.featureIds){a.featureIds.forEach(id=>assert.ok(regionIds.has(id)));assert.equal(a.kind,'modern-reference');assert.ok(/今|现代/.test(a.note),'今国面不得冒充历史疆界');}else{assert.ok(a.ring.length>=4);a.ring.forEach(coords);assert.deepEqual(a.ring[0],a.ring.at(-1));}}
 for(const p of m.places){coords(p.coords);assert.ok(p.name);for(const id of p.eventIds || [])assert.ok(eventIds.has(id));}
}
assert.ok(routeCount>=95&&areaCount>=50,'必须覆盖示例之外的已审计几何');
const march=mapPlans.get('8a-15'),silk=mapPlans.get('7a-14');
assert.equal(march.routes.length,6);assert.ok(march.places.some(p=>p.name==='会宁'));assert.ok(march.places.some(p=>p.name==='将台堡'));
assert.ok(silk.routes.some(r=>r.kind==='mission'));assert.ok(silk.routes.some(r=>r.kind==='trade'&&r.directional===false));
assert.ok(books[0].units.flatMap(u=>u.lessons).find(l=>l.id==='7a-14').events.some(e=>e.id==='7a-14-e5'&&e.year===-119));
assert.ok(!mapPlans.get('9b-14').routes.some(r=>r.id.includes('poland')),'1939侵略不可绑定1933上台');
const nato=mapPlans.get('9b-16');assert.ok(nato.places.filter(p=>/1952|1955加入/.test(p.group||'')).every(p=>!p.eventIds.includes('9b-16-e2')),'1949阶段不能提前点亮后来成员');
// Test the teaching states, not just the existence of a coordinate array.
const lessonById=new Map(books.flatMap(b=>b.units.flatMap(u=>u.lessons)).map(l=>[l.id,l]));
assert.equal(routeState(march.routes.find(r=>r.id==='8a-15-chishui'),lessonById.get('8a-15'),1),'future','1935年1月会议不能显示四渡已经完成');
assert.equal(routeState(march.routes.find(r=>r.id==='8a-15-turn'),lessonById.get('8a-15'),1),'current');
// A coarse land mask rejects substantial accidental inland sea segments.
// It is not proof of an exact historical track or a harbor-scale coastline.
const land=await json('assets/world-land.json');
const polygons=land.features.flatMap(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates]).map(rings=>({rings,minX:Math.min(...rings[0].map(p=>p[0])),maxX:Math.max(...rings[0].map(p=>p[0])),minY:Math.min(...rings[0].map(p=>p[1])),maxY:Math.max(...rings[0].map(p=>p[1]))}));
function inRing([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function onLand(p){return polygons.some(g=>p[0]>=g.minX&&p[0]<=g.maxX&&p[1]>=g.minY&&p[1]<=g.maxY&&inRing(p,g.rings[0])&&!g.rings.slice(1).some(r=>inRing(p,r)));}
const distance=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])/2*Math.PI/180),a[1]-b[1])*111.2;
for(const m of mapPlans.values())for(const route of m.routes){
 if(!['sea','mixed'].includes(route.medium))continue;
 for(let i=1;i<route.waypoints.length;i++){
  if(route.medium==='mixed'&&!route.seaSegments.includes(i-1))continue;
  const a=route.waypoints[i-1],b=route.waypoints[i];if(Math.abs(a.coords[0]-b.coords[0])>180)continue;
  const length=distance(a.coords,b.coords),n=Math.max(3,Math.ceil(length/15));let run=0,maxRun=0;
  for(let j=0;j<=n;j++){const t=j/n,p=a.coords.map((v,k)=>v+t*(b.coords[k]-v));const near=(a.name&&distance(p,a.coords)<45)||(b.name&&distance(p,b.coords)<45);run=onLand(p)&&!near?run+length/n:0;maxRun=Math.max(maxRun,run);}
  assert.ok(maxRun<=90,`海路不得明显穿陆: ${route.id} (${maxRun.toFixed(0)}km)`);
 }
}
const raw=await readFile(resolve(root,'data/curriculum.json'),'utf8');assert.ok(!raw.includes('/Users/'),'公开数据不得含本机个人路径');
for(const f of ['index.html','css/classroom.css','js/app.js','js/map.js','assets/paper.png','assets/world-land.json','assets/fonts/heading.woff2','assets/fonts/serif.woff2'])await access(resolve(root,f));
const mapRaw=await readFile(resolve(root,'data/map-learning.json'),'utf8');assert.ok(!mapRaw.includes('/Users/')&&!mapRaw.includes('local:/'));
const names=await readdir(root,{recursive:true});assert.ok(!names.some(n=>/\.(pdf|tif|zip)$/i.test(n)),'站点目录不得附带教材扫描或原始压缩包');
console.log(`通过：${books.length}册，${lessons}课，${events}节点，${borderIndex.length}个课程相关政权快照；${routeCount}条类型化线路、${areaCount}个区域；六册地图角色、阶段引用、坐标与发布边界已校验。`);
