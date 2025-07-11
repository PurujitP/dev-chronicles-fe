#!/usr/bin/env node

/**
 * Comprehensive test script for DevChronicles authentication flow
 * This script guides you through testing each step of the authentication process
 */

const readline = require('readline');
const { spawn } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function log(message, type = 'INFO') {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    ERROR: '\x1b[31m',   // Red
    WARNING: '\x1b[33m', // Yellow
    RESET: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}[${timestamp}] ${type}: ${message}${colors.RESET}`);
}

async function main() {
  console.log('🔍 DevChronicles Authentication Flow Test');
  console.log('==========================================\n');
  
  log('Starting comprehensive authentication test...');
  
  // Step 1: Check if servers are running
  log('Step 1: Checking server status...');
  
  try {
    const backendCheck = await fetch('http://localhost:8000/backend-api/chrome/stats');
    if (backendCheck.status === 401) {
      log('✅ Backend server is running (401 expected without auth)', 'SUCCESS');
    } else {
      log(`⚠️ Backend server responded with unexpected status: ${backendCheck.status}`, 'WARNING');
    }
  } catch (error) {
    log('❌ Backend server is not running!', 'ERROR');
    log('Please start it with: cd dev-chronicles-be && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000', 'ERROR');
    process.exit(1);
  }
  
  try {
    const dashboardCheck = await fetch('http://localhost:3000');
    if (dashboardCheck.ok) {
      log('✅ Dashboard server is running', 'SUCCESS');
    } else {
      log(`⚠️ Dashboard server responded with status: ${dashboardCheck.status}`, 'WARNING');
    }
  } catch (error) {
    log('❌ Dashboard server is not running!', 'ERROR');
    log('Please start it with: cd dev-chronicles-dashboard && python3 -m http.server 3000 --directory public', 'ERROR');
    process.exit(1);
  }
  
  // Step 2: Extension setup check
  log('\nStep 2: Extension setup check...');
     log('Please ensure you have:');
   log('1. Loaded the Chrome extension from the parent directory (dev-chronicles-fe/');
   log('2. The extension is active and shows in your browser toolbar');
  log('3. You can see the extension popup when clicked\n');
  
  const extensionReady = await ask('Is the Chrome extension loaded and ready? (y/n): ');
  if (extensionReady.toLowerCase() !== 'y') {
    log('Please load the Chrome extension first', 'ERROR');
    process.exit(1);
  }
  
  // Step 3: Authentication test
  log('\nStep 3: Testing authentication flow...');
  log('Now we will test the complete authentication flow:');
  log('1. Click on the Chrome extension icon');
  log('2. If you see an onboarding screen, click "Sign in with Google"');
  log('3. If you see a mini stats screen, you are already authenticated');
  log('4. Check the browser console for debug logs\n');
  
  const authTested = await ask('Have you tested the extension authentication? (y/n): ');
  if (authTested.toLowerCase() !== 'y') {
    log('Please test the extension authentication first', 'WARNING');
  }
  
  // Step 4: Dashboard opening test
  log('\nStep 4: Testing dashboard opening...');
  log('1. Click "View Full Dashboard" button in the extension popup');
  log('2. A new tab should open with the dashboard');
  log('3. Check the browser console for debug logs about token passing\n');
  
  const dashboardTested = await ask('Did the dashboard open successfully? (y/n): ');
  if (dashboardTested.toLowerCase() !== 'y') {
    log('Dashboard opening failed. Let\'s debug...', 'ERROR');
    
    // Debugging steps
    log('\nDEBUGGING STEPS:');
    log('1. Open the Chrome extension popup');
    log('2. Right-click and select "Inspect" to open developer tools');
    log('3. In the console, run: testTokenAndOpenDashboard()');
    log('4. Check what logs appear');
    log('5. Also check if chrome.storage.local has the access_token');
    log('6. You can run: chrome.storage.local.get(["access_token"], console.log)');
    
    await ask('Press Enter when you have checked the extension console...');
  }
  
  // Step 5: Token verification test
  log('\nStep 5: Testing token verification...');
  log('1. Go to http://localhost:3000/test-token.html');
  log('2. Click "Test Token Flow" button');
  log('3. Check if the token is properly passed from extension to dashboard\n');
  
  const tokenTested = await ask('Did you test the token flow? (y/n): ');
  if (tokenTested.toLowerCase() === 'y') {
    const tokenWorked = await ask('Did the token test show success? (y/n): ');
    if (tokenWorked.toLowerCase() === 'y') {
      log('✅ Token flow is working correctly!', 'SUCCESS');
    } else {
      log('❌ Token flow has issues. Check the test page for details.', 'ERROR');
    }
  }
  
  // Step 6: Final verification
  log('\nStep 6: Final verification...');
  log('1. Go to http://localhost:3000');
  log('2. Click the "Debug Auth" button');
  log('3. Check the console output for authentication status\n');
  
  const finalTest = await ask('What was the result of the debug auth test? (success/failed): ');
  if (finalTest.toLowerCase() === 'success') {
    log('🎉 All tests passed! Authentication flow is working correctly.', 'SUCCESS');
    
    // Show summary
    log('\n📋 SUMMARY:');
    log('✅ Backend server running');
    log('✅ Dashboard server running');
    log('✅ Extension loaded and authenticated');
    log('✅ Token passing from extension to dashboard');
    log('✅ Dashboard can make authenticated API calls');
    
  } else {
    log('❌ Authentication flow has issues. Here\'s what to check:', 'ERROR');
    
    log('\n🔧 TROUBLESHOOTING:');
    log('1. Extension Console (Right-click extension popup → Inspect):');
    log('   - Check if chrome.storage.local has access_token');
    log('   - Run: chrome.storage.local.get(["access_token"], console.log)');
    log('   - Run: testTokenAndOpenDashboard()');
    
    log('\n2. Dashboard Console (F12 on dashboard page):');
    log('   - Check if URL has token parameter when opened from extension');
    log('   - Run: debugAuth.checkAllSources()');
    log('   - Check localStorage for devchronicles_token');
    
    log('\n3. Network Tab:');
    log('   - Check if API calls have Authorization header');
    log('   - Look for 401 vs 200 responses');
    
    log('\n4. Backend Logs:');
    log('   - Check if backend receives "Token received: eyJhbGciOiJIUzI1NiIs..."');
    log('   - Look for successful authentication logs');
  }
  
  log('\n🚀 Next Steps:');
  log('1. If authentication works, your app is ready!');
  log('2. If issues persist, check the troubleshooting steps above');
  log('3. You can re-run this test script anytime: node test-flow.js');
  
  rl.close();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`Unhandled error: ${error.message}`, 'ERROR');
  process.exit(1);
});

// Run the test
main().catch((error) => {
  log(`Test failed: ${error.message}`, 'ERROR');
  process.exit(1);
}); 