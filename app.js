(()=>{
  const store = { getTheme:()=>localStorage.getItem('theme'), setTheme:v=>localStorage.setItem('theme', v) };
  function applyTheme(v){ document.documentElement.setAttribute('data-theme', v||'') }
  const saved = store.getTheme(); if(saved) applyTheme(saved);
  document.getElementById('themeBtn')?.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur==='dark' ? 'light' : 'dark';
    applyTheme(next); store.setTheme(next);
  });

  const nav = document.getElementById('nav');
  function setHeaderH(){ document.documentElement.style.setProperty('--headerH', nav?.offsetHeight+'px') }
  setHeaderH(); window.addEventListener('resize', setHeaderH);

  const page = document.body.getAttribute('data-page');
  document.querySelectorAll('.nav-menu a').forEach(a=>{
    const k = a.getAttribute('data-link'); if(k===page) a.classList.add('active');
  });

  window.addEventListener('scroll', ()=> nav?.classList.toggle('scrolled', scrollY>10));

  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  navToggle?.addEventListener('click', ()=>{
    const open = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  navMenu?.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=>{
    navMenu.classList.remove('open'); navToggle?.setAttribute('aria-expanded','false');
  }));

  if(page==='nominees') initNominees();
})();

function initNominees(){
  const TAGS = ["Portfolio","E-commerce","3D","Motion","Experimental"];
  const W = {d:0.4,u:0.3,c:0.2,t:0.1};
  const avg = (a,b,c,d)=> (a*W.d + b*W.u + c*W.c + d*W.t);
  const fmt = x => (Math.round(x*100)/100).toFixed(2);
  const store = {
    getVotes(){ try{return JSON.parse(localStorage.getItem('votes')||'{}')}catch{return {}} },
    setVotes(v){ localStorage.setItem('votes', JSON.stringify(v)) },
  };

  const grid = document.getElementById('grid');
  const sortSel = document.getElementById('sortSel');
  const tagsWrap = document.getElementById('tags');

  let activeTag = null;

  function totalFor(p, votesMap){
    const v = votesMap[p.id] || null;
    if(!v) return { score: avg(p.base.d,p.base.u,p.base.c,p.base.t), votes:p.votes };
    const cnt = p.votes + v.count;
    const sBase = p.votes * avg(p.base.d,p.base.u,p.base.c,p.base.t);
    const sUser = v.sum;
    return { score: (sBase + sUser)/cnt, votes: cnt };
  }

  function mkTag(txt, active){
    const b = document.createElement('button'); b.className='tag'+(active?' active':''); b.textContent=txt; return b;
  }
  function buildTags(){
    tagsWrap.innerHTML = '';
    const all = mkTag('الكل', !activeTag);
    all.addEventListener('click', ()=>{ activeTag=null; buildTags(); render() }); tagsWrap.appendChild(all);
    TAGS.forEach(t=>{
      const b = mkTag(t, activeTag===t);
      b.addEventListener('click', ()=>{ activeTag = activeTag===t? null : t; buildTags(); render() });
      tagsWrap.appendChild(b);
    });
  }

  function cardTemplate(p, score, votes){
    const el = document.createElement('article');
    el.className = 'card';
    el.id = 'card-'+p.id;
    el.innerHTML = `
      <div class="thumb">
        <picture>
          <source media="(min-width:1024px)" srcset="https://picsum.photos/seed/p${p.id}/1200/750 1200w">
          <source media="(min-width:640px)" srcset="https://picsum.photos/seed/p${p.id}/800/500 800w">
          <img loading="lazy" src="https://picsum.photos/seed/p${p.id}/600/400" alt="${p.title}"
               sizes="(min-width:1280px) 320px, (min-width:768px) 33vw, 100vw">
        </picture>
      </div>
      <div class="body">
        <div class="title">${p.title}</div>
        <div class="meta">${p.studio} • ${p.country} • <span class="muted">${p.tag}</span></div>
        <div class="actions">
          <button class="btn small voteBtn" data-id="${p.id}">صوّت</button>
          <span class="votes">النتيجة: <b>${fmt(score)}</b> • الأصوات: <b>${votes}</b></span>
        </div>
      </div>`;
    el.querySelector('img').addEventListener('load', ()=> el.querySelector('.thumb').style.animation='none');
    return el;
  }

  function render(){
    const votesMap = store.getVotes();
    let list = PROJECTS.slice();
    if(activeTag) list = list.filter(p=> p.tag===activeTag);
    const scored = list.map(p=>{
      const {score, votes} = totalFor(p, votesMap);
      return {...p, _score:score, _votes:votes};
    });
    const s = sortSel.value;
    if(s==='top') scored.sort((a,b)=> b._score - a._score);
    if(s==='votes') scored.sort((a,b)=> b._votes - a._votes);
    if(s==='az') scored.sort((a,b)=> a.title.localeCompare(b.title));

    grid.innerHTML = '';
    scored.forEach(p=>{
      const card = cardTemplate(p, p._score, p._votes);
      grid.appendChild(card);
      io.observe(card);
    });

    if(location.hash){
      const el = document.getElementById(location.hash.slice(1));
      if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
    }
  }

  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('closeModal');
  const sD = document.getElementById('sDesign');
  const sU = document.getElementById('sUsability');
  const sC = document.getElementById('sCreativity');
  const sT = document.getElementById('sContent');
  const oD = document.getElementById('oDesign');
  const oU = document.getElementById('oUsability');
  const oC = document.getElementById('oCreativity');
  const oT = document.getElementById('oContent');
  const weighted = document.getElementById('weighted');
  const bar = document.getElementById('bar');
  const resetBtn = document.getElementById('resetScores');
  const submitVote = document.getElementById('submitVote');

  function openModal(pid){
    const target = PROJECTS.find(x=>x.id===pid);
    if(!target) return;
    document.getElementById('voteTitle').textContent = 'التصويت: ' + target.title;
    [sD,sU,sC,sT].forEach(i=> i.value = 7.5);
    updatePreview();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    submitVote.onclick = ()=> saveVote(target.id);
  }
  function close(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  function updatePreview(){
    oD.textContent = sD.value; oU.textContent = sU.value; oC.textContent = sC.value; oT.textContent = sT.value;
    const w = avg(+sD.value,+sU.value,+sC.value,+sT.value);
    weighted.textContent = fmt(w);
    bar.style.width = (w*10) + '%';
  }
  function saveVote(id){
    const w = avg(+sD.value,+sU.value,+sC.value,+sT.value);
    const votes = store.getVotes();
    const rec = votes[id] || {count:0,sum:0};
    rec.count += 1; rec.sum += w;
    votes[id] = rec;
    store.setVotes(votes);
    close();
    render();
  }

  sortSel.addEventListener('change', render);
  resetBtn.addEventListener('click', ()=>{ [sD,sU,sC,sT].forEach(i=> i.value=7.5); updatePreview() });
  [sD,sU,sC,sT].forEach(i=> i.addEventListener('input', updatePreview));
  document.addEventListener('click', (e)=>{
    const vote = e.target.closest('.voteBtn');
    if(vote) openModal(+vote.dataset.id);
    if(e.target === modal) close();
  });
  closeModal.addEventListener('click', close);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal.classList.contains('open')) close() });

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('appear'); io.unobserve(en.target); } });
  }, {threshold:.12});

  buildTags();
  render();
}
