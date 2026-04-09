'use strict';
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  if(event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { action, payload } = JSON.parse(event.body);
    const db = createClient(process.env.SUPA_URL, process.env.SUPA_SERVICE_KEY);

    // Kullanıcıları çek
    const { data } = await db.from('seos_store').select('value').eq('key','seos_users').single();
    let users = data?.value || [];

    if(action === 'list') {
      // Şifreleri çıkar
      return { statusCode: 200, headers: cors, body: JSON.stringify(
        users.map(({password, _hashed, ...u}) => u)
      )};
    }

    if(action === 'add') {
      const { username, password, role, name, tesisler, msEmail } = payload;
      if(users.find(u => u.username === username))
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Kullanıcı adı zaten var' }) };
      users.push({
        id: Date.now(), username, role, name, active: true,
        password: sha256(password), _hashed: true,
        tesisler: tesisler||[], msEmail: msEmail||'', lastLogin: ''
      });
    }

    if(action === 'update') {
      const { id, name, role, tesisler, msEmail, password, active } = payload;
      const idx = users.findIndex(u => u.id === id);
      if(idx < 0) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Kullanıcı bulunamadı' }) };
      if(name !== undefined) users[idx].name = name;
      if(role !== undefined) users[idx].role = role;
      if(tesisler !== undefined) users[idx].tesisler = tesisler;
      if(msEmail !== undefined) users[idx].msEmail = msEmail;
      if(active !== undefined) users[idx].active = active;
      if(password) { users[idx].password = sha256(password); users[idx]._hashed = true; }
    }

    if(action === 'delete') {
      const { id } = payload;
      users = users.filter(u => u.id !== id);
    }

    // Kaydet
    await db.from('seos_store').upsert({ key: 'seos_users', value: users }, { onConflict: 'key' });
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };

  } catch(e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
