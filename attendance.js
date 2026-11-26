const KEY="ajiet-att", LIMIT=75;
let db={};
try{db=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
SUBJECTS.forEach(s=>sub.add(new Option(s)));
STUDENTS.forEach(([u,n])=>usn.add(new Option(u+" - "+n,u)));
date.value=date.max=new Date().toLocaleDateString("en-CA");
const pct=(p,t)=>t?Math.round(p/t*100):0;
const cls=(p,t)=>t&&pct(p,t)<LIMIT?"low":"";

function roll_(){
  const r=db[date.value+"|"+sub.value]||{};
  roll.innerHTML=STUDENTS.map(([u,n])=>`<div class="st"><span>${n}<br><small>${u}</small></span><select data-u="${u}" aria-label="${n}"><option value="">Not marked</option><option value="P"${r[u]=="P"?" selected":""}>Present</option><option value="A"${r[u]=="A"?" selected":""}>Absent</option></select></div>`).join("");
  msg.textContent="";
}
// Present / total classes of one student for every subject
function stats(u){
  const per={};
  SUBJECTS.forEach(s=>per[s]={p:0,t:0});
  Object.keys(db).forEach(k=>{
    const s=k.split("|")[1], v=db[k][u];
    if(!v||!per[s])return;
    per[s].t++; if(v=="P")per[s].p++;
  });
  return per;
}
function mine_(){
  const per=stats(usn.value);
  let P=0,T=0;
  const rows=SUBJECTS.map(s=>{const {p,t}=per[s];P+=p;T+=t;
    return `<tr><td>${s}</td><td>${p}</td><td>${t}</td><td class="${cls(p,t)}">${t?pct(p,t)+"%":"-"}</td></tr>`}).join("");
  if(!T){mine.innerHTML='<p class="muted">No attendance marked yet.</p>';return}
  mine.innerHTML=`<p class="sum ${cls(P,T)}">Overall ${pct(P,T)}% (${P} of ${T} classes)</p>`+
    (pct(P,T)<LIMIT?`<p class="warn">Attendance is below ${LIMIT}%.</p>`:"")+
    `<div class="scroll"><table><tr><th>Subject</th><th>Present</th><th>Total</th><th>%</th></tr>${rows}</table></div>`;
}
function all_(){
  const head=`<tr><th>Roll</th><th>Name</th>${SUBJECTS.map(s=>`<th>${s}</th>`).join("")}<th>Overall</th></tr>`;
  const body=STUDENTS.map(([u,n])=>{
    const per=stats(u); let P=0,T=0;
    const cells=SUBJECTS.map(s=>{const {p,t}=per[s];P+=p;T+=t;return `<td class="${cls(p,t)}">${t?pct(p,t)+"%":"-"}</td>`}).join("");
    return `<tr><td>${u}</td><td>${n}</td>${cells}<td class="${cls(P,T)}">${T?pct(P,T)+"%":"-"}</td></tr>`;
  }).join("");
  all.innerHTML=`<table>${head}${body}</table>`;
}
allp.onclick=()=>roll.querySelectorAll("select").forEach(s=>s.value="P");
save.onclick=()=>{
  const sel=[...roll.querySelectorAll("select")];
  if(!date.value||sel.some(s=>!s.value)){msg.textContent="Choose a date and mark every student.";return}
  db[date.value+"|"+sub.value]=Object.fromEntries(sel.map(s=>[s.dataset.u,s.value]));
  try{localStorage.setItem(KEY,JSON.stringify(db));msg.textContent="Attendance saved."}catch(e){msg.textContent="Could not save. Turn off private browsing."}
  mine_();all_();
};
date.onchange=sub.onchange=roll_;usn.onchange=mine_;
roll_();mine_();all_();
