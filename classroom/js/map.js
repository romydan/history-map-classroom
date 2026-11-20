import { project, geometryPath, routePath, fitBounds, fitLearningBounds, clampView, distanceScale } from './geo.js';
import { learningMap, routeState, routePoints, lessonMapPoints, hasLearningLayers, mapContextYear } from './learning-map.js';
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
const label = (text, [x,y], attrs = {}) => { const n = el('text', { x, y, ...attrs }); n.textContent = text; return n; };
let atlasData;
async function loadGeo() {
  if (!atlasData) atlasData = Promise.all([fetch('./assets/world-land.json').then(r => { if (!r.ok) throw new Error('地图陆地数据未能载入'); return r.json(); }), fetch('./data/borders/index.json').then(r => r.ok ? r.json() : []).catch(() => []),fetch('./assets/world-rivers.json').then(r=>r.ok?r.json():null).catch(()=>null),fetch('./assets/teaching-regions.json').then(r=>{if(!r.ok)throw new Error('课程区域图层未能载入');return r.json();})]);
  return atlasData;
}
export class AtlasMap {
  constructor(container, { onSelect, onInspect, compact = false } = {}) {
    this.root = container; this.onSelect = onSelect; this.onInspect=onInspect; this.compact = compact; this.layers = true; this.showPlaces = true; this.overview = false; this.disposed = false;
    this.svg = el('svg', { class: 'geo-map', role: compact?'img':'group', 'aria-label': compact?'本课地图预览':'历史事件地图，可用地点按钮或本课时序选择事件', preserveAspectRatio:'xMidYMid slice' });
    this.root.append(this.svg);
    if(!compact){this.scale=document.createElement('div');this.scale.className='map-scale';this.scale.setAttribute('role','img');this.root.append(this.scale);}
    this.observer = new ResizeObserver(() => { if (this.lesson && !this.drag) this.fit(); }); this.observer.observe(container);
    this.listen();
  }
  async setLesson(lesson, book, index = 0, { preserve = false } = {}) {
    this.lesson = lesson; this.book = book; this.index = index;
    this.root.classList.toggle('simplified-map-labels',!!learningMap(lesson).mobileHideContextLabels);
    try {
      const [land, borders, rivers,regions] = await loadGeo(); if (this.disposed) return;
      this.land = land; this.borders = borders;this.rivers=rivers;this.regions=regions; this.render(); if (!preserve || !this.view) this.fit(); else this.applyView();
      this.loadBorder();
    } catch (err) { this.root.querySelector('.map-error')?.remove(); const p = document.createElement('p'); p.className='map-error'; p.textContent=`${err.message}。请刷新页面重试；右侧知识内容仍可阅读。`; this.root.append(p); }
  }
  async setEvent(index) { this.index = index; if (!this.land) return; this.render();if(learningMap(this.lesson).camera==='stage')this.fit();else this.applyView();this.loadBorder(); }
  render() {
    if (!this.baseReady) {
    this.svg.replaceChildren();
    const defs = el('defs');
    const marker = el('marker', { id: this.compact ? 'preview-arrow' : 'voyage-arrow', viewBox:'0 0 12 12', refX:10, refY:6, markerWidth:8, markerHeight:8, orient:'auto-start-reverse', markerUnits:'userSpaceOnUse' });
    marker.append(el('path', { d:'M1 1L11 6L1 11L4 6Z', fill:'#b5452f' })); defs.append(marker); this.svg.append(defs);
    this.svg.append(el('rect', { x:-1000,y:-1000,width:3000,height:3000,fill:'#b6cbc9' }));
    const landGroup = el('g', { class:'land-layer' });
    this.land.features.forEach(f => landGroup.append(el('path', { d:geometryPath(f.geometry), fill:'#e4d9b7', stroke:'#9f9d7e', 'stroke-width':'.55', 'vector-effect':'non-scaling-stroke' })));
    this.svg.append(landGroup);
    this.svg.setAttribute('aria-busy','true');
    const terrain=el('image', { href:'./assets/world-color-mercator.jpg', x:0,y:0,width:1000,height:1000, preserveAspectRatio:'none', class:'terrain-image' });
    terrain.addEventListener('load',()=>this.svg.setAttribute('aria-busy','false'),{once:true});
    terrain.addEventListener('error',()=>{this.svg.setAttribute('aria-busy','false');const n=document.createElement('p');n.className='map-error';n.textContent='地形图暂未载入，地点与路线仍可查看。请刷新页面重试。';this.root.append(n);},{once:true});
    this.svg.append(terrain);
    const coast=el('g',{'aria-hidden':'true'});this.land.features.forEach(f=>coast.append(el('path',{d:geometryPath(f.geometry),fill:'none',stroke:'#8f967f','stroke-width':'.5','stroke-opacity':'.6','vector-effect':'non-scaling-stroke'})));this.svg.append(coast);
    const rivers=el('g',{'aria-hidden':'true',class:'rivers-layer'});this.rivers?.features.forEach(f=>rivers.append(el('path',{d:geometryPath(f.geometry),fill:'none',stroke:'#6791a1','stroke-width':'.7','stroke-opacity':'.75','vector-effect':'non-scaling-stroke'})));this.svg.append(rivers);
    this.polities = el('g', { class:'polity-layer' }); this.svg.append(this.polities);
    this.context = el('g', { class:'map-context' });
    const isWorld = this.book.id.startsWith('9');
    const labels = isWorld ? [['美 洲',[-104,35]],['欧 洲',[21,51]],['非 洲',[20,8]],['亚 洲',[94,42]],['大 西 洋',[-35,0]],['印 度 洋',[76,-24]],['太 平 洋',[-130,-19]]] : [['青 藏 高 原',[84,32]],['蒙 古 高 原',[105,46]],['太 平 洋',[142,23]],['印 度 洋',[75,6]]];
    labels.forEach(([text, point]) => this.context.append(label(text, project(point), { class: /洋/.test(text) ? 'ocean-name' : 'region-name', 'text-anchor':'middle' })));
    this.svg.append(this.context);
    this.baseReady=true;
    }
    this.points?.remove();this.svg.querySelectorAll('[data-transient]').forEach(n=>n.remove());this.annotation=null;this.learningStops=[];
    const event = this.lesson.events[this.index];
    if (hasLearningLayers(this.lesson)) this.renderLearningLayers();
    else if (event?.route?.length > 1) {
      const d=routePath(event.route);
      this.svg.append(el('path', { d, class:'route-casing', fill:'none', 'data-transient':'true', 'vector-effect':'non-scaling-stroke' }));
      this.svg.append(el('path', { d, class:'voyage-route', fill:'none', 'data-transient':'true', 'marker-mid':`url(#${this.compact ? 'preview-arrow' : 'voyage-arrow'})`, 'marker-end':`url(#${this.compact ? 'preview-arrow' : 'voyage-arrow'})`, 'vector-effect':'non-scaling-stroke' }));
      this.routeLabels(event);
      if(!this.compact)this.routeAnnotation(event);
    }
    this.points = el('g', { class:'event-points' });
    this.lesson.events.forEach((e, i) => {
      if (!e.coords || (this.compact && i !== this.index)) return;
      // Coincident events share the active map point; the timeline retains each event.
      if (i !== this.index && event?.coords && e.coords.every((n,j) => Math.abs(n-event.coords[j]) < 1e-6)) return;
      const [x,y] = project(e.coords), active = i === this.index;
      const mappedPlace=this.learningStops.find(p=>Math.hypot(p.xy[0]-x,p.xy[1]-y)<.2);
      const g = el('g', { class:`event-point ${active ? 'is-active' : ''}`, 'data-event':i, role:this.compact?'none':'button',tabindex:this.compact?-1:0,'aria-label':`${e.dateLabel} ${e.title}`, 'aria-pressed':active?'true':'false' });
      g.append(el('circle', { cx:x,cy:y,r:active?5:3.1,class:'point-halo' })); g.append(el('circle',{cx:x,cy:y,r:active?2.8:1.5,class:'point-dot'}));
      const title=el('title'); title.textContent=`${e.title} · ${e.place}`;g.append(title);
      const nearRoute = !active && event?.route?.some(p=>{const a=project(p);return Math.hypot(a[0]-x,a[1]-y)<12;});
      if (!hasLearningLayers(this.lesson) && !mappedPlace && (active || (this.lesson.events.length <= 4 && !nearRoute))) g.append(label(e.id==='9a-14-e2'?'巴哈马群岛':e.place.replace(/（.*?）/g,''), [x,y], { class:`place-name ${active?'active-place':''}`,'data-anchor-x':x,'data-anchor-y':y,'data-dx':7,'data-dy':11 }));
      g.addEventListener('click', ev=>{ev.stopPropagation();this.onSelect?.(i);});
      g.addEventListener('keydown', ev=>{if(['Enter',' '].includes(ev.key)){ev.preventDefault();this.onSelect?.(i);}});
      this.points.append(g);
    });
    this.svg.append(this.points);
    this.points.style.display=this.showPlaces?'':'none';this.context.style.display=this.layers?'':'none';
  }
  renderLearningLayers() {
    const plan=learningMap(this.lesson),group=el('g',{'data-transient':'true',class:'learning-layers'});
    const areas=el('g',{class:'learning-areas'}),routes=el('g',{class:'learning-routes'}),stops=el('g',{class:'learning-stops'});
    group.append(areas,routes,stops);this.svg.append(group);
    const positions=new Map(),event=this.lesson.events[this.index];
    const addPlace=(p,status,color,defaultPriority=2)=>{
      if(!p.name || !p.coords) return;
      const xy=project(p.coords),key=p.coords.map(n=>n.toFixed(4)).join(','),priority=p.labelPriority ?? defaultPriority;
      const old=positions.get(key),current=status==='current'||status==='overview'||p.eventIds?.includes(event?.id);
      if(!old || (current&&!old.current) || (current===old.current&&priority<old.priority))positions.set(key,{...p,xy,priority,current,status,color,endpoint:p.endpoint||old?.endpoint});
      else if(p.endpoint)old.endpoint=true;
    };
    for(const area of plan.areas || []) {
      const status=routeState(area,this.lesson,this.index,this.overview),color=area.color || '#96712e';
      const g=el('g',{class:`learning-area area-${status}`,'data-area-id':area.id,style:`--layer-color:${color}`});
      const geometries=area.featureIds?this.regions.features.filter(f=>area.featureIds.includes(f.properties.id)).map(f=>f.geometry):[{type:'Polygon',coordinates:[area.ring]}];
      const path=el('path',{d:geometries.map(geometryPath).join(''),'vector-effect':'non-scaling-stroke'});
      const title=el('title');title.textContent=`${area.label}：${area.note || plan.scopeNote || ''}`;path.append(title);g.append(path);areas.append(g);
      if(area.labelAnchor)addPlace({name:area.label,coords:area.labelAnchor,labelPriority:2,eventIds:area.eventIds,labelOnly:true},status,color);
    }
    // Paint contextual routes first, selected-stage routes last.
    const list=(plan.routes || []).map(route=>({route,status:routeState(route,this.lesson,this.index,this.overview)}));
    list.sort((a,b)=>Number(a.status==='current')-Number(b.status==='current'));
    for(const {route,status} of list) {
      const color=route.color || '#b5452f',g=el('g',{class:`learning-route route-${status} kind-${route.kind || 'movement'}`,'data-route-id':route.id,'data-route-state':status,style:`--layer-color:${color}`});
      const d=routePath(routePoints(route));
      g.append(el('path',{d,class:'learning-route-casing',fill:'none','vector-effect':'non-scaling-stroke'}));
      const attrs={d,class:'learning-route-line',fill:'none','vector-effect':'non-scaling-stroke'};
      if(route.directional!==false){attrs['marker-mid']=`url(#route-direction-${route.id})`;attrs['marker-end']=`url(#route-direction-${route.id})`;}
      const marker=el('marker',{id:`route-direction-${route.id}`,viewBox:'0 0 12 12',refX:10,refY:6,markerWidth:9,markerHeight:9,orient:'auto',markerUnits:'userSpaceOnUse'});
      marker.append(el('path',{d:'M1 1L11 6L1 11L4 6Z',fill:status==='future'?'#8c8374':color}));g.append(marker);
      const path=el('path',attrs),title=el('title');title.textContent=`${route.label}：${route.note || plan.scopeNote || ''}`;path.append(title);g.append(path);routes.append(g);
      route.waypoints.forEach((p,i)=>addPlace({...p,endpoint:i===0||i===route.waypoints.length-1},status,color,i===0||i===route.waypoints.length-1?1:2));
    }
    for(const p of plan.places || []) addPlace(p,routeState(p,this.lesson,this.index,this.overview),p.color || '#5d5548',2);
    for(const p of plan.labels || []) addPlace({...p,labelOnly:true},routeState(p,this.lesson,this.index,this.overview),p.color || '#5d5548',1);
    const order={current:0,overview:0,earlier:1,context:2,future:3};
    this.learningStops=[...positions.values()].sort((a,b)=>(order[a.status]-order[b.status])||a.priority-b.priority||Number(b.endpoint)-Number(a.endpoint));
    for(const p of this.learningStops) {
      const [x,y]=p.xy,g=el('g',{class:`learning-place ${p.current?'place-current':''} place-${p.status}`,'data-learning-place':p.name,style:`--layer-color:${p.status==='future'?'#8c8374':p.color}`,role:this.compact?'none':'button',tabindex:this.compact?-1:0,'aria-label':`地图地点：${p.name}${p.dateLabel?'，'+p.dateLabel:''}`});
      const t=el('title');t.textContent=[p.name,p.dateLabel,p.note].filter(Boolean).join(' · ');g.append(t);
      if(!p.labelOnly)g.append(el('circle',{cx:x,cy:y,r:3.2,'vector-effect':'non-scaling-stroke'}));
      const n=label(p.name,[x,y],{class:`place-name learning-place-label ${p.current&&p.priority===1?'active-place':''}`,'data-anchor-x':x,'data-anchor-y':y,'data-dx':p.labelDx ?? 7,'data-dy':p.labelDy ?? -7});
      const inspect=ev=>{ev.stopPropagation();if(p.eventIds?.length===1){const index=this.lesson.events.findIndex(e=>e.id===p.eventIds[0]);if(index>=0&&index!==this.index){this.onSelect?.(index);return;}}this.onInspect?.(p);};
      g.addEventListener('click',inspect);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();inspect(ev);}});
      g.append(n);stops.append(g);p.node=g;p.label=n;
    }
    stops.style.display=this.showPlaces?'':'none';
    const annotated=list.find(({route,status})=>route.annotation&&status==='current');
    if(annotated&&!this.compact)this.routeAnnotation({...event,route:routePoints(annotated.route),mapAnnotation:annotated.route.annotation});
  }
  routeLabels(event) {
    const start=event.route[0], g=el('g', {class:'route-labels','data-transient':'true'});
    const [x,y]=project(start); g.append(el('circle',{cx:x,cy:y,r:3,class:'route-origin',fill:'#fff7e8',stroke:'#b5452f','stroke-width':1,'vector-effect':'non-scaling-stroke'}));
    if (event.id.startsWith('9a-14') && event.id!=='9a-14-e4') {
      const origin=event.id==='9a-14-e2'?'帕洛斯':event.id==='9a-14-e4'?'塞维利亚':'里斯本';
      g.append(label(origin,[x,y],{class:'place-name active-place','data-anchor-x':x,'data-anchor-y':y,'data-dx':7,'data-dy':-7}));
      if(event.id==='9a-14-e2') { const p=project([-16.3,28.3]);g.append(el('circle',{cx:p[0],cy:p[1],r:4.5,class:'route-stop',fill:'#fff7e8',stroke:'#776957','stroke-width':1.6,'vector-effect':'non-scaling-stroke'}));g.append(el('circle',{cx:p[0],cy:p[1],r:1.7,class:'route-stop-inner',fill:'#776957'}));g.append(label('加那利群岛',p,{class:'place-name','data-anchor-x':p[0],'data-anchor-y':p[1],'data-dx':3,'data-dy':13})); }
    }
    this.svg.append(g);
    g.style.display=this.showPlaces?'':'none';
  }
  routeAnnotation(event){
    const names=['迪亚士','哥伦布','达·伽马','麦哲伦船队'];
    const short=event.mapAnnotation || (event.id.startsWith('9a-14')?names[this.index]:event.keywords[0]||event.title);
    const text=`${event.id==='9a-14-e3'?'1498年':event.dateLabel} · ${short}`;
    const anchor=project(event.route[Math.floor(event.route.length/2)]);
    const group=el('g',{class:'event-annotation','data-transient':'true','aria-label':text});
    const tail=el('path',{class:'annotation-tail','vector-effect':'non-scaling-stroke'});
    const rect=el('rect',{class:'annotation-box','vector-effect':'non-scaling-stroke'});
    const textNode=label(text,[0,0],{class:'annotation-label','text-anchor':'middle'});
    group.append(tail,rect,textNode);this.svg.append(group);
    const width=[...text].reduce((n,c)=>n+(/[\u2e80-\uffff]/.test(c)?16:/\s/.test(c)?4.5:8.5),26);
    this.annotation={group,tail,rect,text:textNode,anchor,width,short,full:text};
  }
  async loadBorder() {
    const token = this.borderToken = Symbol(), plan=learningMap(this.lesson),year=mapContextYear(this.lesson,this.index);
    this.polities?.replaceChildren();
    if (!this.layers || plan.hidePolity || this.book.id.startsWith('9') || !Number.isInteger(year)) return;
    const phase=this.borders?.find(p=>year>=p.from && year<=p.to); if(!phase) return;
    try {
      const r=await fetch(`./data/borders/${phase.file}`); if(!r.ok) return; const data=await r.json(); if(this.disposed || this.borderToken!==token) return;
      data.features.forEach(f=>{
        const p=f.properties; this.polities.append(el('path',{d:geometryPath(f.geometry),fill:p.tint||'#c6952b','fill-opacity':'.14',stroke:p.tint||'#8b6e46','stroke-opacity':'.72','stroke-width':'.8','vector-effect':'non-scaling-stroke'}));
        if(p.anchor) this.polities.append(label(p.title,project(p.anchor),{class:'polity-name','text-anchor':'middle'}));
      });
    } catch { /* Geographic reference stays available if an optional polity layer cannot load. */ }
  }
  fit() {
    if(!this.lesson) return;this.focusedRoute=null;
    const events=this.lesson.events;let points=events.flatMap(e=>[...(e.coords?[e.coords]:[]),...(e.route||[])]);if(!points.length&&!this.book.id.startsWith('9'))points=[[75,20],[130,52]];
    const aspect=this.root.clientWidth/Math.max(1,this.root.clientHeight),plan=learningMap(this.lesson);
    this.homeView=hasLearningLayers(this.lesson)?fitLearningBounds(lessonMapPoints(this.lesson),aspect,{world:plan.world,extent:this.overview?plan.overviewExtent:plan.stageExtents?.[events[this.index]?.id] || plan.extent}):fitBounds(points,aspect,this.lesson.id==='9a-14');
    this.view=[...this.homeView];this.applyView();
  }
  applyView() {
    if(!this.view) return; this.svg.setAttribute('viewBox',this.view.join(' '));
    const k=1/(this.svg.getScreenCTM()?.a||Math.max(1,this.root.clientWidth)/this.view[2]),small=this.root.clientWidth<500;
    this.svg.style.setProperty('--map-unit',String(k));
    this.svg.style.setProperty('--map-type',`${18*k}px`);
    this.svg.style.setProperty('--place-type',`${(small?12:14)*k}px`);
    this.svg.style.setProperty('--active-place-type',`${(small?14:16)*k}px`);
    this.svg.style.setProperty('--region-type',`${(small?(this.compact?17:18):26)*k}px`);
    this.svg.querySelectorAll('[data-anchor-x]').forEach(n=>{n.setAttribute('x',Number(n.dataset.anchorX)+Number(n.dataset.dx)*k);n.setAttribute('y',Number(n.dataset.anchorY)+Number(n.dataset.dy)*k);});
    this.svg.querySelectorAll('.route-origin,.route-stop,.route-stop-inner').forEach(n=>n.setAttribute('r',(n.classList.contains('route-origin')?5.5:n.classList.contains('route-stop-inner')?1.7:4.5)*k));
    this.svg.querySelectorAll('marker').forEach(n=>{n.setAttribute('markerWidth',10*k);n.setAttribute('markerHeight',10*k);});
    this.points?.querySelectorAll('circle').forEach(c=>{const active=c.parentElement.classList.contains('is-active');const dot=c.classList.contains('point-dot');c.setAttribute('r',(dot?(active?4:1.7):(active?8:4.5))*k);});
    this.svg.classList.toggle('zoomed-map',this.view[2]<100);
    this.declutterLearningLabels(k);
    if(this.annotation){
      const a=this.annotation,ctm=this.svg.getScreenCTM(),shortWidth=[...a.short].reduce((n,c)=>n+(/[\u2e80-\uffff]/.test(c)?14:7),20);
      const obstacles=[...this.svg.querySelectorAll('.map-context text,.route-labels text,.route-labels circle,.event-points text,.event-points circle,.learning-stops text,.learning-stops circle'),...this.root.parentElement.querySelectorAll('.map-tools,.map-badge,.zoom-tools,.map-legend,.map-scale')].map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height);
      const left=this.view[0]+(this.view[2]-this.root.clientWidth*k)/2,top=this.view[1]+(this.view[3]-this.root.clientHeight*k)/2;
      const candidate=(compact,dx,dy)=>{const w=Math.min(compact?shortWidth:a.width,compact?208:280)*k,h=(compact?28:34)*k,cx=Math.max(left+12*k+w/2,Math.min(left+this.root.clientWidth*k-12*k-w/2,a.anchor[0]+dx*k)),y=Math.max(top+72*k,Math.min(top+this.root.clientHeight*k-12*k-h,a.anchor[1]+dy*k));const r={left:ctm.a*(cx-w/2)+ctm.e,right:ctm.a*(cx+w/2)+ctm.e,top:ctm.d*y+ctm.f,bottom:ctm.d*(y+h)+ctm.f};const overlap=obstacles.reduce((sum,b)=>sum+Math.max(0,Math.min(r.right+3,b.right)-Math.max(r.left-3,b.left))*Math.max(0,Math.min(r.bottom+3,b.bottom)-Math.max(r.top-3,b.top)),0);return {compact,w,h,cx,y,overlap};};
      let best=candidate(small,small?-4:0,small?-42:-66);
      if(best.overlap)for(const [dx,dy] of [[-4,-42],[-4,18],[40,-42],[-40,-42],[40,18],[-40,18],[-4,-76],[-4,52]]){const p=candidate(true,dx,dy);if(p.overlap<best.overlap)best=p;if(!best.overlap)break;}
      const {w,h,cx,y,compact}=best;
      a.rect.setAttribute('x',cx-w/2);a.rect.setAttribute('y',y);a.rect.setAttribute('width',w);a.rect.setAttribute('height',h);a.rect.setAttribute('rx',4*k);
      a.text.textContent=compact?a.short:a.full;a.text.setAttribute('x',cx);a.text.setAttribute('y',y+(compact?19:23)*k);a.text.style.fontSize=`${(compact?14:16)*k}px`;
      const edge=a.anchor[1]>y+h/2?y+h:y;
      a.tail.setAttribute('d',`M${a.anchor.join(',')}L${cx},${edge}`);
    }
    if(this.scale){const s=distanceScale(this.view,this.root.clientWidth,this.root.clientHeight,small?85:130),km=s.km.toLocaleString('zh-CN',{maximumFractionDigits:s.km<1?2:0}),latitude=`${Math.abs(s.latitude).toFixed(0)}°${s.latitude>=0?'N':'S'}`;this.scale.style.width=`${s.pixels+16}px`;this.scale.setAttribute('aria-label',`距离参照：${latitude}附近约${km}公里，随地图缩放变化`);this.scale.title='按视图中心纬度估算；墨卡托投影在不同纬度的距离比例不同。';this.scale.innerHTML=`<div class="scale-values"><span>0</span><span>${km}公里</span></div><div class="scale-bar"><i></i><i></i><i></i><i></i></div><small>${latitude}附近</small>`;}
  }
  declutterLearningLabels(k) {
    if(!this.learningStops?.length)return;
    const ctm=this.svg.getScreenCTM();if(!ctm)return;
    const bounds=this.root.getBoundingClientRect(),small=bounds.width<500,occupied=[...this.root.parentElement.querySelectorAll('.map-tools,.map-badge,.zoom-tools,.map-legend,.map-scale')].map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height),counts={current:0,overview:0,earlier:0,context:0,future:0},seenLabels=new Set(),plan=learningMap(this.lesson),mobileNames=small?plan.mobileLabelNames?.[this.lesson.events[this.index]?.id]:null;let total=0;
    const overlaps=(a,b)=>a.left<b.right+4&&a.right>b.left-4&&a.top<b.bottom+3&&a.bottom>b.top-3;
    for(const p of this.learningStops) {
      const circle=p.node.querySelector('circle');if(circle)circle.setAttribute('r',(p.priority===1?3.8:2.8)*k);
      p.label.style.display='';
      if((mobileNames&&!this.focusedRoute&&!mobileNames.includes(p.name)) || seenLabels.has(p.name)){p.label.style.display='none';continue;}
      const detailed=!!this.focusedRoute || this.view[2]<40,limit=p.status==='future'?(small?2:4):p.status==='earlier'?(small?3:6):p.status==='context'?(small?3:5):(small?7:12);
      if(total>=(small?13:23)||(!detailed&&counts[p.status]>=limit)||(!detailed&&p.status==='future'&&p.priority>1)||(small&&p.priority>1&&!detailed)||(p.priority>2&&!detailed)){p.label.style.display='none';continue;}
      const font=small?14:15;p.label.style.fontSize=`${font*k}px`;
      const width=[...p.name].reduce((n,c)=>n+(/[\u2e80-\uffff]/.test(c)?font:font*.53),0),height=font+3;
      const sx=p.xy[0]*ctm.a+ctm.e,sy=p.xy[1]*ctm.d+ctm.f;
      const candidates=[[p.labelDx ?? 7,p.labelDy ?? -7],[7,19],[-width-7,-7],[-width-7,19],[7,-25],[7,35],[-width/2,-12],[-width/2,25]];
      let chosen;
      for(const [dx,dy] of candidates){const r={left:sx+dx,right:sx+dx+width,top:sy+dy-height,bottom:sy+dy+3};if(r.left<bounds.left+5||r.right>bounds.right-5||r.top<bounds.top+5||r.bottom>bounds.bottom-5)continue;if(!occupied.some(b=>overlaps(r,b))){chosen={dx,dy,r};break;}}
      if(!chosen){p.label.style.display='none';continue;}
      p.label.setAttribute('x',p.xy[0]+chosen.dx*k);p.label.setAttribute('y',p.xy[1]+chosen.dy*k);occupied.push(chosen.r);seenLabels.add(p.name);counts[p.status]++;total++;
    }
  }
  toggleOverview(){this.overview=!this.overview;this.render();this.fit();return this.overview;}
  focusRoute(id){const route=learningMap(this.lesson).routes?.find(r=>r.id===id);if(!route)return;this.focusedRoute=id;const points=routePoints(route);this.view=fitLearningBounds(points,this.root.clientWidth/Math.max(1,this.root.clientHeight),{extent:points});this.applyView();}
  zoom(factor) { if(!this.view) return; const [x,y,w,h]=this.view; this.view=clampView([x+w*(1-factor)/2,y+h*(1-factor)/2,w*factor,h*factor]);this.applyView(); }
  toggleReference(){this.layers=!this.layers;this.context.style.display=this.layers?'':'none';this.loadBorder();return this.layers;}
  togglePlaces(){this.showPlaces=!this.showPlaces;this.points.style.display=this.showPlaces?'':'none';this.svg.querySelectorAll('.route-labels,.learning-stops').forEach(n=>n.style.display=this.showPlaces?'':'none');return this.showPlaces;}
  listen() {
    this.svg.addEventListener('pointerdown',e=>{if(this.compact || e.target.closest('[data-event],[data-learning-place]')) return;this.drag={x:e.clientX,y:e.clientY,view:[...this.view]};this.svg.setPointerCapture(e.pointerId);this.svg.classList.add('is-dragging');});
    this.svg.addEventListener('pointermove',e=>{if(!this.drag)return;const d=this.drag;this.view=clampView([d.view[0]-(e.clientX-d.x)*d.view[2]/this.root.clientWidth,d.view[1]-(e.clientY-d.y)*d.view[3]/this.root.clientHeight,d.view[2],d.view[3]]);this.applyView();});
    const done=()=>{this.drag=null;this.svg.classList.remove('is-dragging');};this.svg.addEventListener('pointerup',done);this.svg.addEventListener('pointercancel',done);
  }
  destroy(){this.disposed=true;this.observer.disconnect();this.borderToken=Symbol();}
}
