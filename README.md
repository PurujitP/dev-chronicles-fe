<<<<<<< HEAD
# dev-chronicles-fe
FrontEnd Dashboard and FrontEnd Extention Pop Up
=======
# DevChronicles Frontend

This directory contains all frontend components for the DevChronicles application.

## 📁 Directory Structure

```
dev-chronicles-fe/
├── popup/                    # Chrome Extension Popup
│   ├── popup.html           # Popup UI
│   └── popup.js             # Popup logic
├── dashboard/               # Dashboard Web Application
│   ├── public/             # Static dashboard files
│   │   ├── index.html      # Main dashboard page
│   │   ├── dashboard.js    # Dashboard logic
│   │   ├── debug-auth.js   # Authentication debugging
│   │   └── test-token.html # Token testing page
│   ├── test-auth.js        # Authentication test script
│   └── test-flow.js        # Comprehensive flow test
├── background.js           # Chrome Extension Background Script
├── manifest.json          # Chrome Extension Manifest
├── icons/                  # Extension Icons
└── README.md              # This file
```

## 🚀 Getting Started

### 1. Chrome Extension Setup

1. **Load the extension** in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dev-chronicles-fe` directory

2. **Test the extension**:
   - Click the extension icon in the toolbar
   - Sign in with Google
   - Verify the mini stats display

### 2. Dashboard Setup

1. **Start the dashboard server**:
   ```bash
   cd dev-chronicles-fe/dashboard
   python3 -m http.server 3000 --directory public
   ```

2. **Access the dashboard**:
   - Through extension: Click "View Full Dashboard" in popup
   - Direct access: Visit `http://localhost:3000`

## 🔧 Development

### Testing Authentication Flow

Run the comprehensive test:
```bash
cd dev-chronicles-fe/dashboard
node test-flow.js
```

### Debug Authentication

1. **Extension Console**:
   - Right-click extension popup → Inspect
   - Run: `chrome.storage.local.get(["access_token"], console.log)`
   - Run: `testTokenAndOpenDashboard()`

2. **Dashboard Console**:
   - Open dashboard → F12
   - Run: `debugAuth.checkAllSources()`

3. **Test Token Flow**:
   - Visit: `http://localhost:3000/test-token.html`
   - Click "Test Token Flow"

### Quick Debug Commands

**Extension Popup Console:**
```javascript
// Check stored token
chrome.storage.local.get(["access_token"], console.log)

// Test token and open dashboard
testTokenAndOpenDashboard()

// Clear authentication
clearAuth()
```

**Dashboard Console:**
```javascript
// Debug all auth sources
debugAuth.checkAllSources()

// Test specific token
debugAuth.testToken('your-token-here')

// Clear all tokens
debugAuth.clearTokens()
```

## 📝 File Descriptions

### Extension Files

- **`popup/popup.html`** - Extension popup UI with onboarding and mini stats
- **`popup/popup.js`** - Popup logic, authentication, and dashboard opening
- **`background.js`** - Background script for API calls and history collection
- **`manifest.json`** - Extension configuration and permissions

### Dashboard Files

- **`dashboard/public/index.html`** - Main dashboard page
- **`dashboard/public/dashboard.js`** - Dashboard logic and API integration
- **`dashboard/public/debug-auth.js`** - Authentication debugging helper
- **`dashboard/public/test-token.html`** - Token flow testing page

### Test Files

- **`dashboard/test-auth.js`** - Basic authentication test
- **`dashboard/test-flow.js`** - Comprehensive flow test with guided steps

## 🔄 Authentication Flow

1. **Extension Authentication**:
   - User clicks "Sign in with Google" in popup
   - Extension exchanges Google token with backend
   - Backend returns access token and user data
   - Extension stores tokens in `chrome.storage.local`

2. **Dashboard Authentication**:
   - Extension passes token via URL: `?token=XXX&user=XXX`
   - Dashboard reads token from URL parameters
   - Dashboard stores token in `localStorage`
   - Dashboard makes authenticated API calls

3. **Token Usage**:
   - All API calls include: `Authorization: Bearer TOKEN`
   - Backend validates token and returns user-specific data

## 🐛 Troubleshooting

### Common Issues

1. **401 Unauthorized errors**:
   - Check if extension is authenticated
   - Verify token is passed in URL when opening dashboard
   - Run `debugAuth.checkAllSources()` on dashboard

2. **Extension not loading**:
   - Ensure all files are in correct directory structure
   - Check Chrome extension console for errors
   - Verify manifest.json is valid

3. **Dashboard not loading data**:
   - Check if backend server is running on port 8000
   - Verify token is stored in localStorage
   - Check network tab for API call failures

### Debug Steps

1. **Run comprehensive test**:
   ```bash
   cd dev-chronicles-fe/dashboard
   node test-flow.js
   ```

2. **Check backend logs** for token validation
3. **Use browser developer tools** to inspect API calls
4. **Test token flow** at `http://localhost:3000/test-token.html`

## 📚 API Endpoints

- **`/backend-api/auth/extension-token`** - Exchange Google token for access token
- **`/backend-api/chrome/stats`** - Get user statistics
- **`/backend-api/chrome/recent-activity`** - Get recent activity
- **`/backend-api/chrome/test`** - Test token validity

## 🔐 Security Notes

- Tokens are stored securely in Chrome extension storage
- All API calls use HTTPS in production
- User data is encrypted and private
- No sensitive data is logged in production builds

## 📈 Development Workflow

1. **Make changes** to extension or dashboard code
2. **Reload extension** in Chrome (chrome://extensions/)
3. **Test authentication flow** using provided tools
4. **Debug issues** using console commands and test scripts
5. **Verify API integration** with backend server

This reorganized structure provides a cleaner separation of concerns while keeping all frontend code in a single directory for easier management and development. 
>>>>>>> dd74cc4 (main)
