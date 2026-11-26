const KEY="ajiet-att";
let db={};
try{db=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
SUBJECTS.forEach(s=>sub.add(new Option(s)));
STUDENTS.forEach(([u,n])=>usn.add(new Option(u+" - "+n,u)));
date.value=date.max=new Date().toLocaleDateString("en-CA");
function roll_(){
  const r=db[date.value+"|"+sub.value]||{};
  roll.innerHTML=STUDENTS.map(([u,n])=>`<div class="st"><span>${n}<br><small>${u}</small></span><select data-u="${u}" aria-label="${n}"><option value="">Not marked</option><option value="P"${r[u]=="P"?" selected":""}>Present</option><option value="A"${r[u]=="A"?" selected":""}>Absent</option></select></div>`).join("");
  msg.textContent="";
}
function mine_(){
  const rows=Object.keys(db).sort().reverse().map(k=>[...k.split("|"),db[k][usn.value]]).filter(x=>x[2]);
  if(!rows.length){mine.innerHTML='<p class="muted">No attendance marked yet.</p>';return}
  const p=rows.filter(x=>x[2]=="P").length;
  mine.innerHTML=`<p class="sum">${Math.round(p/rows.length*100)}% (${p} of ${rows.length} classes)</p><table><tr><th>Date</th><th>Subject</th><th>Status</th></tr>${rows.map(([d,s,v])=>`<tr><td>${d}</td><td>${s}</td><td class="${v}">${v=="P"?"Present":"Absent"}</td></tr>`).join("")}</table>`;
}
save.onclick=()=>{
  const all=[...roll.querySelectorAll("select")];
  if(!date.value||all.some(s=>!s.value)){msg.textContent="Choose a date and mark every student.";return}
  db[date.value+"|"+sub.value]=Object.fromEntries(all.map(s=>[s.dataset.u,s.value]));
  try{localStorage.setItem(KEY,JSON.stringify(db));msg.textContent="Attendance saved."}catch(e){msg.textContent="Could not save. Turn off private browsing."}
  mine_();
};
date.onchange=sub.onchange=roll_;usn.onchange=mine_;roll_();mine_();
