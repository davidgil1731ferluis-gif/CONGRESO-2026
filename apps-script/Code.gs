/** EventFlow · puente privado. Nunca llamar desde GitHub Pages ni publicar BRIDGE_SECRET. */
function doPost(e) {
  try {
    const envelope = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('BRIDGE_SECRET');
    if (!secret || typeof envelope.body !== 'string' || Math.abs(Date.now() - Number(envelope.ts)) > 300000 || !/^[a-zA-Z0-9-]{20,80}$/.test(envelope.nonce || '')) throw new Error('Solicitud no autorizada.');
    const expected = Utilities.computeHmacSha256Signature(envelope.ts + '.' + envelope.nonce + '.' + envelope.body, secret).map(function (b) {return ('0' + (b & 255).toString(16)).slice(-2);}).join('');
    let diff = expected.length ^ String(envelope.signature || '').length;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ String(envelope.signature || '').charCodeAt(i);
    if (diff) throw new Error('Firma inválida.');
    const lock = LockService.getScriptLock();lock.waitLock(30000);
    try {
      const cache = CacheService.getScriptCache();if (cache.get(envelope.nonce)) throw new Error('Solicitud repetida.');cache.put(envelope.nonce, '1', 600);
      const request = JSON.parse(envelope.body);
      let result;
      if (request.action === 'job') result = processJob_(request.payload);
      else if (request.action === 'download') {
        // Firebase ya verificó que este certificado pertenece al solicitante.
        const ledger = ledger_(), rows = ledger.getDataRange().getValues();
        const row = rows.find(function (r) {return r[0] === 'certificate_' + request.payload.attendanceId;});
        const record = row && JSON.parse(row[1]);
        if (!record || record.certificateFileId !== request.payload.fileId) throw new Error('Certificado no disponible.');
        const file = DriveApp.getFileById(record.certificateFileId), blob = file.getBlob();
        if (blob.getBytes().length > 5 * 1024 * 1024) throw new Error('Certificado demasiado grande.');
        result = {fileName: file.getName(), base64: Utilities.base64Encode(blob.getBytes())};
      } else throw new Error('Operación inválida.');
      return json_({ok: true, result: result});
    } finally {lock.releaseLock();}
  } catch (error) {return json_({ok: false, error: String(error.message).slice(0, 500)});}
}
function json_(value) {return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function properties_() {
  const p = PropertiesService.getScriptProperties().getProperties();
  ['SPREADSHEET_ID', 'EVIDENCE_FOLDER_ID', 'CERTIFICATE_FOLDER_ID'].forEach(function(k) {if (!p[k]) throw new Error('Falta configurar ' + k);});
  return p;
}
function sheet_(name, headers) {
  const book = SpreadsheetApp.openById(properties_().SPREADSHEET_ID);
  let sheet = book.getSheetByName(name);
  if (!sheet) {sheet = book.insertSheet(name);sheet.appendRow(headers);sheet.setFrozenRows(1);sheet.getRange(1,1,1,headers.length).setBackground('#f2f2f3').setFontColor('#17191c');}
  return sheet;
}
function ledger_() {return sheet_('Procesos', ['ID', 'Estado JSON', 'Actualizado']);}
function safeCell_(value) {const s = String(value == null ? '' : value);return /^[\s]*[=+@-]/.test(s) ? "'" + s : s;}
function upsert_(sheet, id, values) {
  const rows = sheet.getDataRange().getValues();const index = rows.findIndex(function(r) {return String(r[0]) === id;});
  const safe = values.map(safeCell_);if (index > 0) sheet.getRange(index + 1, 1, 1, safe.length).setValues([safe]);else sheet.appendRow(safe);
  SpreadsheetApp.flush();
}
function processJob_(p) {
  if (!p || !/^[a-zA-Z0-9_-]{1,150}$/.test(p.jobId) || !['registration','status','certificate'].includes(p.kind)) throw new Error('Proceso inválido.');
  const ledger = ledger_(), row = ledger.getDataRange().getValues().find(function(r) {return r[0] === p.jobId;});
  let record = row ? JSON.parse(row[1]) : {mailState: 'pending'};
  const save = function() {upsert_(ledger, p.jobId, [p.jobId, JSON.stringify(record), new Date().toISOString()]);};
  if (record.done) return record;
  const props = properties_(), settings = p.settings || {};
  // La copia de Firestore se guarda antes de enviar el correo.
  if (p.kind === 'registration' || p.kind === 'status') {
    const sheet = sheet_('Inscripciones', ['ID', 'Evento ID', 'Evento', 'Nombre', 'Correo', 'Inscripción', 'Pago', 'Fecha de registro', 'Versión', 'Respuestas JSON', 'Última copia', 'Referencia pago']);
    // Evitar que una confirmación atrasada sobrescriba un cambio de estado más reciente.
    const old = sheet.getDataRange().getValues().find(function(r) {return r[0] === p.registrationId;});
    if (!old || p.kind === 'status' && Date.parse(p.updatedAt || p.createdAt) >= Date.parse(old[10] || 0)) {
      upsert_(sheet, p.registrationId, [p.registrationId,p.eventId,p.eventTitle,p.name,p.email,p.status,p.payment,p.createdAt,p.version,'Ver hoja Respuestas',p.updatedAt || p.createdAt,p.paymentReference || '']);
      const answersSheet = sheet_('Respuestas',['ID','Inscripción ID','Evento ID','Pregunta ID','Respuesta']);
      Object.keys(p.answers || {}).forEach(function(k) {upsert_(answersSheet,p.registrationId + '_' + k,[p.registrationId + '_' + k,p.registrationId,p.eventId,k,JSON.stringify(p.answers[k])]);});
    }
  }
  if (p.kind === 'certificate') {
    if (!record.evidenceFileId) {
      if (!p.base64 || !['image/jpeg','image/png','image/webp'].includes(p.mime)) throw new Error('Evidencia inválida.');
      const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[p.mime];
      const folder = DriveApp.getFolderById(props.EVIDENCE_FOLDER_ID), filename = p.attendanceId + '.' + ext;
      const existing = folder.getFilesByName(filename);
      const file = existing.hasNext() ? existing.next() : folder.createFile(Utilities.newBlob(Utilities.base64Decode(p.base64), p.mime, filename));
      record.evidenceFileId = file.getId();save();
    }
    if (!record.certificateFileId) {record.certificateFileId = certificate_(p, props);save();}
    upsert_(sheet_('Asistencias', ['ID','Inscripción ID','Evento ID','Conferencia ID','Nombre','Correo','Conferencia','Sellado UTC','Sellado Bogotá','Evidencia Drive ID','Certificado Drive ID']), p.attendanceId,
      [p.attendanceId,p.registrationId,p.eventId,p.conferenceId,p.name,p.email,p.conferenceTitle,p.stampedAt,Utilities.formatDate(new Date(p.stampedAt),'America/Bogota','yyyy-MM-dd HH:mm:ss'),record.evidenceFileId,record.certificateFileId]);
  }
  // Si hubo interrupción después de enviar, no reenviar a ciegas: pedir revisión.
  if (record.mailState === 'sending') {record.review = true;save();return record;}
  if (record.mailState !== 'sent') {
    if (MailApp.getRemainingDailyQuota() < (settings.ccEmail && p.kind === 'registration' ? 2 : 1)) throw new Error('Cuota de correos agotada. Se reintentará.');
    const states = {pending:'en espera',approved:'aprobado',rejected:'no aprobado'};
    const subject = p.kind === 'registration' ? 'Inscripción recibida · ' + p.eventTitle : p.kind === 'certificate' ? 'Tu certificado de asistencia · ' + p.conferenceTitle : 'Actualización de inscripción · ' + p.eventTitle;
    const body = 'Hola ' + p.name + ',\n\n' + (p.kind === 'registration' ? 'Recibimos tu inscripción a ' + p.eventTitle + '. Tu estado es en espera. Consulta las siguientes fases en la plataforma.' : p.kind === 'certificate' ? 'Tu asistencia a ' + p.conferenceTitle + ' quedó registrada. Adjuntamos tu certificado.' : 'El estado de tu inscripción es ' + (states[p.status] || p.status) + ' y el estado del pago es ' + (states[p.payment] || p.payment) + '.') + '\n\nReferencia: ' + p.registrationId + '\n' + (settings.organizer || 'Equipo organizador');
    const options = {name: settings.organizer || 'EventFlow'};
    if (p.kind === 'registration' && settings.ccEmail) options.cc = settings.ccEmail;
    if (p.kind === 'certificate') options.attachments = [DriveApp.getFileById(record.certificateFileId).getBlob()];
    // Preparar el borrador antes de marcar la ventana de envío incierto.
    const draft = GmailApp.createDraft(p.email, subject, body, options);
    record.draftId = draft.getId();record.mailState = 'sending';save();
    try {
      const message = draft.send();record.messageId = message.getId();record.mailState = 'sent';save();
    } catch (error) {record.review = true;record.error = 'Revisar Gmail: ' + error.message;save();return record;}
  }
  if (settings.label && record.messageId) {
    const label = GmailApp.getUserLabelByName(settings.label) || GmailApp.createLabel(settings.label);
    GmailApp.getMessageById(record.messageId).getThread().addLabel(label);
  }
  record.done = true;record.review = false;save();return record;
}
function certificate_(p, props) {
  const folder = DriveApp.getFolderById(props.CERTIFICATE_FOLDER_ID), filename = 'Certificado_' + p.attendanceId + '.pdf';
  const existing = folder.getFilesByName(filename);if (existing.hasNext()) return existing.next().getId();
  let presentation, source;
  if (props.CERTIFICATE_TEMPLATE_ID) {
    source = DriveApp.getFileById(props.CERTIFICATE_TEMPLATE_ID).makeCopy('Temporal_' + p.attendanceId, folder);
    presentation = SlidesApp.openById(source.getId());
    const values = {'{{NOMBRE}}':p.name,'{{EVENTO}}':p.eventTitle,'{{CONFERENCIA}}':p.conferenceTitle,'{{FECHA}}':Utilities.formatDate(new Date(p.stampedAt),'America/Bogota','dd/MM/yyyy'),'{{ORGANIZADOR}}':p.settings.organizer || 'Equipo organizador','{{ID}}':p.attendanceId};
    Object.keys(values).forEach(function(k) {presentation.replaceAllText(k,String(values[k]));});
  } else {
    presentation = SlidesApp.create('Temporal_' + p.attendanceId);source = DriveApp.getFileById(presentation.getId());
    const slide = presentation.getSlides()[0];slide.getPageElements().forEach(function(el) {el.remove();});slide.getBackground().setSolidFill('#ffffff');
    const w = presentation.getPageWidth(), h = presentation.getPageHeight();
    function box(text, x, y, width, height, size, color) {const shape = slide.insertTextBox(text,x,y,width,height);shape.getText().getTextStyle().setFontFamily(size >= 22 ? 'Georgia' : 'Arial').setFontSize(size).setForegroundColor(color);return shape;}
    box('EVENTFLOW / ' + (p.settings.organizer || 'EVENTOS').toUpperCase(),36,28,w-72,25,10,'#626670');
    box('CERTIFICADO DE ASISTENCIA',36,82,w-72,30,13,'#5d2a1a');
    box(p.name,36,126,w-72,80,p.name.length>45?28:36,'#17191c');
    box('Participó en la conferencia',36,208,w-72,30,13,'#626670');
    box(p.conferenceTitle,36,242,w-72,55,22,'#17191c');
    box(p.eventTitle + ' · ' + Utilities.formatDate(new Date(p.stampedAt),'America/Bogota','dd/MM/yyyy'),36,h-86,w-72,25,12,'#626670');
    box('REGISTRO / ' + p.attendanceId.slice(0,24),36,h-44,w-72,18,9,'#777b86');
  }
  presentation.saveAndClose();
  const pdf = source.getAs(MimeType.PDF).setName(filename), file = folder.createFile(pdf);source.setTrashed(true);return file.getId();
}
function verificarInstalacion() {
  const p = properties_();if (!p.BRIDGE_SECRET || p.BRIDGE_SECRET.length < 32) throw new Error('Configura BRIDGE_SECRET de al menos 32 caracteres.');
  SpreadsheetApp.openById(p.SPREADSHEET_ID);DriveApp.getFolderById(p.EVIDENCE_FOLDER_ID);DriveApp.getFolderById(p.CERTIFICATE_FOLDER_ID);
  ledger_();sheet_('Inscripciones',['ID','Evento ID','Evento','Nombre','Correo','Inscripción','Pago','Fecha de registro','Versión','Respuestas JSON','Última copia','Referencia pago']);
  console.log('Drive y Sheets accesibles. Cuota restante de destinatarios: ' + MailApp.getRemainingDailyQuota());
}
/** Ejecutar solo después de comprobar Gmail. Ver OPERACION.md. */
function resolverEnvioRevisado() {
  const props = PropertiesService.getScriptProperties(), id = props.getProperty('REVIEW_JOB_ID'), messageId = props.getProperty('REVIEW_SENT_MESSAGE_ID'), notSent = props.getProperty('REVIEW_CONFIRMED_NOT_SENT') === 'true';
  if (!id || (!messageId && !notSent) || (messageId && notSent)) throw new Error('Indica el proceso y una única decisión después de revisar Gmail.');
  const lock = LockService.getScriptLock();lock.waitLock(30000);
  try {
    const ledger = ledger_(), row = ledger.getDataRange().getValues().find(function(r) {return r[0] === id;});
    if (!row) throw new Error('Proceso inexistente.');
    const record = JSON.parse(row[1]);if (record.mailState !== 'sending' || !record.review) throw new Error('El proceso no requiere revisión.');
    if (messageId) {GmailApp.getMessageById(messageId);record.messageId = messageId;record.mailState = 'sent';}
    else {
      // Conserva el borrador ya creado; se descarta antes del próximo intento para no duplicarlo.
      if (record.draftId) {try {GmailApp.getDraft(record.draftId).deleteDraft();} catch (error) {throw new Error('El borrador no existe. Comprueba si se envió antes de autorizar otro correo.');}}
      record.mailState = 'pending';
    }
    record.review = false;record.done = false;record.error = '';upsert_(ledger,id,[id,JSON.stringify(record),new Date().toISOString()]);
    props.deleteProperty('REVIEW_JOB_ID');props.deleteProperty('REVIEW_SENT_MESSAGE_ID');props.deleteProperty('REVIEW_CONFIRMED_NOT_SENT');
    console.log('Revisión registrada. Reanuda exclusivamente este trabajo en Firebase siguiendo OPERACION.md.');
  } finally {lock.releaseLock();}
}
