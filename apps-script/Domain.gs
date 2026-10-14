// Solo comprobación del archivo y formato del consolidado. El negocio se valida en Firestore.
function decodeBase64_(s){return Utilities.base64Decode(s).map(function(b){return String.fromCharCode(b&255);}).join('');}
function validateImage_(data, mime) {
  if (!['image/jpeg','image/png','image/webp'].includes(mime) || typeof data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('Adjunta una imagen JPG, PNG o WebP.');
  const bytes = Uint8Array.from(decodeBase64_(data), c => c.charCodeAt(0));
  if (bytes.length < 12 || bytes.length > 3 * 1024 * 1024) throw new Error('La imagen debe pesar como máximo 3 MB.');
  const png = bytes.slice(0,8).join(',') === '137,80,78,71,13,10,26,10';
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  if (!(mime === 'image/png' && png || mime === 'image/jpeg' && jpg || mime === 'image/webp' && webp)) throw new Error('El contenido no corresponde al tipo de imagen.');
  return bytes.length;
}

function evaluationReport_(poster,evaluations){
 const rows=poster.judgeIds.map(uid=>evaluations.find(e=>e.judgeUid===uid)).filter(Boolean);
 return {posterId:poster.id,eventId:poster.eventId,title:poster.title,author:poster.authorName,category:poster.rubric.name,rubric:poster.rubric,evaluations:rows,expected:poster.judgeIds.length,completed:rows.length,final:rows.length===poster.judgeIds.length&&rows.length>0,average:rows.length?Math.round(rows.reduce((s,e)=>s+e.total,0)/rows.length*100)/100:null};
}
