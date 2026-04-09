'use strict';
const { createClient } = require('@supabase/supabase-js');

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { tesis, data } = JSON.parse(event.body);
    if(!tesis || !data) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Eksik bilgi' }) };

    const db = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);
    const { error } = await db
      .from('seos_tesis_data')
      .upsert({ tesis, data, updated_at: new Date().toISOString() }, { onConflict: 'tesis' });

    if(error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch(e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
