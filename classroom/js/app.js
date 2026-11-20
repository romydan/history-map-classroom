import { AtlasMap } from './map.js';
import { learningMap, mapRouteGroups, routeState, mapContextYear } from './learning-map.js';
const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = { book:'M3 5c4-2 6-2 9 0 3-2 5-2 9 0v15c-4-2-6-2-9 0-3-2-5-2-9 0ZM12 5v15', pin:'M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0Z M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6',mountain:'m2 19 6-11 4 6 3-9 7 14ZM6 12l2 2 2-2M13 11l2 2 2-2',reset:'M5 7a8 8 0 1 1-1 8M5 2v5H0',left:'m15 5-7 7 7 7',right:'m9 5 7 7-7 7',menu:'M3 5h18M3 12h18M3 19h18',info:'M12 11v6M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',plus:'M12 4v16M4 12h16',minus:'M4 12h16',close:'m5 5 14 14M5 19 19 5' };
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.book}"/></svg>`;
function legendSymbol(type){
  const shape=type==='route'?'<path d="M2 12H29" stroke-dasharray="5 3"/><path d="m23 7 7 5-7 5"/>':type==='origin'?'<circle cx="16" cy="12" r="5.5" class="legend-paper"/>':type==='current'?'<circle cx="16" cy="12" r="8" class="legend-paper"/><circle cx="16" cy="12" r="4" class="legend-dot"/>':'<circle cx="16" cy="12" r="4.5" class="legend-paper"/><circle cx="16" cy="12" r="1.7" class="legend-dot"/>';
  return `<svg class="legend-symbol ${type==='other'?'legend-other':''}" viewBox="0 0 34 24" aria-hidden="true">${shape}</svg>`;
}
function mapLegend(){
  const {lesson}=current(),e=lesson.events[state.event];if(!e)return '';
  const plan=learningMap(lesson),overview=!!map?.overview,groups=mapRouteGroups({...lesson,mapLearning:{...plan,routes:(plan.routes||[]).filter(r=>overview||routeState(r,lesson,state.event)==='current'||routeState(r,lesson,state.event)==='context')}});
  const rows=groups.map(g=>`<div class="legend-row"><svg class="legend-symbol learning-key" viewBox="0 0 34 24" aria-hidden="true" style="color:${esc(g.color)}"><path d="M2 12H30"/>${g.directional?'<path d="m23 7 7 5-7 5"/>':''}</svg><span>${esc(g.label)}</span></div>`);
  if(!groups.length){const pointGroups=new Map();for(const p of plan.places || [])if(p.group&&(overview||['current','context'].includes(routeState(p,lesson,state.event)))&&!pointGroups.has(p.group))pointGroups.set(p.group,p.color || '#5d5548');for(const [name,color]of pointGroups)rows.push(`<div class="legend-row"><svg class="legend-symbol learning-key" viewBox="0 0 34 24" aria-hidden="true" style="color:${esc(color)}"><circle cx="16" cy="12" r="5"/></svg><span>${esc(name)}</span></div>`);}
  if(!overview&&plan.routes?.some(r=>routeState(r,lesson,state.event)==='future'))rows.push('<div class="legend-row"><svg class="legend-symbol future-key" viewBox="0 0 34 24" aria-hidden="true"><path d="M2 12H30" stroke-dasharray="3 4"/></svg><span>后续阶段（参照）</span></div>');
  if(plan.areas?.length)rows.push(`<div class="legend-row"><svg class="legend-symbol area-key" viewBox="0 0 34 24" aria-hidden="true"><rect x="4" y="5" width="25" height="14"/></svg><span>${plan.areas.some(a=>a.featureIds)?'今国土轮廓定位历史事件':'相关地区（范围示意）'}</span></div>`);
  if(e.coords)rows.push(`<div class="legend-row">${legendSymbol('current')}<span>当前事件地点</span></div>`);
  if(plan.routes?.length||plan.places?.length)rows.push('<div class="legend-row"><svg class="legend-symbol learning-key" viewBox="0 0 34 24" aria-hidden="true" style="color:#645a4e"><circle cx="16" cy="12" r="5"/></svg><span>关键地点（依图层设色）</span></div>');
  return `<div class="legend-heading"><b>图例</b>${plan.routes?.length?`<button type="button" data-action="map-overview" aria-pressed="${overview}" aria-label="${overview?'返回当前时序阶段':'显示本课完整路线总览'}">${overview?'按时序':'全课总览'}</button>`:''}</div>${rows.join('')}`;
}
function updateLegend(){const n=$('#map-legend');if(n){n.innerHTML=mapLegend();n.hidden=!current().lesson.events.length;}}
const CN = ['一','二','三','四','五','六','七','八','九'];
const shortVoyages = ['迪亚士','哥伦布','达·伽马','麦哲伦船队'];
const bookDescriptions = { '7a':'中国古代史 · 史前至南北朝','7b':'中国古代史 · 隋至明清','8a':'中国近代史','8b':'中国现代史','9a':'世界古代史与近代史','9b':'世界现代史' };
let books = [], entries = new Map(), state, map, toastTimer, saveTimer, sourceInvoker;
let progress = readStorage('history-atlas-progress', {});
function readStorage(key, fallback) { try { const value=JSON.parse(localStorage.getItem(key));return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback; } catch { return fallback; } }
function saveStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
const current = () => entries.get(state.lesson);
const title = l => `第${l.number}课 ${l.title}`;
function parseRoute() {
  const p = new URLSearchParams(location.hash.slice(1));
  const book = books.find(b => b.id === p.get('book')) || books.find(b => b.id === '9a');
  const lessonId = entries.has(p.get('lesson')) ? p.get('lesson') : book.id === '9a' ? '9a-14' : book.units[0].lessons[0].id;
  const entry = entries.get(lessonId), event = Math.max(0,Math.min(entry.lesson.events.length-1, Number.parseInt(p.get('event'),10)||0));
  const rawMap = (p.get('map') || '').split(',').map(Number);
  return { view:['lesson','progress'].includes(p.get('view')) ? p.get('view') : p.get('lesson') && p.get('view') !== 'home' ? 'lesson':'home', book:entry.book.id,lesson:lessonId,event,mode:p.get('mode')==='student'?'student':'teacher',tab:['knowledge','inquiry'].includes(p.get('tab'))?p.get('tab'):'events',initialMap:rawMap.length===4 && rawMap.every(Number.isFinite) && rawMap[2]>=24 && rawMap[2]<=1200 && rawMap[3]>0 && rawMap[3]<=1800 && Math.abs(rawMap[0])<1200 && Math.abs(rawMap[1])<1200 ? rawMap:null };
}
function urlFor(extra = {}) {
  const s={...state,...extra}, p = new URLSearchParams({view:s.view,book:s.book,lesson:s.lesson,mode:s.mode});
  if(s.view==='lesson'){p.set('event',s.event);p.set('tab',s.tab);}
  return `${location.pathname}${location.search}#${p}`;
}
function writeUrl(replace=false) { history[replace?'replaceState':'pushState'](null,'',urlFor()); }
function navigate(patch) { state={...state,...patch,initialMap:null};const e=entries.get(state.lesson);state.book=e.book.id;writeUrl();render(); }
function openLesson(id, mode=state.mode, index=0) {const e=entries.get(id);if(!e)return;navigate({view:'lesson',lesson:id,book:e.book.id,event:index,mode,tab:e.lesson.kind==='activity'?'inquiry':'events'});}
function toast(text) { const n=$('#toast');clearTimeout(toastTimer);n.textContent=text;n.hidden=false;toastTimer=setTimeout(()=>n.hidden=true,3600); }
function updateModeUI(){ document.body.dataset.mode=state.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode))); }
function render() {
  map?.destroy();map=null;document.body.classList.remove('is-outline-open');$('#source-sheet').hidden=true;closeSearch();
  document.body.classList.toggle('home-view',state.view!=='lesson');updateModeUI();
  const {book,lesson} = current();$('.brand').href=urlFor({view:'home'});$('.home-nav a').href=urlFor({view:'home'});document.title=`${state.view==='lesson'?lesson.title:state.view==='progress'?'我的学习':book.title} · 历史地图课堂`;
  $('#breadcrumb').innerHTML=state.view==='lesson'?`<button class="outline-toggle" data-action="outline" aria-expanded="false" aria-controls="course-outline">${icon('menu')}目录</button><a href="${esc(urlFor({view:'home'}))}">课程首页</a><span class="divider">/</span><a href="${esc(urlFor({view:'home'}))}">${esc(book.title)}</a><span class="divider">/</span><span class="current">${esc(title(lesson))}</span>`:`<span>${state.view==='progress'?'课程首页 / 我的学习':'选教材 → 选课程 → 进入地图'}</span>`;
  $('#breadcrumb').insertAdjacentHTML('beforeend','<button class="breadcrumb-learning" data-action="progress">我的学习</button>');
  if(state.view==='lesson') renderLesson();else if(state.view==='progress') renderProgress();else renderHome();
}
function renderLesson() {
  const {book,unit,lesson} = current(), unitIndex=book.units.indexOf(unit);
  const mainline=lesson.id==='9a-14'?['航路开辟的背景','主要航海活动','世界联系与殖民扩张']:lesson.knowledge.map(k=>k.title);
  $('#main').innerHTML=`<div class="lesson-shell"><div class="workspace-grid">
    <aside id="course-outline" class="course-sidebar" aria-label="课程目录"><button class="outline-close" data-action="outline-close">收起目录 ${icon('close')}</button><h2>${esc(book.title)}</h2><div class="unit-title">第${CN[unitIndex]}单元 ${esc(unit.title)}</div>
    ${unit.lessons.map(l=>`<button class="lesson-link ${l.id===lesson.id?'is-selected':''}" data-lesson="${l.id}" ${l.id===lesson.id?'aria-current="page"':''}>${esc(title(l))}</button>`).join('')}
    <section class="sidebar-section"><h3>本课主线</h3>${mainline.map((t,i)=>`<div class="mainline-item"><span>${String(i+1).padStart(2,'0')}</span>${esc(t)}</div>`).join('')}</section>
    <section class="sidebar-section"><h3>学习目标</h3><ul class="goal-list">${(lesson.id==='9a-14'?['在地图上辨认主要航海路线。','说明新航路开辟的影响，并从不同视角思考。']:lesson.goals).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section><button class="course-return" data-action="home">查看本册全部课程</button></aside>
    <section class="map-stage" aria-label="本课历史地图"><div id="lesson-map" class="map-canvas"></div><div class="map-badge" id="map-badge"></div>
    <div class="map-tools"><button data-action="places" aria-pressed="true" aria-label="显示或隐藏本课地点">${icon('pin')}<span class="map-tool-label">本课地点</span></button><button data-action="reference" aria-pressed="true" aria-label="显示或隐藏地理参照">${icon('mountain')}<span class="map-tool-label">地理参照</span></button><button data-action="reset-map" aria-label="重置地图视野">${icon('reset')}<span class="map-tool-label">重置</span></button></div>
    <div id="map-legend" class="map-legend"></div><div class="zoom-tools" role="group" aria-label="地图缩放"><button data-action="zoom-in" aria-label="放大地图">${icon('plus')}</button><button data-action="zoom-out" aria-label="缩小地图">${icon('minus')}</button></div>
    ${!lesson.events.length?'<div class="map-activity-note"><h3>把所学串起来</h3><p>本课是一节活动课。结合右侧任务，回到相关课程收集证据，完成你的历史表达。</p></div>':''}</section>
    <aside class="reading-panel" aria-label="本课知识与探究"><div class="reading-tabs" role="tablist" aria-label="内容视图">${[['knowledge','知识梳理'],['events','事件详解'],['inquiry',state.mode==='student'?'自主探究':'课堂探究']].map(([id,t])=>`<button role="tab" id="tab-${id}" data-tab="${id}" aria-controls="reading-content" aria-selected="${state.tab===id}" tabindex="${state.tab===id?0:-1}">${t}</button>`).join('')}</div><div id="reading-content" class="reading-content" role="tabpanel" tabindex="0"></div></aside>
    </div><section id="timeline" class="timeline" aria-label="本课时序"></section><footer class="lesson-footer">${icon('info')}<span id="map-truth-note">${book.id.startsWith('9')?'历史航线为教学示意':'历史疆域与路线为教学示意'} · 地形为现代地理参照，地点为教学定位</span><button data-action="sources">教材与地图来源</button></footer></div>`;
  map=new AtlasMap($('#lesson-map'),{onSelect:selectEvent,onInspect:inspectMapPlace});
  map.setLesson(lesson,book,state.event).then(()=>{if(state.initialMap){map.view=state.initialMap;map.applyView();state.initialMap=null;}});
  renderPanel();renderTimeline();updateBadge();updateLegend();
}
function updateBadge(){const {lesson}=current(),e=lesson.events[state.event],plan=learningMap(lesson);$('#map-badge').textContent=e?`${e.id.startsWith('9a-14')?(state.event===2?'1498年':e.dateLabel):e.dateLabel} · ${e.id.startsWith('9a-14')?shortVoyages[state.event]:(plan.eventLabels?.[e.id]||e.title)}`:lesson.title;const year=mapContextYear(lesson,state.event),note=$('#map-truth-note');if(note&&Number.isInteger(year)&&(plan.contextYear!==undefined||plan.contextYears)){note.textContent=`疆域背景参照${year<0?'公元前'+Math.abs(year):year}年 · 线与区域为教学示意，地形为现代地理参照`;}}
function selectEvent(index){const {lesson}=current();if(index<0||index>=lesson.events.length)return;state.event=index;state.tab='events';writeUrl(true);map?.setEvent(index);renderPanel();renderTimeline();updateBadge();updateLegend();map?.fit();}
function sourceButton(){const {lesson}=current();return `<button class="source-link" data-action="sources">${icon('book')}教材第${lesson.number}课${lesson.page?` · ${lesson.page}${lesson.id==='9a-14'?'—79':''}页`:''} · 查看来源 ${icon('right')}</button>`;}
function explanation(head,body,open=false){return `<details class="explanation" ${open?'open':''}><summary>${esc(head)}</summary><p>${esc(body)}</p></details>`;}
function mapReadingTask(){
  const {lesson}=current(),plan=learningMap(lesson);if(!plan.spatialSkill)return '';
  const routes=plan.routes || [],groups=plan.historicalGroups || plan.stateGroups || [],q=plan.question;
  const layers=[...routes.map(r=>`<div><h3>${esc(r.label)} <button type="button" class="route-focus" data-route-focus="${esc(r.id)}">定位此段</button></h3><p>${r.waypoints.filter(p=>p.name).map(p=>esc(p.name)).join(r.directional===false?' — ':' → ')}</p></div>`),...(plan.areas || []).map(a=>`<div><h3>${esc(a.label)}</h3><p>${esc(a.note || '')}</p></div>`),...groups.map(g=>`<div><h3>${esc(g.label)}${g.dateLabel?' · '+esc(g.dateLabel):''}</h3><p>${(g.members || []).map(esc).join('、')}</p>${g.note?`<p>${esc(g.note)}</p>`:''}</div>`)];
  return `<section class="map-reading-task"><h2>读图任务</h2><p>${esc(plan.spatialSkill)}</p><p class="map-inspection" id="map-inspection" aria-live="polite">${esc(plan.stageNotes?.[lesson.events[state.event]?.id] || plan.summary || '')}</p>${layers.length?`<details class="route-reading"><summary>${routes.length?'关键地点、路线与区域':'区域与分布对照'}</summary>${layers.join('')}<p class="route-precision">${esc(plan.scopeNote || '')}</p></details>`:''}${q?`<details class="map-question"><summary>${esc(q.prompt)}</summary><ol>${(q.hints || []).map(h=>`<li>${esc(h)}</li>`).join('')}</ol><details><summary>查看读图思路</summary><p>${esc(q.answer)}</p></details></details>`:''}</section>`;
}
function inspectMapPlace(place){let n=$('#map-inspection');if(n){n.textContent=[place.name,place.dateLabel,place.note].filter(Boolean).join(' · ');n.scrollIntoView({block:'nearest'});}}
function renderPanel(){
  const {lesson}=current(),event=lesson.events[state.event],n=$('#reading-content');
  if(!n)return;
  document.querySelectorAll('.reading-tabs [data-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tab===state.tab));b.tabIndex=b.dataset.tab===state.tab?0:-1;if(b.dataset.tab==='inquiry')b.textContent=state.mode==='student'?'自主探究':'课堂探究';});n.setAttribute('aria-labelledby',`tab-${state.tab}`);
  if(state.tab==='knowledge'){
    n.innerHTML=`<h1>${esc(lesson.title)}</h1><p class="event-summary">${esc(lesson.overview)}</p>${mapReadingTask()}${lesson.knowledge.map(k=>`<section class="knowledge-section"><h3>${esc(k.title)}</h3><p>${esc(k.body)}</p></section>`).join('')}${sourceButton()}${state.mode==='student'?completionControl():''}`;
  }else if(state.tab==='inquiry'||!event){
    const saved=progress[lesson.id]||{};
    n.innerHTML=`<p class="panel-intro">${state.mode==='student'?'先形成自己的解释，再查看提示与参考思路。':'结合地图引导观察，逐步展开提示与参考思路。'}</p>${mapReadingTask()}<h1 class="inquiry-question">${esc(lesson.inquiry.question)}</h1><button class="secondary-button" data-action="inquiry-hints" aria-expanded="false" aria-controls="inquiry-hints">展开提示</button><ol class="inquiry-hints" id="inquiry-hints" hidden>${lesson.inquiry.hints.map((h,i)=>`<li>提示${CN[i]}：${esc(h)}</li>`).join('')}</ol><label class="reflection-label" for="reflection-draft">${state.mode==='student'?'我的思考':'课堂记录'}</label><textarea id="reflection-draft" class="answer-input" maxlength="5000" placeholder="结合时间、地点与证据，写下你的解释…">${esc(saved.draft||'')}</textarea><p class="draft-status" id="draft-status">${saved.draft?'已保存在本机浏览器':'内容仅保存在本机浏览器'}</p><button class="text-action" data-action="inquiry-answer" aria-expanded="false" aria-controls="inquiry-answer">查看参考思路</button><section class="inquiry-answer" id="inquiry-answer" hidden><h3>参考思路</h3><p>${esc(lesson.inquiry.answer)}</p></section>${completionControl()}${sourceButton()}`;
  }else{
    const columbus=event.id==='9a-14-e2';
    const name=columbus?'哥伦布抵达美洲':event.title;
    const summary=columbus?'哥伦布受西班牙王室支持，向西横渡大西洋，抵达美洲的巴哈马群岛。他误以为到达了亚洲，实际开辟了欧洲通往美洲的航路。':event.summary;
    n.innerHTML=`<span class="event-date">${esc(event.dateLabel)}</span><h1>${esc(name)}</h1><p class="event-summary">${esc(summary)}</p><dl class="fact-list"><div><dt>时间</dt><dd>${esc(event.dateLabel)}</dd></div><div><dt>${columbus?'支持者':'相关地点'}</dt><dd>${esc(columbus?'西班牙王室':event.place)}</dd></div><div><dt>${columbus?'出发与抵达':'关键词'}</dt><dd>${esc(columbus?'帕洛斯 → 巴哈马群岛':event.keywords.join('、'))}</dd></div></dl>
    ${mapReadingTask()}${explanation(columbus?'为什么向西航行？':'事件背景',columbus?'欧洲人希望寻找通往东方的新航路。地圆学说与航海技术的发展，为向西航行提供了认识和技术条件。':event.background,true)}${explanation(learningMap(lesson).routes?.length?'经过与空间联系':'事件经过',event.process)}${columbus?'<details class="explanation impact-preview"><summary><span>历史影响与不同视角<small>世界联系扩大，殖民扩张也给美洲原住民带来灾难。</small></span></summary><p>'+esc(event.impact)+'</p></details>':explanation('历史影响与不同视角',event.impact)}
    <section class="reflection"><h3>想一想</h3><p>${esc(columbus?'为什么不能简单说哥伦布“发现了美洲”？':lesson.inquiry.question)}</p><button class="text-action" data-action="quick-hint" aria-expanded="false" aria-controls="quick-hint">展开提示</button><div class="hint-content" id="quick-hint" hidden>${esc(columbus?'美洲原住民早已生活在当地。试着区分欧洲人的地理认识与美洲居民自己的历史。':lesson.inquiry.hints[0])}<br><button class="text-action" data-tab="inquiry">进入${state.mode==='student'?'自主':'课堂'}探究</button></div></section>${sourceButton()}${state.mode==='student'?completionControl():''}`;
  }
  n.scrollTop=0;$('.reading-panel').scrollTop=0;
}
function completionControl(){const done=!!progress[current().lesson.id]?.completed;return `<button class="${done?'secondary-button':'primary-button'} completion-button" data-action="complete" aria-pressed="${done}">${done?'本课已学 · 点击取消标记':'标记本课已学'}</button><p class="completion-note">学习记录保存在本机，无需注册账号。</p>`;}
function renderTimeline(){const {lesson}=current(),events=lesson.events;$('#timeline').innerHTML=`<h2>本课时序</h2>${events.length?`<div class="timeline-events">${events.map((e,i)=>`<button class="timeline-event ${i===state.event?'is-active':''}" data-event="${i}" aria-label="${esc(e.dateLabel+' '+e.title)}" aria-pressed="${i===state.event}"><span>${esc(e.id.startsWith('9a-14')?(i===2?'1498年':e.dateLabel):e.dateLabel)}</span><span>${esc(e.id.startsWith('9a-14')?shortVoyages[i]:e.title)}</span></button>`).join('')}</div><div class="timeline-navigation"><span class="step-count" aria-live="polite">${state.event+1} / ${events.length}</span><button class="secondary-button" data-action="previous" ${state.event===0?'disabled':''}>${icon('left')}上一步</button><button class="primary-button" data-action="next" ${state.event===events.length-1?'disabled':''}>下一步${icon('right')}</button></div>`:`<p class="activity-timeline">本课为活动课，请结合任务整理所学。</p><button class="secondary-button" data-tab="inquiry">查看活动任务 ${icon('right')}</button>`}`;}
function renderHome(){
  const {book,unit,lesson}=current(),tints=['#b55b3a','#c49a4f','#879679','#819a91','#9c442d','#84919c'];
  $('#main').innerHTML=`<section class="home-page"><div class="home-heading"><h1>按教材选课</h1></div><div class="home-grid">
    <nav class="book-list" aria-label="选择教材">${books.map((b,i)=>`<button class="book-choice" style="--book-tint:${tints[i]}" data-book="${b.id}" aria-pressed="${b.id===book.id}"><strong>${esc(b.title)}</strong><span>${esc(bookDescriptions[b.id])}</span></button>`).join('')}<p class="book-helper">选定一册，查看对应单元与课程</p></nav>
    <section class="course-catalog" aria-labelledby="catalog-title"><div class="catalog-heading"><h2 id="catalog-title">${esc(book.title)} · 课程目录</h2><span>${book.id.startsWith('9')?'世界历史':'中国历史'}</span></div><div class="catalog-units">${book.units.map((u,i)=>`<details class="unit-group" ${u.id===unit.id?'open':''}><summary>第${CN[i]}单元　${esc(u.title)}</summary>${u.lessons.map(l=>`<button class="catalog-lesson ${l.id===lesson.id?'is-selected':''}" data-preview-lesson="${l.id}" ${l.id===lesson.id?'aria-current="true"':''}><span class="lesson-kind">${l.kind==='activity'?'活动':l.kind==='theme'?'专题':'地图'}</span><span class="lesson-label">${esc(title(l))}${progress[l.id]?.completed?' · 已学':''}</span>${icon('right')}</button>${l.id===lesson.id?`<p class="lesson-subtitle">${esc(l.id==='9a-14'?'航海背景 · 主要航线 · 世界联系':l.knowledge.slice(0,3).map(k=>k.title).join(' · '))}</p>`:''}`).join('')}</details>`).join('')}</div></section>
    <section class="lesson-preview" aria-labelledby="preview-title"><div class="preview-heading"><h2 id="preview-title" tabindex="-1">${esc(lesson.title)}</h2><p>${esc(lesson.id==='9a-14'?'循着四次航海活动，理解世界联系的扩大与殖民扩张。':lesson.overview)}</p></div><div class="preview-map"><div id="preview-map" class="map-canvas"></div><div class="map-badge">${esc(lesson.id==='9a-14'?'15—16世纪 · 新航路开辟示意':lesson.kind==='activity'?'按任务串联历史知识':'本课相关地点 · 地理参照')}</div></div><p class="preview-years">${lesson.events.length?lesson.events.slice(0,5).map((e,i)=>`${esc(e.id.startsWith('9a-14')?(i===2?'1498年':e.dateLabel):e.dateLabel)} ${esc(e.id.startsWith('9a-14')?shortVoyages[i]:e.keywords[0]||e.title)}`).join(' / '):'本课为活动课，以问题、证据和表达任务组织学习。'}</p><div class="preview-actions"><button class="primary-button" data-start="teacher">开始授课</button><button class="secondary-button" data-start="student">开始学习</button></div><button class="preview-details" data-action="lesson-details">查看本课知识点与事件 ${icon('right')}</button></section>
    </div><footer class="home-footer"><span>人教版初中历史课程辅助学习</span><button data-action="sources">教材与地图来源</button></footer></section>`;
  map=new AtlasMap($('#preview-map'),{compact:true});map.setLesson(lesson,book,lesson.id==='9a-14'?1:0);
}
function renderProgress(){
  const saved=[...entries.values()].filter(e=>progress[e.lesson.id]?.completed||progress[e.lesson.id]?.draft).sort((a,b)=>(progress[b.lesson.id].updated||0)-(progress[a.lesson.id].updated||0));
  $('#main').innerHTML=`<section class="home-page progress-panel"><div class="home-heading"><h1>我的学习</h1></div><p class="progress-intro">这里保留本机的已学标记与文字草稿。无需账号，换设备后不会自动同步。</p>${saved.length?saved.map(({book,lesson})=>`<article class="progress-item"><div><strong>${esc(lesson.title)}</strong><span>${esc(book.title)} · 第${lesson.number}课 · ${progress[lesson.id].completed?'已标记学过':'已有思考草稿'}</span></div><button class="secondary-button" data-resume="${lesson.id}">继续学习 ${icon('right')}</button></article>`).join(''):`<div class="progress-empty"><p>从一课开始，在地图上把时间与地点联系起来。</p><p>学习后可以标记“本课已学”，也可以在探究区保存自己的思考。</p><button class="primary-button" data-action="home">选择一课开始学习 ${icon('right')}</button></div>`}<footer class="home-footer"><button data-action="home">返回教材课程</button><button data-action="sources">学习记录与来源说明</button></footer></section>`;
}
function setMode(mode){state.mode=mode;writeUrl(true);updateModeUI();if(state.view==='lesson')renderPanel();}
function closeSearch(){$('#search-results').hidden=true;$('#search').setAttribute('aria-expanded','false');}
function showSearch(){
  const q=$('#search').value.trim().toLowerCase(),book=books.find(b=>b.id===state.book),results=[];
  for(const unit of book.units) for(const l of unit.lessons){if(!q||`${l.number}${l.title}${l.knowledge.map(k=>k.title).join('')}`.toLowerCase().includes(q))results.push({lesson:l,index:0,text:title(l),caption:unit.title});for(const [i,e] of l.events.entries())if(q&&`${e.title}${e.place}${e.keywords.join('')}`.toLowerCase().includes(q))results.push({lesson:l,index:i,text:e.title,caption:`第${l.number}课 · ${e.dateLabel}`});}
  const n=$('#search-results');n.innerHTML=`<h2>${esc(book.title)} · ${q?'搜索结果':'选择课程'}</h2>${results.length?results.slice(0,16).map(r=>`<button class="search-result" data-search-lesson="${r.lesson.id}" data-search-event="${r.index}">${esc(r.text)}<small>${esc(r.caption)}</small></button>`).join(''):'<p class="empty-copy">本册没有匹配内容。试试课名、人物或地点，或返回课程首页更换教材。</p>'}`;n.hidden=false;$('#search').setAttribute('aria-expanded','true');
}
function showSources(){
  sourceInvoker=document.activeElement;
  const {book,lesson}=current(),s=book.source;
  const states={'textbook_checked':'已核对所用教材镜像的目录与相关内容；镜像不代表官方发行认证。','publisher_guide_and_toc_checked':'已核对出版社配套指南与24课目录；尚未逐课核对新版教材正文。','toc_images_and_publisher_catalog_checked':'已核对新版目录影像与出版社配套目录；尚未逐课核对全部正文。','user_pdf_toc_and_chronology_checked':'已核对用户提供的九下教材目录与年表；尚未逐课核对全部正文。'};
  const status=book.id==='9a'?states.toc_images_and_publisher_catalog_checked:book.id==='9b'?states.user_pdf_toc_and_chronology_checked:states[s.status]||s.notes||'已按教材目录整理，内容为原创教学概述。';
  const links=[...(s.supportingUrls||[]),s.publicUrl].filter(Boolean).filter(u=>/^https:\/\//.test(u)&&!u.includes('media.keben.app'));
  const n=$('#source-sheet');n.innerHTML=`<button class="source-close" data-action="close-sources">关闭 ${icon('close')}</button><h2 id="source-title" tabindex="-1">教材与地图来源</h2><h3>${esc(book.title)} · 第${lesson.number}课</h3><p>${esc(s.title)}</p><p class="source-status">${esc(status)}</p>${lesson.id==='9a-14'?'<p>《探寻新航路》已另行核对教材75—79页正文与地图，含四次航行的年份、方向及影响。</p>':''}${book.id==='8a'?'<p>所用镜像内含内部资料标记，本站不提供该PDF、页面图像或下载链接，仅呈现原创课程概述。</p>':'<p>本站提供原创教学概述，不转载整本教材或扫描页。教材页码仅用于对照。</p>'}${links.length?`<ul>${[...new Set(links)].slice(0,3).map((u,i)=>`<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${i?'配套核对资料':'目录与出版社配套资料'}</a></li>`).join('')}</ul>`:''}<h3>地图怎样阅读</h3><p>底图来自 Natural Earth 的真实陆地与地形数据。地形、海岸线属于现代地理参照，不代表历史国界。地图采用墨卡托投影，高纬地区存在面积变形。</p><p>事件坐标通常定位相关城市或遗址；全国政策和长期进程的地图点只作教学参照。行进线、交通网、阵营关系线和战线使用不同图例；路线表示关键经过地区，区域标记注明其历史或现代定位性质。</p>${lesson.events[state.event]?.routeNote?`<p class="source-status">本次路线：${esc(lesson.events[state.event].routeNote)}</p>`:''}<p>中国史中出现的历史政权边界，取自江山时序的课程相关快照，均为教学近似；未发布受限制的CHGIS郡县图层。</p><ul><li><a href="https://www.naturalearthdata.com/downloads/50m-raster-data/50m-natural-earth-2/" target="_blank" rel="noopener noreferrer">Natural Earth 地形数据</a> · 公共领域</li><li><a href="https://github.com/DeanChensj/jiangshan-map" target="_blank" rel="noopener noreferrer">江山时序原项目</a> · GPL-3.0</li><li><a href="./ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">完整署名与许可说明</a></li><li><a href="./data/curriculum.json" target="_blank" rel="noopener noreferrer">课程与事件数据</a></li></ul><h3>关于学习记录</h3><p>学习标记和文字记录仅存于当前设备的浏览器，不上传服务器。清除网站数据或更换浏览器后不会同步。</p>`;appendLearningSources(n);n.hidden=false;$('#source-title').focus();
}
function appendLearningSources(n){
  const plan=learningMap(current().lesson);
  const sources=(plan.sources || []).map(s=>`<li>${s.url&&/^https:\/\//.test(s.url)&&s.public!==false?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`:esc(s.title)}${s.pages?.length?' · 页码'+esc(s.pages.join('、')):''}<p>${esc(s.verification || '')}</p></li>`).join('');
  n.insertAdjacentHTML('beforeend',`<h3>本课地图的学习依据</h3><p>${esc(plan.spatialSkill || '')}</p><p>${esc(plan.scopeNote || '')}</p>${plan.sourceContext?`<p>${esc(plan.sourceContext)}</p>`:''}<ul>${sources}</ul><p>读图任务和练习依据教材内容与课程标准设计，不是地方考试的必考或押题清单。</p><ul><li><a href="./MAP-LEARNING.md" target="_blank" rel="noopener noreferrer">六册逐课地图学习清单</a></li><li><a href="./data/map-learning.json" target="_blank" rel="noopener noreferrer">图层、阶段与来源数据</a></li></ul>`);
}
async function share(){const u=new URL(urlFor(),location.href);if(map?.view&&state.view==='lesson'){const p=new URLSearchParams(u.hash.slice(1));p.set('map',map.view.map(v=>v.toFixed(2)).join(','));u.hash=p.toString();}try{await navigator.clipboard.writeText(u.href);toast('已复制当前课程链接，可分享给老师或同学');}catch{const n=$('#source-sheet');n.innerHTML=`<button class="source-close" data-action="close-sources">关闭</button><h2 id="source-title">分享当前课程</h2><p>复制下方链接，即可打开同一课程、事件与使用模式。</p><label for="share-url">课程链接</label><input class="share-field" id="share-url" readonly value="${esc(u.href)}">`;n.hidden=false;$('#share-url').focus();$('#share-url').select();}}
async function present(){const active=document.body.classList.toggle('presentation');const b=$('[data-action="present"]');b.querySelector('span').textContent=active?'退出投屏':'投屏';b.setAttribute('aria-label',active?'退出投屏':'投屏');b.setAttribute('aria-pressed',String(active));try{if(active&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else if(!active&&document.fullscreenElement)await document.exitFullscreen();}catch{toast(active?'已切换为大字授课视图；可使用浏览器全屏':'已退出大字授课视图');}}
document.addEventListener('click',e=>{
  if(e.target.closest('.skip-link')){e.preventDefault();$('#main').focus();return;}
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.book){const book=books.find(x=>x.id===b.dataset.book);const id=book.id==='9a'?'9a-14':book.units[0].lessons[0].id;navigate({view:'home',book:book.id,lesson:id,event:0});document.querySelector(`[data-book="${book.id}"]`)?.focus({preventScroll:true});return;}
  if(b.dataset.previewLesson){navigate({view:'home',lesson:b.dataset.previewLesson,event:0});if(matchMedia('(max-width:760px)').matches){$('#preview-title').focus({preventScroll:true});$('#preview-title').scrollIntoView({block:'start'});}else document.querySelector(`[data-preview-lesson="${state.lesson}"]`)?.focus({preventScroll:true});return;}
  if(b.dataset.start){openLesson(state.lesson,b.dataset.start);$('#main').focus({preventScroll:true});return;}
  if(b.dataset.resume){openLesson(b.dataset.resume,'student');state.tab='inquiry';writeUrl(true);renderPanel();return;}
  if(b.dataset.mode){setMode(b.dataset.mode);return;}
  if(b.dataset.routeFocus){map?.focusRoute(b.dataset.routeFocus);return;}
  if(b.dataset.lesson){openLesson(b.dataset.lesson);return;}
  if(b.dataset.searchLesson){openLesson(b.dataset.searchLesson,state.mode,Number(b.dataset.searchEvent));$('#search').value='';return;}
  if(b.dataset.event!==undefined){selectEvent(Number(b.dataset.event));return;}
  if(b.dataset.tab){state.tab=b.dataset.tab;writeUrl(true);renderPanel();return;}
  const action=b.dataset.action;
  if(action==='home')navigate({view:'home'});
  else if(action==='lesson-details'){openLesson(state.lesson);state.tab='knowledge';writeUrl(true);renderPanel();}
  else if(action==='progress')navigate({view:'progress'});
  else if(action==='previous')selectEvent(state.event-1);
  else if(action==='next')selectEvent(state.event+1);
  else if(action==='sources')showSources();
  else if(action==='close-sources'){const open=!$('#source-sheet').hidden;$('#source-sheet').hidden=true;if(open&&sourceInvoker?.isConnected)sourceInvoker.focus();}
  else if(action==='share')share();
  else if(action==='present')present();
  else if(action==='outline'){const open=document.body.classList.toggle('is-outline-open');b.setAttribute('aria-expanded',String(open));}
  else if(action==='outline-close'){document.body.classList.remove('is-outline-open');$('.outline-toggle')?.setAttribute('aria-expanded','false');}
  else if(action==='reset-map')map?.fit();
  else if(action==='zoom-in')map?.zoom(.72);
  else if(action==='zoom-out')map?.zoom(1.38);
  else if(action==='places')b.setAttribute('aria-pressed',String(map?.togglePlaces()));
  else if(action==='reference')b.setAttribute('aria-pressed',String(map?.toggleReference()));
  else if(action==='map-overview'){map?.toggleOverview();updateLegend();map?.fit();}
  else if(['quick-hint','inquiry-hints','inquiry-answer'].includes(action)){const n=$('#'+action);n.hidden=!n.hidden;b.setAttribute('aria-expanded',String(!n.hidden));b.textContent=n.hidden?(action==='inquiry-answer'?'查看参考思路':'展开提示'):(action==='inquiry-answer'?'收起参考思路':'收起提示');}
  else if(action==='complete'){const id=state.lesson;progress[id]={...progress[id],completed:!progress[id]?.completed,updated:Date.now()};const saved=saveStorage('history-atlas-progress',progress);renderPanel();toast(saved?(progress[id].completed?'本课已标记为已学':'已取消本课学习标记'):'浏览器未允许保存，标记暂保留至本次访问结束');}
});
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))closeSearch();});
$('#search').addEventListener('input',showSearch);$('#search').addEventListener('focus',()=>{if(state)showSearch();});
$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){const first=$('.search-result');if(first){e.preventDefault();first.click();}}else if(e.key==='ArrowDown'){$('.search-result')?.focus();e.preventDefault();}});
document.addEventListener('input',e=>{if(e.target.id!=='reflection-draft')return;clearTimeout(saveTimer);const id=state.lesson,draft=e.target.value;progress[id]={...progress[id],draft,updated:Date.now()};saveTimer=setTimeout(()=>{const saved=saveStorage('history-atlas-progress',progress);const n=$('#draft-status');if(n)n.textContent=saved?'已保存在本机浏览器':'浏览器未允许保存，请自行复制记录';},400);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const sourceOpen=!$('#source-sheet').hidden;closeSearch();$('#source-sheet').hidden=true;document.body.classList.remove('is-outline-open');$('.outline-toggle')?.setAttribute('aria-expanded','false');if(sourceOpen&&sourceInvoker?.isConnected)sourceInvoker.focus();return;}if(e.target.matches('input,textarea,select')||e.altKey||e.metaKey||e.ctrlKey)return;if(e.key==='/'){e.preventDefault();$('#search').focus();return;}if(e.target.getAttribute('role')==='tab'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const t=[...document.querySelectorAll('[role="tab"]')],i=t.indexOf(e.target),next=t[(i+(e.key==='ArrowRight'?1:t.length-1))%t.length];next.click();next.focus();return;}if(state?.view==='lesson'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();selectEvent(state.event+(e.key==='ArrowRight'?1:-1));}});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('presentation')){document.body.classList.remove('presentation');$('[data-action="present"] span').textContent='投屏';$('[data-action="present"]').setAttribute('aria-pressed','false');$('[data-action="present"]').setAttribute('aria-label','投屏');}});
window.addEventListener('popstate',()=>{if(books.length){state=parseRoute();render();}});
window.addEventListener('hashchange',()=>{if(books.length){state=parseRoute();render();}});
try{
  const [r,mr]=await Promise.all([fetch('./data/curriculum.json'),fetch('./data/map-learning.json')]);if(!r.ok||!mr.ok)throw new Error('课程与地图学习数据未能载入');books=await r.json();const maps=await mr.json(),audit=new Map(maps.lessons.map(l=>[l.lessonId,l])),plans=new Map(maps.lessonMaps.map(m=>[m.lessonId,m]));
  for(const book of books)for(const unit of book.units)for(const lesson of unit.lessons){if(!audit.has(lesson.id)||!plans.has(lesson.id))throw new Error('课程地图资料不完整');lesson.mapLearning={...plans.get(lesson.id),...audit.get(lesson.id)};entries.set(lesson.id,{book,unit,lesson});}
  state=parseRoute();render();
}catch(err){$('#main').innerHTML=`<section class="load-error"><h1>暂时无法载入课程</h1><p>${esc(err.message)}。请检查网络后刷新重试。</p><button class="primary-button" onclick="location.reload()">重新载入</button></section>`;}
