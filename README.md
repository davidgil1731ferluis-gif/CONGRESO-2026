# EventFlow

Aplicación de inscripciones a eventos para **GitHub Pages**, con diseño híbrido Steep, estudio azul y elementos institucionales. Interfaz en español, adaptable a móvil y computador.

Consulte [MEJORAS_ACADEMICAS.md](MEJORAS_ACADEMICAS.md) para el nuevo recorrido de cuentas, roles, categorías editables, pósteres y evaluación.

## Qué viene incluido

- Editor de formularios personalizados: respuesta corta, párrafo, correo, número, fecha, lista, selección única y múltiple.
- Preguntas obligatorias, hasta 10 pasos y condiciones «igual a/contiene» o «diferente de/no contiene» respecto de preguntas anteriores. Las respuestas ocultas se excluyen del registro.
- Borradores y publicación de versiones; enlace público por evento.
- Creación de cuentas, inicio de sesión y consulta sin contraseña mediante enlaces privados de correo. Activación tras aprobar el pago, conservando los datos de inscripción.
- Roles de administrador, ponente/expositor, autor de póster, jurado y asistente.
- Categorías y rúbricas editables, asignación de jurados y formato PDF consolidado en una carpeta independiente de Drive.
- Inscripción en espera, aprobada o no aprobada. Pago separado, con aprobación administrativa y referencia verificable.
- Conferencias con ponente, lugar, apertura y cierre de asistencia en horario de Bogotá.
- Imagen de evidencia de hasta 3 MB. El servidor valida la clave única, los estados y el horario antes de sellar la asistencia.
- Evidencias y certificados PDF privados en Drive; descarga del PDF mediante la cuenta del participante.
- Confirmación de inscripción con copia, correos de estado y certificado adjunto; etiqueta en Gmail del organizador.
- Respaldo en Sheets de inscripciones, respuestas, asistencia y procesos. Exportación CSV de inscripciones y asistencias.
- Cola independiente con reintentos, control de duplicados y estado visible de errores.

## Estado de entrega

El proyecto viene en **modo demo**. Es una demostración funcional que guarda datos en el navegador. No envía correos, no cobra, no crea archivos en Google y el enlace no comparte los datos entre dispositivos. La barra superior lo indica.

El código de Firebase y Apps Script está incluido para instalarlo. **No está desplegado ni verificado en una cuenta real.** Las pruebas automatizadas se describen en `VALIDACION.md`.

El módulo de pagos anterior no fue proporcionado. Se incluye una URL configurable para abrirlo y aprobación manual desde el administrador. La aprobación automática de ese módulo necesita adaptar su notificación de servidor; no se considera conectada por introducir una URL.

## Probar la demo

Necesitas Node.js 22 o posterior. Desde esta carpeta:

```powershell
npm start
```

Abre `http://127.0.0.1:4188`. No abras `index.html` directamente porque usa módulos JavaScript.

1. Empieza en administración. Edita el formulario de ejemplo o crea uno nuevo.
2. Publica y usa **Compartir enlace**. En demo el enlace funciona con los datos de ese mismo navegador.
3. Usa **Cambiar rol** para ver el participante de ejemplo.
4. En administración, aprueba su inscripción y valida un pago con una referencia de prueba.
5. Cambia otra vez al participante. Verás las conferencias y podrás ingresar la clave de la conferencia y subir una imagen de prueba para sellar.
6. En **Reportes**, revisa los procesos simulados y descarga los CSV.

La demo muestra un participante preinscrito; si deseas probar el envío desde cero, crea otro evento y abre su enlace.

## Configurar los servicios reales

Sigue `INSTALACION.md`. Debes disponer de:

| Servicio | Datos necesarios |
|---|---|
| GitHub | Repositorio y GitHub Pages mediante Actions |
| Firebase | Proyecto, configuración web, Authentication, Firestore, Functions, Storage y App Check |
| Google | Cuenta organizadora, una hoja de cálculo, dos carpetas privadas de Drive y Apps Script |
| Correos | Destinatario de copia y nombre de etiqueta |
| Pagos | URL del módulo existente; contrato de integración si tendrá aprobación automática |

Firebase conserva el registro principal. Sheets recibe una copia para control y reportes; editar Sheets no cambia aprobaciones en Firebase.

Las imágenes usan Firebase Storage **temporalmente** para transportar los archivos sin superar el límite de tamaño de un documento de Firestore. Se conservan finalmente en Drive y se elimina la copia temporal después de procesarlas correctamente.

## Archivos

`web/`: interfaz que publica GitHub Pages. `functions/`: servidor Firebase y validaciones. `apps-script/`: Drive, Gmail, PDF y Sheets. `tests/`: pruebas sin dependencias. `.github/workflows/pages.yml`: publicación del sitio.

No hay secretos ni claves privadas en este paquete. Las credenciales de servidor nunca deben colocarse en `web/config.mjs` ni subirse al repositorio.

## Alcance de la primera versión

Se admiten 80 preguntas por formulario y 10.000 registros por consulta del panel. Los reportes de mayor tamaño requieren procesamiento de servidor. Las condiciones trabajan sobre preguntas anteriores; no son un editor de expresiones booleanas arbitrarias. El editor crea formularios y define pasos, pero no permite insertar HTML libre ni cambiar las reglas del servidor.

La evidencia es un registro de participación declarado por el usuario, no una verificación biométrica o de ubicación. La generación del certificado comienza después de aceptar el sello, sin revisión adicional de la imagen. Si se necesita revisión humana antes del certificado, debe añadirse esa fase.

La cuenta organizadora de Google debe tener acceso a las carpetas y cuota de correo suficiente. La capacidad de usuarios simultáneos no está certificada; se debe probar antes del evento.
