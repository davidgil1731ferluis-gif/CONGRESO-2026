# Validación de la entrega

Se ejecutaron **20 pruebas automatizadas**, todas aprobadas, con Node.js. No requieren instalar paquetes.

```powershell
node --test tests/*.test.mjs
```

## Comprobado

- Preguntas obligatorias visibles y exclusión de respuestas ocultas.
- Condiciones encadenadas, preguntas anteriores y orden de pasos.
- Rechazo de opciones manipuladas y archivos que no corresponden al tipo de imagen.
- Aprobación de inscripción y pago antes de registrar asistencia.
- Apertura, cierre y deshabilitación de conferencias. Caso exacto: 17:00 Bogotá = 22:00 UTC; se rechaza el instante posterior.
- Recorrido de la demo: crear, guardar borrador, publicar, inscribir, aprobar, validar pago y sellar. Repetir inscripción o sello no duplica registros.
- Separación de administración y participante en la demo.
- Validaciones idénticas entre el módulo compartido de la interfaz y el del servidor.
- Apps Script, mediante servicios simulados: confirmación y respaldo, reintentos sin repetir correos, envío incierto en revisión, cuota agotada, confirmación atrasada que no reemplaza el estado nuevo, firma HMAC, caducidad y repetición de solicitudes.
- Sintaxis de los módulos de la interfaz y del servidor; Apps Script se cargó y ejecutó en un entorno de prueba.

## Pendiente en los servicios reales

La vista previa no fue accesible desde el navegador de la sesión. **No se confirma QA visual ni interacción real de navegador**. La interfaz debe revisarse en móvil y computador después de levantarla o publicarla.

No se dispuso del proyecto Firebase, carpetas, hoja, Gmail ni módulo de pagos. Por tanto quedan pendientes: despliegue de Functions/Firestore/Storage, reglas con usuarios reales, App Check, identidad del administrador, generación visual del PDF con Slides, permisos privados de Drive, envíos reales con copia/etiqueta y funcionamiento de la cola programada en Google.

Las pruebas de Apps Script usan dobles de servicios y no certifican la disponibilidad ni las cuotas de la cuenta Google. Tampoco se realizó prueba de carga; no hay una cifra comprobada de usuarios simultáneos.

No se publicaron repositorios ni sitios y no se enviaron correos durante la preparación. El paquete contiene una demo funcional y el código de integración para configurar.
