// Configuración pública. Nunca colocar aquí secretos, claves privadas o credenciales de Google.
export const config = {
  mode: 'demo', // Cambiar a 'firebase' únicamente después de instalar el backend.
  firebase: { apiKey: '', authDomain: '', projectId: '', appId: '' },
  region: 'us-central1',
  appCheckSiteKey: '', // Clave pública reCAPTCHA Enterprise, requerida en producción.
  brand: 'EventFlow'
};
