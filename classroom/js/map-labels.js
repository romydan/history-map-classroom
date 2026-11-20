// Labels share one screen-space collision system, including geographic context.
// Geographic anchors never move. Displaced type is connected to its own anchor.
const NS='http://www.w3.org/2000/svg';
export const intersects=(a,b,pad=3)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
const rect=(x,y,w,h)=>({left:x,top:y,right:x+w,bottom:y+h,width:w,height:h});
const visible=r=>r.width>0&&r.height>0;
export function segmentCrosses(a,b){
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  return cross(a[0],a[1],b[0])*cross(a[0],a[1],b[1])<0&&cross(b[0],b[1],a[0])*cross(b[0],b[1],a[1])<0;
}
function segmentHitsRect(line,r){
  if(line.some(p=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom))return true;
  const corners=[{x:r.left,y:r.top},{x:r.right,y:r.top},{x:r.right,y:r.bottom},{x:r.left,y:r.bottom}];
  return corners.some((p,i)=>segmentCrosses(line,[p,corners[(i+1)%4]]));
}
function pointSegmentDistance(p,[a,b]){
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function mapObstacles(root){return [...root.parentElement.querySelectorAll('.map-tools,.map-badge,.zoom-tools,.map-legend,.map-scale')].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect()).filter(visible);}
export function displayName(p){const name=p.name.replace(/（[^）]*）/g,'').trim();return p.displayName || (p.group?name:name.split(/[：:]/)[0]) || p.name;}
function setText(p,x,y,k){
  p.label.setAttribute('x',x);p.label.setAttribute('y',y);
  [...p.label.children].forEach((n,i)=>{n.setAttribute('x',x);n.setAttribute('y',y+i*18*k);});
}
function prepareText(p,k){
  const name=displayName(p),chars=[...name],lines=chars.length>12?[chars.slice(0,10).join(''),chars.slice(10).join('')]:[name];
  p.label.replaceChildren();
  for(const line of lines){const n=document.createElementNS(NS,'tspan');n.textContent=line;p.label.append(n);}
  setText(p,0,0,k);
}
export function layoutMapLabels({svg,root,stops,background=[],k,compact=false,focusedRoute}){
  const ctm=svg.getScreenCTM();if(!ctm)return;
  const bounds=root.getBoundingClientRect(),small=bounds.width<500,obstacles=mapObstacles(root),occupied=[...obstacles],seen=new Set();
  const all=[...stops,...background],onScreen=p=>{const x=p.xy[0]*ctm.a+ctm.e,y=p.xy[1]*ctm.d+ctm.f;return x>bounds.left+6&&x<bounds.right-6&&y>bounds.top+6&&y<bounds.bottom-6;};
  const anchors=[],culled=new Set();
  for(const p of stops.filter(p=>!p.labelOnly&&(p.status!=='future'||p.focused)&&onScreen(p))){
    const a={p,x:p.xy[0]*ctm.a+ctm.e,y:p.xy[1]*ctm.d+ctm.f};
    if(anchors.some(b=>Math.hypot(a.x-b.x,a.y-b.y)<8))culled.add(p);else anchors.push(a);
  }
  let total=0,contextCount=0;const leaders=[];
  for(const p of all){
    p.node.style.display='';p.label.style.display='none';if(p.leader)p.leader.style.display='none';
    const circle=p.node.querySelector('circle'),dot=p.node.querySelector('.learning-event-dot');
    if(circle)circle.setAttribute('r',(p.eventActive?7:p.priority<=1?3.8:2.8)*k);
    if(dot)dot.setAttribute('r',3.4*k);
    const detailed=!!focusedRoute||svg.viewBox.baseVal.width<40,backgroundLabel=!!p.background;
    const hide=culled.has(p)||(!onScreen(p))||(!backgroundLabel&&obstacles.some(r=>intersects(rect(p.xy[0]*ctm.a+ctm.e-4,p.xy[1]*ctm.d+ctm.f-4,8,8),r,1)))||seen.has(displayName(p))||(!p.eventActive&&((p.status==='future'&&!p.focused)||(focusedRoute&&!p.focused&&!backgroundLabel)||(!detailed&&p.priority>2)||(small&&!detailed&&p.status==='earlier')));
    if(hide||total>=(small?15:28)||(backgroundLabel&&contextCount>=(small?2:4))){p.node.style.display='none';continue;}
    // Current sites and endpoints are strongest. Secondary stops stay readable.
    const preferred=p.eventActive?17:backgroundLabel?(small?17:20):p.priority<=1?16:14;
    let chosen;
    const sx=p.xy[0]*ctm.a+ctm.e,sy=p.xy[1]*ctm.d+ctm.f;
    for(const font of [...new Set([preferred,Math.max(14,preferred-2)])]){
      p.label.style.display='';p.label.style.fontSize=`${font*k}px`;prepareText(p,k);
      const b=p.label.getBBox(),w=b.width/k,h=b.height/k;
      const offsets=backgroundLabel?[[-w/2,-h/2],[-w/2,-h-12],[-w/2,12]]:[[9,-h-6],[9,8],[-w-9,-h-6],[-w-9,8],[-w/2,-h-13],[-w/2,14],[18,-h-23],[-w-18,-h-23],[18,25],[-w-18,25],[32,-h-42],[-w-32,-h-42],[32,44],[-w-32,44],[-w/2,-h-65],[-w/2,66]];
      for(const [dx,dy]of offsets){
        const r=rect(sx+dx,sy+dy,w,h);
        if(r.left<bounds.left+9||r.right>bounds.right-9||r.top<bounds.top+9||r.bottom>bounds.bottom-9||occupied.some(o=>intersects(r,o,5))||leaders.some(l=>segmentHitsRect(l,r)))continue;
        if(anchors.some(a=>a.p!==p&&Math.hypot(a.x-sx,a.y-sy)>1&&intersects(r,rect(a.x-4,a.y-4,8,8),3)))continue;
        const ex=Math.max(r.left,Math.min(r.right,sx)),ey=Math.max(r.top,Math.min(r.bottom,sy)),distance=Math.hypot(ex-sx,ey-sy);
        const nearAnchor=anchors.some(a=>a.p!==p&&Math.hypot(a.x-sx,a.y-sy)<18),radius=p.eventActive?8:4;
        const line=!p.labelOnly&&(distance>12||nearAnchor)?[{x:sx+(ex-sx)/distance*radius,y:sy+(ey-sy)/distance*radius},{x:ex,y:ey}]:null;
        if(line&&(leaders.some(l=>segmentCrosses(line,l))||occupied.some(o=>segmentHitsRect(line,o))||anchors.some(a=>a.p!==p&&Math.hypot(a.x-sx,a.y-sy)>1&&pointSegmentDistance(a,line)<6)))continue;
        chosen={r,line,x:p.xy[0]+(dx-b.x/k)*k,y:p.xy[1]+(dy-b.y/k)*k};break;
      }
      if(chosen)break;
    }
    if(!chosen){p.node.style.display='none';continue;}
    setText(p,chosen.x,chosen.y,k);occupied.push(chosen.r);seen.add(displayName(p));total++;if(backgroundLabel)contextCount++;
    if(p.leader&&chosen.line){
      p.leader.setAttribute('d',chosen.line.map((a,i)=>`${i?'L':'M'}${(a.x-ctm.e)/ctm.a},${(a.y-ctm.f)/ctm.d}`).join(''));p.leader.style.display='';leaders.push(chosen.line);
    }
  }
}

