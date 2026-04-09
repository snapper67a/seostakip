'use strict';

// ══════════════════════════════════════════
// TÜM HESAPLAMA KODU BURADA — KAYNAK KODDA GÖRÜNMEZ
// ══════════════════════════════════════════

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const TESISLER = {
  'Bartın':['Fırın 1','Fırın 2'],
  'Torbalı':['Maerz','ALA'],
  'Soma':['Fırın 1','Fırın 2','Fırın 3','Fırın 4','Fırın 5','Fırın 6'],
  'Pınarhisar':['Fırın 1','Fırın 2'],
  'Bergama':['Pergamon']
};

const PARAMS = [
  {key:'o2n', sKey:'o2nS', lbl:'O2n',   unit:'%Vol'},
  {key:'con', sKey:'conS', lbl:'COn',   unit:'mg/Nm³'},
  {key:'debin',sKey:'debinS',lbl:'DEBIn',unit:'Nm³/h'},
  {key:'tozn',sKey:'toznS',lbl:'TOZn',  unit:'mg/Nm³'},
  {key:'tocn',sKey:'tocnS',lbl:'TOCn',  unit:'mgC/Nm³'},
  {key:'noxn',sKey:'noxnS',lbl:'NOXn',  unit:'mg/Nm³'},
];

// Tesis bazlı aktif parametreler
// Pınarhisar: tüm parametreler (NOXn + TOCn dahil, atık yakıcı)
// Bergama: sadece TOZn
// Diğerleri: TOCn ve NOXn hariç
const ATIK_YAKICI = ['Pınarhisar'];
const SADECE_TOZ  = ['Bergama'];
function getActiveParams(tesis){
  if(!tesis) return PARAMS;
  if(SADECE_TOZ.includes(tesis))   return PARAMS.filter(p=>p.key==='tozn');
  if(ATIK_YAKICI.includes(tesis))  return PARAMS;
  return PARAMS.filter(p=>p.key!=='tocn'&&p.key!=='noxn');
}

// ══════════════════════════════════════════
// TEBLİĞ SABİTLERİ: ESD, GÜVEN ARALIĞI, GKV
// ══════════════════════════════════════════
// SKHKKY Ek-4 Güven Aralığı Oranları
const GUVEN_ARALIGI = {
  tozn: 0.30,  // TOZ: %30
  tocn: 0.30,  // TOC: %30
  noxn: 0.20,  // NOx: %20
  con:  0.10,  // CO: %10
  o2n:  0,     // O2: referans parametre
  debin: 0     // DEBI: referans parametre
};

// Tesis bazlı varsayılan ESD değerleri (mg/Nm³)
function getDefaultESD(tesis){
  const base = {o2n:null, con:null, debin:null, tozn:100, tocn:null, noxn:null};
  if(tesis==='Pınarhisar'){ base.tocn=50; }
  return base;
}

// GKV (Geçerli Kılınmış Veri) hesaplama
// GKV_YSO = Ham YSO - (ESD × Güven Aralığı Oranı)
// Negatif ise 0 olur
function calcGKV(hamDeger, paramKey, esd){
  if(hamDeger===null||hamDeger===undefined) return null;
  const ga = GUVEN_ARALIGI[paramKey]||0;
  if(!esd||esd<=0||ga===0) return hamDeger;
  return Math.max(0, hamDeger - (esd * ga));
}

// ══════════════════════════════════════════
// TAM STATÜ TABLOSU (Excel Statüler sayfasından)
// ══════════════════════════════════════════

