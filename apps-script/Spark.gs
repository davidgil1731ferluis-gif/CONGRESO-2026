/** Drive y correo solamente. Las reglas de Firestore autorizan las solicitudes y el sello. */
function sparkProperties_() {
 const p=PropertiesService.getScriptProperties().getProperties();
 ['FIREBASE_PROJECT_ID','FIREBASE_API_KEY','APP_URL'].forEach(function(k){if(!p[k])throw new Error('Falta configurar '+k);});
 if(!/^[a-z0-9-]+$/.test(p.FIREBASE_PROJECT_ID)||!/^https:\/\/[^\s?#]+\/$/.test(p.APP_URL))throw new Error('Revise el proyecto y la URL pública, terminada en /.');
 return p;
}
function sparkHttp_(url,method,body,token,missing) {
 const options={method:method,headers:{Authorization:'Bearer '+token},muteHttpExceptions:true};
 if(body!==undefined){options.contentType='application/json';options.payload=JSON.stringify(body);}
 const r=UrlFetchApp.fetch(url,options),code=r.getResponseCode();
 if(code===404&&missing)return null;
 if(code<200||code>=300)throw new Error(code===403?'Firebase no autorizó la operación.':code===401?'La sesión no es válida. Inicie sesión nuevamente.':'El servicio de Google no pudo completar la operación ('+code+').');
 return JSON.parse(r.getContentText()||'{}');
}
function sparkName_(path) { if(!/^[a-zA-Z0-9_@.+%\-\/]{1,1400}$/.test(path)||path.split('/').some(function(x){return !x||x==='.'||x==='..';}))throw new Error('Referencia inválida.');return 'projects/'+sparkProperties_().FIREBASE_PROJECT_ID+'/databases/(default)/documents/'+path; }
function sparkEncode_(v) {
 if(v===null)return {nullValue:null};if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='string')return {stringValue:v};
 if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
 if(v instanceof Date)return {timestampValue:v.toISOString()};
 if(Array.isArray(v))return {arrayValue:{values:v.map(sparkEncode_)}};
 const fields={};Object.keys(v).forEach(function(k){if(v[k]!==undefined)fields[k]=sparkEncode_(v[k]);});return {mapValue:{fields:fields}};
}
function sparkDecode_(v) { if('stringValue' in v)return v.stringValue;if('timestampValue' in v)return v.timestampValue;if('integerValue' in v)return Number(v.integerValue);if('doubleValue' in v)return v.doubleValue;if('booleanValue' in v)return v.booleanValue;if('nullValue' in v)return null;if(v.arrayValue)return (v.arrayValue.values||[]).map(sparkDecode_);const o={};Object.keys(v.mapValue&&v.mapValue.fields||{}).forEach(function(k){o[k]=sparkDecode_(v.mapValue.fields[k]);});return o; }
function sparkRow_(doc) { if(!doc)return null;return Object.assign({id:doc.name.split('/').pop()},sparkDecode_({mapValue:{fields:doc.fields||{}}})); }
function sparkGet_(path,token) { const name=sparkName_(path);return sparkRow_(sparkHttp_('https://firestore.googleapis.com/v1/'+name.split('/').map(encodeURIComponent).join('/'),'get',undefined,token||ScriptApp.getOAuthToken(),true)); }
function sparkPatch_(path,data) {
 const fields=sparkEncode_(data).mapValue.fields,mask=Object.keys(fields).map(function(k){return 'updateMask.fieldPaths='+encodeURIComponent(k);}).join('&');
 return sparkHttp_('https://firestore.googleapis.com/v1/'+sparkName_(path).split('/').map(encodeURIComponent).join('/')+'?'+mask,'patch',{fields:fields},ScriptApp.getOAuthToken());
}
function sparkQuery_(collection,filters,limit) {
 const parts=collection.split('/'),name=parts.pop(),prefix=parts.length?sparkName_(parts.join('/')):sparkName_('placeholder').replace('/placeholder','');
 const q={from:[{collectionId:name}],limit:limit||25};
 if(filters&&filters.length){const predicates=filters.map(function(f){return {fieldFilter:{field:{fieldPath:f[0]},op:f[1],value:sparkEncode_(f[2])}};});q.where=predicates.length===1?predicates[0]:{compositeFilter:{op:'AND',filters:predicates}};}
 const rows=sparkHttp_('https://firestore.googleapis.com/v1/'+prefix+':runQuery','post',{structuredQuery:q},ScriptApp.getOAuthToken());return rows.filter(function(r){return r.document;}).map(function(r){return sparkRow_(r.document);});
}
function sparkUser_(token) {
 if(typeof token!=='string'||token.length>16000)throw new Error('Sesión inválida.');
 const p=sparkProperties_();
 // Google verifica la firma, vigencia y estado de la cuenta; no se confía en claims enviados por el navegador.
 const response=UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(p.FIREBASE_API_KEY),{method:'post',contentType:'application/json',payload:JSON.stringify({idToken:token}),muteHttpExceptions:true});
 if(response.getResponseCode()!==200)throw new Error('La sesión no es válida.');const u=(JSON.parse(response.getContentText()).users||[])[0];
 let claims;try{claims=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(token.split('.')[1])).getDataAsString());}catch(e){throw new Error('Sesión inválida.');}
 if(!u||u.disabled||!u.emailVerified||claims.aud!==p.FIREBASE_PROJECT_ID||claims.iss!=='https://securetoken.google.com/'+p.FIREBASE_PROJECT_ID||claims.sub!==u.localId||claims.exp*1000<=Date.now())throw new Error('Verifique su correo e inicie sesión.');return u;
}
function sparkId_(v) {if(typeof v!=='string'||!v||v.length>500||!/^[a-zA-Z0-9_@.+%\-]+$/.test(v))throw new Error('Identificador inválido.');return v;}
function sparkFiles(request) {
 try {
  if(!request||!['uploadEvidence','downloadCertificate','downloadEvaluationReport'].includes(request.action))throw new Error('Operación de archivos inválida.');
  const u=sparkUser_(request.idToken);
  if(request.action==='uploadEvidence') {
   const id=sparkId_(request.uploadId),r=sparkGet_('uploadRequests/'+id,request.idToken); // Firebase valida propietario, aprobaciones, clave y horario.
   if(!r||r.uid!==u.localId)throw new Error('Solicitud no disponible.');validateImage_(request.base64,request.mime);
   const old=sparkGet_('evidenceReceipts/'+id);if(old)return {ok:true,result:{receiptId:id}};
   const props=properties_(),ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[request.mime],folder=DriveApp.getFolderById(props.EVIDENCE_FOLDER_ID),filename='Evidencia_'+id+'.'+ext,files=folder.getFilesByName(filename);
   const file=files.hasNext()?files.next():folder.createFile(Utilities.newBlob(Utilities.base64Decode(request.base64),request.mime,filename));
   try {sparkGet_('uploadRequests/'+id,request.idToken); // Firestore vuelve a comprobar el plazo tras recibir la imagen.
    sparkPatch_('evidenceReceipts/'+id,{uid:u.localId,registrationId:r.registrationId,conferenceId:r.conferenceId,eventId:r.eventId,fileId:file.getId(),receivedAt:new Date(),mime:request.mime});
   }catch(e){file.setTrashed(true);throw e;}return {ok:true,result:{receiptId:id}};
  }
  const isCertificate=request.action==='downloadCertificate',path=isCertificate?'attendance/'+sparkId_(request.attendanceId):'posters/'+sparkId_(request.posterId),r=sparkGet_(path,request.idToken);
  // Para formatos, además de la lectura del póster, Firebase debe permitir la lectura administrativa de la cola.
  if(!r)throw new Error('Documento no disponible.');if(!isCertificate)sparkGet_('jobs/evaluation_'+r.id,request.idToken);
  const fileId=isCertificate?r?.certificateFileId:r?.reportFileId;if(!r||!fileId||(isCertificate?r.certificateStatus:r.reportStatus)!=='ready')throw new Error('El documento aún no está disponible.');
  const file=DriveApp.getFileById(fileId),blob=file.getBlob();if(blob.getBytes().length>5*1024*1024)throw new Error('Documento demasiado grande.');return {ok:true,result:{fileName:file.getName(),base64:Utilities.base64Encode(blob.getBytes())}};
 }catch(e){return {ok:false,error:String(e.message).slice(0,300)};}
}
function doGet(e) {
 const p=sparkProperties_(),channel=String(e.parameter.channel||'');if(!/^[a-f0-9-]{36}$/.test(channel))throw new Error('Canal inválido.');
 const template=HtmlService.createTemplateFromFile('Bridge');template.channel=channel;template.origin=p.APP_URL.match(/^https:\/\/[^/]+/)[0];
 return template.evaluate().setTitle('EventFlow · conexión con Drive').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function sparkLink_(email,password) {
 const p=sparkProperties_(),response=sparkHttp_('https://identitytoolkit.googleapis.com/v1/projects/'+p.FIREBASE_PROJECT_ID+'/accounts:sendOobCode','post',{requestType:password?'PASSWORD_RESET':'EMAIL_SIGNIN',email:email,continueUrl:p.APP_URL,canHandleCodeInApp:!password,returnOobLink:true},ScriptApp.getOAuthToken());
 const match=String(response.oobLink||'').match(/[?&]oobCode=([^&]+)/);if(!match)throw new Error('No se generó el enlace de acceso.');
 return p.APP_URL+'?mode='+(password?'resetPassword':'signIn')+'&oobCode='+match[1]+'&apiKey='+encodeURIComponent(p.FIREBASE_API_KEY);
}
function sparkEnsureUser_(email,name) {
 const p=sparkProperties_(),base='https://identitytoolkit.googleapis.com/v1/projects/'+p.FIREBASE_PROJECT_ID;
 const users=sparkHttp_(base+'/accounts:lookup','post',{email:[email]},ScriptApp.getOAuthToken()).users||[];if(users.length)return users[0];
 try{return sparkHttp_('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(p.FIREBASE_API_KEY),'post',{email:email,displayName:name,targetProjectId:p.FIREBASE_PROJECT_ID},ScriptApp.getOAuthToken());}catch(e){const retry=sparkHttp_(base+'/accounts:lookup','post',{email:[email]},ScriptApp.getOAuthToken()).users||[];if(retry.length)return retry[0];throw e;}
}
function sparkJobPayload_(j,settings) {
 const base={jobId:'spark_'+sparkHash_(j.id),kind:j.kind,settings:settings};
 if(j.kind==='registration'||j.kind==='status'){const r=sparkGet_('registrations/'+j.registrationId),e=sparkGet_('publicEvents/'+r.eventId);sparkEnsureUser_(r.email,r.name);return Object.assign(base,r,{registrationId:r.id,eventTitle:e.title,trackingUrl:sparkLink_(r.email,false),activationUrl:r.status==='approved'&&r.payment==='approved'?sparkLink_(r.email,true):''});}
 if(j.kind==='judgeInvitation'){const i=sparkGet_('judgeInvitations/'+j.judgeEmail);sparkEnsureUser_(i.email,i.name);return Object.assign(base,i,{uid:i.email,eventId:'accounts',activationUrl:sparkLink_(i.email,true)});}
 if(j.kind==='certificate'){const a=sparkGet_('attendance/'+j.attendanceId),r=sparkGet_('registrations/'+a.registrationId),c=sparkGet_('conferences/'+a.conferenceId),e=sparkGet_('publicEvents/'+a.eventId),receipt=sparkGet_('evidenceReceipts/'+a.receiptId);return Object.assign(base,r,a,{attendanceId:a.id,registrationId:r.id,conferenceTitle:c.title,speaker:c.speaker,eventTitle:e.title,evidenceFileId:receipt.fileId,mime:receipt.mime});}
 if(j.kind==='evaluation'){const p=sparkGet_('posters/'+j.posterId),evaluations=sparkQuery_('posters/'+p.id+'/evaluations',[],20);evaluations.forEach(function(e){e.scores={};p.scoreKeys.forEach(function(key,i){e.scores[key]=e.marks[i];});});return Object.assign(base,evaluationReport_(p,evaluations));}
 throw new Error('Tipo de proceso inválido.');
}
function sparkHash_(s) {return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s)).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');}
/** Solo activar desde el editor. Google.script.run no puede llamar funciones terminadas en _. */
function procesarColaSpark_() {
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
 const props=PropertiesService.getScriptProperties();let lease;
 try{if(Number(props.getProperty('WORKER_UNTIL')||0)>Date.now())return;lease=Utilities.getUuid();props.setProperty('WORKER_UNTIL',String(Date.now()+360000));props.setProperty('WORKER_TOKEN',lease);}finally{lock.releaseLock();}
 try {
  const settings=sparkGet_('settings/main')||{};settings.appUrl=sparkProperties_().APP_URL;
  const jobs=sparkQuery_('jobs',[['status','IN',['queued','processing']]],12).filter(function(j){return j.nextAttempt<=Date.now()&&(j.status==='queued'||Number(j.leaseUntil||0)<Date.now());}).slice(0,4);
  jobs.forEach(function(j){try{sparkPatch_('jobs/'+j.id,{status:'processing',leaseUntil:Date.now()+360000,attempts:(j.attempts||0)+1});const payload=sparkJobPayload_(j,settings),r=processJob_(payload);sparkPatch_('jobs/'+j.id,{status:r.review?'review':'done',completedAt:new Date(),error:r.review?'Revisar Gmail antes de reanudar.':''});if(j.kind==='certificate')sparkPatch_('attendance/'+j.attendanceId,{certificateStatus:r.certificateFileId?'ready':'error',certificateFileId:r.certificateFileId||'',evidenceStatus:'ready',evidenceFileId:r.evidenceFileId||'',emailStatus:r.review?'review':'sent'});if(j.kind==='evaluation')sparkPatch_('posters/'+j.posterId,{reportStatus:r.reportFileId?'ready':'error',reportFileId:r.reportFileId||''});}catch(e){const attempts=(j.attempts||0)+1;sparkPatch_('jobs/'+j.id,{status:attempts>=5?'error':'queued',attempts:attempts,nextAttempt:Date.now()+Math.min(60,Math.pow(2,attempts))*60000,error:String(e.message).slice(0,300)});}});
  sparkQuery_('accessRequests',[['status','EQUAL','queued']],4).forEach(function(a){try{const registrations=sparkQuery_('registrations',[['email','EQUAL',a.email],['submissionState','EQUAL','submitted']],1),invite=sparkGet_('judgeInvitations/'+a.email);if(registrations.length||invite){const person=registrations[0]||invite;sparkEnsureUser_(a.email,person.name);processJob_({jobId:'access_'+sparkHash_(a.email+'_'+a.createdAt),kind:'access',email:a.email,name:person.name,eventId:'accounts',trackingUrl:sparkLink_(a.email,false),settings:settings});}sparkPatch_('accessRequests/'+a.id,{status:'done'});}catch(e){sparkPatch_('accessRequests/'+a.id,{status:'error',error:String(e.message).slice(0,300)});}});
 }finally{if(props.getProperty('WORKER_TOKEN')===lease){props.deleteProperty('WORKER_UNTIL');props.deleteProperty('WORKER_TOKEN');}}
}
function instalarProcesosSpark_() {sparkProperties_();properties_();ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='procesarColaSpark_';}).forEach(function(t){ScriptApp.deleteTrigger(t);});ScriptApp.newTrigger('procesarColaSpark_').timeBased().everyMinutes(1).create();}
