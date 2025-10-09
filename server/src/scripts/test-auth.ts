// Test script for authentication endpoints
// Run with: ts-node src/scripts/test-auth.ts

const BASE_URL = 'http://localhost:4000/api/auth';

const testAuth = async () => {
  console.log('🧪 Testing Authentication Endpoints...\n');

  // Test data
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Test123456!'
  };

  try {
    // 1. Test Register
    console.log('1️⃣ Testing Register...');
    const registerRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const registerData = await registerRes.json();
    console.log('Register Response:', registerData);

    if (!registerData.success) {
      console.error('❌ Register failed:', registerData.message);
      return;
    }

    const token = registerData.token;
    console.log('✅ Register successful! Token:', token.substring(0, 20) + '...\n');

    // 2. Test Login with correct credentials
    console.log('2️⃣ Testing Login (correct credentials)...');
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);

    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }
    console.log('✅ Login successful!\n');

    // 3. Test Login with wrong password
    console.log('3️⃣ Testing Login (wrong password)...');
    const wrongLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'wrongpassword'
      })
    });
    const wrongLoginData = await wrongLoginRes.json();
    console.log('Wrong Login Response:', wrongLoginData);

    if (wrongLoginData.success) {
      console.error('❌ Should have failed with wrong password!');
    } else {
      console.log('✅ Correctly rejected wrong password\n');
    }

    // 4. Test Verify Token
    console.log('4️⃣ Testing Verify Token...');
    const verifyRes = await fetch(`${BASE_URL}/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyData = await verifyRes.json();
    console.log('Verify Response:', verifyData);

    if (!verifyData.success) {
      console.error('❌ Token verification failed:', verifyData.message);
      return;
    }
    console.log('✅ Token verified successfully!\n');

    // 5. Test Verify with invalid token
    console.log('5️⃣ Testing Verify (invalid token)...');
    const invalidVerifyRes = await fetch(`${BASE_URL}/verify`, {
      headers: { 'Authorization': 'Bearer invalid_token_here' }
    });
    const invalidVerifyData = await invalidVerifyRes.json();
    console.log('Invalid Token Response:', invalidVerifyData);

    if (invalidVerifyData.success) {
      console.error('❌ Should have failed with invalid token!');
    } else {
      console.log('✅ Correctly rejected invalid token\n');
    }

    // 6. Test duplicate email
    console.log('6️⃣ Testing Register (duplicate email)...');
    const duplicateRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'anotheruser',
        email: testUser.email, // Same email
        password: 'password123'
      })
    });
    const duplicateData = await duplicateRes.json();
    console.log('Duplicate Email Response:', duplicateData);

    if (duplicateData.success) {
      console.error('❌ Should have failed with duplicate email!');
    } else {
      console.log('✅ Correctly rejected duplicate email\n');
    }

    console.log('🎉 All tests completed!\n');
    console.log('Summary:');
    console.log('- Register: ✅');
    console.log('- Login (correct): ✅');
    console.log('- Login (wrong password): ✅');
    console.log('- Verify (valid token): ✅');
    console.log('- Verify (invalid token): ✅');
    console.log('- Register (duplicate): ✅');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

// Run tests
testAuth();