const FULL_STATUS_TABLE = [
  {kod:'-',    status:'Veri Yok',                         uzun:'Veri Yok',                          gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'b'},
  {kod:'1',    status:'Geçerli Veri',                     uzun:'Geçerli Veri',                       gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'2',    status:'Kayıt Kapalı',                     uzun:'Kayıt Kapalı',                       gecerli:'NA',    ortalama:'NA',    veriYuzdesi:'NA',    kat:'k'},
  {kod:'3',    status:'Yetersiz Veri',                    uzun:'Yetersiz Veri',                      gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'4',    status:'Geçersiz',                         uzun:'Geçersiz',                           gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'5',    status:'KGS3 Sıfır',                       uzun:'KGS3 Sıfır',                         gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'6',    status:'KGS3 Span',                        uzun:'KGS3 Span',                          gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'7',    status:'KGS3 Limit Dışı',                  uzun:'KGS3 Limit Dışı',                    gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'8',    status:'İletişim Hatası',                  uzun:'İletişim Hatası',                    gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'9',    status:'Kalibrasyon Durumu',               uzun:'Kalibrasyon Durumu',                 gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'10',   status:'Kalibrasyon Hatası',               uzun:'Kalibrasyon Hatası',                 gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'11',   status:'Cihaz Bakımı',                     uzun:'Cihaz Bakımı',                       gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'12',   status:'Sistem Bakımı',                    uzun:'Sistem Bakımı',                      gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'13',   status:'Proses Kapalı',                    uzun:'Proses Kapalı',                      gecerli:'Evet',  ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'k'},
  {kod:'17',   status:'KGS2',                             uzun:'KGS2',                               gecerli:'Evet',  ortalama:'Hayır', veriYuzdesi:'Evet',  kat:'v'},
  {kod:'18',   status:'Alarm',                            uzun:'Alarm',                              gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'19',   status:'Ölçüm Hazır Değil',                uzun:'Ölçüm Hazır Değil',                  gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'22',   status:'Isıtmalı Hat Sıcaklık Alarm',      uzun:'Isıtmalı Hat Sıcaklık Alarm',        gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'28',   status:'E.F. Sistem Arızası',              uzun:'Elektro Filtre Sistem Arızası',      gecerli:'Evet',  ortalama:'Hayır', veriYuzdesi:'Evet',  kat:'v'},
  {kod:'29',   status:'Inversiyon',                       uzun:'Inversiyon',                         gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'30',   status:'Isıtmalı Prop Sıcaklık Alarmı',   uzun:'Isıtmalı Prob Sıcaklık Alarmı',      gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'31',   status:'G.S. Sıcaklık Alarmı',            uzun:'Gaz Soğutucusu Sıcaklık Alarmı',     gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'32',   status:'YGT',                              uzun:'YGT',                                gecerli:'Evet',  ortalama:'Hayır', veriYuzdesi:'Evet',  kat:'v'},
  {kod:'33',   status:'NOX Konvertör Alarmı',             uzun:'NOX Konvertör Alarmı',               gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'108',  status:'Tekrar Veri',                      uzun:'Tekrar Veri',                        gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'109',  status:'Değerlendirme Dışı',               uzun:'Değerlendirme Dışı',                 gecerli:'Evet',  ortalama:'Hayır', veriYuzdesi:'Evet',  kat:'v'},
  {kod:'110',  status:'Geçersiz Isıtmalı Hat/Prop Değeri',uzun:'Geçersiz Isıtmalı Hat/Prop',         gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'111',  status:'Gaz Soğutucu Alarmı',              uzun:'Gaz Soğutucu Alarmı',                gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'112',  status:'Planlı Duruş',                     uzun:'Planlı Duruş',                       gecerli:'Evet',  ortalama:'Hayır', veriYuzdesi:'Evet',  kat:'v'},
  {kod:'113',  status:'NOX Konvertör Alarmı (113)',        uzun:'NOX Konvertör Alarmı',               gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'114',  status:'Geçersiz Ölçüm Aralığı',           uzun:'Geçersiz Ölçüm Aralığı',             gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'115',  status:'KGS2 Yok',                         uzun:'KGS2 Yok',                           gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'116',  status:'KGS2 Süresi Doldu',                uzun:'KGS2 Süresi Doldu',                  gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'117',  status:'YGT Süresi Doldu',                 uzun:'YGT Süresi Doldu',                   gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'118',  status:'YGT Geçersiz',                     uzun:'YGT Geçersiz',                       gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'119',  status:'Duruş Başlama',                    uzun:'Duruş Başlangıç',                    gecerli:'Evet',  ortalama:'Hayır', veriYuzdesi:'Evet',  kat:'v'},
  {kod:'120',  status:'Duruş Bitiş',                      uzun:'Duruş Bitiş',                        gecerli:'Evet',  ortalama:'Hayır', veriYuzdesi:'Evet',  kat:'v'},
  {kod:'121',  status:'Negatif Veri',                     uzun:'Negatif Veri',                       gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'122',  status:'Atık Var',                         uzun:'Atık Var',                           gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'123',  status:'Atık Yok',                         uzun:'Atık Yok',                           gecerli:'Evet',  ortalama:'Evet',  veriYuzdesi:'Evet',  kat:'v'},
  {kod:'124',  status:'PK',                               uzun:'PK',                                 gecerli:'Evet',  ortalama:'Hayır', veriYuzdesi:'Evet',  kat:'v'},
  {kod:'125',  status:'Geçersiz Isıtmalı Prob Değeri',    uzun:'Geçersiz Isıtmalı Prob Değeri',      gecerli:'Hayır', ortalama:'Hayır', veriYuzdesi:'Hayır', kat:'e'},
  {kod:'666',  status:'Geçersiz Veri',                    uzun:'Geçersiz Veri',                      gecerli:'Hayır', ortalama:'NA',    veriYuzdesi:'NA',    kat:'e'},
  {kod:'-',    status:'Geçersiz Veri (-)',                uzun:'Geçersiz Veri',                      gecerli:'Hayır', ortalama:'NA',    veriYuzdesi:'NA',    kat:'b'},
];



const DEFAULT_USERS = [
  {id:1,username:'yonetici',password:'seos2024',role:'yonetici',name:'Yönetici',active:true,lastLogin:'',tesisler:[]},
  {id:2,username:'admin',password:'admin123',role:'admin',name:'Admin Kullanıcı',active:true,lastLogin:'',tesisler:[]},
  {id:3,username:'izleyici',password:'izle123',role:'izleyici',name:'İzleyici',active:true,lastLogin:'',tesisler:[]},
  {id:4,username:'operator',password:'op1234',role:'operator',name:'Operatör Demo',active:true,lastLogin:'',tesisler:['Bartın']}
];

