#!/usr/bin/env node

/**
 * Test script to verify extension → dashboard authentication flow
 * Run this from the dashboard directory: node test-auth.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing DevChronicles Authentication Flow');
console.log('=============================================');

// 1. Check if dashboard files exist
const dashboardPath = path.join(__dirname, 'public');
const requiredFiles = ['index.html', 'dashboard.js', 'debug-auth.js'];

console.log('\n1. Checking dashboard files...');
requiredFiles.forEach(file => {
    const filepath = path.join(dashboardPath, file);
    if (fs.existsSync(filepath)) {
        console.log(`   ✅ ${file} exists`);
    } else {
        console.log(`   ❌ ${file} missing`);
    }
});

// 2. Check if extension files exist
const extensionPath = path.join(__dirname, '..');
const extensionFiles = ['popup/popup.js', 'background.js', 'manifest.json'];

console.log('\n2. Checking extension files...');
extensionFiles.forEach(file => {
    const filepath = path.join(extensionPath, file);
    if (fs.existsSync(filepath)) {
        console.log(`   ✅ ${file} exists`);
    } else {
        console.log(`   ❌ ${file} missing`);
    }
});

// 3. Check backend connection
console.log('\n3. Testing backend connection...');
const testBackend = async () => {
    try {
        const response = await fetch('http://localhost:8000/backend-api/chrome/stats');
        console.log(`   Backend response: ${response.status} ${response.statusText}`);
        
        if (response.status === 401) {
            console.log('   ✅ Backend is running (401 expected without auth)');
        } else if (response.status === 404) {
            console.log('   ❌ Backend route not found');
        } else {
            console.log('   ⚠️  Unexpected response');
        }
    } catch (error) {
        console.log(`   ❌ Backend not reachable: ${error.message}`);
    }
};

// 4. Instructions for testing
console.log('\n4. Testing Instructions:');
console.log('=====================');
console.log('1. Start the backend server:');
console.log('   cd dev-chronicles-be && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000');
console.log('');
console.log('2. Start the dashboard server:');
console.log('   cd dev-chronicles-fe/dashboard && python3 -m http.server 3000 --directory public');
console.log('');
console.log('3. Load the Chrome extension and test authentication');
console.log('');
console.log('4. Click "View Dashboard" button in extension popup');
console.log('');
console.log('5. On the dashboard, click the "Debug Auth" button to check authentication');
console.log('');
console.log('6. Expected flow:');
console.log('   - Extension popup gets token from chrome.storage.local');
console.log('   - Extension passes token via URL: http://localhost:3000?token=XXX&user=XXX');
console.log('   - Dashboard reads token from URL and stores in localStorage');
console.log('   - Dashboard makes API calls with Authorization: Bearer TOKEN');

// Run backend test
testBackend(); 