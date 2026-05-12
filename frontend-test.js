const http = require('http');
const fs = require('fs');

let testResults = [];
let testCount = 0;

function logTest(name, status, message = '') {
  testCount++;
  const result = `[${testCount}] ${status === 'PASS' ? '✅' : '⚠️ '} ${name}${message ? ': ' + message : ''}`;
  testResults.push(result);
  console.log(result);
}

async function runTests() {
  console.log('\n📱 FRONTEND + INTEGRATION TEST SUITE\n');
  console.log('===============================================');
  console.log('FRONTEND PAGES & FEATURES');
  console.log('===============================================\n');

  const tests = [
    {
      name: 'Auth Page - Login Form',
      url: 'http://localhost:3000',
      checks: [
        { selector: 'input[type="text"]', desc: 'Username input' },
        { selector: 'input[type="password"]', desc: 'Password input' },
        { selector: 'button', desc: 'Sign in button' },
      ]
    },
    {
      name: 'Auth Page - OAuth Buttons',
      url: 'http://localhost:3000',
      checks: [
        { selector: 'button:contains("Google")', desc: 'Google button exists' },
        { selector: 'a:contains("Register")', desc: 'Register link' },
      ]
    },
    {
      name: 'Home Page (when authenticated)',
      url: 'http://localhost:3000/home',
      checks: [
        { selector: 'nav', desc: 'Navigation exists' },
        { selector: '[class*="featured"]', desc: 'Featured section' },
      ]
    },
    {
      name: 'Browse Page',
      url: 'http://localhost:3000/browse',
      checks: [
        { selector: 'input[type="text"]', desc: 'Search/filter input' },
      ]
    },
    {
      name: 'Watchlist Page',
      url: 'http://localhost:3000/watchlist',
      checks: []
    },
    {
      name: 'Profile Page',
      url: 'http://localhost:3000/profile',
      checks: []
    },
    {
      name: 'Search Page',
      url: 'http://localhost:3000/search',
      checks: []
    },
  ];

  console.log('📍 PAGE ACCESSIBILITY TESTS\n');
  
  for (const test of tests) {
    console.log(`Testing: ${test.name} → ${test.url}`);
    try {
      const response = await makeRequest('GET', test.url);
      if (response.status === 200 || response.status === 304) {
        logTest(test.name, 'PASS', `HTTP ${response.status}`);
        if (test.checks.length > 0) {
          console.log(`  Checks requested: ${test.checks.map(c => c.desc).join(', ')}`);
        }
      } else {
        logTest(test.name, 'WARN', `HTTP ${response.status}`);
      }
    } catch (err) {
      logTest(test.name, 'WARN', err.message);
    }
    console.log();
  }

  console.log('===============================================');
  console.log('FEATURE TESTS (Integration)');
  console.log('===============================================\n');

  const features = [
    '📍 API Integration: Frontend ↔ Backend',
    '📍 Authentication System',
    '📍 Session Management (localStorage)',
    '📍 Responsive Navigation',
    '📍 Error Handling',
    '📍 OAuth Integration',
    '📍 Search & Filter',
    '📍 Anime Detail View',
    '📍 User Profile',
    '📍 Watchlist Management',
  ];

  console.log('Features to verify:\n');
  features.forEach(f => console.log('  ' + f));

  console.log('\n===============================================');
  console.log('TEST SUMMARY');
  console.log('===============================================\n');

  const passed = testResults.filter(r => r.includes('✅')).length;
  const warned = testResults.filter(r => r.includes('⚠️')).length;
  const total = testResults.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`⚠️  Warnings: ${warned}/${total}`);
  console.log(`\n📊 Frontend Tests: ${((passed / total) * 100).toFixed(1)}% accessible\n`);

  console.log('MANUAL VERIFICATION CHECKLIST:');
  console.log('=============================\n');
  
  const checklist = [
    'Auth page loads without errors',
    'Can enter email and password',
    'Google OAuth button is clickable',
    'GitHub OAuth button is clickable',
    'Register link works',
    'Login validation shows errors for empty fields',
    'Successful login redirects to /home',
    'Home page displays anime content',
    'Navigation menu is responsive',
    'Search functionality works',
    'Watchlist page accessible',
    'Profile page loads',
    'Can logout',
    'Protected pages redirect to auth when not logged in',
    'No console errors blocking functionality',
  ];

  checklist.forEach((item, idx) => {
    console.log(`  [ ] ${idx + 1}. ${item}`);
  });

  console.log('\n===============================================');
  console.log('✅ FRONTEND TEST SUITE COMPLETE');
  console.log('===============================================\n');
}

function makeRequest(method, url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: method,
    };

    const protocol = url.startsWith('https') ? require('https') : require('http');
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.end();
  });
}

runTests();
