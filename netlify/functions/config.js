'use strict';
// Supabase bilgileri Netlify Environment Variables'dan gelir
// Kaynak kodda görünmez
exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ url: process.env.SUPA_URL, key: process.env.SUPA_KEY })
});
