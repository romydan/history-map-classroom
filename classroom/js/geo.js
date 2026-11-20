// Georeferenced Mercator chart. Data: Natural Earth; historical polity data: Jiangshan Atlas.
// Coordinates stay in WGS84. No generated map outlines are used.
export const WORLD = 1000;
export function project([lon, lat]) {
  const phi = Math.max(-85.051129, Math.min(85.051129, lat)) * Math.PI / 180;
  return [(lon + 180) / 360 * WORLD, (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2 * WORLD];
}
export function latitudeAtY(y) {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / WORLD))) * 180 / Math.PI;
}
export function distanceScale(view, width, height, targetPixels = 130) {
  const unitPerPixel = Math.min(view[2] / width, view[3] / height);
  const latitude = latitudeAtY(view[1] + view[3] / 2);
  const kmPerPixel = 40075.016686 / WORLD * Math.cos(latitude * Math.PI / 180) * unitPerPixel;
  const targetKm = kmPerPixel * targetPixels;
  const magnitude = 10 ** Math.floor(Math.log10(targetKm));
  const candidates = [1, 2, 5, 10].map(n => n * magnitude);
  const km = candidates.sort((a,b) => Math.abs(a-targetKm)-Math.abs(b-targetKm))[0];
  return { km, pixels: km / kmPerPixel, latitude };
}
export function ringPath(ring) {
  return ring.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(n => n.toFixed(3)).join(',')}`).join('') + 'Z';
}
export function geometryPath(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates.map(ringPath).join('');
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap(p => p.map(ringPath)).join('');
  if (geometry.type === 'LineString') return routePath(geometry.coordinates);
  if (geometry.type === 'MultiLineString') return geometry.coordinates.map(routePath).join('');
  return '';
}
export function splitRoute(points) {
  if (!points?.length) return [];
  const parts = [[points[0]]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], delta = b[0] - a[0];
    if (Math.abs(delta) <= 180) { parts.at(-1).push(b); continue; }
    const adjusted = b[0] + (delta > 0 ? -360 : 360);
    const boundary = delta > 0 ? -180 : 180;
    const lat = a[1] + (b[1] - a[1]) * (boundary - a[0]) / (adjusted - a[0]);
    parts.at(-1).push([boundary, lat]);
    parts.push([[-boundary, lat], b]);
  }
  return parts.filter(p => p.length > 1);
}
export function routePath(points) {
  return splitRoute(points).map(part => part.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(n => n.toFixed(3)).join(',')}`).join('')).join('');
}
export function fitBounds(points, aspect = 1.25, world = false) {
  const p = points.filter(p => Array.isArray(p) && p.every(Number.isFinite)).map(project);
  if (world || !p.length || Math.max(...p.map(p => p[0])) - Math.min(...p.map(p => p[0])) > 700) {
    const a = project([-148, 82]), b = project([155, -62]);
    return fitRect([a[0], a[1], b[0] - a[0], b[1] - a[1]], aspect);
  }
  const xs = p.map(p => p[0]), ys = p.map(p => p[1]);
  let w = Math.max(105, Math.max(...xs) - Math.min(...xs) + 80);
  let h = Math.max(95, Math.max(...ys) - Math.min(...ys) + 70);
  return fitRect([(Math.max(...xs) + Math.min(...xs) - w) / 2, (Math.max(...ys) + Math.min(...ys) - h) / 2, w, h], aspect);
}
export function fitLearningBounds(points, aspect = 1.25, {world=false,extent} = {}) {
  if(world) return fitBounds(points,aspect,true);
  const p=(extent || points).filter(p=>Array.isArray(p)&&p.every(Number.isFinite)).map(project);
  if(!p.length) return fitBounds([],aspect,true);
  const xs=p.map(p=>p[0]),ys=p.map(p=>p[1]);
  if(Math.max(...xs)-Math.min(...xs)>700) return fitBounds(points,aspect,true);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const minimum=extent?3:25,padding=extent?2:10;
  const w=Math.max(minimum,(maxX-minX)*1.25+padding),h=Math.max(minimum,(maxY-minY)*1.25+padding);
  // Reserve room for the cartouche, named waypoints and the bottom map key.
  return fitRect([(minX+maxX-w)/2,(minY+maxY-h)/2,w,h],aspect);
}
function fitRect([x, y, w, h], aspect) {
  if (w / h > aspect) { const nh = w / aspect; y -= (nh - h) / 2; h = nh; }
  else { const nw = h * aspect; x -= (nw - w) / 2; w = nw; }
  return [x, y, w, h];
}
export function clampView([x, y, w, h]) {
  const ww = Math.min(1200, Math.max(24, w));
  const hh = h * ww / w;
  return [Math.max(-150, Math.min(1150 - ww, x)), Math.max(-100, Math.min(1100 - hh, y)), ww, hh];
}
