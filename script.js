const sel = id => document.getElementById(id);
const fromEl = sel("from"), toEl = sel("to"), out = sel("result"), svg = sel("map");
const P = CAMPUS.places, B = CAMPUS.byId, NS = "http://www.w3.org/2000/svg";

P.forEach(p => {
  fromEl.add(new Option(p.name, p.id));
  toEl.add(new Option(p.name, p.id));
});
fromEl.value = "gate";
toEl.value = "lib";

function el(name, attrs, text) {
  const e = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  if (text) e.textContent = text;
  return e;
}

function drawMap(ids) {
  const xs = P.map(p => p.x), ys = P.map(p => -p.y), pad = 45;
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - minX, h = Math.max(...ys) + pad - minY;
  svg.setAttribute("viewBox", `${minX} ${minY} ${w} ${h}`);
  svg.innerHTML = "";
  CAMPUS.edges.forEach(([a, b]) =>
    svg.appendChild(el("line", { class: "edge", x1: B[a].x, y1: -B[a].y, x2: B[b].x, y2: -B[b].y })));
  if (ids) svg.appendChild(el("polyline", { class: "route", points: ids.map(i => `${B[i].x},${-B[i].y}`).join(" ") }));
  P.forEach(p => {
    const on = ids && ids.includes(p.id);
    svg.appendChild(el("circle", { class: "node" + (on ? " on" : ""), cx: p.x, cy: -p.y, r: on ? 7 : 5 }));
    svg.appendChild(el("text", { class: "lbl", x: p.x, y: -p.y - 10 }, p.name));
  });
}

function find() {
  const from = fromEl.value, to = toEl.value;
  if (from === to) { out.innerHTML = '<p class="muted">You are already there.</p>'; drawMap([from]); return; }
  const r = CAMPUS.route(from, to);
  if (!r) { out.innerHTML = "<p>No walking route found.</p>"; return; }
  drawMap(r.ids);
  const steps = r.ids.slice(1).map((id, i) => {
    const a = B[r.ids[i]], b = B[id];
    return `<li>Walk from <b>${a.name}</b> to <b>${b.name}</b> (about ${Math.round(Math.hypot(a.x - b.x, a.y - b.y))} m)</li>`;
  }).join("");
  out.innerHTML = `<p class="sum">${Math.round(r.dist)} m · about ${Math.max(1, Math.round(r.dist / 80))} min walk</p><ol>${steps}</ol>
   <a class="btn alt" href="ar-navigation.html#to=${to}">Open AR navigation</a>`;
}

sel("go").onclick = find;
sel("swap").onclick = () => { const t = fromEl.value; fromEl.value = toEl.value; toEl.value = t; find(); };
drawMap();
find();
