import {academicAction,academicAdminActions} from './academic.mjs';
import {participation,fullyApproved} from './academic-domain.mjs';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,FieldValue,FieldPath} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {setGlobalOptions} from 'firebase-functions/v2';
import {defineSecret} from 'firebase-functions/params';
import {createHmac,createHash,randomUUID} from 'node:crypto';
import {validateSchema,validateAnswers,attendanceGate,validateImage} from './domain.mjs';
initializeApp();setGlobalOptions({region:'us-central1',maxInstances:10});
const db=getFirestore(),bridgeUrl=defineSecret('APPS_SCRIPT_URL'),bridgeSecret=defineSecret('BRIDGE_SECRET');
const stamp=()=>new Date().toISOString(), hash=s=>createHash('sha256').update(s).digest('hex');
const ref=(c,id)=>{if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new HttpsError('invalid-argument','Identificador inválido.');return db.collection(c).doc(id)};
const dataOf=s=>{if(!s.exists)throw new HttpsError('not-found','Registro inexistente.');return {id:s.id,...s.data()}};
const auth=r=>{if(!r.auth)throw new HttpsError('unauthenticated','Inicia sesión para continuar.');if(!r.auth.token.email_verified&&r.auth.token.admin!==true)throw new HttpsError('permission-denied','Verifique su correo para consultar sus datos.');return r.auth.uid};
const admin=r=>{auth(r);if(r.auth.token.admin!==true)throw new HttpsError('permission-denied','Acceso exclusivo del administrador.');};
const text=(v,max=300)=>{if(typeof v!=='string'||v.length>max)throw new Error('Texto inválido o demasiado largo.');return v.trim()};
const owner=(r,uid)=>{if(r.uid!==uid)throw new HttpsError('permission-denied','No puedes consultar este registro.');};
const job=(tx,id,kind,payload)=>tx.create(db.collection('jobs').doc(id),{kind,payload,eventId:payload.eventId,status:'queued',attempts:0,nextAttempt:0,createdAt:stamp()});
const publicEvent=e=>({title:e.title,description:e.description,location:e.location,date:e.date,questions:e.questions,sections:e.sections||[],appearance:e.appearance||{theme:'studio',layout:'cards',cover:'orbital'},version:e.version,published:true});
async function page(collection,d,field,value){let q=db.collection(collection);if(field)q=q.where(field,'==',value);q=q.orderBy(FieldPath.documentId()).limit(250);if(d.cursor)q=q.startAfter(d.cursor);const s=await q.get();return {items:s.docs.map(dataOf),nextCursor:s.size===250?s.docs.at(-1).id:null};}
async function rateLimit(uid,max=120){const r=db.collection('limits').doc(hash(uid));await db.runTransaction(async tx=>{const s=await tx.get(r),now=Date.now(),old=s.data();if(old&&old.until>now&&old.count>=max)throw new HttpsError('resource-exhausted','Demasiadas solicitudes. Espera un minuto.');tx.set(r,{count:old?.until>now?old.count+1:1,until:old?.until>now?old.until:now+60000})});}
async function bridge(action,payload){const body=JSON.stringify({action,payload}),ts=Date.now(),nonce=randomUUID(),signature=createHmac('sha256',bridgeSecret.value()).update(`${ts}.${nonce}.${body}`).digest('hex');
 const response=await fetch(bridgeUrl.value(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ts,nonce,body,signature}),signal:AbortSignal.timeout(110000)});
 if(!response.ok)throw new Error('Apps Script no respondió correctamente.');const result=await response.json();if(!result.ok)throw new Error(result.error||'Error del servicio de Google.');return result.result;
}
export const api=onCall({enforceAppCheck:true,secrets:[bridgeUrl,bridgeSecret],timeoutSeconds:120,memory:'512MiB'},async request=>{
 const d=request.data;if(!d||typeof d.action!=='string')throw new HttpsError('invalid-argument','Solicitud inválida.');
 try{
 const privileged=['listEvents','saveEvent','publishEvent','listRegistrations','listAttendance','updateRegistration','saveConference','getSettings','updateSettings','listJobs','retryJob'];
 if([...privileged,...academicAdminActions].includes(d.action))admin(request);
 await rateLimit(request.auth?.uid||`guest_${hash(request.rawRequest.ip||'unknown')}`);
 const extra=await academicAction(d,request,{db,ref,dataOf,auth,admin,stamp,hash,job,bridge,randomUUID,validateAnswers,page,FieldPath});if(extra.handled)return extra.result;
 switch(d.action){
 case 'listEvents':return page('events',d);
 case 'saveEvent':{
   const e=d.event;validateSchema(e);const er=e.id?ref('events',e.id):db.collection('events').doc();
   await db.runTransaction(async tx=>{const old=await tx.get(er);tx.set(er,{title:text(e.title,160),description:text(e.description,3000),location:text(e.location||'',300),date:text(e.date||'',20),questions:e.questions,sections:e.sections||[],appearance:e.appearance||{theme:'studio',layout:'cards',cover:'orbital'},version:old.data()?.version||0,published:old.data()?.published||false,updatedAt:stamp()});});return dataOf(await er.get());
 }
 case 'publishEvent':{
   const er=ref('events',d.eventId);await db.runTransaction(async tx=>{const e=dataOf(await tx.get(er));validateSchema(e);e.version++;tx.update(er,{published:true,version:e.version});tx.set(ref('publicEvents',er.id),publicEvent(e));tx.set(er.collection('versions').doc(String(e.version)),{...publicEvent(e),publishedAt:stamp()});});return dataOf(await er.get());
 }
 case 'getEvent':return dataOf(await ref('publicEvents',d.eventId).get());
 case 'register':{
   const uid=auth(request);if(d.consent!==true)throw new Error('Debes autorizar el tratamiento de datos.');
   const u=await getAuth().getUser(uid);if(!u.email||!u.emailVerified)throw new Error('Verifica tu correo antes de enviar la inscripción. Después vuelve a iniciar sesión.');
   const rr=ref('registrations',hash(`${uid}_${d.eventId}`));
   await db.runTransaction(async tx=>{const [es,previous]=await Promise.all([tx.get(ref('publicEvents',d.eventId)),tx.get(rr)]);if(previous.exists)return;const event=dataOf(es),answers=validateAnswers(event.questions,d.answers),ar=ref('accounts',uid),account=await tx.get(ar);const r={uid,eventId:d.eventId,name:text(u.displayName||u.email,160),email:u.email,identification:text(d.profile?.identification||uid,80),role:participation(d.profile?.role),answers,status:'pending',payment:'pending',version:event.version,consentAt:stamp(),createdAt:stamp()};tx.create(rr,r);if(!account.exists)tx.create(ar,{uid,email:r.email,name:r.name,identification:r.identification,role:r.role,activated:!!u.passwordHash,createdAt:stamp()});job(tx,`registration_${rr.id}`,'registration',{...r,registrationId:rr.id,eventTitle:event.title});});return dataOf(await rr.get());
 }
 case 'listRegistrations':return page('registrations',d,d.eventId?'eventId':null,d.eventId);
 case 'myRegistrations':return page('registrations',d,'uid',auth(request));
 case 'updateRegistration':{
   const rr=ref('registrations',d.registrationId),jobId=randomUUID();const initial=dataOf(await rr.get()),settings=(await db.doc('settings/main').get()).data()||{};let activationUrl='';if(d.payment==='approved'&&initial.payment!=='approved'){if(!settings.appUrl)throw Error('Configure la URL pública para enviar el enlace de activación.');const link=await getAuth().generatePasswordResetLink(initial.email,{url:settings.appUrl});const out=new URL(settings.appUrl);const params=new URL(link).searchParams;out.searchParams.set('mode','resetPassword');out.searchParams.set('oobCode',params.get('oobCode'));activationUrl=out.href;}
   await db.runTransaction(async tx=>{const r=dataOf(await tx.get(rr));const es=await tx.get(ref('events',r.eventId)),accountRef=ref('accounts',r.uid),account=await tx.get(accountRef);
   const changes={updatedAt:stamp(),updatedBy:request.auth.uid};
   if(d.status){if(!['pending','approved','rejected'].includes(d.status))throw new Error('Estado inválido.');changes.status=d.status;}
   if(d.payment){if((changes.status||r.status)!=='approved')throw new Error('Primero debe aprobarse la inscripción.');if(!['pending','approved','rejected'].includes(d.payment))throw new Error('Estado de pago inválido.');changes.payment=d.payment;changes.paymentReference=text(d.reference||'',200);if(d.payment==='approved'&&!changes.paymentReference)throw new Error('Escribe la referencia verificable del pago.');}
   if(d.role)changes.role=participation(d.role);if(!d.status&&!d.payment&&!d.role)throw new Error('Selecciona un cambio.');if((changes.status||r.status)===r.status&&(changes.payment||r.payment)===r.payment&&(changes.role||r.role)===r.role)return;tx.update(rr,changes);if(changes.role&&account.exists&&account.data().role!=='judge')tx.update(accountRef,{role:changes.role});tx.create(db.collection('audit').doc(jobId),{registrationId:rr.id,actor:request.auth.uid,before:{status:r.status,payment:r.payment},after:changes,createdAt:stamp()});job(tx,`status_${jobId}`,'status',{...r,...changes,registrationId:rr.id,eventTitle:es.data()?.title||'Evento',activationUrl,appUrl:settings.appUrl||''});
   });return dataOf(await rr.get());
 }
 case 'listConferences':{auth(request);const out=await page('conferences',d,'eventId',d.eventId);if(request.auth.token.admin)out.items=await Promise.all(out.items.map(async c=>({...c,attendanceCode:(await ref('conferenceSecrets',c.id).get()).data()?.code||''})));return out;}
 case 'saveConference':{
   const c=d.conference;if(!c.title?.trim()||!Number.isFinite(Date.parse(c.opensAt))||!Number.isFinite(Date.parse(c.closesAt))||Date.parse(c.closesAt)<=Date.parse(c.opensAt)||typeof c.active!=='boolean')throw new Error('Revisa el título y los horarios.');await ref('events',c.eventId).get().then(dataOf);
   const cr=c.id?ref('conferences',c.id):db.collection('conferences').doc();if(c.id){const old=dataOf(await cr.get());if(old.eventId!==c.eventId)throw new Error('No se puede cambiar el evento de una conferencia.');}
   if(c.speakerRegistrationId){const r=dataOf(await ref('registrations',c.speakerRegistrationId).get());if(r.eventId!==c.eventId||r.role!=='speaker'||!fullyApproved(r))throw Error('Seleccione un ponente con aprobación total.');}
   await db.runTransaction(async tx=>{const secretRef=ref('conferenceSecrets',cr.id),oldSecret=await tx.get(secretRef);if(!oldSecret.exists){const code=randomUUID().replaceAll('-','').slice(0,12).toUpperCase();tx.create(secretRef,{code,hash:hash(code)});}tx.set(cr,{speakerRegistrationId:c.speakerRegistrationId||'',eventId:c.eventId,title:text(c.title,200),speaker:text(c.speaker||'',200),location:text(c.location||'',300),opensAt:new Date(c.opensAt).toISOString(),closesAt:new Date(c.closesAt).toISOString(),active:c.active,updatedAt:stamp()});});return dataOf(await cr.get());
 }
 case 'myAttendance':return page('attendance',d,'uid',auth(request));
 case 'listAttendance':return page('attendance',d,d.eventId?'eventId':null,d.eventId);
 case 'stamp':{
   const uid=auth(request);validateImage(d.base64,d.mime);const rr=ref('registrations',d.registrationId),cr=ref('conferences',d.conferenceId),ar=ref('attendance',hash(`${rr.id}_${cr.id}`));
   const existing=await ar.get();if(existing.exists){owner(existing.data(),uid);return dataOf(existing);}
   const r=dataOf(await rr.get()),c=dataOf(await cr.get());owner(r,uid);await rateLimit(`code_${uid}_${cr.id}`,5);const secret=(await ref('conferenceSecrets',cr.id).get()).data();if(!secret||hash(String(d.code||'').trim().toUpperCase())!==secret.hash)throw Error('La clave de la conferencia no es correcta.');if(r.eventId!==c.eventId)throw new Error('La conferencia no pertenece al evento.');attendanceGate(r,c);
   const uploadPath=`staging/${ar.id}/${randomUUID()}`,file=getStorage().bucket().file(uploadPath);await file.save(Buffer.from(d.base64,'base64'),{contentType:d.mime,resumable:false});
   let used=false;try{await db.runTransaction(async tx=>{used=false;const [rs,cs,as,es]=await Promise.all([tx.get(rr),tx.get(cr),tx.get(ar),tx.get(ref('events',r.eventId))]);if(as.exists){owner(as.data(),uid);return;}const freshR=dataOf(rs),freshC=dataOf(cs);owner(freshR,uid);attendanceGate(freshR,freshC,Date.now());const a={uid,eventId:r.eventId,registrationId:rr.id,conferenceId:cr.id,stampedAt:stamp(),certificateStatus:'queued',evidenceStatus:'queued'};tx.create(ar,a);job(tx,`certificate_${ar.id}`,'certificate',{...freshR,...a,attendanceId:ar.id,conferenceTitle:freshC.title,speaker:freshC.speaker,eventTitle:es.data()?.title||'Evento',uploadPath,mime:d.mime,fileName:text(d.fileName||'evidencia',200)});used=true;});}finally{if(!used)await file.delete().catch(()=>{});}return dataOf(await ar.get());
 }
 case 'getSettings':return (await db.doc('settings/main').get()).data()||{ccEmail:'',label:'Inscripciones/EventFlow',paymentUrl:'',organizer:'Equipo organizador'};
 case 'updateSettings':{
   const s=d.settings,ccEmail=text(s.ccEmail||'',254),paymentUrl=text(s.paymentUrl||'',2000);if(ccEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ccEmail))throw new Error('Correo de copia inválido.');if(paymentUrl&&new URL(paymentUrl).protocol!=='https:')throw new Error('El módulo de pagos requiere HTTPS.');const appUrl=text(s.appUrl||'',2000);if(appUrl&&new URL(appUrl).protocol!=='https:')throw Error('La URL pública requiere HTTPS.');const clean={ccEmail,paymentUrl,appUrl,label:text(s.label||'Inscripciones/EventFlow',100),organizer:text(s.organizer||'Equipo organizador',160)};await db.doc('settings/main').set(clean);return clean;
 }
 case 'getPaymentLink':{const uid=auth(request),r=dataOf(await ref('registrations',d.registrationId).get());owner(r,uid);if(r.status!=='approved')throw new Error('Inscripción aún no aprobada.');const s=(await db.doc('settings/main').get()).data();if(!s?.paymentUrl)throw new Error('El módulo de pagos aún no está conectado.');const url=new URL(s.paymentUrl);url.searchParams.set('registrationId',r.id);url.searchParams.set('eventId',r.eventId);return {url:url.href};}
 case 'getCertificate':{const uid=auth(request),a=dataOf(await ref('attendance',d.attendanceId).get());owner(a,uid);if(a.certificateStatus!=='ready'||!a.certificateFileId)throw new Error('El certificado aún no está listo.');return bridge('download',{fileId:a.certificateFileId,attendanceId:a.id});}
 case 'listJobs':return page('jobs',d,d.eventId?'eventId':null,d.eventId);
 case 'retryJob':{const jr=ref('jobs',d.jobId);await db.runTransaction(async tx=>{const j=dataOf(await tx.get(jr));if(j.status!=='error')throw new Error('Solo se pueden reintentar errores confirmados.');tx.update(jr,{status:'queued',attempts:0,nextAttempt:0,error:''});});return {ok:true};}
 default:throw new HttpsError('invalid-argument','Operación desconocida.');
 }
 }catch(e){if(e instanceof HttpsError)throw e;throw new HttpsError('failed-precondition',e.message||'No se pudo completar la operación.');}
});
export const processJobs=onSchedule({schedule:'every 1 minutes',secrets:[bridgeUrl,bridgeSecret],timeoutSeconds:540,memory:'512MiB',maxInstances:1},async()=>{
 // Trabajar por lotes evita que Apps Script participe en cada navegación.
 const candidates=await db.collection('jobs').where('status','in',['queued','processing']).orderBy('nextAttempt').limit(4).get();
 for(const s of candidates.docs){const token=randomUUID();let j;
 await db.runTransaction(async tx=>{j=undefined;const fresh=await tx.get(s.ref),v=fresh.data();if(!v||!['queued','processing'].includes(v.status)||v.nextAttempt>Date.now()||v.status==='processing'&&v.leaseUntil>Date.now())return;j={id:fresh.id,...v};tx.update(s.ref,{status:'processing',leaseUntil:Date.now()+12*60000,token,attempts:v.attempts+1});});
 if(!j)continue;
 try{
   if(j.kind==='status'){const current=(await ref('registrations',j.payload.registrationId).get()).data();if(current?.updatedAt&&j.payload.updatedAt&&Date.parse(current.updatedAt)>Date.parse(j.payload.updatedAt)){await s.ref.update({status:'done',completedAt:stamp(),skipped:'Superado por una actualización posterior.'});continue;}}
   const settings=(await db.doc('settings/main').get()).data()||{};let image;
   if(j.kind==='certificate'){const [buffer]=await getStorage().bucket().file(j.payload.uploadPath).download();image=buffer.toString('base64');}
   const result=await bridge('job',{jobId:j.id,kind:j.kind,...j.payload,settings,base64:image});
   const changes={status:result.review?'review':'done',completedAt:stamp(),error:result.review?'Revisar si Gmail envió el correo antes de reanudar.':''};
   await db.runTransaction(async tx=>{const fresh=await tx.get(s.ref);if(fresh.data()?.token!==token)return;tx.update(s.ref,changes);if(j.kind==='evaluation')tx.update(ref('posters',j.payload.posterId),{reportStatus:result.reportFileId?'ready':'error',reportFileId:result.reportFileId||''});if(j.kind==='certificate')tx.update(ref('attendance',j.payload.attendanceId),{certificateStatus:result.certificateFileId?'ready':'error',evidenceStatus:result.evidenceFileId?'ready':'error',certificateFileId:result.certificateFileId||'',evidenceFileId:result.evidenceFileId||'',emailStatus:result.review?'review':'sent'});});
   if(j.kind==='certificate'&&!result.review)await getStorage().bucket().file(j.payload.uploadPath).delete().catch(()=>{});
 }catch(e){await db.runTransaction(async tx=>{const fresh=await tx.get(s.ref);if(fresh.data()?.token!==token)return;const attempts=fresh.data().attempts;tx.update(s.ref,{status:attempts>=5?'error':'queued',error:String(e.message).slice(0,500),nextAttempt:Date.now()+Math.min(60,2**attempts)*60000});});}
 }
});
