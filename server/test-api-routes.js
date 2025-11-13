// Test if match-history routes are working
const http = require('http');

const testEndpoint = (path, callback) => {
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: path,
    method: 'GET',
  };

  console.log(`\nTesting: ${path}`);
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response: ${data.substring(0, 200)}...`);
      callback();
    });
  });

  req.on('error', (error) => {
    console.error(`Error: ${error.message}`);
    callback();
  });

  req.end();
};

// Test các routes
console.log('=== Testing API Routes ===');

testEndpoint('/api/server-info', () => {
  testEndpoint('/api/match-history/3', () => {
    console.log('\n=== Test Complete ===');
  });
});
