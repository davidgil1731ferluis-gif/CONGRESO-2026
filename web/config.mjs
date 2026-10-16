// Configuración pública. No añadir contraseñas, tokens privados ni cuentas de servicio.
export const config={
 mode:'demo', // Activar 'firebase-spark' cuando las reglas y Apps Script estén instalados.
 firebase:{
  apiKey:'AIzaSyCH7D2yZnywe32_GwvjO5vdOo0HKivzQ0c',
  authDomain:'cic-2027.firebaseapp.com',
  projectId:'cic-2027',
  storageBucket:'cic-2027.firebasestorage.app', // Metadato del proyecto; los archivos se guardan en Drive.
  messagingSenderId:'251774778171',
  appId:'1:251774778171:web:511ec7ad6c57ede287151e'
 },
 appsScriptUrl:'', // URL pública /exec para evidencias y descargas privadas de Drive.
 brand:'EventFlow'
};
