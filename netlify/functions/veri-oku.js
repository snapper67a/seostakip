'use strict';
const { createClient } = require('@supabase/supabase-js');

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  try {
    const db = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);

    // Tüm verileri çek
    const { data: store } = await db.from('seos_store').select('key,value');
    const { data: tesis } = await db.from('seos_tesis_data').select('tesis,data');

    const result = {};
    if(store) store.forEach(r => { result[r.key] = r.value; });

    const mergedData = {};
    if(tesis) tesis.forEach(r => Object.assign(mergedData, r.data));
    result['seos_data'] = mergedData;

    return { statusCode: 200, headers: cors, body: JSON.stringify(result) };
  } catch(e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
