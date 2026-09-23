// Throwaway interaction study. All research and edits stay in browser memory.
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = [
  '<path d="M4 12h16M12 4v16M6 6l12 12M18 6 6 18"/><circle cx="12" cy="12" r="4"/>',
  '<path d="m12 3 9 9-9 9-9-9zM8 12h8M12 8v8"/>',
  '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c-5 5-5 11 0 16 5-5 5-11 0-16"/>',
  '<path d="M5 5h5v5H5zM14 14h5v5h-5zM7 10v7h7M10 7h7v7"/>',
  '<path d="m13 3-8 11h6l-1 7 9-12h-7z"/>',
  '<path d="m12 3 8 4v6c0 4-8 8-8 8s-8-4-8-8V7zM8 12l3 3 5-6"/>',
  '<path d="M4 9a8 8 0 1 1 1 9M4 3v6h6M12 7v5l4 2"/>'
];
const symbol = index => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[index % icons.length]}</svg>`;
const domains = [
  {name:'The experience',accent:'var(--mint)',icon:1,desc:'Make a complex idea feel inviting without hiding its complexity.',topics:['A map you can navigate','Questions at the right time','Signals that feel meaningful'],leaves:[['Zoom and orientation','Find a thought again','Keyboard exploration'],['One question or many?','Pause and return','A useful recommendation'],['What does a glow mean?','Progress without pressure','Show the unknown']],question:'When you open a complex map, what should help you choose your next step?',finding:'Keep suggested branches available but visually quiet. Let a selected node explain why it matters before asking for commitment.'},
  {name:'The knowledge',accent:'var(--blue)',icon:2,desc:'Keep the reasoning useful to people and to the next agent that reads it.',topics:['A format agents can read','Evidence and uncertainty','Relationships, not just lists'],leaves:[['A small entry point','Details on demand','Context window budget'],['Source provenance','Facts vs. assumptions','Conflicting findings'],['Cross-domain connections','Dependencies','Changing your mind']],question:'What should an agent understand first when it opens this map?',finding:'Start with a short overview, then follow stable node references into relevant evidence. Keep assumptions separate from confirmed decisions.'},
  {name:'The agents',accent:'var(--gold)',icon:3,desc:'Explore in parallel while keeping the person in charge of scope.',topics:['Activate a branch','Keep research bounded','Work across coding agents'],leaves:[['User consent in the UI','Job ownership','Progress visibility'],['A stopping condition','Ask before expanding','Recover interrupted work'],['Codex workflow','Claude Code workflow','Copilot workflow']],question:'What should cause an agent to stop researching and come back to you?',finding:'Treat activation as permission for one branch. Stop at a useful finding or a consequential question; propose deeper work as new gray nodes.'},
  {name:'The discovery',accent:'var(--mint)',icon:4,desc:'Uncover valuable directions, including questions nobody thought to ask.',topics:['Find hidden assumptions','Suggest the next direction','Know when to stop'],leaves:[['A counterexample','The smallest experiment','Where might this fail?'],['Adjacent domains','Alternative approaches','Research priority'],['Enough to build','Unresolved questions','Avoid endless exploration']],question:'Which matters more here: broad coverage or depth on the riskiest assumption?',finding:'Use broad discovery to suggest options, then prioritize the assumption most likely to change the plan. Coverage alone is not understanding.'},
  {name:'The trust',accent:'var(--blue)',icon:5,desc:'Make the state of the exploration honest and legible at every step.',topics:['Who decided what?','Research you can inspect','Safe local ownership'],leaves:[['User decisions','Agent suggestions','Revision history'],['Cite the source','Surface disagreement','Flag stale conclusions'],['Local-first files','No silent execution','Portable project data']],question:'What would make you trust a researched node enough to build on it?',finding:'Show the source, the reasoning, and remaining uncertainty. A lit node means explored; it should not imply the user has accepted its conclusion.'},
  {name:'The continuity',accent:'var(--gold)',icon:6,desc:'Return to an exploration later without reconstructing the whole conversation.',topics:['Resume a session','Build from the map','Let an idea evolve'],leaves:[['A useful recap','Pending questions','Work across devices'],['Read the right branch','Accepted decisions','Implementation constraints'],['Revise an assumption','Invalidate descendants','Compare alternatives']],question:'When you return a week later, what would you want the map to remind you of?',finding:'Resume with the latest decisions, unanswered questions, and active branches. Preserve the reasoning behind changes instead of replacing it silently.'}
];
let nodes, selected = 'root', variant = new URL(location.href).searchParams.get('variant') === 'paths' ? 'paths' : 'constellation';
let timers = new Set(), transform = {x:0,y:0,scale:1}, dragging, mapTitle = 'Grill My Mind';
let lightMode = new URL(location.href).searchParams.get('theme') === 'light';
const offsets = {constellation: new Map(), paths: new Map()};
const stateNames = {suggested:'Unexplored',explored:'Explored',researching:'Researching',question:'Needs your answer'};
function seed() {
  nodes = [{id:'root',title:'Grill My Mind',domain:-1,depth:0,status:'explored',icon:0,summary:'A living map of an idea. Follow questions into research, and turn research into shared understanding.'}];
  domains.forEach((domain,d) => {
    const id = `d${d}`;
    nodes.push({id,parent:'root',title:domain.name,domain:d,depth:1,status:d < 3 ? 'explored':'suggested',icon:domain.icon,summary:domain.desc});
    domain.topics.forEach((title,t) => {
      const topicId = `${id}-${t}`;
      nodes.push({id:topicId,parent:id,title,domain:d,depth:2,branch:t,status:d<3&&t===0?'explored':'suggested',icon:domain.icon});
      domain.leaves[t].forEach((title,l) => nodes.push({id:`${topicId}-${l}`,parent:topicId,title,domain:d,depth:3,branch:t,leaf:l,status:d===0&&t===0&&l===0?'explored':'suggested',icon:(domain.icon+l)%7}));
    });
  });
}
function position(node) {
  const point = basePosition(node), offset = offsets[variant].get(node.id);
  return offset ? {x:point.x+offset.x,y:point.y+offset.y} : point;
}
function basePosition(node) {
  if (variant === 'paths') {
    const rect=$('#canvas').getBoundingClientRect();
    const height=rect.height/Math.max(.5,rect.width/1400);
    const y=value=>22+(height-50)*value;
    if(node.id==='root') return {x:700,y:18};
    const cx = 118 + node.domain * 232;
    if(node.depth===1) return {x:cx,y:y(.24)};
    if(node.depth===2) return {x:cx+(node.branch-1)*67,y:y(.53+(node.branch===1?.04:0))};
    if(node.depth===3) return {x:cx+(node.branch-1)*67+(node.leaf-1)*22,y:y(.82+(node.leaf===1?.05:0))};
    const parent = basePosition(nodes.find(n=>n.id===node.parent));
    return {x:parent.x+(node.leaf===0?-25:25),y:Math.min(height-18,parent.y+55)};
  }
  if(node.id==='root')return{x:700,y:500};
  const base = (-155 + node.domain*60)*Math.PI/180;
  const angle = base + (node.depth>=2?(node.branch-1)*.22:0) + (node.depth>=3?(node.leaf-1)*.065:0);
  const radius = node.depth===1?190+(node.domain%3)*28:node.depth===2?325+node.branch*35:node.depth===3?460+node.leaf*40+node.branch*28:620;
  return {x:700+Math.cos(angle)*radius,y:500+Math.sin(angle)*radius*.64};
}
function renderGraph() {
  const edges = [], buttons = [];
  nodes.forEach(node=>{
    const p = position(node), accent = node.domain<0?'var(--mint)':domains[node.domain].accent;
    if(node.parent){const parent = nodes.find(n=>n.id===node.parent), q=position(parent), lit=node.status==='explored';
      const path=variant==='paths'?`M${q.x},${q.y} C${q.x},${(q.y+p.y)/2} ${p.x},${(q.y+p.y)/2} ${p.x},${p.y}`:`M${q.x},${q.y} L${p.x},${p.y}`;
      edges.push(`<path d="${path}" class="${lit?'lit':''}" style="--accent:${accent}"/>`);
    }
    const label = node.id==='root'||(variant==='constellation'&&node.depth===1);
    buttons.push(`<button class="node ${node.depth<2?'major':''} ${node.id==='root'?'root':''} ${node.status} ${node.id===selected?'selected':''}" data-node="${node.id}" style="left:${p.x}px;top:${p.y}px;--accent:${accent}" aria-label="${escape(node.title)}, ${stateNames[node.status]}" aria-pressed="${node.id===selected}">${symbol(node.icon)}<span class="tooltip">${escape(node.title)} · ${stateNames[node.status]}</span>${label?`<span class="node-label">${escape(node.title)}</span>`:''}</button>`);
  });
  $('#connections').innerHTML=edges.join('');$('#nodes').innerHTML=buttons.join('');
  $('#zones').innerHTML=domains.map((domain,d)=>{
    const p=variant==='paths'?{x:118+d*232,y:3}:{x:700+Math.cos((-155+d*60)*Math.PI/180)*460,y:500+Math.sin((-155+d*60)*Math.PI/180)*460*.76-64};
    return `<div class="zone" style="left:${p.x}px;top:${p.y}px">${variant==='paths'?escape(domain.name):`0${d+1}`} ${variant==='paths'?`<span>${nodes.filter(n=>n.domain===d&&n.status==='explored').length} / ${nodes.filter(n=>n.domain===d).length} explored</span>`:''}</div>`;
  }).join('');
  const explored=nodes.filter(n=>n.status==='explored').length;
  $('#count').textContent=explored;$('#total').textContent=nodes.length;$('#progress-fill').style.width=`${explored/nodes.length*100}%`;
}
function renderDetail() {
  const node=nodes.find(n=>n.id===selected),domain=domains[node.domain],root=node.id==='root';
  const heading=`<div class="detail-heading"><div class="detail-top"><span>${root?'THE STARTING IDEA':`0${node.domain+1} / ${escape(domain.name.replace('The ',''))}`}</span><span class="status ${node.status}">${stateNames[node.status]}</span></div><div class="detail-symbol" style="--accent:${domain?.accent||'var(--mint)'}">${symbol(node.icon)}</div><h2>${escape(node.title)}</h2><p class="detail-copy">${escape(node.summary||`Explore ${node.title.toLowerCase()} and how it might shape the idea. ${domain.desc}`)}</p></div>`;
  let body, action;
  if(root) {
    body='<div class="detail-section"><span class="small-label">Your exploration</span><p>Every gray node is a possible direction. Open one to see why it matters, then decide whether to explore it.</p><p class="subnote">Nothing is locked. You choose the order and the depth.</p></div>';
    action='<div><button class="primary" data-select="d0-1">Try a question-led exploration ↗</button><p class="subnote">This preview uses illustrative branches and simulated findings.</p></div>';
  } else if(node.status==='suggested') {
    body=`<div class="detail-section"><span class="small-label">Why follow this thread?</span><p>${escape(domain.question)}</p><p class="subnote">A focused question can reveal a constraint before it becomes a costly assumption.</p></div>`;
    action='<div><button class="primary" id="explore">Explore this idea ↗</button><p class="subnote">Preview: a question, then a simulated finding.<br>Only this branch lights up.</p></div>';
  } else if(node.status==='researching') {
    body='<div class="detail-section"><span class="small-label">Exploring this thread</span><p>Connecting the idea to its surrounding questions…</p></div>';
    action='<div><button class="primary" disabled>Simulating research…</button><p class="subnote">This is an interaction preview. No agent is running.</p></div>';
  } else if(node.status==='question') {
    body=`<form class="detail-form" id="answer-form"><div class="detail-section"><span class="small-label">One question before we go deeper</span><label for="answer">${escape(domain.question)}</label><textarea id="answer" name="answer" required maxlength="2000" placeholder="A rough answer is enough…"></textarea></div><div><button class="primary" type="submit">Answer & continue ↗</button><p class="subnote">Your answer stays in this preview only.</p></div></form>`;action='';
  } else {
    body=`<div class="detail-section"><span class="small-label">${node.answer?'Simulated finding':'Illustrative finding'}</span><p>${escape(domain.finding)}</p>${node.answer?`<p class="answer">You said: ${escape(node.answer)}</p>`:''}</div>`;
    const children=nodes.filter(n=>n.parent===node.id&&n.status==='suggested').sort((a,b)=>b.depth-a.depth).slice(0,3);
    action=`<div class="detail-section"><span class="small-label">${node.answer?'New possibilities':'Keep exploring'}</span><div class="branch-links">${children.map(child=>`<button data-select="${child.id}">${escape(child.title)} ↗</button>`).join('')||'<p>No deeper branches in this preview.</p>'}</div><p class="subnote">Explored means investigated, not decided.<br>New directions wait for you to activate them.</p></div>`;
  }
  $('#inspector').innerHTML=heading+body+action;
}
function select(id) {selected=id;renderGraph();renderDetail();$('#inspector').scrollTop=0;}
function applyTransform() {$('#world').style.transform=`translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`;}
function fit() {
  const rect=$('#canvas').getBoundingClientRect();
  if(offsets[variant].size){
    const points=nodes.filter(n=>variant!=='paths'||n.id!=='root').map(position);
    const minX=Math.min(...points.map(p=>p.x))-80,maxX=Math.max(...points.map(p=>p.x))+80;
    const minY=Math.min(...points.map(p=>p.y))-70,maxY=Math.max(...points.map(p=>p.y))+80;
    const scale=Math.min(2.8,rect.width/(maxX-minX),rect.height/(maxY-minY));
    transform={scale,x:rect.width/2-(minX+maxX)/2*scale,y:rect.height/2-(minY+maxY)/2*scale};
  }else{
    const scale=variant==='paths'?Math.max(.5,rect.width/1400):Math.max(.4,Math.min(rect.width/1250,rect.height/850));
    transform={scale,x:rect.width/2-700*scale,y:variant==='paths'?0:rect.height/2-500*scale};
  }
  renderGraph();applyTransform();
}
function zoom(factor) {const rect=$('#canvas').getBoundingClientRect(),old=transform.scale;transform.scale=Math.min(2.8,Math.max(.18,old*factor));const ratio=transform.scale/old;transform.x=rect.width/2-(rect.width/2-transform.x)*ratio;transform.y=rect.height/2-(rect.height/2-transform.y)*ratio;applyTransform();}
function applyVariant() {
  document.body.classList.toggle('paths',variant==='paths');
  $('#eyebrow').textContent=variant==='paths'?'02 / RESEARCH PATHS':'01 / CONSTELLATION';
  $('#variant-name').textContent=variant==='paths'?'02 — Research paths':'01 — Constellation';
  $('#description').textContent=variant==='paths'?'Six domains. Many directions. Choose your own depth.':'Follow a thread. See where it leads.';
  const url=new URL(location.href);url.searchParams.set('variant',variant);history.replaceState(null,'',url);
  renderGraph();renderDetail();fit();
}
function delay(callback) {const timer=setTimeout(()=>{timers.delete(timer);callback();},1200);timers.add(timer);}
function research() {
  const node=nodes.find(n=>n.id===selected);node.status='researching';renderGraph();renderDetail();
  $('#announcement').textContent=`Preview research started for ${node.title}.`;
  delay(()=>{node.status='question';renderGraph();if(selected===node.id)renderDetail();$('#announcement').textContent=`${node.title} needs your answer.`;});
}
function answer(event) {
  event.preventDefault();const form=event.target;if(form.id!=='answer-form')return;
  const value=new FormData(form).get('answer').trim();if(!value){$('#answer').setCustomValidity('Add a short answer to continue.');$('#answer').reportValidity();return;}
  const node=nodes.find(n=>n.id===selected);node.answer=value;node.status='researching';renderGraph();renderDetail();
  delay(()=>{node.status='explored';
    for(let leaf=0;leaf<2;leaf++)nodes.push({id:`${node.id}-new${leaf}`,parent:node.id,title:leaf?'Test the assumption':'Explore the trade-off',domain:node.domain,depth:4,branch:node.branch??1,leaf,status:'suggested',icon:leaf?4:2});
    renderGraph();if(selected===node.id)renderDetail();$('#announcement').textContent=`${node.title} explored. Two new suggestions are available.`;
  });
}
$('#nodes').addEventListener('click',event=>{const button=event.target.closest('[data-node]');if(button)select(button.dataset.node);});
$('#inspector').addEventListener('click',event=>{const button=event.target.closest('button');if(button?.dataset.select)select(button.dataset.select);else if(button?.id==='explore')research();});
$('#inspector').addEventListener('submit',answer);
$('#inspector').addEventListener('input',event=>{if(event.target.id==='answer')event.target.setCustomValidity('');});
function switchVariant(){variant=variant==='paths'?'constellation':'paths';applyVariant();}
function applyTheme(){
  document.documentElement.classList.toggle('light',lightMode);
  $('#theme-toggle').setAttribute('aria-pressed',String(lightMode));
  const url=new URL(location.href);url.searchParams.set('theme',lightMode?'light':'dark');history.replaceState(null,'',url);
}
$('#theme-toggle').onclick=()=>{lightMode=!lightMode;applyTheme();};
$('#previous').onclick=switchVariant;$('#next').onclick=switchVariant;
document.addEventListener('keydown',event=>{
  if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  const button=event.target.closest('[data-node]');
  if(button&&event.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
    event.preventDefault();const id=button.dataset.node,offset=offsets[variant].get(id)||{x:0,y:0};
    offsets[variant].set(id,{x:offset.x+(event.key==='ArrowLeft'?-24:event.key==='ArrowRight'?24:0),y:offset.y+(event.key==='ArrowUp'?-24:event.key==='ArrowDown'?24:0)});
    renderGraph();$(`[data-node="${id}"]`).focus();return;
  }
  if(!event.altKey&&!event.ctrlKey&&!event.metaKey&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();switchVariant();}
});
$('#reset').onclick=()=>{timers.forEach(clearTimeout);timers.clear();offsets.constellation.clear();offsets.paths.clear();seed();selected='root';applyVariant();$('#announcement').textContent='Preview reset. No saved map was changed.';};
$('#reset-layout').onclick=()=>{offsets[variant].clear();fit();$('#announcement').textContent='Node positions restored for this layout.';};
$('#zoom-in').onclick=()=>zoom(1.25);$('#zoom-out').onclick=()=>zoom(.8);$('#fit').onclick=fit;
$('#canvas').addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||dragging)return;
  const id=event.target.closest('[data-node]')?.dataset.node;
  dragging={id,pointerId:event.pointerId,x:event.clientX,y:event.clientY,tx:transform.x,ty:transform.y,offset:{...(offsets[variant].get(id)||{x:0,y:0})},scale:transform.scale,moved:false};
  $('#canvas').setPointerCapture(event.pointerId);
});
$('#canvas').addEventListener('pointermove',event=>{
  if(!dragging||event.pointerId!==dragging.pointerId)return;
  const dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;
  if(!dragging.moved&&Math.hypot(dx,dy)<4)return;
  dragging.moved=true;$('#canvas').classList.add('dragging');
  if(dragging.id){
    offsets[variant].set(dragging.id,{x:dragging.offset.x+dx/dragging.scale,y:dragging.offset.y+dy/dragging.scale});
    renderGraph();
  }else{transform.x=dragging.tx+dx;transform.y=dragging.ty+dy;applyTransform();}
});
function finishDrag(event){
  if(!dragging||event.pointerId!==dragging.pointerId)return;
  const finished=dragging;dragging=null;$('#canvas').classList.remove('dragging');
  if($('#canvas').hasPointerCapture(event.pointerId))$('#canvas').releasePointerCapture(event.pointerId);
  if(event.type==='pointerup'&&finished.id){
    select(finished.id);
    if(finished.moved)$('#announcement').textContent='Node moved. Its connections remain attached.';
  }
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('#canvas').addEventListener(type,finishDrag);
$('#canvas').addEventListener('wheel',event=>{event.preventDefault();if(!dragging)zoom(event.deltaY<0?1.1:1/1.1);},{passive:false});
new ResizeObserver(fit).observe($('#canvas'));
seed();applyTheme();applyVariant();
$('#exit').href=`/${location.hash}`;
// Read title only; never claim jobs or mutate the underlying exploration.
if(/^#map-[a-z0-9-]+$/.test(location.hash)){
  try{
    const sessionResponse=await fetch('/api/session');if(!sessionResponse.ok)throw new Error('Session unavailable');
    const session=await sessionResponse.json();
    const response=await fetch(`/api/maps/${location.hash.slice(1)}`,{headers:{Authorization:`Bearer ${session.token}`}});
    if(!response.ok)throw new Error('Map unavailable');
    const map=await response.json();mapTitle=map.title;
    $('#map-title').textContent=mapTitle;$('#description').textContent+=' · Illustrative skill tree';
  }catch{$('#map-title').textContent=mapTitle;}
}
