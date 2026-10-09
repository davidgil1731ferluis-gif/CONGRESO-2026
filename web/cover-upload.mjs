export async function prepareCover(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Seleccione una imagen JPG, PNG o WebP.');
 if(file.size>5*1024*1024)throw new Error('La imagen original debe pesar como máximo 5 MB.');
 const bitmap=await createImageBitmap(file);try{
  const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  for(const quality of [.88,.75,.6,.45]){const result=canvas.toDataURL('image/webp',quality);if(result.length<=240000)return result}
  throw new Error('La imagen contiene demasiados detalles. Seleccione una imagen más pequeña.');
 }finally{bitmap.close()}
}
