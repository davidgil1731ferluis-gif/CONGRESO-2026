# Operación de EventFlow Spark

Firebase guarda y valida las operaciones del evento. La cola **jobs** guarda las referencias de registros aceptados; Apps Script recoge la información desde Firestore, procesa correo y documentos y guarda el respaldo en Sheets. Un activador interno de Apps Script atiende la cola cada minuto, sin Cloud Scheduler.

Los fallos confirmados reintentan hasta cinco veces con espera progresiva. Reportes permite reintentar estados error. Una respuesta de Gmail incierta se marca review y no se vuelve a enviar automáticamente. Revisar Gmail antes de cualquier reanudación. En la hoja Procesos, buscar el ID spark_HASH correspondiente; **resolverEnvioRevisado_** utiliza REVIEW_JOB_ID, REVIEW_SENT_MESSAGE_ID o REVIEW_CONFIRMED_NOT_SENT desde las propiedades del script. Tras verificar el resultado y resolver el registro, reanudar solo ese trabajo desde la consola Firestore con status queued y nextAttempt 0. La interfaz no permite reintentar automáticamente un envío incierto.

El correo usa los estados vigentes al procesarse. Los archivos de Drive son privados; las constancias de evidencia no equivalen a un sello de asistencia. Una imagen recibida cuyo sello no se completa puede quedar como evidencia huérfana: revisar las constancias evidenceReceipts sin asistencia correspondiente antes de limpiar la carpeta. No borrar documentos vinculados a asistencias o evaluaciones.

Los procesos de Apps Script no aprueban propuestas ni pagos ni conceden roles. El administrador realiza esas operaciones en Firebase. La cuenta organizadora tiene acceso IAM al proyecto para leer datos y registrar únicamente estados de envío y archivos; sus credenciales no se publican.

La cuenta organizadora debe revisar las cuotas de Gmail, Apps Script y Drive y el consumo gratuito de Firestore. Las reglas de formularios por bloques consumen lecturas y escrituras adicionales. Preparar una prueba con el volumen esperado antes de abrir las inscripciones.
