const http = require('http');
const BASE_URL = 'http://localhost:3000';
const studentEmail = `dbg-${Date.now()}@test.com`;
const payload = JSON.stringify({ name: 'Dbg Student', email: studentEmail, password: 'pass' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers));
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('BODY RAW:', data);
    try { console.log('BODY JSON:', JSON.parse(data)); } catch(e) { console.log('BODY PARSE ERROR'); }
  });
});

req.on('error', (e) => { console.error('Request error:', e); });
req.write(payload);
req.end();