const DEFAULT_MAIL = {
  to: [],
  cc: [],
  subject: 'SEÖS Günlük Emisyon Raporu — {tesis} {tarih}'
};

const DEFAULT_SETTINGS = {
  appVersion: 'v1.0',
  limitTOZ: 100,
  asimPct: 5,
  ysmax: {COn:null,TOZn:100,O2n:null,DEBIn:null,TOCn:null,NOXn:null},
  statusCodes: {
    /* Boş / Veri Yok */
    '':'b','Veri Yok':'b','-':'b','BOŞ':'b',
    /* Kapalı */
    'Kayıt Kapalı':'k','Proses Kapalı':'k','NA':'k',
    /* ✅ Geçerli */
    'Geçerli Veri':'v',
    'KGS3 Limit Dışı':'v',
    'KGS2':'v',
    'E.F. Sistem Arızası':'v','Elektro Filtre Sistem Arızası':'v',
    'Inversiyon':'v',
    'YGT':'v',
    'NOX Konvertör Alarmı':'v',
    'Değerlendirme Dışı':'v',
    'Planlı Duruş':'v',
    'KGS2 Yok':'v',
    'KGS2 Süresi Doldu':'v',
    'YGT Süresi Doldu':'v',
    'YGT Geçersiz':'v',
    'Duruş Başlama':'v','Duruş Başlangıç':'v',
    'Duruş Bitiş':'v',
    'Negatif Veri':'v',
    'Atık Var':'v',
    'Atık Yok':'v',
    'PK':'v',
    /* ❌ Geçersiz */
    'Yetersiz Veri':'e',
    'Geçersiz':'e',
    'KGS3 Sıfır':'e',
    'KGS3 Span':'e',
    'İletişim Hatası':'e',
    'Kalibrasyon Durumu':'e',
    'Kalibrasyon Hatası':'e',
    'Cihaz Bakımı':'e',
    'Sistem Bakımı':'e',
    'Alarm':'e',
    'Ölçüm Hazır Değil':'e',
    'Isıtmalı Hat Sıcaklık Alarm':'e',
    'Isıtmalı Prop Sıcaklık Alarmı':'e','Isıtmalı Prob Sıcaklık Alarmı':'e',
    'G.S. Sıcaklık Alarmı':'e','Gaz Soğutucusu Sıcaklık Alarmı':'e',
    'Gaz Soğutucu Alarmı':'e',
    'Tekrar Veri':'e',
    'Geçersiz Isıtmalı Hat/Prop Değeri':'e','Geçersiz Isıtmalı Hat/Prop':'e',
    'Geçersiz Ölçüm Aralığı':'e',
    'Geçersiz Isıtmalı Prob Değeri':'e',
    'Geçersiz Veri':'e',
  }
};

// ══════════════════════════════════════════
// STORAGE — File System Access API + bellek önbelleği
// ══════════════════════════════════════════

// Hangi SK anahtarı hangi dosyaya karşılık gelir
const FS_FILES = {
  [SK.DATA]:     'seos_data.json',
  [SK.USERS]:    'seos_users.json',
  [SK.SETTINGS]: 'seos_settings.json',
  [SK.LIMITS]:   'seos_limits.json',
  [SK.LOGS]:     'seos_logs.json',
  [SK.KGS]:      'seos_kgs.json',
  [SK.BAKIM]:    'seos_bakim.json',
  [SK.PERMS]:    'seos_perms.json',
  [SK.MAIL]:     'seos_mail.json',
};

let _dirHandle = null;   // FileSystemDirectoryHandle
const _mem     = {};     // Bellek önbelleği — senkron okuma için

// ── IndexedDB: klasör handle'ını sakla / oku ──────────
function _idbOpen(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open('seos_fs_v1',1);
    r.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    r.onsuccess = e => res(e.target.result);
    r.onerror   = ()=> rej(r.error);
  });
}
async function _idbGet(key){
  try{
    const db = await _idbOpen();
    return new Promise((res)=>{
      const tx = db.transaction('kv','readonly');
      const req = tx.objectStore('kv').get(key);
      req.onsuccess = ()=> res(req.result ?? null);
      req.onerror   = ()=> res(null);
    });
  } catch{ return null; }
}
async function _idbSet(key,val){
  try{
    const db = await _idbOpen();
    return new Promise((res)=>{
      const tx = db.transaction('kv','readwrite');
      tx.objectStore('kv').put(val,key);
      tx.oncomplete = ()=> res();
      tx.onerror    = ()=> res();
    });
  } catch{}
}
async function _idbDel(key){
  try{
    const db = await _idbOpen();
    return new Promise((res)=>{
      const tx = db.transaction('kv','readwrite');
      tx.objectStore('kv').delete(key);
      tx.oncomplete = ()=> res();
      tx.onerror    = ()=> res();
    });
  } catch{}
}

