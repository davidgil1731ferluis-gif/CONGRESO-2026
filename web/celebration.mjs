const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let stopEffects=()=>{};
export function celebrate(kind,{demo=false,preview=false}={}){
 stopEffects();const attendance=kind==='attendance',dialog=document.querySelector('#dialog');
 const title=attendance?'Su asistencia ha quedado registrada.':'Su inscripción se ha recibido correctamente.';
 const message=attendance?'Gracias por participar en este espacio académico. Su certificado se enviará por correo una vez finalice su generación.':'Gracias por su interés en este encuentro académico. El comité organizador revisará su inscripción y le contactará para informarle si puede avanzar a la siguiente fase.';
 const note=preview?`Vista previa: esta confirmación permite revisar la experiencia; ${attendance?'no se registró una asistencia':'no se creó una inscripción'}.`:demo?'Demostración: el registro se guardó en este navegador. Los correos y certificados están simulados.':'';
 dialog.innerHTML=`<button class="subtle close" data-close aria-label="Cerrar confirmación">✕</button><div class="success-experience"><span class="success-kicker">${attendance?'Un encuentro que deja huella':'El primer paso está completo'}</span><div class="success-seal" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="35"/><path d="M23 40l12 12 23-25"/></svg></div><h2>${title}</h2><p>${message}</p>${note?`<div class="success-note">${note}</div>`:''}<button class="primary" data-close>Continuar ${attendance?'con el encuentro':'a mi inscripción'} →</button></div>`;
 if(!dialog.open)dialog.showModal();
 if(reduced.matches)return;
 const canvas=document.createElement('canvas');canvas.className='celebration-canvas';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);if(canvas.showPopover){canvas.setAttribute('popover','manual');canvas.showPopover()}
 const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return}
 const width=innerWidth,height=innerHeight,ratio=Math.min(devicePixelRatio||1,2);canvas.width=width*ratio;canvas.height=height*ratio;ctx.scale(ratio,ratio);
 const colors=['#82aaff','#f5cc80','#fbe1d1','#b6d8e8','#ffffff'],particles=[];let frame,start=performance.now(),burst=0;
 const emit=()=>{const x=width*(.15+Math.random()*.7),y=height*(.12+Math.random()*.36);for(let i=0;i<(attendance?55:35);i++){const angle=Math.random()*Math.PI*2,speed=2+Math.random()*5;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1,size:2+Math.random()*2,color:colors[i%colors.length]})}};
 const render=now=>{ctx.clearRect(0,0,width,height);if(burst<(attendance?5:3)&&now-start>burst*420){emit();burst++}for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.025;p.vx*=.985;p.life-=.012;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.strokeStyle=p.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-p.vx*3,p.y-p.vy*3);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}if(now-start<3600)frame=requestAnimationFrame(render);else stopEffects()};
 stopEffects=()=>{cancelAnimationFrame(frame);canvas.remove()};frame=requestAnimationFrame(render);
}
document.querySelector('#dialog').addEventListener('close',()=>stopEffects());
