export const roles={speaker:'Ponente o expositor',poster:'Presentador de póster',judge:'Jurado',attendee:'Asistente',admin:'Administrador'};
export function participation(v='attendee'){if(!['speaker','poster','attendee'].includes(v))throw Error('Seleccione un perfil de participación válido.');return v;}
export function identity(p){
 const clean={name:String(p?.name||'').trim(),email:String(p?.email||'').trim().toLowerCase(),identification:String(p?.identification||'').trim(),role:participation(p?.role)};
 if(!clean.name||clean.name.length>160||!clean.identification||clean.identification.length>80||clean.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email))throw Error('Complete nombre, correo e identificación válidos.');return clean;
}
export function fullyApproved(r){return r.status==='approved'&&r.payment==='approved';}
export function validateCategory(c){
 if(!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>120||!Array.isArray(c.criteria)||!c.criteria.length||c.criteria.length>20)throw Error('Defina la categoría y entre uno y veinte criterios.');
 const ids=new Set();let total=0;
 for(const q of c.criteria){if(typeof q.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(q.id)||ids.has(q.id)||typeof q.label!=='string'||!q.label.trim()||q.label.length>200||!Number.isFinite(q.weight)||q.weight<=0||q.weight>100)throw Error('Revise los nombres y ponderaciones de los criterios.');ids.add(q.id);total+=q.weight;}
 if(Math.abs(total-100)>.001)throw Error('Las ponderaciones deben sumar 100 %.');return {name:c.name.trim(),criteria:structuredClone(c.criteria),scale:5};
}
export function validateEvaluation(rubric,scores,comments=''){
 if(!scores||typeof scores!=='object'||Array.isArray(scores)||Object.keys(scores).length!==rubric.criteria.length||typeof comments!=='string'||comments.length>4000)throw Error('Complete todos los criterios y revise las observaciones.');
 const clean={};let total=0;for(const q of rubric.criteria){const n=scores[q.id];if(!Number.isInteger(n)||n<1||n>5)throw Error('Cada criterio requiere una calificación de 1 a 5.');clean[q.id]=n;total+=n/5*q.weight;}return {scores:clean,comments:comments.trim(),total:Math.round(total*100)/100};
}
export function evaluationReport(poster,evaluations){
 const rows=poster.judgeIds.map(uid=>evaluations.find(e=>e.judgeUid===uid)).filter(Boolean);
 return {posterId:poster.id,eventId:poster.eventId,title:poster.title,author:poster.authorName,category:poster.rubric.name,rubric:poster.rubric,evaluations:rows,expected:poster.judgeIds.length,completed:rows.length,final:rows.length===poster.judgeIds.length&&rows.length>0,average:rows.length?Math.round(rows.reduce((s,e)=>s+e.total,0)/rows.length*100)/100:null};
}
export function checkCode(expected,received){if(typeof received!=='string'||!expected||received.trim().toUpperCase()!==expected)throw Error('La clave de la conferencia no es correcta.');}
