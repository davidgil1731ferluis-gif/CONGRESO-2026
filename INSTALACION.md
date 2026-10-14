# Instalación de EventFlow con Firebase Spark

Esta versión no utiliza Cloud Functions, Cloud Scheduler, Cloud Storage ni Blaze. GitHub Pages sirve la interfaz. Firebase Authentication identifica a las personas y Firestore valida y guarda las operaciones. Apps Script procesa exclusivamente correos, imágenes, documentos y respaldo.

## 1. Proyecto de Firebase

1. Crear el proyecto en Firebase y mantener el plan **Spark**, sin vincular facturación. Registrar una aplicación Web.
2. En Authentication activar **Correo/contraseña**, **Enlace de correo electrónico** y **Anónimo**. La sesión anónima permite entregar el formulario sin crear contraseña; el enlace de correo verifica la identidad antes de acceder a la cuenta.
3. Agregar el dominio **davidgil1731ferluis-gif.github.io** a los dominios autorizados.
4. Crear Firestore en modo producción. No crear un bucket de Storage. La configuración provista solo despliega Firestore.
5. Instalar las reglas y los índices de esta carpeta mediante Firebase CLI: `firebase deploy --only firestore --project TU_PROJECT_ID`. También se pueden instalar las reglas en la consola y crear los índices indicados en firestore.indexes.json.
6. Mantener `web/config.mjs` en demo hasta completar la instalación. Copiar allí apiKey, authDomain, projectId y appId de la aplicación Web.

## 2. Cuenta administradora

Crear una cuenta con correo y contraseña en Authentication y verificar su correo. Copiar su UID. Desde la consola de Firestore, crear **admins/UID_DE_LA_CUENTA** con el campo booleano **enabled: true**. Ningún usuario puede crear o modificar ese permiso desde la aplicación. Al iniciar sesión, se crea su perfil académico y se reconoce el acceso administrativo. Para revocarlo, cambiar enabled a false en la consola.

## 3. Drive y respaldo

Con la cuenta organizadora, crear tres carpetas privadas: Evidencias, Certificados y Evaluaciones. Crear una hoja de cálculo para respaldo. Copiar sus identificadores. Los documentos permanecen privados; la descarga pasa por Firebase y el servicio de archivos de Apps Script.

## 4. Apps Script

1. Crear un proyecto de Apps Script con la misma cuenta Google que tiene permiso sobre el proyecto Firebase. Vincularlo al proyecto estándar de Google Cloud asociado a Firebase mediante su número de proyecto. Mantener la facturación sin activar.
2. Copiar **Code.gs**, **Spark.gs**, **Domain.gs**, **Bridge.html** y el manifiesto **appsscript.json** incluidos en esta carpeta. Sustituir el puente anterior; ya no se usa BRIDGE_SECRET.
3. La cuenta ejecutora necesita acceso IAM a Firestore y Firebase Authentication. Si creó el proyecto Firebase con esa cuenta, comprobar sus permisos existentes. Para una cuenta diferente, usar los roles Datastore User y Firebase Authentication Admin, sin entregar credenciales al navegador ni subir cuentas de servicio.
4. Confirmar que las API Cloud Firestore e Identity Toolkit están habilitadas en el proyecto. No habilitar Cloud Functions, Cloud Run ni Storage.
5. Configurar estas propiedades del script:

| Propiedad | Valor |
|---|---|
| FIREBASE_PROJECT_ID | ID del proyecto Firebase |
| FIREBASE_API_KEY | Clave API del mismo proyecto para Identity Toolkit, utilizable desde servidor; no restringida por referente HTTP. Puede restringirse a esa API. No es una clave privada de cuenta de servicio. |
| APP_URL | https://davidgil1731ferluis-gif.github.io/CONGRESO-2026/ |
| SPREADSHEET_ID | ID de la hoja de respaldo |
| EVIDENCE_FOLDER_ID | ID de la carpeta Evidencias |
| CERTIFICATE_FOLDER_ID | ID de la carpeta Certificados |
| EVALUATION_FOLDER_ID | ID de la carpeta Evaluaciones |
| CERTIFICATE_TEMPLATE_ID | Opcional: presentación de Slides para certificados |

6. Ejecutar **verificarInstalacion_** desde el editor y autorizar los servicios con la cuenta organizadora. Ejecutar **instalarProcesosSpark_** para crear un único activador de tiempo que atiende la cola cada minuto. Ambas funciones son privadas para google.script.run; se ejecutan desde el editor.
7. Publicar como aplicación web, ejecutada como la cuenta organizadora y con acceso **Cualquier persona**. Copiar la URL /exec en `appsScriptUrl` de web/config.mjs. Cada cambio posterior requiere una nueva versión del despliegue de Apps Script. Si la organización impide aplicaciones web accesibles públicamente o los permisos OAuth requeridos, esta instalación no podrá operar sin una solución institucional autorizada.

El iframe de conexión no envía tokens en la URL. Vincula sus mensajes a un canal aleatorio, a la ventana exacta y al origen permitido. Apps Script comprueba el ID token con Google y realiza las lecturas de autorización con el token del participante: Firestore es quien concede o deniega el acceso. El token OAuth de la cuenta organizadora permanece en el servidor.

## 5. Activar la aplicación

Cambiar mode a **firebase-spark** y publicar web/ mediante el flujo existente de GitHub Pages. En Configuración, guardar organizador, correo de copia, etiqueta Gmail, URL pública y URL HTTPS del módulo de pagos. El módulo de pagos mantiene la validación administrativa con referencia; no se confirma un pago por abrir un enlace.

## 6. Verificación con cuentas reales

- Crear y publicar un formulario. Abrirlo desde otro dispositivo.
- Inscribirse sin contraseña y completar las comprobaciones de Firebase. Solo los envíos completos se muestran para revisión.
- Comprobar el correo con copia y el enlace privado de seguimiento. Aprobar la propuesta y el pago; revisar sus correos y la activación de contraseña.
- Asignar jurados por correo, crear categorías y pósteres, enviar todas las evaluaciones y comprobar el PDF privado de Drive.
- Vincular un ponente aprobado a una conferencia y comprobar su credencial y clave.
- Sellar con clave e imagen antes del cierre. Comprobar que después del cierre Firebase rechaza tanto nuevas solicitudes de imagen como el sello final.
- Descargar certificado y comprobar el correo, las carpetas y las hojas de respaldo.

## Cuotas y rendimiento

Las consultas, aprobaciones y validaciones operan directamente en Firebase. Correo y PDF se atienden en una cola separada, hasta cuatro procesos por ejecución. Las preguntas se comprueban en pequeños bloques paralelos para respetar el límite de evaluación de reglas de Firestore; esto consume lecturas y escrituras adicionales. Se admiten hasta 80 preguntas y hasta cinco niveles de condiciones encadenadas. Las rúbricas admiten 20 criterios.

Spark, Firebase Authentication, Apps Script, Gmail y Drive tienen cuotas. Esta adaptación elimina la dependencia de Blaze, pero no garantiza capacidad ilimitada ni entrega inmediata de correos. Antes del evento, comprobar el número de inscripciones esperado y las cuotas de la cuenta organizadora. Al alcanzar una cuota gratuita, el servicio puede rechazar operaciones hasta su restablecimiento: no se convierte automáticamente en un servicio facturado.

Referencias: [Firestore REST e IAM](https://firebase.google.com/docs/firestore/use-rest-api), [límites de reglas](https://firebase.google.com/docs/firestore/security/rules-structure), [cuotas de Apps Script](https://developers.google.com/apps-script/guides/services/quotas).
