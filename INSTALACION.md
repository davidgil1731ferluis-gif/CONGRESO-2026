# Instalación de EventFlow

## 1. Firebase

1. Crea un proyecto independiente en la consola de Firebase y registra una aplicación web.
2. Activa Authentication con proveedor **Correo electrónico/contraseña**. En dominios autorizados añade `TU_USUARIO.github.io` y, si probarás localmente, `localhost`.
3. Crea Firestore y un bucket predeterminado de Cloud Storage. La implementación usa `getStorage().bucket()`; si tu proyecto tiene varios buckets, configura el predeterminado o adapta esa llamada.
4. Activa App Check con **reCAPTCHA Enterprise** para los dominios de tu sitio. Copia su clave pública en `web/config.mjs`.
5. Habilita la facturación que requieren los servicios de servidor y establece alertas de presupuesto. No se presupone que la operación será gratuita.
6. Copia la configuración web de Firebase en `web/config.mjs`. Mantén `mode: 'demo'` hasta terminar la instalación. La región viene como `us-central1`; si la cambias, cambia también `setGlobalOptions` en `functions/index.mjs`.

El navegador solo contiene la configuración pública de Firebase. El Admin SDK usa la identidad del servicio desplegado.

## 2. Drive, Sheets y Apps Script

1. Con la cuenta del organizador, crea dos carpetas privadas de Drive: **Evidencias** y **Certificados**. Copia sus identificadores desde la URL.
2. Crea una hoja de cálculo para el respaldo y copia su identificador.
3. Crea un proyecto de Apps Script. Copia `apps-script/Code.gs` en un archivo `Code.gs`.
4. En configuración del proyecto, habilita el manifiesto `appsscript.json` y reemplázalo por el incluido.
5. En **Propiedades del script**, configura:

| Propiedad | Valor |
|---|---|
| `SPREADSHEET_ID` | ID de la hoja |
| `EVIDENCE_FOLDER_ID` | ID de la carpeta de evidencias |
| `CERTIFICATE_FOLDER_ID` | ID de la carpeta de certificados |
| `BRIDGE_SECRET` | Secreto aleatorio de 32 caracteres o más, compartido únicamente con Firebase |
| `CERTIFICATE_TEMPLATE_ID` | Opcional: ID de una presentación de Google Slides que servirá como plantilla |

6. Ejecuta **`verificarInstalacion`** y autoriza Drive, Sheets, Slides y Gmail con la cuenta organizadora. Esta operación comprueba los accesos y crea las hojas necesarias. No envía mensajes.
7. Implementa como **Aplicación web**, ejecutada como la cuenta organizadora, con acceso **Cualquier persona**. El endpoint valida una firma HMAC y una fecha de solicitud; las operaciones no aceptan llamadas sin el secreto. Algunas organizaciones bloquean ese tipo de publicación; en ese caso se necesita otro puente autenticado y no podrá usarse esta instalación tal cual.
8. Copia la URL que termina en `/exec`. Cada cambio posterior de código requiere una nueva versión de esta implementación.

No añadas permisos públicos a las carpetas ni a los PDF. Las descargas pasan por Firebase después de comprobar al propietario.

### Certificado personalizado

Sin plantilla, se genera un certificado claro con estilo Steep. Si proporcionas una presentación de Google Slides, usa estos campos:

`{{NOMBRE}}`, `{{EVENTO}}`, `{{CONFERENCIA}}`, `{{FECHA}}`, `{{ORGANIZADOR}}`, `{{ID}}`.

La presentación completa se convierte a PDF. Mantén una sola diapositiva si quieres un certificado de una página.

## 3. Desplegar Firebase

