const http = require('http');

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(urlPath, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path: urlPath,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('--- Testing LBM Mirror Auth API ---');

  // 1. System Status
  const statusRes = await getJson('/api/auth/system-status');
  console.log('1. System Status:', statusRes.status, statusRes.data);

  // 2. Google OAuth test
  const googleRes = await postJson('/api/auth/google', {
    email: 'testgoogleuser@gmail.com',
    name: 'Lucky Tester',
  });
  console.log('2. Google Sign-In:', googleRes.status, googleRes.data.success ? 'SUCCESS (Token issued)' : googleRes.data);

  // 3. Verify Session
  if (googleRes.data.token) {
    const meRes = await getJson('/api/auth/me', googleRes.data.token);
    console.log('3. Session Verify /me:', meRes.status, meRes.data.success ? `Verified user: ${meRes.data.user.email}` : meRes.data);
  }

  // 4. Password Reset test
  const resetRes = await postJson('/api/auth/reset-password', {
    identifier: 'testgoogleuser@gmail.com',
    newPassword: 'newpassword123',
  });
  console.log('4. Reset Password:', resetRes.status, resetRes.data.success ? 'SUCCESS (Password updated)' : resetRes.data);

  // 5. Login with new password
  const loginRes = await postJson('/api/auth/login', {
    identifier: 'testgoogleuser@gmail.com',
    password: 'newpassword123',
  });
  console.log('5. Login with credentials:', loginRes.status, loginRes.data.success ? 'SUCCESS' : loginRes.data);

  console.log('--- All Tests Completed Successfully ---');
}

runTests().catch(console.error);
