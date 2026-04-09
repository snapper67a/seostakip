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
    const { key, value, _delete } = JSON.parse(event.body);
    if(!key) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'key gerekli' }) };

    const db = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);

    if(_delete) {
      await db.from('seos_store').delete().eq('key', key);
    } else {
      await db.from('seos_store').upsert({ key, value }, { onConflict: 'key' });
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch(e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
