// Motion enhances the existing UI without changing registration or payment rules.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let observer,frames=new Set();
export function enhanceView(){
 observer?.disconnect();frames.forEach(cancelAnimationFrame);frames.clear();
 const elements=[...document.querySelectorAll('main .heading, main .stats article, main .panel, main .question')];
 elements.forEach(el=>el.classList.remove('reveal-in'));
 if(reduced.matches)return;
 observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  const el=entry.target;el.classList.add('reveal-in');observer.unobserve(el);
  const counter=el.matches('.stats article')?el.querySelector('strong'):null;
  if(counter){const value=Number(counter.textContent);if(Number.isFinite(value)&&value>0){const start=performance.now();const tick=now=>{counter.textContent=String(Math.round(value*(1-(1-Math.min((now-start)/700,1))**3))).padStart(2,'0');if(now-start<700){const id=requestAnimationFrame(tick);frames.add(id)}};const id=requestAnimationFrame(tick);frames.add(id)}}
 }),{threshold:.08});
 elements.forEach((el,i)=>{el.style.setProperty('--enter-delay',`${Math.min(i%5*45,180)}ms`);observer.observe(el)});
}
export function setWorking(button,on){
 if(on){button.setAttribute('aria-busy','true');document.body.classList.add('is-working')}
 else{button.removeAttribute('aria-busy');if(!document.querySelector('button[aria-busy=true]'))document.body.classList.remove('is-working')}
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||button.disabled||reduced.matches)return;
 const ripple=document.createElement('span');ripple.className='button-ripple';ripple.setAttribute('aria-hidden','true');const rect=button.getBoundingClientRect();ripple.style.left=`${event.detail?event.clientX-rect.left-10:rect.width/2-10}px`;ripple.style.top=`${event.detail?event.clientY-rect.top-10:rect.height/2-10}px`;button.append(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
});
let evidenceURL;
document.addEventListener('change',event=>{
 const input=event.target;if(input.type!=='file'||!input.closest('#stamp-form'))return;
 const host=input.closest('.file');host.querySelectorAll('.evidence-preview,.evidence-meta').forEach(el=>el.remove());if(evidenceURL)URL.revokeObjectURL(evidenceURL);evidenceURL=null;
 const file=input.files[0];if(!file)return;
 const meta=document.createElement('small');meta.className='evidence-meta';meta.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;host.append(meta);
 if(['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=3*1024*1024){const img=document.createElement('img');img.className='evidence-preview';img.alt='Vista previa de la evidencia seleccionada';evidenceURL=URL.createObjectURL(file);img.src=evidenceURL;host.append(img)}
});
document.querySelector('#dialog').addEventListener('close',()=>{if(evidenceURL)URL.revokeObjectURL(evidenceURL);evidenceURL=null});
