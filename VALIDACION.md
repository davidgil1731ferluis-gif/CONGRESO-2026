# Validación · 14 de octubre de 2026

Se aprobaron 38 pruebas unitarias y de servicios simulados. Se ejecutó adicionalmente una prueba de integración con el emulador oficial de Firestore y tokens de prueba, sin proyecto real ni facturación.

El emulador comprobó las reglas reales: creación de perfiles, rechazo de roles autoasignados, registro y comprobación de respuestas, datos privados, aprobaciones administrativas, clave de conferencia, constancia de evidencia no falsificable desde el cliente, sello antes del cierre, rechazo después del cierre, jurados asignados, rango y ponderación de calificaciones y privacidad entre jurados. También comprobó el límite de 80 preguntas, condiciones encadenadas de cinco niveles y una rúbrica de 20 criterios.

Las pruebas de archivo verifican que Apps Script no ofrece operaciones de aprobación, que no crea archivos cuando Firebase deniega la autorización y que rechaza contenido disfrazado de imagen. Se verificó la vinculación del puente a un origen, canal y ventana exactos, sin tokens en URL.

Pruebas unitarias: `node --test tests/*.test.mjs`. La integración utiliza FIRESTORE_EMULATOR_HOST y el proyecto de prueba demo-eventflow. Sin emulador, se omite explícitamente; no se simula una aprobación de reglas.

La interfaz institucional y los recorridos de demostración se conservan. El modo real Spark necesita una configuración Firebase, reglas e índices desplegados y una cuenta Apps Script autorizada. No se ha verificado todavía la conexión real entre GitHub Pages, el iframe Google, OAuth, Gmail y Drive, ni una prueba de carga o de cuotas del evento. La validación local no acredita disponibilidad de servicios reales.
