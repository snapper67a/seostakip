'use strict';
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { username, password } = JSON.parse(event.body);
    if(!username || !password) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Eksik bilgi' }) };

    const db = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);
    const { data, error } = await db.from('seos_store').select('value').eq('key','seos_users').single();
    if(error || !data) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Kullanıcılar alınamadı' }) };

    const users = data.value;
    const hash  = sha256(password);
    const user  = users.find(u => u.username === username && u.password === hash && u.active);
    if(!user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Kullanıcı adı veya şifre hatalı' }) };

    // Şifreyi çıkar, sadece gerekli alanları döndür
    const { password: _, _hashed: __, ...safe } = user;
    return { statusCode: 200, headers: cors, body: JSON.stringify(safe) };
  } catch(e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
