import test from 'node:test';import assert from 'node:assert/strict';
const dialog={innerHTML:'',open:false,showModal(){this.open=true},addEventListener(){}};
globalThis.matchMedia=()=>({matches:true});
globalThis.document={querySelector:()=>dialog,createElement(){throw new Error('No deben crearse efectos con movimiento reducido')}};
const {celebrate}=await import('../web/celebration.mjs');
test('La confirmación de inscripción informa revisión pendiente y distingue demostración',()=>{celebrate('registration',{demo:true});assert.equal(dialog.open,true);assert.match(dialog.innerHTML,/comité organizador revisará/);assert.match(dialog.innerHTML,/Demostración/);assert.doesNotMatch(dialog.innerHTML,/inscripción está aprobada/)});
test('La vista previa de asistencia no afirma haber creado un registro',()=>{celebrate('attendance',{preview:true});assert.match(dialog.innerHTML,/no se registró una asistencia/);assert.match(dialog.innerHTML,/Su certificado se enviará/)});
