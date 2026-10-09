# Validación · 9 de octubre de 2026

Se ejecutaron 38 pruebas automatizadas, todas aprobadas, con Node.js. Se comprobó la sintaxis de los módulos de la interfaz y del servidor.

- Registro sin contraseña, conservación del perfil, identificación y respuestas, inscripción repetida sin sobrescritura, activación condicionada al pago y separación de roles.
- Categorías configurables, ponderaciones, rúbricas conservadas al editar o eliminar categorías, jurados asignados, calificaciones válidas, bloqueo de dobles envíos y consolidación tras la última evaluación.
- Privacidad de claves: listados de participantes sin claves, acceso del ponente solo a sus conferencias vinculadas, rechazo de clave incorrecta e imagen válida obligatoria.
- Formularios por secciones, preguntas condicionales, opciones, borradores, publicación y portadas personalizadas.
- Estados, pago y límites horarios de Bogotá, firmas de imagen y separación de administración.
- Apps Script mediante servicios simulados: textos y pasos de los correos por etapa, PDF consolidado con todos los jurados guardado en carpeta independiente, respaldo, HMAC, caducidad, replay, cuotas e idempotencia de correo.

Ejecutar: `node --test tests/*.test.mjs`.

## Límites de la validación

El frontend publicado opera en demostración. No se proporcionaron Firebase, Gmail, Drive, Sheets ni el módulo de pagos real. La instalación del servidor, los índices, App Check, el envío de mensajes, las firmas del proveedor de pago, la evaluación concurrente en Firestore y la generación visual de PDF en Google deben verificarse con cuentas de prueba después de conectar esos servicios. Los simuladores no certifican disponibilidad, permisos ni cuotas reales.
