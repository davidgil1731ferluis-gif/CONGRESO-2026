import {config} from './config.mjs';
import {validateSchema,validateAnswers,attendanceGate,validateImage} from './domain.mjs';
const key='eventflow-demo-v1';
const clone=v=>structuredClone(v);
const id=()=>crypto.randomUUID();
export const demo=config.mode==='demo';
let state, user, live;
const seed=()=>{
 const event={id:'encuentro-2026',title:'Encuentro de conocimiento',description:'Un espacio para conectar ideas, compartir experiencias y construir lo que sigue. Completa tu inscripción y acompáñanos en nuestras conferencias.',location:'Bogotá · Auditorio principal',date:'2026-11-20',published:true,version:1,questions:[
 {id:'organization',label:'¿A qué organización perteneces?',type:'text',required:true,step:1},
 {id:'profile',label:'¿Cuál es tu perfil?',type:'select',options:['Profesional','Estudiante','Invitado'],required:true,step:1},
 {id:'university',label:'Nombre de tu universidad',type:'text',required:true,step:1,condition:{field:'profile',operator:'eq',value:'Estudiante'}},
 {id:'interests',label:'¿Qué temas te interesan?',type:'checkbox',options:['Innovación','Liderazgo','Tecnología'],required:true,step:2},
 {id:'accessibility',label:'¿Necesitas algún ajuste para participar?',type:'radio',options:['Sí','No'],required:true,step:2},
 {id:'details',label:'Cuéntanos qué necesitas',type:'textarea',required:true,step:2,condition:{field:'accessibility',operator:'eq',value:'Sí'}}]};
 const now=Date.now();
 return {events:[event],registrations:[{id:'demo-inscripcion',eventId:event.id,uid:'demo-participant',name:'Andrea Martínez',email:'andrea@example.com',status:'pending',payment:'pending',createdAt:new Date(now).toISOString(),answers:{organization:'Organización ejemplo',profile:'Profesional',interests:['Innovación'],accessibility:'No'},version:1}],conferences:[{id:'demo-conferencia',eventId:event.id,title:'Ideas que transforman',speaker:'Equipo organizador',location:'Auditorio principal',opensAt:new Date(now-3600000).toISOString(),closesAt:new Date(now+86400000).toISOString(),active:true}],attendance:[],jobs:[],settings:{ccEmail:'',label:'Inscripciones/EventFlow',paymentUrl:'',organizer:'Equipo organizador'}};
};
function persist(){localStorage.setItem(key,JSON.stringify(state));}
export async function init(){
 if(demo){try{state=JSON.parse(localStorage.getItem(key))||seed()}catch{state=seed()}persist();user={uid:'demo-admin',name:'Administrador demo',email:'admin@example.com',admin:true};return user;}
 if(config.mode!=='firebase')throw new Error('Modo de configuración inválido.');
 if(!config.firebase.projectId||!config.firebase.apiKey||!config.appCheckSiteKey)throw new Error('Completa Firebase y App Check en config.mjs antes de activar el modo real.');
 const base='https://www.gstatic.com/firebasejs/12.4.0/';
 const [appSDK,authSDK,fnSDK,checkSDK]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-functions.js'),import(base+'firebase-app-check.js')]);
 const app=appSDK.initializeApp(config.firebase);
 checkSDK.initializeAppCheck(app,{provider:new checkSDK.ReCaptchaEnterpriseProvider(config.appCheckSiteKey),isTokenAutoRefreshEnabled:true});
 const auth=authSDK.getAuth(app), functions=fnSDK.getFunctions(app,config.region);
 live={auth,authSDK,functions,fnSDK};
 await authSDK.authStateReady?.(auth); // Versiones sin helper usan el observador abajo.
 await new Promise(resolve=>{const unsub=authSDK.onAuthStateChanged(auth,u=>{user=u;unsub();resolve()})});
 return await currentUser();
}
export async function currentUser(){if(demo)return user;if(!live.auth.currentUser)return null;const u=live.auth.currentUser,t=await u.getIdTokenResult();return {uid:u.uid,email:u.email,name:u.displayName||u.email,admin:t.claims.admin===true};}
export async function login(email,password,signup=false,name=''){
 if(demo){user=email==='admin@example.com'?{uid:'demo-admin',email,name:'Administrador demo',admin:true}:{uid:'demo-participant',email,name:name||'Andrea Martínez',admin:false};return user;}
 const result=await live.authSDK[signup?'createUserWithEmailAndPassword':'signInWithEmailAndPassword'](live.auth,email,password);
 if(signup){await live.authSDK.updateProfile(result.user,{displayName:name});await live.authSDK.sendEmailVerification(result.user);}
 return currentUser();
}
export async function resetPassword(email){if(demo)return;await live.authSDK.sendPasswordResetEmail(live.auth,email);}
export async function logout(){if(demo){user=null;return}await live.authSDK.signOut(live.auth);}
export function resetDemo(){localStorage.removeItem(key);location.reload();}
export async function call(action,data={}){
 if(!demo){
   let result=(await live.fnSDK.httpsCallable(live.functions,'api')({action,...data})).data;
   if(!result?.items)return result;
   const items=[...result.items];let pages=1;
   while(result.nextCursor){if(++pages>40)throw new Error('La consulta supera 10.000 registros. Exporta por evento o implementa un reporte masivo.');result=(await live.fnSDK.httpsCallable(live.functions,'api')({action,...data,cursor:result.nextCursor})).data;items.push(...result.items);}
   return items.sort((a,b)=>String(b.createdAt||b.updatedAt||'').localeCompare(String(a.createdAt||a.updatedAt||'')));
 }
 const adminActions=['listEvents','saveEvent','publishEvent','listRegistrations','listAttendance','updateRegistration','saveConference','getSettings','updateSettings','listJobs','retryJob'];
 if(adminActions.includes(action)&&!user?.admin)throw new Error('Acceso exclusivo del administrador.');
 const event=state.events.find(e=>e.id===data.eventId);
 const registration=state.registrations.find(r=>r.id===data.registrationId);
 const enqueue=(kind,payload)=>{const job={id:id(),kind,status:'demo',payload,createdAt:new Date().toISOString()};state.jobs.unshift(job);};
 let result;
 switch(action){
 case 'listEvents':result=state.events;break;
 case 'getEvent':if(!event?.published)throw new Error('El formulario no está publicado.');result={...event,...event.publicSnapshot,questions:event.publishedQuestions||event.questions};break;
 case 'saveEvent':{
   validateSchema(data.event);const clean=clone(data.event);
   const existing=state.events.find(e=>e.id===clean.id);
   if(existing){Object.assign(existing,{...clean,published:existing.published,publishedQuestions:existing.publishedQuestions||clone(existing.questions),version:existing.version})}else{state.events.push({...clean,id:id(),published:false,version:0})}
   result=existing||state.events.at(-1);break;
 }
 case 'publishEvent':if(!event)throw new Error('Evento inexistente.');validateSchema(event);event.published=true;event.version++;event.publishedQuestions=clone(event.questions);event.publicSnapshot={title:event.title,description:event.description,location:event.location,date:event.date};result=event;break;
 case 'register':{
   if(!user)throw new Error('Inicia sesión para inscribirte.');if(!event?.published)throw new Error('Formulario no disponible.');
   const previous=state.registrations.find(r=>r.uid===user.uid&&r.eventId===event.id);
   if(previous){result=previous;break;}
   const answers=validateAnswers(event.publishedQuestions||event.questions,data.answers);
   const r={id:id(),uid:user.uid,eventId:event.id,name:user.name,email:user.email,answers,status:'pending',payment:'pending',version:event.version,createdAt:new Date().toISOString()};state.registrations.push(r);enqueue('registration',r);result=r;break;
 }
 case 'listRegistrations':result=state.registrations.filter(r=>!data.eventId||r.eventId===data.eventId);break;
 case 'myRegistrations':if(!user)throw new Error('Inicia sesión.');result=state.registrations.filter(r=>r.uid===user.uid);break;
 case 'updateRegistration':{
   if(!registration)throw new Error('Inscripción inexistente.');
   if(data.status){if(!['pending','approved','rejected'].includes(data.status))throw new Error('Estado inválido.');registration.status=data.status;}
   if(data.payment){if(registration.status!=='approved')throw new Error('Primero aprueba la inscripción.');if(!['pending','approved','rejected'].includes(data.payment))throw new Error('Pago inválido.');registration.payment=data.payment;}
   enqueue('status',registration);result=registration;break;
 }
 case 'listConferences':result=state.conferences.filter(c=>c.eventId===data.eventId);break;
 case 'saveConference':{
   const c=data.conference;if(!c.title?.trim()||Date.parse(c.closesAt)<=Date.parse(c.opensAt)||!Number.isFinite(Date.parse(c.opensAt))||!Number.isFinite(Date.parse(c.closesAt)))throw new Error('Revisa título y fechas de apertura y cierre.');
   const existing=state.conferences.find(x=>x.id===c.id);if(existing)Object.assign(existing,c);else state.conferences.push({...c,id:id()});result=c;break;
 }
 case 'myAttendance':result=state.attendance.filter(a=>a.uid===user?.uid);break;
 case 'listAttendance':result=state.attendance.filter(a=>!data.eventId||a.eventId===data.eventId);break;
 case 'stamp':{
   if(!registration||registration.uid!==user?.uid)throw new Error('Inscripción inválida.');
   const c=state.conferences.find(c=>c.id===data.conferenceId&&c.eventId===registration.eventId);if(!c)throw new Error('Conferencia inexistente.');attendanceGate(registration,c);validateImage(data.base64,data.mime);
   const previous=state.attendance.find(a=>a.registrationId===registration.id&&a.conferenceId===c.id);if(previous){result=previous;break;}
   const a={id:id(),uid:user.uid,registrationId:registration.id,conferenceId:c.id,eventId:c.eventId,stampedAt:new Date().toISOString(),certificateStatus:'demo',fileName:data.fileName};state.attendance.push(a);enqueue('certificate',{...registration,...a,conferenceTitle:c.title});result=a;break;
 }
 case 'getSettings':result=state.settings;break;
 case 'updateSettings':Object.assign(state.settings,data.settings);result=state.settings;break;
 case 'getPaymentLink':if(registration?.uid!==user?.uid||registration.status!=='approved')throw new Error('Inscripción no aprobada.');if(!state.settings.paymentUrl)throw new Error('El organizador aún no ha conectado el módulo de pagos.');result={url:state.settings.paymentUrl};break;
 case 'getCertificate':throw new Error('El certificado PDF y los correos se generan al conectar Apps Script. La demo no envía correos.');
 case 'listJobs':result=state.jobs;break;
 case 'retryJob':throw new Error('Los envíos están simulados en la demostración.');
 default:throw new Error('Operación no disponible.');
 }
 persist();return clone(result);
}
