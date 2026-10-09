const partners=[
 {id:'umng',name:'Universidad Militar Nueva Granada',width:1032,height:1250,box:'0 0 1032 1250'},
 {id:'faedis',name:'FAEDIS',width:416,height:195,box:'0 0 416 195'},
 {id:'modelos',name:'Modelos de Simulación ICDIST',width:1600,height:1083,box:'225 320 1150 440'},
 {id:'gran-colombia',name:'Universidad La Gran Colombia',width:570,height:792,box:'0 0 570 792'},
 {id:'unam',name:'Universidad Nacional Autónoma de México',width:900,height:853,box:'90 65 720 740'},
 {id:'javeriana',name:'Pontificia Universidad Javeriana Cali',width:1230,height:1246,box:'170 55 930 975'},
 {id:'lujan',name:'Universidad Nacional de Luján',width:452,height:383,box:'75 45 310 280'}
];
// The viewport frames the supplied originals; no institutional mark is redrawn.
const mark=p=>`<svg class="partner-mark mark-${p.id}" role="img" aria-label="${p.name}" viewBox="${p.box}" preserveAspectRatio="xMidYMid meet"><image href="./assets/${p.id}.jpg" width="${p.width}" height="${p.height}"/></svg>`;
export const partnerHeader=()=>`<div class="institution-header" aria-label="Organizadores del congreso">${partners.slice(0,3).map(p=>`<div class="institution-mark">${mark(p)}</div>`).join('')}<span class="institution-caption">Un encuentro para<br><strong>conectar conocimiento.</strong></span></div>`;
export const partnerFooter=()=>`<footer class="partners-footer"><div class="partners-title"><div><span class="eyebrow">Una comunidad que nos conecta</span><h2>El conocimiento se construye juntos.</h2></div><span class="partners-caption">Instituciones que apoyan este encuentro</span></div><div class="partners-grid">${partners.map(p=>`<figure class="partner-tile">${mark(p)}<figcaption>${p.name}</figcaption></figure>`).join('')}</div><div class="partners-bottom"><span>EVENTFLOW · Encuentros que dejan huella</span><span>Horarios · Bogotá UTC−5</span></div></footer>`;
