import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../apps-script/Code.gs',import.meta.url),'utf8');
const c=vm.createContext({Date,JSON});vm.runInContext(code,c);
const person={name:'Persona de prueba',eventTitle:'Congreso',registrationId:'R1',settings:{}};
test('Los correos de cada fase contienen instrucciones distintas y enlaces adecuados',()=>{
 const first=c.academicMail_({...person,kind:'registration',trackingUrl:'https://example.com/privado'},{});assert.match(first.body,/revisión/);assert.match(first.body,/https:\/\/example.com\/privado/);assert.match(first.body,/conservaremos/);
 const approved=c.academicMail_({...person,kind:'status',status:'approved',payment:'pending'},{paymentUrl:'https://example.com/pago'});assert.match(approved.subject,/aprobada/);assert.match(approved.body,/primer filtro/);assert.match(approved.body,/https:\/\/example.com\/pago/);
 const paid=c.academicMail_({...person,kind:'status',status:'approved',payment:'approved',activationUrl:'https://example.com/activar'},{});assert.match(paid.subject,/Pago aprobado/);assert.match(paid.body,/No necesita registrar de nuevo/);assert.match(paid.body,/https:\/\/example.com\/activar/);
 const rejected=c.academicMail_({...person,kind:'status',status:'rejected',payment:'pending'},{});assert.match(rejected.body,/no fue aprobada/);assert.doesNotMatch(rejected.body,/Felicitaciones/);
 const judge=c.academicMail_({...person,kind:'judgeInvitation',activationUrl:'https://example.com/activar'},{});assert.match(judge.body,/rúbrica/);assert.match(judge.body,/asignados/);
});
test('El formato PDF incluye todos los jurados, criterios y resultados y se guarda en la carpeta independiente',()=>{
 const paragraphs=[],tables=[],files=[],folders=[],trashed=[];const body={appendParagraph(t){paragraphs.push(t);return {setHeading(){}}},appendTable(t){tables.push(t);}};
 c.DocumentApp={ParagraphHeading:{HEADING1:'h1',HEADING2:'h2'},create:()=>({getId:()=> 'doc',getBody:()=>body,saveAndClose(){}})};c.MimeType={PDF:'pdf'};
 c.DriveApp={getFolderById:id=>{folders.push(id);return {getFilesByName:()=>({hasNext:()=>false}),createFile:b=>{files.push(b);return {getId:()=> 'pdf-report'}}};},getFileById:()=>({getAs:()=>({setName(name){this.name=name;return this;}}),setTrashed:v=>trashed.push(v)})};
 const p={posterId:'p1',title:'Proyecto',author:'Autora',category:'Categoría propia',completed:2,expected:2,average:90,rubric:{criteria:[{id:'q1',label:'Criterio propio',weight:100}]},evaluations:[{judgeName:'Jurado A',scores:{q1:5},total:100,comments:'Comentario A',createdAt:'2026-10-09'},{judgeName:'Jurado B',scores:{q1:4},total:80,comments:'Comentario B',createdAt:'2026-10-09'}]};
 assert.equal(c.evaluationDocument_(p,{EVALUATION_FOLDER_ID:'evaluation-folder'}),'pdf-report');assert.deepEqual(folders,['evaluation-folder']);assert.equal(files[0].name,'Evaluacion_p1.pdf');assert.equal(tables.length,2);assert.equal(tables[0][1][0],'Criterio propio');assert.ok(paragraphs.includes('Jurado: Jurado A'));assert.ok(paragraphs.includes('Jurado: Jurado B'));assert.ok(paragraphs.some(t=>t.includes('Promedio: 90 / 100')));assert.deepEqual(trashed,[true]);
});