// Prefer a small camera shift to putting a route endpoint under a map control.
export function avoidCoveredAnchors(view,points,root){
  if(!points.length)return view;
  const b=root.getBoundingClientRect(),obstacles=mapObstacles(root),[x,y,w,h]=view,scale=b.width/w;
  const score=(v)=>points.reduce((s,item)=>{const p=item.xy||item,weight=item.weight||1,sx=b.left+(p[0]-v[0])*b.width/v[2],sy=b.top+(p[1]-v[1])*b.height/v[3];const outside=sx<b.left+24||sx>b.right-24||sy<b.top+24||sy>b.bottom-24;return s+weight*((outside?1000:0)+(obstacles.some(o=>intersects(rect(sx-12,sy-12,24,24),o,8))?500:0));},0);
  let best=view,bestCost=score(view);
  for(const factor of [1,1.12,1.28,1.5])for(const dx of [0,-35,35,-70,70,-110,110])for(const dy of [0,-35,35,-70,70,-110,110]){
    const v=[x-(w*factor-w)/2-dx/scale,y-(h*factor-h)/2-dy/scale,w*factor,h*factor],cost=score(v)+(factor-1)*8+Math.hypot(dx,dy)/100;
    if(cost<bestCost){best=v;bestCost=cost;}
  }
  return best;
}
