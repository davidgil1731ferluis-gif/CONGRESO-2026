# Firebase valida; Apps Script procesa correo y Drive

Arquitectura vigente: GitHub Pages → Firebase Authentication + Firestore Spark. La base de datos aplica permisos, separación de roles, obligatoriedad y condiciones del formulario, aprobación y pago administrativos, asignación y calificación de jurados, clave de conferencia y apertura/cierre por hora de servidor. Las comprobaciones de inscripción se conservan con la versión publicada del formulario y se ejecutan en bloques paralelos; una entrega incompleta no se muestra como inscripción enviada.

Para evidencias, Firebase autoriza una solicitud con la clave correcta dentro del horario. Apps Script lee esa autorización usando el ID token del solicitante, recibe la imagen y escribe una constancia privada de archivo. El cliente confirma el sello en Firestore, que comprueba nuevamente propietario, aprobaciones, clave, constancia y plazo. Una constancia de Drive por sí sola no acredita asistencia.

Los jurados solo crean una evaluación propia por póster asignado. Firebase valida la escala, la ponderación y el puntaje. Las calificaciones se almacenan como una lista ordenada según los criterios de la rúbrica; la interfaz y el formato convierten esa lista a los nombres de los criterios. Tras el último jurado, se prepara el trabajo que Apps Script convierte en PDF y guarda en Drive.

Apps Script recibe únicamente solicitudes de archivos. No ofrece operaciones para aprobar inscripciones o pagos, asignar permisos o sellar asistencia. Su proceso de correo y documentos lee los registros ya aceptados por Firebase y actualiza exclusivamente los metadatos de envío, archivos y respaldo. La aplicación no contiene tokens OAuth de la cuenta organizadora.

No se despliegan Cloud Functions, Cloud Scheduler ni Firebase Storage. Se retiró el servidor anterior para evitar activarlo accidentalmente. Consulte [INSTALACION.md](INSTALACION.md) para conectar el proyecto Spark. La entrega permanece en demo hasta proporcionar la configuración y desplegar los servicios propios.
