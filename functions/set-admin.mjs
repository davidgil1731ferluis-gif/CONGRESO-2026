// Ejecutar con Application Default Credentials del propietario, nunca con una clave en la web.
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
initializeApp();
const uid=process.argv[2];if(!uid)throw new Error('Uso: node set-admin.mjs UID_FIREBASE');
const u=await getAuth().getUser(uid);await getAuth().setCustomUserClaims(uid,{...u.customClaims,admin:true});
console.log('Administrador habilitado. Debe cerrar y volver a iniciar sesión.');
