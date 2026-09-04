const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll-reveal motion
const revealObserver=new IntersectionObserver((entries)=>{
  entries.forEach((entry)=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target);}
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach((el)=>revealObserver.observe(el));

// Lightweight perspective / parallax on infographic panels
if(!reduced){
  document.querySelectorAll('.tilt').forEach((panel)=>{
    panel.addEventListener('pointermove',(event)=>{
      const r=panel.getBoundingClientRect();
      const x=(event.clientX-r.left)/r.width-.5;
      const y=(event.clientY-r.top)/r.height-.5;
      panel.style.transform=`perspective(1100px) rotateX(${(-y*2.2).toFixed(2)}deg) rotateY(${(x*3).toFixed(2)}deg) translateY(-2px)`;
    });
    panel.addEventListener('pointerleave',()=>panel.style.transform='');
  });
}

// Copy-to-clipboard helpers for first-time developers
for(const button of document.querySelectorAll('[data-copy]')){
  button.addEventListener('click',async()=>{
    const value=button.dataset.copy;
    try{
      await navigator.clipboard.writeText(value);
      const old=button.textContent;
      button.textContent='Copied ✓';button.classList.add('copied');
      setTimeout(()=>{button.textContent=old;button.classList.remove('copied');},1600);
    }catch{
      button.textContent='Select command';
    }
  });
}

// Tiny self-contained star field: no third-party scripts or remote code
const canvas=document.getElementById('stars');
const ctx=canvas?.getContext('2d');
let stars=[];
function resize(){
  if(!canvas||!ctx)return;
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;
  canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  stars=Array.from({length:Math.min(95,Math.floor(innerWidth/14))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.4+.25,a:Math.random()*.6+.15,v:Math.random()*.08+.02}));
}
function draw(){
  if(!ctx||reduced)return;
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for(const s of stars){
    s.y+=s.v;if(s.y>innerHeight+5)s.y=-5;
    ctx.beginPath();ctx.fillStyle=`rgba(120,220,255,${s.a})`;ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
  }
  requestAnimationFrame(draw);
}
resize();addEventListener('resize',resize);if(!reduced)draw();

// Make hash navigation offset feel deliberate beneath sticky nav
for(const link of document.querySelectorAll('a[href^="#"]')){
  link.addEventListener('click',(e)=>{
    const target=document.querySelector(link.getAttribute('href'));
    if(!target)return;
    e.preventDefault();target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
    history.replaceState(null,'',link.getAttribute('href'));
  });
}
