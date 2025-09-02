// Minimal background script for debugging
console.log('Minimal background script starting...');

// Basic variables
let accessToken = null;
let isAuthenticated = false;
const BACKEND_URL = 'https://api.devchronicles.xyz';
let historyCollectionInterval = null;

// Function to check and restore authentication state
function checkAuthenticationState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['access_token'], (result) => {
      accessToken = result.access_token || null;
      isAuthenticated = !!accessToken;
      console.log('Auth check complete, authenticated:', isAuthenticated);
      
      // If authenticated, start collecting history
      if (isAuthenticated) {
        console.log('Authenticated - starting history collection');
        startHistoryCollection();
      }
      
      resolve(isAuthenticated);
    });
  });
}

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed - minimal version');
  
  // Initialize storage
  chrome.storage.local.set({ DevHistoryLength: 0 }, () => {
    console.log('Storage initialized');
  });
  
  // Check authentication state
  checkAuthenticationState();
});

// Initialize extension on startup (browser restart)
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension starting up (browser restart)');
  checkAuthenticationState();
});

// Listen for storage changes (e.g., when popup updates auth tokens)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.access_token) {
    console.log('Access token changed in storage');
    const newToken = changes.access_token.newValue;
    const oldToken = changes.access_token.oldValue;
    
    if (newToken && !oldToken) {
      console.log('User authenticated - starting history collection');
      accessToken = newToken;
      isAuthenticated = true;
      startHistoryCollection();
    } else if (!newToken && oldToken) {
      console.log('User logged out - stopping history collection');
      accessToken = null;
      isAuthenticated = false;
      if (historyCollectionInterval) {
        clearInterval(historyCollectionInterval);
        historyCollectionInterval = null;
      }
    }
  }
});

// Also check authentication when service worker starts
// (This covers cases where the service worker goes dormant and restarts)
console.log('Background script loaded - checking authentication...');
checkAuthenticationState();

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  if (message.action === 'ping') {
    console.log('Ping received');
    sendResponse({ success: true, message: 'Pong from minimal background script!' });
    return true;
  }
  
  if (message.action === 'checkAuthStatus') {
    chrome.storage.local.get(['access_token'], (result) => {
      accessToken = result.access_token || null;
      isAuthenticated = !!accessToken;
      sendResponse({ isAuthenticated: isAuthenticated });
    });
    return true;
  }
  
  if (message.action === 'authenticate') {
    console.log('Authentication requested');
    authenticateWithGoogle()
      .then(() => {
        sendResponse({ success: true });
        startHistoryCollection();
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.message || 'Authentication failed'
        });
      });
    return true;
  }
  
  if (message.action === 'getStats') {
    console.log('Stats requested');
    getDetailedStats()
      .then(stats => {
        sendResponse({ success: true, data: stats });
      })
      .catch(error => {
        console.error('Error getting stats:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.action === 'getRecentActivity') {
    console.log('Recent activity requested');
    getRecentActivity()
      .then(activity => {
        sendResponse({ success: true, data: activity });
      })
      .catch(error => {
        console.error('Error getting recent activity:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  // Return for unknown messages
  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});

// Authenticate with Google
function authenticateWithGoogle() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError) {
        console.error('Auth error:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (!token) {
        console.error('No token returned');
        reject(new Error('No token returned from Google'));
        return;
      }
      
      // Exchange token with backend
      fetch(`${BACKEND_URL}/backend-api/auth/extension-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_token: token })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Store tokens
        chrome.storage.local.set({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        }, function() {
          accessToken = data.access_token;
          isAuthenticated = true;
          console.log('Auth complete, tokens stored');
          resolve(data.access_token);
        });
      })
      .catch(error => {
        console.error('Token exchange error:', error);
        reject(error);
      });
    });
  });
}

// Refresh access token using refresh token
async function refreshAccessToken() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['refresh_token'], async (result) => {
      const refreshToken = result.refresh_token;
      
      if (!refreshToken) {
        console.error('No refresh token available');
        reject(new Error('No refresh token available'));
        return;
      }
      
      try {
        console.log('Attempting to refresh access token...');
        
        const response = await fetch(`${BACKEND_URL}/backend-api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error('Refresh token is invalid or expired');
            throw new Error('Refresh token expired');
          }
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        // Store new tokens
        chrome.storage.local.set({
          access_token: data.access_token,
          refresh_token: data.refresh_token || refreshToken // Use new refresh token if provided, otherwise keep the old one
        }, function() {
          accessToken = data.access_token;
          isAuthenticated = true;
          console.log('Token refresh complete, new tokens stored');
          resolve(data.access_token);
        });
        
      } catch (error) {
        console.error('Token refresh error:', error);
        reject(error);
      }
    });
  });
}

