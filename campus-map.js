// CAMPUS DATA - TEST VERSION with real GPS coordinates.
// Each place now uses lat / lon directly. x,y (metres from the Main Gate) are calculated automatically.
// To change a place later, just edit its lat / lon below.
const CAMPUS = {
  name: "AJIET Campus Navigator",
  // Main Gate position. PLACEHOLDER: replace with the real Main Gate lat/lon.
  origin: { lat: 12.30250, lon: 75.25940 },
  places: [
    { id: "gate", name: "Main Gate", lat: 12.30250, lon: 75.25940 },      // PLACEHOLDER
    { id: "lib", name: "Library", lat: 12.302702, lon: 75.259497 },
    { id: "ece", name: "ECE Department", lat: 12.302648, lon: 75.259469 },
    { id: "aiml", name: "AIML Department", lat: 12.30269, lon: 75.259491 }
  ],
  // Walkable paths between places
  edges: [
    ["gate", "lib"], ["gate", "ece"], ["gate", "aiml"],
    ["lib", "ece"], ["lib", "aiml"], ["ece", "aiml"]
  ]
};

// Convert each place's lat/lon into x (east) and y (north) metres from the origin.
CAMPUS.places.forEach(p => {
  if (p.lat !== undefined) {
    p.y = (p.lat - CAMPUS.origin.lat) * 111320;
    p.x = (p.lon - CAMPUS.origin.lon) * 111320 * Math.cos(CAMPUS.origin.lat * Math.PI / 180);
  }
});

(function () {
  const byId = {};
  CAMPUS.places.forEach(p => (byId[p.id] = p));
  CAMPUS.byId = byId;
  const adj = {};
  CAMPUS.edges.forEach(([a, b]) => {
    const d = Math.hypot(byId[a].x - byId[b].x, byId[a].y - byId[b].y);
    (adj[a] = adj[a] || []).push([b, d]);
    (adj[b] = adj[b] || []).push([a, d]);
  });
  const R = Math.PI / 180;
  CAMPUS.ll = p => {
    const lat = CAMPUS.origin.lat + p.y / 111320;
    return { lat, lon: CAMPUS.origin.lon + p.x / (111320 * Math.cos(lat * R)) };
  };
  CAMPUS.hav = (a, b, c, d) => {
    const dl = (c - a) * R, dn = (d - b) * R;
    const h = Math.sin(dl / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(dn / 2) ** 2;
    return 12742000 * Math.asin(Math.sqrt(h));
  };
  CAMPUS.bearing = (a, b, c, d) => {
    const y = Math.sin((d - b) * R) * Math.cos(c * R);
    const x = Math.cos(a * R) * Math.sin(c * R) - Math.sin(a * R) * Math.cos(c * R) * Math.cos((d - b) * R);
    return (Math.atan2(y, x) / R + 360) % 360;
  };
  CAMPUS.nearest = (lat, lon) => {
    let best = null;
    CAMPUS.places.forEach(p => {
      const q = CAMPUS.ll(p), d = CAMPUS.hav(lat, lon, q.lat, q.lon);
      if (!best || d < best.d) best = { id: p.id, d };
    });
    return best;
  };
  // Shortest walking route (Dijkstra). Returns { ids:[...], dist } or null.
  CAMPUS.route = (from, to) => {
    const dist = {}, prev = {}, todo = new Set(CAMPUS.places.map(p => p.id));
    CAMPUS.places.forEach(p => (dist[p.id] = Infinity));
    dist[from] = 0;
    while (todo.size) {
      let u = null;
      todo.forEach(i => { if (u === null || dist[i] < dist[u]) u = i; });
      if (dist[u] === Infinity) break;
      todo.delete(u);
      if (u === to) break;
      (adj[u] || []).forEach(([v, w]) => {
        if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
      });
    }
    if (dist[to] === Infinity) return null;
    const ids = [to];
    while (ids[0] !== from) ids.unshift(prev[ids[0]]);
    return { ids, dist: dist[to] };
  };
})();
