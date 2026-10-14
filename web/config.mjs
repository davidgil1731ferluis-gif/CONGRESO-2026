// Configuración pública. No añadir contraseñas, tokens privados ni cuentas de servicio.
export const config={
 mode:'demo', // Activar 'firebase-spark' cuando las reglas y Apps Script estén instalados.
 firebase:{apiKey:'',authDomain:'',projectId:'',appId:''},
 appsScriptUrl:'', // URL pública /exec para evidencias y descargas privadas de Drive.
 brand:'EventFlow'
};
