// Shared curricular map semantics. A timeline is not a route: only researched
// layers with explicit waypoints may draw a line between places.
export function learningMap(lesson) {
  return lesson.mapLearning || {mode:'point', routes:[], areas:[], places:[]};
}
export function routeState(route, lesson, eventIndex, overview = false) {
  if (overview) return 'overview';
  if (route.contextOnly) return 'context';
  const stages=(route.eventIds || []).map(id=>lesson.events.findIndex(e=>e.id===id)).filter(i=>i>=0);
  if (!stages.length) return 'context';
  if (stages.includes(eventIndex)) return 'current';
  return Math.min(...stages)>eventIndex ? 'future' : 'earlier';
}
export function routePoints(route) {
  return route.waypoints.map(p=>p.coords);
}
export function lessonMapPoints(lesson) {
  const map=learningMap(lesson);
  return [
    ...lesson.events.flatMap(e=>e.coords?[e.coords]:[]),
    ...(map.routes || []).flatMap(routePoints),
    ...(map.areas || []).flatMap(a=>a.ring || []),
    ...(map.places || []).map(p=>p.coords)
  ];
}
export function mapRouteGroups(lesson) {
  const groups=new Map();
  for(const route of learningMap(lesson).routes || []) {
    const key=route.group || route.label;
    if(!groups.has(key)) groups.set(key,{label:key,color:route.color || '#b5452f',kind:route.kind,directional:route.directional!==false});
  }
  return [...groups.values()];
}
export function hasLearningLayers(lesson) {
  const map=learningMap(lesson);
  return !!(map.routes?.length || map.areas?.length || map.places?.length);
}
export function mapContextYear(lesson,index) {
  const map=learningMap(lesson),event=lesson.events[index];
  return map.contextYears?.[event?.id] ?? map.contextYear ?? event?.year;
}