Instala Node.js 22 y Firebase CLI desde sus fuentes oficiales. Desde la raíz del proyecto:

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
cd functions
npm install
cd ..
firebase functions:secrets:set APPS_SCRIPT_URL
firebase functions:secrets:set BRIDGE_SECRET
firebase deploy --only firestore,storage,functions
```

Al solicitar `APPS_SCRIPT_URL`, pega la URL `/exec`. En `BRIDGE_SECRET`, introduce el mismo secreto de las propiedades de Apps Script. El secreto se escribe en el diálogo de la herramienta, no en el código.

El despliegue instala reglas que bloquean el acceso directo del navegador a Firestore y Storage. Todas las operaciones pasan por la función `api`, que verifica autenticación, rol, propietario y transiciones. El proceso programado `processJobs` atiende un lote de hasta cuatro trabajos por minuto. Confirma en la consola que Cloud Scheduler y los índices de Firestore estén activos y que no haya errores de permisos.

## 4. Administrador

1. Cambia temporalmente `mode` a `firebase` y levanta la interfaz local con `npm start`.
2. Crea la cuenta que será administradora desde la interfaz y verifica su correo.
3. Copia su UID desde Firebase Authentication.
4. Con credenciales de aplicación predeterminadas del propietario del proyecto (por ejemplo, mediante Google Cloud CLI `gcloud auth application-default login` y el proyecto configurado), ejecuta:

```powershell
cd functions
node set-admin.mjs UID_DE_LA_CUENTA
```

También puedes asignar el claim `admin: true` mediante un entorno de administración Firebase ya autorizado. No uses ni subas una clave de cuenta de servicio a la web.

5. Cierra sesión y vuelve a entrar. La aplicación reconocerá el claim de administrador. Tener un correo con la palabra «admin» no concede privilegios en el modo real.

## 5. Correo, etiqueta y pagos

En **Configuración** del aplicativo, establece el organizador, el correo de copia, la etiqueta y la URL HTTPS del módulo de pagos.

La confirmación de inscripción se envía al participante con copia al correo indicado. La etiqueta se aplica en el Gmail que envía el mensaje. Gmail no permite imponer etiquetas en la cuenta del destinatario: para ordenar la copia, crea allí un filtro por remitente/asunto y aplica la etiqueta deseada.

El módulo de pagos recibe `registrationId` y `eventId` en la URL. Estos datos identifican el registro y no autorizan un pago. En esta entrega, el administrador confirma el pago verificado y escribe su referencia. No se acepta la aprobación desde un parámetro de URL, un mensaje del iframe ni una respuesta del navegador.

Para automatizar el módulo existente, adapta su webhook o API de servidor con su firma real y referencia única, validando monto, moneda, evento y estado de la transacción antes de actualizar Firestore. El módulo no se recibió, así que no se inventó un webhook que aparentara validar sus pagos.

## 6. GitHub Pages

1. Crea el repositorio de destino y sube **el contenido de esta carpeta**, incluyendo `.github`, `web`, `functions` y `apps-script`. No subas `node_modules`, secretos ni claves privadas.
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Comprueba que tu rama principal sea `main`; si tiene otro nombre, modifica `pages.yml`.
4. Ejecuta el flujo **Publicar EventFlow**. Este flujo prueba las reglas compartidas y publica únicamente `web/`.
5. El enlace tendrá la forma `https://TU_USUARIO.github.io/TU_REPOSITORIO/`. La navegación usa el fragmento `#form=ID`, compatible con GitHub Pages.
6. Con Firebase instalado, crea y publica un formulario; usa **Compartir enlace**. El enlace real comparte el mismo formulario entre dispositivos.

## 7. Comprobación antes del evento

Prueba primero con cuentas y archivos de prueba:

- El formulario publicado abre desde otro dispositivo; el borrador no reemplaza la versión publicada hasta volver a publicar.
- Una inscripción nueva queda en espera y genera una copia en Sheets y un correo con copia.
- Una cuenta participante no puede abrir datos de otra persona ni aprobar estados.
- El pago no se habilita antes de la aprobación; las conferencias no se habilitan antes de aprobar el pago.
- Una imagen dentro del horario registra asistencia; después del cierre se rechaza aunque el reloj del computador se cambie.
- El PDF llega adjunto al correo, existe en la carpeta privada de Drive y se descarga desde la cuenta del participante.
- Repetir una inscripción o un sello no crea otro registro ni otro certificado.
- Los errores de la cola aparecen en **Reportes** y los archivos temporales procesados desaparecen de Storage.
- Revisa móvil y computador, permisos, cuotas y una prueba de carga acorde al número de asistentes esperado.

## Operación y recuperación

La cola conserva los trabajos y reintenta errores hasta cinco veces con espera progresiva. Si el correo se interrumpe en una ventana en la que no se puede confirmar si se envió, se marca **Revisar envío** para evitar duplicar correos automáticamente. Consulta Gmail del organizador antes de resolverlo.

El archivo `OPERACION.md` explica recuperación, copias y datos temporales. Las cuotas de Gmail/Apps Script siguen aplicando; la cola no las elimina.

Referencias oficiales: [GitHub Pages con Actions](https://docs.github.com/en/pages/getting-started/start-your-journey/deploying-your-website-automatically), [funciones callable de Firebase](https://firebase.google.com/docs/functions/callable), [cuotas de Apps Script](https://developers.google.com/apps-script/guides/services/quotas).