// Function to start history collection
function startHistoryCollection() {
  // Clear any existing interval
  if (historyCollectionInterval) {
    console.log('Clearing existing history collection interval');
    clearInterval(historyCollectionInterval);
  }
  
  console.log('Starting history collection - Auth state:', isAuthenticated, 'Token present:', !!accessToken);
  
  // Collect history immediately
  collectHistory();
  
  // Then set up interval for future collection
  historyCollectionInterval = setInterval(collectHistory, 3600000); //every hour
  console.log('History collection interval set up');
}

// Function to collect history
function collectHistory() {
  if (!isAuthenticated) {
    console.log('Not authenticated locally, double-checking storage...');
    // Double-check authentication state from storage
    chrome.storage.local.get(['access_token'], (result) => {
      if (result.access_token) {
        console.log('Found auth token in storage, updating state and retrying...');
        accessToken = result.access_token;
        isAuthenticated = true;
        collectHistory(); // Retry now that we're authenticated
      } else {
        console.log('No auth token found in storage, skipping history collection');
      }
    });
    return;
  }
  
  console.log('Collecting history...');
  chrome.history.search({
    text: '',
    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
    maxResults: 10 // Limit for testing
  }, (historyItems) => {
    if (chrome.runtime.lastError) {
      console.error('History search error:', chrome.runtime.lastError);
      return;
    }
    
    // Store history count
    chrome.storage.local.set({ DevHistoryLength: historyItems.length }, () => {
      console.log("Updated DevHistoryLength:", historyItems.length);
    });
    
    // Send to backend
    sendHistoryToBackend(accessToken, historyItems);
  });
}

