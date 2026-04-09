'use strict';
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { username, oldPassword, newPassword } = JSON.parse(event.body);
    if(!username || !oldPassword || !newPassword) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Eksik bilgi' }) };
    if(newPassword.length < 4) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Şifre en az 4 karakter olmalı' }) };

    const db = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);
    const { data } = await db.from('seos_store').select('value').eq('key','seos_users').single();
    if(!data) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Kullanıcılar alınamadı' }) };

    const users = data.value;
    const idx = users.findIndex(u => u.username === username && u.password === sha256(oldPassword) && u.active);
    if(idx < 0) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Mevcut şifre hatalı' }) };

    users[idx].password = sha256(newPassword);
    users[idx]._hashed  = true;
    await db.from('seos_store').upsert({ key: 'seos_users', value: users }, { onConflict: 'key' });
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch(e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
