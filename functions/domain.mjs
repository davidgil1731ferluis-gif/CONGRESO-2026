export const TYPES = ['text', 'textarea', 'email', 'number', 'date', 'select', 'radio', 'checkbox'];
export function visibleQuestions(questions, answers) {
  const visible = new Set();
  return questions.filter(q => {
    if (!q.condition) { visible.add(q.id); return true; }
    const { field, operator, value } = q.condition;
    if (!visible.has(field)) return false;
    const actual = answers[field];
    const matches = Array.isArray(actual) ? actual.includes(value) : String(actual ?? '') === value;
    const result = operator === 'neq' ? !matches : matches;
    if (result) visible.add(q.id);
    return result;
  });
}
export function validateSchema(form) {
  if (!form || typeof form.title !== 'string' || !form.title.trim() || form.title.length > 160) throw new Error('Escribe un título de hasta 160 caracteres.');
  if (typeof form.description !== 'string' || form.description.length > 3000) throw new Error('Descripción demasiado larga.');
  if (!Array.isArray(form.questions) || form.questions.length < 1 || form.questions.length > 80) throw new Error('El formulario admite de 1 a 80 preguntas.');
  const ids = new Set();
  for (const q of form.questions) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(q.id) || ids.has(q.id)) throw new Error('Identificador de pregunta inválido o repetido.');
    if (!TYPES.includes(q.type) || !q.label?.trim() || q.label.length > 300 || typeof q.required !== 'boolean') throw new Error('Revisa el tipo, título y obligatoriedad de las preguntas.');
    if (!Number.isInteger(q.step) || q.step < 1 || q.step > 10) throw new Error('Los pasos deben estar entre 1 y 10.');
    if (['select','radio','checkbox'].includes(q.type) && (!Array.isArray(q.options) || q.options.length < 1 || q.options.length > 50 || new Set(q.options).size !== q.options.length || q.options.some(v => typeof v !== 'string' || !v.trim() || v.length > 200))) throw new Error('Revisa las opciones de respuesta.');
    if (q.condition) {
      if (!ids.has(q.condition.field) || !['eq','neq'].includes(q.condition.operator) || typeof q.condition.value !== 'string') throw new Error('La condición debe usar una pregunta anterior.');
      const parent = form.questions.find(p => p.id === q.condition.field);
      if (parent.step > q.step) throw new Error('La condición no puede depender de un paso posterior.');
    }
    ids.add(q.id);
  }
  if (form.sections !== undefined) {
    if (!Array.isArray(form.sections) || form.sections.length>10) throw new Error("Revisa las secciones del formulario.");
    const steps=new Set();
    for (const s of form.sections) {
      if (!Number.isInteger(s.step)||s.step<1||s.step>10||steps.has(s.step)||typeof s.title!=="string"||!s.title.trim()||s.title.length>120||typeof s.description!=="string"||s.description.length>600) throw new Error("Título o descripción de sección inválidos.");
      steps.add(s.step);
    }
  }
  if (form.appearance !== undefined && (!form.appearance || !["studio","warm","midnight"].includes(form.appearance.theme) || !["cards","minimal"].includes(form.appearance.layout) || !["orbital","ribbon","none"].includes(form.appearance.cover))) throw new Error("Estilo de formulario inválido.");
  return form;
}
export function validateAnswers(questions, answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Respuestas inválidas.');
  const result = {};
  for (const q of visibleQuestions(questions, answers)) {
    const v = answers[q.id];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (q.required && empty) throw new Error(`Completa: ${q.label}`);
    if (empty) continue;
    if (q.type === 'checkbox') {
      if (!Array.isArray(v) || new Set(v).size !== v.length || v.some(x => !q.options.includes(x))) throw new Error(`Opciones inválidas: ${q.label}`);
    } else {
      if (typeof v !== 'string' || v.length > 4000) throw new Error(`Respuesta inválida: ${q.label}`);
      if (['select','radio'].includes(q.type) && !q.options.includes(v)) throw new Error(`Opción inválida: ${q.label}`);
      if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(`Correo inválido: ${q.label}`);
      if (q.type === 'number' && !Number.isFinite(Number(v))) throw new Error(`Número inválido: ${q.label}`);
      if (q.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)))) throw new Error(`Fecha inválida: ${q.label}`);
    }
    result[q.id] = v;
  }
  return result; // Las respuestas ocultas nunca se guardan.
}
export function attendanceGate(registration, conference, now = Date.now()) {
  if (registration.status !== 'approved') throw new Error('La inscripción aún no está aprobada.');
  if (registration.payment !== 'approved') throw new Error('Primero debe aprobarse el pago.');
  if (!conference.active) throw new Error('La conferencia no está habilitada.');
  const opens = Date.parse(conference.opensAt), closes = Date.parse(conference.closesAt);
  if (!Number.isFinite(opens) || !Number.isFinite(closes) || closes <= opens) throw new Error('Horario inválido.');
  if (now < opens) throw new Error('Todavía no se ha abierto el registro de asistencia.');
  if (now > closes) throw new Error('El plazo para sellar la asistencia terminó.');
  return true;
}
export function validateImage(data, mime) {
  if (!['image/jpeg','image/png','image/webp'].includes(mime) || typeof data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('Adjunta una imagen JPG, PNG o WebP.');
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  if (bytes.length < 12 || bytes.length > 3 * 1024 * 1024) throw new Error('La imagen debe pesar como máximo 3 MB.');
  const png = bytes.slice(0,8).join(',') === '137,80,78,71,13,10,26,10';
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  if (!(mime === 'image/png' && png || mime === 'image/jpeg' && jpg || mime === 'image/webp' && webp)) throw new Error('El contenido no corresponde al tipo de imagen.');
  return bytes.length;
}
