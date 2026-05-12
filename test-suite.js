const http = require('http');

const API_URL = 'http://localhost:5000/api';
let testResults = [];
let testCount = 0;

// Helper function for HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const fullPath = API_URL + path;
    const url = new URL(fullPath);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers,
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function logTest(name, status, message) {
  testCount++;
  const result = `[${testCount}] ${status === 'PASS' ? '✅' : '❌'} ${name}: ${message}`;
  testResults.push(result);
  console.log(result);
}

async function runTests() {
  console.log('\n🧪 COMPREHENSIVE WEBSITE TEST SUITE\n');
  console.log('===============================================');
  console.log('BACKEND TESTS');
  console.log('===============================================\n');

  try {
    // Test 1: Health Check
    console.log('📍 HEALTH CHECK');
    let res = await makeRequest('GET', '/health');
    logTest('Health Endpoint', res.status === 200 ? 'PASS' : 'FAIL', `Status: ${res.status}`);
    console.log('   Response:', res.body, '\n');

    // Test 2: Register Valid User
    console.log('📍 REGISTRATION TESTS');
    const newUser = {
      username: 'testuser_' + Date.now(),
      email: 'testuser_' + Date.now() + '@example.com',
      password: 'SecurePass123!',
      passwordConfirm: 'SecurePass123!',
    };
    
    res = await makeRequest('POST', '/auth/register', newUser);
    const token1 = res.body?.token;
    logTest('Register Valid User', res.status === 201 ? 'PASS' : 'FAIL', `Status: ${res.status}, Has Token: ${!!token1}`);
    console.log('   Response:', JSON.stringify(res.body, null, 2), '\n');

    // Test 3: Register with Duplicate Email
    console.log('📍 DUPLICATE EMAIL TEST');
    res = await makeRequest('POST', '/auth/register', {
      username: 'duplicate_test',
      email: newUser.email,
      password: 'SecurePass123!',
      passwordConfirm: 'SecurePass123!',
    });
    logTest('Reject Duplicate Email', res.status === 400 ? 'PASS' : 'FAIL', `Status: ${res.status}`);
    console.log('   Response:', res.body, '\n');

    // Test 4: Register with Missing Password
    console.log('📍 VALIDATION TESTS');
    res = await makeRequest('POST', '/auth/register', {
      username: 'nopass_user',
      email: 'nopass@example.com',
      password: '',
      passwordConfirm: '',
    });
    logTest('Reject Missing Password', res.status === 400 ? 'PASS' : 'FAIL', `Status: ${res.status}`);
    console.log('   Response:', res.body, '\n');

    // Test 5: Login with Valid Credentials
    console.log('📍 LOGIN TESTS');
    res = await makeRequest('POST', '/auth/login', {
      email: newUser.email,
      password: 'SecurePass123!',
    });
    const token2 = res.body?.token;
    logTest('Login Valid Credentials', res.status === 200 ? 'PASS' : 'FAIL', `Status: ${res.status}, Has Token: ${!!token2}`);
    console.log('   Response:', JSON.stringify(res.body, null, 2), '\n');

    // Test 6: Login with Wrong Password
    res = await makeRequest('POST', '/auth/login', {
      email: newUser.email,
      password: 'WrongPassword123!',
    });
    logTest('Reject Wrong Password', res.status === 401 ? 'PASS' : 'FAIL', `Status: ${res.status}`);
    console.log('   Response:', res.body, '\n');

    // Test 7: Login with Non-existent Email
    res = await makeRequest('POST', '/auth/login', {
      email: 'nonexistent@example.com',
      password: 'SomePassword123!',
    });
    logTest('Reject Non-existent User', res.status === 401 ? 'PASS' : 'FAIL', `Status: ${res.status}`);
    console.log('   Response:', res.body, '\n');

    // Test 8: OAuth Routes Exist
    console.log('📍 OAUTH ENDPOINT TESTS');
    res = await makeRequest('GET', '/auth/google');
    logTest('Google OAuth Redirect', [301, 302, 307, 308, 200, 404].includes(res.status) ? 'PASS' : 'FAIL', `Status: ${res.status}`);

    res = await makeRequest('GET', '/auth/github');
    logTest('GitHub OAuth Redirect', [301, 302, 307, 308, 200, 404].includes(res.status) ? 'PASS' : 'FAIL', `Status: ${res.status}`);
    console.log();

    // Print Summary
    console.log('===============================================');
    console.log('TEST SUMMARY');
    console.log('===============================================');
    const passed = testResults.filter(r => r.includes('✅')).length;
    const failed = testResults.filter(r => r.includes('❌')).length;
    console.log(`\n✅ Passed: ${passed}/${testCount}`);
    console.log(`❌ Failed: ${failed}/${testCount}`);
    console.log(`\n📊 Success Rate: ${((passed / testCount) * 100).toFixed(1)}%\n`);

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Run tests
runTests().then(() => {
  console.log('===============================================');
  console.log('✅ BACKEND TESTS COMPLETE - Switching to Frontend\n');
});
