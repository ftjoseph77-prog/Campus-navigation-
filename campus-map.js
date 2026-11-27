// CAMPUS DATA
// Places with lat/lon = REAL GPS positions (Main Gate, ECE, AIML, Civil).
// Places with x,y     = SAMPLE positions (metres EAST / NORTH of the Main Gate). Replace them with lat/lon later.
// To make a place real: delete its x,y and write lat and lon instead.
const CAMPUS = {
  name: "AJIET Campus Navigator",
  // Origin = Main Gate (real GPS). Sample x,y are measured from here.
  origin: { lat: 12.302598, lon: 75.259487 },
  places: [
    { id: "gate", name: "Main Gate", lat: 12.302598, lon: 75.259487 },          // REAL
    { id: "parking", name: "Parking", x: -50, y: 20 },              // SAMPLE
    { id: "canteen", name: "Canteen", x: 100, y: 20 },              // SAMPLE
    { id: "admin", name: "Admin Block", x: 40, y: 60 },             // SAMPLE
    { id: "aud", name: "Auditorium", x: -40, y: 90 },               // SAMPLE
    { id: "lib", name: "Library", x: 90, y: 80 },                    // SAMPLE
    { id: "cse", name: "CSE Department", x: 140, y: 60 },           // SAMPLE
    { id: "ece", name: "ECE Department (2nd floor)", lat: 12.302648, lon: 75.259469 },   // REAL
    { id: "aiml", name: "AIML Department (2nd floor)", lat: 12.302702, lon: 75.259497 },  // REAL
    { id: "mech", name: "Mechanical Department", x: 60, y: 140 },   // SAMPLE
    { id: "civil", name: "Civil Department (2nd floor)", lat: 12.30269, lon: 75.259491 },  // REAL
    { id: "ground", name: "Sports Ground", x: 210, y: 10 },         // SAMPLE
    { id: "hostel", name: "Hostel", x: 230, y: 170 }                // SAMPLE
  ],
  // Walkable paths between places
  edges: [
    ["gate", "parking"], ["gate", "admin"], ["gate", "canteen"], ["admin", "aud"],
    ["admin", "lib"], ["admin", "mech"], ["lib", "cse"], ["canteen", "cse"],
    ["cse", "ece"], ["cse", "civil"], ["ece", "mech"], ["ece", "hostel"],
    ["civil", "ground"], ["civil", "hostel"], ["canteen", "ground"],
    ["gate", "aiml"], ["aiml", "ece"], ["aiml", "civil"], ["ece", "civil"]
  ]
};

// Convert real lat/lon places into x,y metres from the origin.
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
