const CAMPUS_FALLBACK = {lat:12.90167, lng:74.999472}; // Approximate campus centre; verify before use.
const map = L.map('map').setView([CAMPUS_FALLBACK.lat,CAMPUS_FALLBACK.lng],17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:20, attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

let places=[], myPosition=null, myMarker=null, routeLayer=null, firebaseDb=null, watchId=null, myShareId=null;
const markers = new Map();
const $ = id => document.getElementById(id);
const status = msg => $('status').textContent=msg;

fetch('locations.json').then(r=>r.json()).then(data=>{
  places=data.places||[];
  const campus=data.campus||CAMPUS_FALLBACK;
  L.marker([campus.lat,campus.lng]).addTo(map).bindPopup('<b>'+escapeHtml(campus.name)+'</b><br>Approximate campus centre');
  map.setView([campus.lat,campus.lng],17);
  renderPlaces();
}).catch(()=>status('Could not load locations.json. Check that the file is in the repository root.'));

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function valid(p){return Number.isFinite(p.lat)&&Number.isFinite(p.lng);}
function renderPlaces(filter=''){
  const select=$('destination'), list=$('placeList'), old=select.value;
  select.innerHTML='<option value="">Select a place…</option>'; list.innerHTML='';
  places.filter(p=>(p.name+' '+p.category+' '+(p.floor||'')).toLowerCase().includes(filter.toLowerCase())).forEach(p=>{
    const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.name+(valid(p)?'':' — pin needed');select.appendChild(opt);
    const li=document.createElement('li');const span=document.createElement('span');span.textContent=p.name;
    const btn=document.createElement('button');btn.textContent='View';btn.onclick=()=>focusPlace(p);
    li.append(span,btn);list.appendChild(li);
    if(valid(p)&&!markers.has(p.id)){markers.set(p.id,L.marker([p.lat,p.lng]).addTo(map).bindPopup('<b>'+escapeHtml(p.name)+'</b><br>'+escapeHtml(p.category)));}
  });
  if(old&&[...select.options].some(o=>o.value===old))select.value=old;
  updateRouteButton();
}
function focusPlace(p){
  if(!valid(p)){status('This place has no verified map pin yet. Add its latitude and longitude in locations.json.');return;}
  map.setView([p.lat,p.lng],19);markers.get(p.id)?.openPopup();$('destination').value=p.id;updateRouteButton();
}
$('search').addEventListener('input',e=>renderPlaces(e.target.value));
$('destination').addEventListener('change',updateRouteButton);
function selected(){return places.find(p=>p.id===$('destination').value);}
function updateRouteButton(){$('routeBtn').disabled=!(myPosition&&selected()&&valid(selected()));}
$('locateBtn').onclick=()=>{
  if(!navigator.geolocation){status('This browser does not support GPS location.');return;}
  status('Requesting location permission…');
  navigator.geolocation.getCurrentPosition(pos=>{
    myPosition={lat:pos.coords.latitude,lng:pos.coords.longitude};
    showMyPosition();status('Your current phone location is shown on the map. It is not shared unless you enable sharing.');
    updateRouteButton();
  },err=>status('Location unavailable: '+err.message+'. Allow location permission and use the HTTPS GitHub Pages URL.'),{enableHighAccuracy:true,timeout:15000,maximumAge:5000});
};
function showMyPosition(){
  const ll=[myPosition.lat,myPosition.lng];
  if(!myMarker)myMarker=L.circleMarker(ll,{radius:9,color:'#fff',weight:3,fillColor:'#1779e8',fillOpacity:1}).addTo(map).bindPopup('Your phone location');
  else myMarker.setLatLng(ll);
  map.setView(ll,18);
}
$('routeBtn').onclick=async()=>{
  const p=selected();if(!myPosition||!valid(p))return;
  status('Finding walking route…');
  try{
    const url=`https://router.project-osrm.org/route/v1/foot/${myPosition.lng},${myPosition.lat};${p.lng},${p.lat}?overview=full&geometries=geojson`;
    const response=await fetch(url);const data=await response.json();
    if(!data.routes?.length)throw new Error('No route found');
    if(routeLayer)map.removeLayer(routeLayer);
    routeLayer=L.geoJSON(data.routes[0].geometry,{style:{color:'#1769aa',weight:6,opacity:.85}}).addTo(map);
    map.fitBounds(routeLayer.getBounds(),{padding:[30,30]});
    const metres=data.routes[0].distance, mins=Math.round(data.routes[0].duration/60);
    status(`Walking route shown. Approx. ${(metres/1000).toFixed(2)} km · ${mins} min. Confirm paths on site.`);
  }catch(e){status('Could not calculate a walking route. Check the pins and internet connection.');}
};

// Realtime sharing uses Firebase only after the user explicitly opts in.
function setupFirebase(){
  if(!window.FIREBASE_CONFIG||!window.FIREBASE_CONFIG.databaseURL||!window.firebase){$('shareStatus').textContent='Live sharing is not configured yet. See README.md.';return;}
  try{if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);firebaseDb=firebase.database();}
  catch(e){$('shareStatus').textContent='Firebase setup error. Check firebase-config.js.';}
}
setupFirebase();
$('shareToggle').addEventListener('change',e=>{
  if(e.target.checked)startSharing();else stopSharing();
});
function startSharing(){
  if(!firebaseDb){$('shareToggle').checked=false;$('shareStatus').textContent='Add Firebase settings first. See README.md.';return;}
  if(!navigator.geolocation){$('shareToggle').checked=false;return;}
  myShareId='u_'+Math.random().toString(36).slice(2,12);
  $('shareStatus').textContent='Waiting for GPS permission…';
  watchId=navigator.geolocation.watchPosition(pos=>{
    myPosition={lat:pos.coords.latitude,lng:pos.coords.longitude};showMyPosition();updateRouteButton();
    firebaseDb.ref('liveLocations/'+myShareId).set({lat:myPosition.lat,lng:myPosition.lng,updatedAt:Date.now(),label:'Campus user'});
    $('shareStatus').textContent='Sharing is ON. Turn the switch off to stop.';
  },err=>{$('shareStatus').textContent='Could not share location: '+err.message;stopSharing();},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  firebaseDb.ref('liveLocations/'+myShareId).onDisconnect().remove();
  listenForOthers();
}
function listenForOthers(){
  firebaseDb.ref('liveLocations').on('value',snap=>{
    const all=snap.val()||{};
    Object.entries(all).forEach(([id,u])=>{
      if(id===myShareId||!Number.isFinite(u.lat)||!Number.isFinite(u.lng))return;
      const ll=[u.lat,u.lng];
      if(!markers.has('shared_'+id))markers.set('shared_'+id,L.circleMarker(ll,{radius:7,color:'#fff',weight:2,fillColor:'#20a477',fillOpacity:1}).addTo(map).bindPopup('Shared user'));
      else markers.get('shared_'+id).setLatLng(ll);
    });
    for(const [key,marker] of markers){if(key.startsWith('shared_')&&!all[key.slice(7)]){map.removeLayer(marker);markers.delete(key);}}
  });
}
function stopSharing(){
  if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}
  if(firebaseDb&&myShareId){firebaseDb.ref('liveLocations/'+myShareId).remove();firebaseDb.ref('liveLocations').off();}
  myShareId=null;$('shareStatus').textContent='Not sharing.';$('shareToggle').checked=false;
}
window.addEventListener('pagehide',()=>{if(myShareId&&firebaseDb)firebaseDb.ref('liveLocations/'+myShareId).remove();});