// ── Klasör erişim izni kontrol et ────────────────────
async function _verifyPermission(handle){
  try{
    const perm = await handle.queryPermission({mode:'readwrite'});
    if(perm==='granted') return true;
    const req = await handle.requestPermission({mode:'readwrite'});
    return req==='granted';
  } catch{ return false; }
}

// ── Tek dosya oku ────────────────────────────────────
async function _readFile(fname){
  if(!_dirHandle) return null;
  try{
    const fh   = await _dirHandle.getFileHandle(fname);
    const file = await fh.getFile();
    return JSON.parse(await file.text());
  } catch{ return null; }
}

// ── Tek dosya yaz (arka planda) ──────────────────────
async function _writeFile(fname, data){
  if(!_dirHandle) return;
  try{
    const fh       = await _dirHandle.getFileHandle(fname,{create:true});
    const writable = await fh.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch(e){
    console.warn('Dosya yazma hatası:', fname, e.message);
  }
}

// ── Tüm dosyaları klasörden yükle ────────────────────
async function _loadAllFromDir(){
  for(const [sk, fname] of Object.entries(FS_FILES)){
    const val = await _readFile(fname);
    if(val !== null) _mem[sk] = val;
  }

function getSettings(){
  return sto.get(SK.SETTINGS)||DEFAULT_SETTINGS;
}
function saveSettings(s){
  sto.set(SK.SETTINGS,s);
  addLog('AYAR','—','—','Ayarlar güncellendi');
}
function getStoredLogo(){
  const s=sto.get(SK.SETTINGS)||{};
  return s.logoBase64||'';
}
function getLogoHeight(){
  const s=sto.get(SK.SETTINGS)||{};
  return s.logoHeight||80;
}
function applyLoginLogo(){
  const img=document.getElementById('loginLogo');
  if(!img) return;
  const logo=getStoredLogo();
  const h=getLogoHeight();
  img.style.height=h+'px';
  if(logo){ img.src=logo; img.style.display=''; }
  else { img.src=''; img.style.display='none'; }
}
function uploadLogoFile(){
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/png,image/jpeg,image/svg+xml,image/webp';
  inp.onchange=function(e){
    const file=e.target.files[0];
    if(!file) return;
    if(file.size>512*1024){ alert('Logo dosyasi en fazla 512 KB olabilir.'); return; }
    const reader=new FileReader();
    reader.onload=function(ev){
      const s=getSettings();
      s.logoBase64=ev.target.result;
      saveSettings(s);
      applyLoginLogo();
      renderAyarlar();
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}
function removeLogoSetting(){
  const s=getSettings();
  delete s.logoBase64;
  saveSettings(s);
  applyLoginLogo();
  renderAyarlar();
}
function saveLogoHeight(){
  const v=parseInt(document.getElementById('logoHeightRange').value)||80;
  const s=getSettings();
  s.logoHeight=v;
  saveSettings(s);
  applyLoginLogo();
}
// ══════════════════════════════════════════
// PER-TESİS/FIRIN LİMİT SİSTEMİ
// ══════════════════════════════════════════
function getDefaultLimits(tesis){
  const esd = getDefaultESD(tesis);
  const ysmax = {};
  // YSMAX = 2 × ESD varsayılan
  Object.keys(esd).forEach(k=>{ ysmax[k] = esd[k] ? esd[k]*2 : null; });
  return {
    limitTOZ: esd.tozn || 100,
    asimPct: 5,
    esd: esd,
    ysmax: ysmax
  };
}

function getAllLimits(){
  return sto.get(SK.LIMITS) || {};
}

function getLimits(tesis, firin){
  const def = getDefaultLimits(tesis);
  if(!tesis || !firin) return def;
  const all = getAllLimits();
  const stored = all[`${tesis}||${firin}`];
  if(!stored) return def;
  // Geriye uyumluluk: eski kayıtlarda esd yoksa varsayılan ile birleştir
  return {
    ...def,
    ...stored,
    esd: { ...def.esd, ...(stored.esd || {}) },
    ysmax: { ...def.ysmax, ...(stored.ysmax || {}) }
  };
}

function saveLimitsForUnit(tesis, firin, data){
  const all = getAllLimits();

function sc(s){
  if(s===null||s===undefined) return 'b';
  const str = String(s).trim();
  if(!str||str==='-') return 'b';
  const cfg = getSettings().statusCodes;
  // Exact match first
  if(cfg[str]!==undefined) return cfg[str];
  // Case-insensitive match
  const lo = str.toLowerCase();
  for(const [k,v] of Object.entries(cfg)){
    if(k.toLowerCase()===lo) return v;
  }
  // Numeric code lookup from FULL_STATUS_TABLE
  const byCode = FULL_STATUS_TABLE.find(r=>r.kod===str);
  if(byCode) return byCode.kat;
  // Fallback
  if(lo.includes('geçerli')&&!lo.includes('geçersiz')) return 'v';
  if(lo.includes('kapalı')||lo.includes('kapali')) return 'k';
  if(lo.includes('veri yok')||lo===''||lo==='-') return 'b';
  return 'e';
}

function scResolvedLabel(s){
  const str=String(s||'').trim();
  if(!str||str==='-') return 'Veri Yok';
  const byCode=FULL_STATUS_TABLE.find(r=>r.kod===str);
  if(byCode) return byCode.status;
  return str;
}

// YSMAX: parametre bazlı yarım saatlik max aşım kontrolü (GKV üzerinden)
// Tebliğ: GKV > 2×ESD ise aşım
function countYsmaxAsim(rows, tesis, firin){
  const limCfg = getLimits(tesis, firin);
  const ys = limCfg.ysmax || {};
  const esd = limCfg.esd || {};
  const APARAMS = getActiveParams(tesis);
  const result = {};
  APARAMS.forEach(p=>{
    const limit = ys[p.key];
    if(!limit && limit!==0){ result[p.key]={limit:null, esd:esd[p.key]||null, asim:0, max:null, maxGKV:null}; return; }
    const paramEsd = esd[p.key]||0;
    const vals = rows.filter(r=>sc(r[p.sKey])==='v'&&r[p.key]!==null&&r[p.key]>=0);
    const gkvVals = vals.map(r=>({ham:r[p.key], gkv:calcGKV(r[p.key], p.key, paramEsd)}));
    const maxHam = gkvVals.length?Math.max(...gkvVals.map(v=>v.ham)):null;
    const maxGKV = gkvVals.length?Math.max(...gkvVals.map(v=>v.gkv)):null;
    const asim = gkvVals.filter(v=>v.gkv>limit).length;
    result[p.key] = {limit, esd:paramEsd, asim, max:maxHam, maxGKV};
  });
  return result;
}

// Detaylı statü kodu dağılımı (48 veri → kod bazlı sayılar)
function buildStatusDist(rows){
  const kodSayac={};
  rows.forEach(r=>{
    const lbl=scResolvedLabel(r.conS);
    const kat=sc(r.conS);
    if(!kodSayac[lbl]) kodSayac[lbl]={cnt:0,kat};
    kodSayac[lbl].cnt++;
  });
  return Object.entries(kodSayac).sort((a,b)=>b[1].cnt-a[1].cnt);
}

function scLabel(s){
  const c=sc(s);
  const lbl=scResolvedLabel(s);
  if(c==='v') return `<span class="badge bg">Geçerli</span>`;
  if(c==='k') return `<span class="badge bgr">${lbl}</span>`;
  if(c==='b') return `<span class="badge bgr" style="opacity:.6">Veri Yok</span>`;
  return `<span class="badge br">${lbl}</span>`;
}

// ══════════════════════════════════════════
// GÜN GEÇERLİLİK KONTROLÜ (Tebliğ Uyum)
// ══════════════════════════════════════════
// Tebliğ Md.37/14 + Md.44.1 (2/3 kuralı)
// Proses Kapalı (k) değerlendirmeye ALINmaz.
// Sadece Geçerli (v) ve Geçersiz (e) arasında oran hesaplanır.
// geçerli / (geçerli + geçersiz) >= 2/3 olmalı
// Ayrıca: >6 saat (>12 yarım saat) geçersiz → gün geçersiz (Tebliğ SEÖS Md.37/14)
// Dönüş: {gecerli:bool, gec:N, gece:N, kap:N, bos:N, toplam:N, oran:N, neden:string|null}
function isGunGecerli(rows, paramSKey){
  // paramSKey: kontrol edilecek parametrenin statü anahtarı (default: conS)
  const sKey = paramSKey || 'conS';
  const gec  = rows.filter(r=>sc(r[sKey])==='v').length;
  const gece = rows.filter(r=>sc(r[sKey])==='e').length;
  const kap  = rows.filter(r=>sc(r[sKey])==='k').length;
  const bos  = rows.filter(r=>sc(r[sKey])==='b').length;
  const toplam = rows.length;
  const degerlendirilen = gec + gece; // kapalı hariç
  const oran = degerlendirilen > 0 ? (gec / degerlendirilen) : 1;
  let gecerli = true;
  let neden = null;

  // Tüm periyotlar kapalı → gün "kapalı" değil geçersiz değil
  if(kap >= toplam){ return {gecerli:true, prosesKapali:true, gec, gece, kap, bos, toplam, oran:1, neden:null}; }

  // >6 saat (>12 yarım saat) geçersiz → gün geçersiz (Tebliğ Md.37/14)
  if(gece > 12){
    gecerli = false;
    neden = '>6 saat geçersiz ('+gece+'/'+toplam+' geçersiz periyot, limit: 12)';
  }
  // 2/3 kuralı (Md.44.1): geçerli/(geçerli+geçersiz) < 2/3
  else if(degerlendirilen > 0 && oran < (2/3)){
    gecerli = false;
    neden = '2/3 kuralı ihlali ('+gec+'/'+degerlendirilen+' = %'+Math.round(oran*100)+')';
  }
  return {gecerli, prosesKapali:false, gec, gece, kap, bos, toplam, oran, neden};
}

// Hızlı gün geçerlilik kontrolü (boolean)
function isGunGecerliBool(rows, paramSKey){
  return isGunGecerli(rows, paramSKey).gecerli;
}

// Tüm parametreler için gün geçerlilik kontrolü (her parametre ayrı ayrı)
function isGunGecerliAllParams(rows, tesis){
  const APARAMS = getActiveParams(tesis);
  const results = {};
  APARAMS.forEach(p=>{
    results[p.key] = isGunGecerli(rows, p.sKey);
  });
  // Genel durum: tüm parametreler kapalıysa prosesKapali
  const allKapali = APARAMS.every(p=>results[p.key].prosesKapali);
  const anyInvalid = APARAMS.some(p=>!results[p.key].gecerli && !results[p.key].prosesKapali);
  results._genel = {
    gecerli: !anyInvalid && !allKapali,
    prosesKapali: allKapali,
    anyInvalid: anyInvalid
  };
  return results;
}

// Yıllık parametre bazlı geçersiz gün sayısı (10 gün limiti kontrolü)
function calcYillikGecersizGunPerParam(allData, allKeys, tesis, firin, yil){
  const APARAMS = getActiveParams(tesis);
  const prefix = tesis+'||'+firin+'||'+yil+'-';
  const gunKeys = allKeys.filter(k=>k.startsWith(prefix));
  const result = {};
  APARAMS.forEach(p=>{
    let gecersizGunler = [];
    let gecerliGunler = [];
    let kapaliGunler = [];
    gunKeys.forEach(k=>{
      const rows = allData[k];
      if(!rows || rows.length!==48) return;
      const dateStr = k.split('||')[2];
      const gg = isGunGecerli(rows, p.sKey);
      if(gg.prosesKapali) kapaliGunler.push(dateStr);
      else if(!gg.gecerli) gecersizGunler.push(dateStr);
      else gecerliGunler.push(dateStr);
    });
    result[p.key] = {
      gecersizGunler,
      gecerliGunler,
      kapaliGunler,
      gecersizSayisi: gecersizGunler.length,
      limitAsildi: gecersizGunler.length > 10 // Tebliğ: max 10 gün/yıl
    };
  });
  return result;
}

// GOD Kontrolü (Günlük Ortalama Değer)
// TOZ: yıl içindeki günlük ortalamaların %97'si ≤ 1.2×ESD
// TOC, NOx, CO: günlük ortalamaların %100'ü ≤ 1.2×ESD
function calcGOD(gunler, tesis, firin){
  const limCfg = getLimits(tesis, firin);
  const APARAMS = getActiveParams(tesis);
  const result = {};
  APARAMS.forEach(p=>{
    const esd = limCfg.esd[p.key];
    if(!esd || esd<=0){ result[p.key] = {uygun:true, limit:null, asimGun:[], toplamGun:0}; return; }
    const godLimit = 1.2 * esd;
    const gunlukOrtalar = [];
    const asimGunler = [];
    gunler.forEach(g=>{
      const gg = isGunGecerli(g.rows, p.sKey);
      if(!gg.gecerli || gg.prosesKapali) return;
      const vals = g.rows.filter(r=>sc(r[p.sKey])==='v'&&r[p.key]!==null&&r[p.key]>=0).map(r=>calcGKV(r[p.key], p.key, esd));
      if(vals.length===0) return;
      const ort = vals.reduce((a,b)=>a+b,0)/vals.length;
      gunlukOrtalar.push({dateStr:g.dateStr, ort});
      if(ort > godLimit) asimGunler.push({dateStr:g.dateStr, ort});
    });
    const topGun = gunlukOrtalar.length;
    // TOZ: %97 kuralı, diğerleri: %100
    let uygun;
    if(p.key==='tozn'){
      const izinVerilenAsim = Math.floor(topGun * 0.03);
      uygun = asimGunler.length <= izinVerilenAsim;
    } else {
      uygun = asimGunler.length === 0;
    }
    result[p.key] = {uygun, limit:godLimit, asimGun:asimGunler, toplamGun:topGun, esd};
  });
  return result;
}

// AOD Kontrolü (Aylık Ortalama Değer)
// Aylık ortalamaların hiçbirisi ESD değerini aşamaz
function calcAOD(gunler, tesis, firin){
  const limCfg = getLimits(tesis, firin);
  const APARAMS = getActiveParams(tesis);
  const result = {};
  // Aylık gruplama
  const byAy = {};
  gunler.forEach(g=>{
    const ay = g.dateStr.slice(0,7);
    if(!byAy[ay]) byAy[ay]=[];
    byAy[ay].push(g);
  });
  APARAMS.forEach(p=>{
    const esd = limCfg.esd[p.key];
    if(!esd || esd<=0){ result[p.key] = {uygun:true, limit:null, asimAylar:[], aylar:[]}; return; }
    const aylar = [];
    const asimAylar = [];
    Object.entries(byAy).forEach(([ay, gs])=>{
      const allVals = [];
      gs.forEach(g=>{
        const gg = isGunGecerli(g.rows, p.sKey);
        if(!gg.gecerli || gg.prosesKapali) return;
        const vals = g.rows.filter(r=>sc(r[p.sKey])==='v'&&r[p.key]!==null&&r[p.key]>=0).map(r=>calcGKV(r[p.key], p.key, esd));
        allVals.push(...vals);
      });
      if(allVals.length===0) return;
      const ort = allVals.reduce((a,b)=>a+b,0)/allVals.length;
      aylar.push({ay, ort});
      if(ort > esd) asimAylar.push({ay, ort});
    });
    result[p.key] = {uygun:asimAylar.length===0, limit:esd, asimAylar, aylar};
  });
  return result;
}

// ══════════════════════════════════════════
// DATA STORAGE
// ══════════════════════════════════════════

function now(){ return new Date().toLocaleString('tr-TR',{hour12:false}).replace(',',''); }


function avg(arr){ return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null; }
function mx(arr){ return arr.length?Math.max(...arr):null; }

function runAnalysis(tesis, firin){
  const settings = getSettings();
  const limCfg = getLimits(tesis, firin);
  const limitTOZ = limCfg.limitTOZ;
  settings.asimPct = limCfg.asimPct;
  settings.ysmax = limCfg.ysmax;

  // Group by date
  const byDate = {};
  rawRows.forEach(r=>{
    const d = r.dateIso || r.tarih.slice(0,10);
    if(!byDate[d]) byDate[d]=[];
    byDate[d].push(r);
  });

  gunlukOzet = Object.entries(byDate).map(([dateStr, rows])=>{
    const incomplete = false; // Eksik kontrol kaldırıldı — kapalı dahil tüm statüler periyot sayılır
    const toplam = rows.length;

    const getSt = (r,p)=>sc(r[p.sKey]);
    const conSt = rows.map(r=>getSt(r,PARAMS[1]));
    const toznSt = rows.map(r=>getSt(r,PARAMS[3]));

    const gec  = conSt.filter(s=>s==='v').length;
    const gece = conSt.filter(s=>s==='e').length;
    const kap  = conSt.filter(s=>s==='k').length;
    const bos  = conSt.filter(s=>s==='b').length;

    const validOf = (p)=>rows.filter((_,i)=>sc(rows[i][p.sKey])==='v').map(r=>r[p.key]).filter(v=>v!==null&&v>=0);

    const ortCOn   = avg(validOf(PARAMS[1]));
    const ortTOZn  = avg(validOf(PARAMS[3]));
    const ortO2n   = avg(validOf(PARAMS[0]));
    const ortDebin = avg(validOf(PARAMS[2]));
    const maxCOn   = mx(validOf(PARAMS[1]));
    const maxTOZn  = mx(validOf(PARAMS[3]));
    const asimTOZ  = rows.filter((_,i)=>sc(rows[i].toznS)==='v'&&rows[i].tozn!==null&&rows[i].tozn>limitTOZ).length;

    const gunObj = new Date(dateStr+'T00:00:00');
    const gun = gunObj.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'});

    return {
      dateStr, gun, gunObj, tesis, firin,
      toplam, gec, gece, kap, bos, incomplete,
      _gg: isGunGecerli(rows),
      gecPct: toplam?Math.round(gec/toplam*100):0,
      ortCOn, ortTOZn, ortO2n, ortDebin,
      maxCOn, maxTOZn, asimTOZ, limitTOZ,
      rows, conSt, toznSt,
      PARAMS
    };
  }).sort((a,b)=>a.gunObj-b.gunObj);

  // Only complete AND valid days for aylık aggregation
  const forAylik = gunlukOzet.filter(g=>!g.incomplete && g._gg.gecerli);

  const byAy = {};
  forAylik.forEach(g=>{
    const k=`${g.gunObj.getFullYear()}-${String(g.gunObj.getMonth()+1).padStart(2,'0')}`;
    if(!byAy[k]) byAy[k]=[];
    byAy[k].push(g);
  });

  aylikOzet = Object.entries(byAy).map(([ay,gs])=>({
    ay,
    ayLabel: new Date(ay+'-01').toLocaleDateString('tr-TR',{month:'long',year:'numeric'}),
    gunSayisi: gs.length,
    toplamGec: gs.reduce((s,g)=>s+g.gec,0),
    toplamGece: gs.reduce((s,g)=>s+g.gece,0),
    toplamKap: gs.reduce((s,g)=>s+g.kap,0),
    toplamAsimTOZ: gs.reduce((s,g)=>s+g.asimTOZ,0),
    ortCOn: avg(gs.map(g=>g.ortCOn).filter(v=>v!==null)),
    ortTOZn: avg(gs.map(g=>g.ortTOZn).filter(v=>v!==null)),
    ortO2n: avg(gs.map(g=>g.ortO2n).filter(v=>v!==null)),
    maxCOn: mx(gs.map(g=>g.maxCOn).filter(v=>v!==null)),
    maxTOZn: mx(gs.map(g=>g.maxTOZn).filter(v=>v!==null)),
    gs
  }));

  document.getElementById('hInfo').textContent = `${tesis} / ${firin} — ${rawRows.length} periyod`;
  renderOzet(tesis,firin,null);
  renderGunluk();
  renderAylik();
  renderYillik();
  renderHam();
  renderRapor();
  document.getElementById('btnPDF').disabled = false;
}

// ══════════════════════════════════════════
// RENDER: ÖZET
// ══════════════════════════════════════════
function renderOzet(filtTesis, filtFirin, filtAyKey){

// ══════════════════════════════════════════
// NETLIFY HANDLER
// ══════════════════════════════════════════
exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { action, payload } = JSON.parse(event.body);

    if(action === 'analiz') {
      const { tesis, firin, rawRows, settings, limits } = payload;
      const result = hesaplaAnaliz(tesis, firin, rawRows, settings, limits);
      return { statusCode: 200, headers: cors, body: JSON.stringify(result) };
    }

    if(action === 'gunGecerli') {
      const { rows, paramSKey } = payload;
      return { statusCode: 200, headers: cors, body: JSON.stringify(isGunGecerli(rows, paramSKey)) };
    }

    if(action === 'calcGKV') {
      const { hamDeger, paramKey, esd } = payload;
      return { statusCode: 200, headers: cors, body: JSON.stringify({ gkv: calcGKV(hamDeger, paramKey, esd) }) };
    }

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Geçersiz action' }) };

  } catch(e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};

// Ana analiz fonksiyonu (runAnalysis'in sunucu versiyonu)
function hesaplaAnaliz(tesis, firin, rawRows, settingsOverride, limitsOverride) {
  const limCfg = limitsOverride || {};
  const limitTOZ = limCfg.limitTOZ || 100;
  const settings = settingsOverride || {};

  const byDate = {};
  rawRows.forEach(r => {
    const d = r.dateIso || r.tarih.slice(0,10);
    if(!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  });

  const gunlukOzet = Object.entries(byDate).map(([dateStr, rows]) => {
    const toplam = rows.length;
    const getSt = (r,p) => sc(r[p.sKey]);
    const conSt  = rows.map(r => getSt(r, PARAMS[1]));
    const toznSt = rows.map(r => getSt(r, PARAMS[3]));
    const gec  = conSt.filter(s=>s==='v').length;
    const gece = conSt.filter(s=>s==='e').length;
    const kap  = conSt.filter(s=>s==='k').length;
    const bos  = conSt.filter(s=>s==='b').length;

    const validOf = (p) => rows
      .filter(r => sc(r[p.sKey])==='v' && r[p.key]!==null && r[p.key]>=0)
      .map(r => r[p.key]);

    const ortCOn   = avg(validOf(PARAMS[1]));
    const ortTOZn  = avg(validOf(PARAMS[3]));
    const ortO2n   = avg(validOf(PARAMS[0]));
    const ortDebin = avg(validOf(PARAMS[2]));
    const maxCOn   = mx(validOf(PARAMS[1]));
    const maxTOZn  = mx(validOf(PARAMS[3]));
    const asimTOZ  = rows.filter(r => sc(r.toznS)==='v' && r.tozn!==null && r.tozn>limitTOZ).length;
    const _gg = isGunGecerli(rows);
    const gecPct = toplam ? Math.round(gec/toplam*100) : 0;

    return {
      dateStr, tesis, firin, toplam, gec, gece, kap, bos,
      _gg, gecPct, ortCOn, ortTOZn, ortO2n, ortDebin,
      maxCOn, maxTOZn, asimTOZ, limitTOZ, conSt, toznSt
    };
  }).sort((a,b) => a.dateStr.localeCompare(b.dateStr));

  const forAylik = gunlukOzet.filter(g => g._gg.gecerli);
  const byAy = {};
  forAylik.forEach(g => {
    const k = g.dateStr.slice(0,7);
    if(!byAy[k]) byAy[k] = [];
    byAy[k].push(g);
  });

  const aylikOzet = Object.entries(byAy).map(([ay,gs]) => ({
    ay,
    gunSayisi: gs.length,
    toplamGec: gs.reduce((s,g)=>s+g.gec,0),
    toplamGece: gs.reduce((s,g)=>s+g.gece,0),
    toplamKap: gs.reduce((s,g)=>s+g.kap,0),
    toplamAsimTOZ: gs.reduce((s,g)=>s+g.asimTOZ,0),
    ortCOn: avg(gs.map(g=>g.ortCOn).filter(v=>v!==null)),
    ortTOZn: avg(gs.map(g=>g.ortTOZn).filter(v=>v!==null)),
    ortO2n: avg(gs.map(g=>g.ortO2n).filter(v=>v!==null)),
    maxCOn: mx(gs.map(g=>g.maxCOn).filter(v=>v!==null)),
    maxTOZn: mx(gs.map(g=>g.maxTOZn).filter(v=>v!==null)),
  }));

  return { gunlukOzet, aylikOzet };
}