// Function to send history to backend
async function sendHistoryToBackend(token, historyItems) {
  try {
    console.log(`Preparing to send ${historyItems.length} history items to backend.`);
    
    // Transform Chrome history items to match HistoryRequest model
    const formattedItems = historyItems.map(item => ({
      link: item.url,  // Changed from 'url' to 'link' to match the API schema
      title: item.title,
      visited_at: new Date(item.lastVisitTime).toISOString(),  // Convert to ISO string format
      visit_count: item.visitCount || 1  // Fallback to 1 if visitCount is missing
    }));
    
    console.log('Formatted history items:', formattedItems);
    
    // Send to backend - using a single endpoint
    const response = await fetch(`${BACKEND_URL}/backend-api/chrome/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formattedItems)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error ${response.status}: ${errorText}`);
      
      // Handle token expiration (401 Unauthorized)
      if (response.status === 401) {
        console.log('Token expired! Attempting to refresh...');
        
        try {
          // Attempt to refresh the token
          const newAccessToken = await refreshAccessToken();
          console.log('Token refresh successful, retrying history upload...');
          
          // Retry the request with the new token
          const retryResponse = await fetch(`${BACKEND_URL}/backend-api/chrome/history`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newAccessToken}`
            },
            body: JSON.stringify(formattedItems)
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log('History sent successfully after token refresh:', retryData);
            
            // Clear any error indicators on success
            chrome.action.setBadgeText({ text: '' });
            chrome.action.setTitle({ title: 'DevChronicles - Running' });
            
            return retryData;
          } else {
            throw new Error(`Retry failed with status ${retryResponse.status}`);
          }
          
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          
          // If refresh fails, clear tokens and require re-authentication
          chrome.storage.local.remove(['access_token', 'refresh_token'], () => {
            console.log('Expired tokens cleared from storage after refresh failure');
          });
          
          // Update local state
          accessToken = null;
          isAuthenticated = false;
          
          // Stop history collection
          if (historyCollectionInterval) {
            clearInterval(historyCollectionInterval);
            historyCollectionInterval = null;
            console.log('History collection stopped due to token refresh failure');
          }
          
          // Notify user that re-authentication is needed
          chrome.action.setBadgeText({ text: '!' });
          chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
          chrome.action.setTitle({ title: 'DevChronicles - Authentication required. Click to sign in again.' });
          
          throw new Error('Token refresh failed, re-authentication required');
        }
      }
      
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    console.log('History sent successfully:', data);
    
    // Clear any error indicators on success
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'DevChronicles - Running' });
    
    return data;
  } catch (error) {
    console.error('Error sending history to backend:', error);
    throw error;
  }
}

// Function to get detailed stats from backend
async function getDetailedStats() {
  try {
    if (!isAuthenticated || !accessToken) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(`${BACKEND_URL}/backend-api/chrome/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Handle token expiration (401 Unauthorized)
      if (response.status === 401) {
        console.log('Stats API: Token expired, attempting to refresh...');
        
        try {
          // Attempt to refresh the token
          const newAccessToken = await refreshAccessToken();
          console.log('Stats API: Token refresh successful, retrying stats request...');
          
          // Retry the request with the new token
          const retryResponse = await fetch(`${BACKEND_URL}/backend-api/chrome/stats`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log('Stats API: Stats fetched successfully after token refresh');
            
            // Process and return formatted stats
            return {
              bugsFixed: retryData.bugsFixed || 0,
              conceptsLearned: retryData.conceptsLearned || 0,
              timeSpent: retryData.timeSpent || '0h',
              totalEntries: retryData.totalEntries || 0
            };
          } else {
            throw new Error(`Retry failed with status ${retryResponse.status}`);
          }
          
        } catch (refreshError) {
          console.error('Stats API: Token refresh failed:', refreshError);
          throw new Error('Token refresh failed for stats API');
        }
      } else {
        throw new Error(`HTTP error ${response.status}`);
      }
    }
    
    const data = await response.json();
    
    // Process and return formatted stats
    return {
      bugsFixed: data.bugsFixed || 0,
      conceptsLearned: data.conceptsLearned || 0,
      timeSpent: data.timeSpent || '0h',
      totalEntries: data.totalEntries || 0
    };
    
  } catch (error) {
    console.error('Error fetching detailed stats:', error);
    
    // Return default stats if backend call fails
    return {
      bugsFixed: 0,
      conceptsLearned: 0,
      timeSpent: '0h',
      totalEntries: 0
    };
  }
}

// Function to get recent activity from backend
async function getRecentActivity() {
  try {
    if (!isAuthenticated || !accessToken) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(`${BACKEND_URL}/backend-api/chrome/recent-activity`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Handle token expiration (401 Unauthorized)
      if (response.status === 401) {
        console.log('Recent Activity API: Token expired, attempting to refresh...');
        
        try {
          // Attempt to refresh the token
          const newAccessToken = await refreshAccessToken();
          console.log('Recent Activity API: Token refresh successful, retrying activity request...');
          
          // Retry the request with the new token
          const retryResponse = await fetch(`${BACKEND_URL}/backend-api/chrome/recent-activity`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log('Recent Activity API: Activity fetched successfully after token refresh');
            
            // Process and return formatted activity
            return retryData.map(item => ({
              title: item.title,
              category: item.main_category || 'learning',
              domain: new URL(item.link).hostname
            }));
          } else {
            throw new Error(`Retry failed with status ${retryResponse.status}`);
          }
          
        } catch (refreshError) {
          console.error('Recent Activity API: Token refresh failed:', refreshError);
          throw new Error('Token refresh failed for recent activity API');
        }
      } else {
        throw new Error(`HTTP error ${response.status}`);
      }
    }
    
    const data = await response.json();
    
    // Process and return formatted activity
    return data.map(item => ({
      title: item.title,
      category: item.main_category || 'learning',
      domain: new URL(item.link).hostname
    }));
    
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    
    // Return sample data if backend call fails
    return [
      {
        title: 'How to fix a TypeError',
        category: 'bug',
        domain: 'python.org'
      },
      {
        title: 'Docker basics',
        category: 'learning',
        domain: 'dev.to'
      },
      {
        title: 'API documentation',
        category: 'docs',
        domain: 'docs.python.org'
      }
    ];
  }
}

// Log completion
console.log('Background script with history collection loaded successfully');