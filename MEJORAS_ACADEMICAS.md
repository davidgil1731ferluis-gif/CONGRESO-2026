# Cuentas y gestión académica

La web sigue en `mode: 'demo'`. Las cuentas, invitaciones y respaldos se simulan en el navegador. No se almacenan contraseñas en la demo. Los servicios reales requieren instalar el backend de Firebase y el puente de Apps Script siguiendo INSTALACION.md.

## Recorrido de inscripción

1. La persona abre el formulario público, indica nombre, correo, identificación y perfil (ponente/expositor, autor de póster o asistente), responde y autoriza el tratamiento de datos. No necesita contraseña.
2. Firebase registra la inscripción mediante una sesión provisional sin contraseña. El servicio de correo prepara el acceso por correo, que verifica su identidad al abrir el enlace. Las respuestas se guardan sin sobrescribir una inscripción existente. El correo de confirmación incluye un enlace privado para verificar la propiedad del correo y consultar el estado.
3. El administrador revisa la propuesta. Al aprobarla, se prepara un correo con las instrucciones de pago. La validación del pago sigue siendo administrativa o mediante la integración del módulo existente; no se confirma por abrir su enlace.
4. Al validar el pago, se prepara otro correo con un enlace de vigencia limitada para crear la contraseña. El nombre, la identificación y las respuestas se conservan.
5. Con aprobación total, el panel de seguimiento se reemplaza por una credencial. La asistencia a otras conferencias aparece en una sección independiente.

Las cuentas nuevas también disponen de creación convencional, inicio de sesión y recuperación de contraseña. Si una persona ya se inscribió sin contraseña, debe usar **Consultar mi propuesta**, no crear una segunda cuenta. Es posible recuperar un enlace de seguimiento caducado desde esa opción.

## Roles

- Administrador: mantiene formularios, cuentas de jurado, propuestas, pagos, conferencias, categorías, pósteres y reportes. Se asigna mediante el procedimiento administrativo existente; el formulario público no concede este rol.
- Ponente/expositor: consulta su credencial y las claves de las conferencias vinculadas a su inscripción aprobada. También registra asistencia a otras conferencias.
- Presentador de póster: consulta su credencial, sus pósteres y las conferencias del evento.
- Jurado: recibe una invitación creada por el administrador y evalúa exclusivamente los pósteres asignados. No ve las evaluaciones de otros jurados.
- Asistente: consulta su credencial y registra asistencia.

El perfil de participación es por inscripción. La asignación de jurado se administra en **Cuentas y roles**. Si un jurado también se inscribe al evento, conserva su espacio de evaluación y dispone de las conferencias cuando su inscripción y pago estén aprobados.

## Categorías, rúbricas y formatos

En **Pósteres y evaluación** se crean, renombran y eliminan categorías. No existen categorías obligatorias predefinidas. Cada categoría permite entre uno y veinte criterios con ponderaciones que suman 100 %, y escala de calificación de 1 a 5. Para agregar criterios se escribe una línea por criterio: `Nombre | porcentaje`.

Cada póster vincula a un autor de póster con aprobación total y uno o varios jurados. Puede adjuntarse un enlace HTTPS al documento. El póster conserva una copia de la rúbrica: editar o eliminar su categoría no cambia resultados anteriores. Eliminar retira la categoría de nuevas asignaciones y conserva el registro histórico. Un póster con evaluaciones enviadas no permite cambiar la rúbrica, el autor ni los jurados.

El administrador consulta un consolidado parcial mientras faltan jurados. Al recibir la última evaluación, se genera automáticamente un PDF con las calificaciones por criterio, las ponderaciones, los comentarios, los puntajes por jurado y el promedio sobre 100. Apps Script lo guarda en la carpeta privada `EVALUATION_FOLDER_ID` y respalda los resultados en la hoja **Evaluaciones**. La descarga del PDF se autoriza exclusivamente al administrador mediante Firebase. En demo se descarga un formato HTML claramente identificado; no se escribe en Drive.

## Claves de asistencia

Cada conferencia recibe automáticamente una clave única al crearse o guardarse. El administrador la consulta al editar la conferencia. Debe vincularse la inscripción del ponente con aprobación total para que vea la clave en el reverso de su credencial.

Las claves se guardan en una colección privada separada (`conferenceSecrets`). Los listados de participantes no las contienen. El servidor valida la clave, la imagen, las aprobaciones y el horario de Bogotá al sellar, y limita los intentos de clave. Para conferencias anteriores a esta versión, editar y guardar genera la clave faltante.

## Configuración para operación real

La arquitectura vigente usa Firebase Spark para validaciones y datos, y Apps Script para correo, evidencia, PDF y respaldo. La asignación de administrador se realiza mediante admins/UID con enabled true en la consola Firestore. Las reglas permiten exclusivamente las operaciones correspondientes a cada rol.

Consulte [INSTALACION.md](INSTALACION.md) y [SIN_BLAZE.md](SIN_BLAZE.md). No se requiere Blaze, Cloud Functions, Cloud Scheduler ni Firebase Storage.
