const $ = id => document.getElementById(id);
const dest = $("dest");
CAMPUS.places.forEach(p => dest.add(new Option(p.name, p.id)));
const m = location.hash.match(/to=([\w-]+)/);
dest.value = m && CAMPUS.byId[m[1]] ? m[1] : "lib";

let pos = null, heading = null;

function update() {
  if (!pos) return;
  const t = CAMPUS.ll(CAMPUS.byId[dest.value]);
  const dTarget = CAMPUS.hav(pos.lat, pos.lon, t.lat, t.lon);
  $("dist").textContent = dTarget > 1000 ? (dTarget / 1000).toFixed(1) + " km" : Math.round(dTarget) + " m";
  if (dTarget < 15) { $("next").textContent = "You have arrived!"; return; }
  // Aim at the next stop on the walking route; go to the nearest path point first if far from it.
  const near = CAMPUS.nearest(pos.lat, pos.lon);
  let aim = t, label = CAMPUS.byId[dest.value].name;
  const r = CAMPUS.route(near.id, dest.value);
  if (near.d > 30) { aim = CAMPUS.ll(CAMPUS.byId[near.id]); label = CAMPUS.byId[near.id].name; }
  else if (r && r.ids.length > 1) { const n = CAMPUS.byId[r.ids[1]]; aim = CAMPUS.ll(n); label = n.name; }
  $("next").textContent = "Head towards " + label;
  const b = CAMPUS.bearing(pos.lat, pos.lon, aim.lat, aim.lon);
  if (heading != null) $("arrow").style.transform = `rotate(${(b - heading + 360) % 360}deg)`;
  if (dTarget > 3000) $("status").textContent = "You are far from the campus, so the arrow is only a demo.";
}

function onOrient(e) {
  let h = null;
  if (e.webkitCompassHeading != null) h = e.webkitCompassHeading;
  else if (e.alpha != null) h = (360 - e.alpha) % 360;
  if (h != null) { heading = h; update(); }
}

$("start").onclick = async () => {
  $("status").textContent = "Starting…";
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    $("cam").srcObject = s;
  } catch (e) { $("status").textContent = "Camera not available. The arrow still works without it."; }
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
      await DeviceOrientationEvent.requestPermission();
    }
  } catch (e) {}
  window.addEventListener("deviceorientationabsolute", onOrient, true);
  window.addEventListener("deviceorientation", e => { if (e.webkitCompassHeading != null || !("ondeviceorientationabsolute" in window)) onOrient(e); }, true);
  if (!navigator.geolocation) { $("status").textContent = "Location is not supported on this device."; return; }
  navigator.geolocation.watchPosition(
    p => { pos = { lat: p.coords.latitude, lon: p.coords.longitude }; $("status").textContent = "Following your location"; update(); },
    () => { $("status").textContent = "Location blocked. Turn on location access for this site."; },
    { enableHighAccuracy: true, maximumAge: 1000 }
  );
  $("start").style.display = "none";
};
dest.onchange = update;
