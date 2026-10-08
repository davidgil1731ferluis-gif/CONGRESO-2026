# Operación y recuperación

## Fuente de información

Firestore es la fuente principal. Colecciones: `events` (borradores), `publicEvents` (versiones públicas), `events/ID/versions` (historial publicado), `registrations`, `conferences`, `attendance`, `jobs`, `audit`, `settings` y `limits`.

El participante solo consulta sus propios registros a través de Firebase Functions. Las reglas deniegan acceso directo. Los administradores se autorizan mediante un custom claim, no mediante un dato editable por el usuario.

Sheets tiene `Inscripciones`, `Respuestas`, `Asistencias` y `Procesos`. Las respuestas se escriben en filas separadas para no superar el tamaño de una celda. `Procesos` registra identificadores de archivos y estados de envío para no duplicar trabajo tras un reintento.

El respaldo de Sheets es operativo y eventual. No sustituye una copia completa de Firestore ni de Drive. Configura exportaciones de Firestore y respaldo de carpetas según la política del evento. Las evidencias y los certificados conservan permisos privados.

## Errores de la cola

`queued`: espera. `processing`: en ejecución con bloqueo temporal. `done`: completado. `error`: agotó los reintentos. `review`: comprobar Gmail antes de reanudar.

En **Reportes**, un trabajo con error confirmado ofrece **Reintentar**. Primero corrige el origen: acceso a carpetas, configuración, cuota o disponibilidad de Apps Script. La cola espera progresivamente y admite cinco intentos por ciclo. No borres el registro de `Procesos` ni los trabajos como forma de reintentar: eso elimina el control de duplicados.

Los correos no se envían dentro del registro del participante. La programación atiende hasta cuatro trabajos por minuto; ajusta el lote después de medir duración, concurrencia y cuota de Google. El tiempo de entrega puede aumentar con la cola. No hay una promesa de correo instantáneo ni de capacidad simultánea certificada.

## Envío que requiere revisión

Gmail y Firestore no comparten una transacción. Si se interrumpe la respuesta durante el envío, la aplicación evita reenviar automáticamente y marca el trabajo para revisión.

1. Busca en Gmail del organizador por destinatario, asunto y referencia de inscripción. Revisa también borradores.
2. En las propiedades de Apps Script, establece `REVIEW_JOB_ID` con el ID exacto de `jobs` que aparece en Firestore.
3. Si el correo **sí fue enviado**, establece `REVIEW_SENT_MESSAGE_ID` con su ID interno de mensaje Gmail, obtenido desde GmailApp/Gmail API; no es el encabezado RFC Message-ID ni el ID de conversación.
4. Si comprobaste que **no se envió** y el borrador original sigue existiendo, establece `REVIEW_CONFIRMED_NOT_SENT` como `true`. No establezcas ambas decisiones.
5. Ejecuta `resolverEnvioRevisado`. Verifica que finalice sin errores. La función conserva los archivos ya generados y ajusta únicamente el estado de envío.
6. En Firestore Console, para **ese único documento** `jobs/ID`, cambia `status` a `queued`, `nextAttempt` a `0`, `attempts` a `0`. Conserva el resto del documento. El proceso programado retomará el trabajo con el estado corregido de Google.
7. Comprueba que termine en `done` y que no haya duplicados en Gmail.

Este procedimiento lo realiza el administrador con acceso al servidor; no se expone un botón que vuelva a enviar un correo incierto.

## Evidencias temporales

Firebase Storage guarda temporalmente `staging/ID_ASISTENCIA/ID_ARCHIVO`. La cola copia la evidencia a Drive, crea el certificado y borra el objeto temporal después del éxito. Un error conserva el archivo para reintentar. Si un proceso muere entre subir una imagen y confirmar la transacción, puede dejar un archivo huérfano. Revisa periódicamente staging comparándolo con `jobs.payload.uploadPath`; elimina solo los objetos sin trabajo asociado y después del periodo de retención decidido por el organizador. No actives una eliminación automática corta que borre evidencias de trabajos pendientes.

## Pago existente

Mientras no se implemente su conexión de servidor, usa la referencia verificable y la aprobación administrativa. El historial de cambios se conserva en `audit`. La URL del módulo no confirma un pago. Nunca aceptes estado, monto o comprobación provenientes únicamente del navegador del participante.

## Datos y horarios

El horario de la interfaz se expresa en Bogotá, UTC−5. La asistencia se confirma en UTC con el reloj del servidor y los límites actuales de la conferencia dentro de una transacción. Una solicitud que termine de subir después del cierre se rechaza, aunque el usuario haya iniciado la subida antes. El límite exacto se acepta y cualquier instante posterior se rechaza.

La primera versión fija Bogotá como zona del evento. Para eventos en otras zonas se debe añadir una zona configurable y convertir sus horarios antes de guardarlos.
