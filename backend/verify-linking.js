const http = require('http');

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', (e) => reject(e));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('--- Testing Caregiver-Patient Linking ---');
  try {
    // 1. Register Patient
    console.log('Registering patient...');
    const patientRes = await request('POST', '/api/auth/register', {
      email: 'test_patient@gmail.com',
      password: '123',
      name: 'Test Patient',
      role: 'patient'
    });
    const patientId = patientRes.data.user.id;
    console.log('✅ Registered patient:', patientId);

    // 2. Get Link Code
    console.log('Fetching link code...');
    const codeRes = await request('GET', `/api/patient/${patientId}/link-code`);
    const linkCode = codeRes.data.linkCode;
    console.log('✅ Link Code:', linkCode);

    // 3. Register Caregiver
    console.log('Registering caregiver...');
    const caregiverRes = await request('POST', '/api/auth/register', {
      email: 'test_caregiver@gmail.com',
      password: '123',
      name: 'Test Caregiver',
      role: 'caregiver'
    });
    const caregiverId = caregiverRes.data.user.id;
    console.log('✅ Registered caregiver:', caregiverId);

    // 4. Link Caregiver
    console.log('Linking caregiver to patient...');
    const linkRes = await request('POST', '/api/caregiver/link-patient', {
      caregiverId,
      linkCode
    });
    console.log('✅ Link Result:', linkRes.data.patientName === 'Test Patient' ? 'SUCCESS' : 'FAILED');

    // 5. Verify patient data access
    console.log('Verifying data access...');
    const accessRes = await request('GET', `/api/caregiver/${caregiverId}/patient`);
    console.log('✅ Linked Patient Name:', accessRes.data.patient?.name);
    
    if (accessRes.data.patient?.name === 'Test Patient') {
      console.log('\n🌟 Caregiver-Patient Linking Verified Successfully!');
    } else {
      console.log('\n❌ Verification Failed.');
    }
  } catch (err) {
    console.error('Test Error:', err.message);
  }
}

test();
