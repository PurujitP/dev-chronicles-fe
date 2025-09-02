// UI State Management
let currentScreen = 'loading';
let isAuthenticated = false;
let userData = null;

// UI Elements
const screens = {
  loading: document.getElementById('loadingState'),
  onboarding: document.getElementById('onboardingScreen'),
  miniStats: document.getElementById('miniStatsScreen'),
  error: document.getElementById('errorState')
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DevChronicles popup loaded');
  
  // Setup event listeners
  setupEventListeners();
  
  // Check authentication and show appropriate screen
  await initializePopup();
});

// DEBUG: Add a way to clear authentication (remove in production)
window.clearAuth = function() {
  chrome.storage.local.clear(() => {
    console.log('Authentication cleared');
    location.reload();
  });
};

// DEBUG: Test token and open dashboard
window.testTokenAndOpenDashboard = function() {
  console.log('🧪 Testing token before opening dashboard...');
  
  chrome.storage.local.get(['access_token'], (result) => {
    if (result.access_token) {
      console.log('✅ Token found, testing API call...');
      
      // Test the token with backend
      chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        console.log('📊 Token test response:', response);
        
        if (response && response.success) {
          console.log('✅ Token is valid, opening dashboard...');
          openDashboard();
        } else {
          console.log('❌ Token is invalid, forcing re-authentication...');
          handleSignIn().then(() => {
            console.log('✅ Re-authentication complete, opening dashboard...');
            openDashboard();
          });
        }
      });
    } else {
      console.log('❌ No token found, forcing authentication...');
      handleSignIn().then(() => {
        console.log('✅ Authentication complete, opening dashboard...');
        openDashboard();
      });
    }
  });
};

// Setup all event listeners
function setupEventListeners() {
  // Onboarding screen
  document.getElementById('signInButton').addEventListener('click', handleSignIn);
  document.getElementById('agreeButton').addEventListener('click', handleAgreeAndContinue);
  document.getElementById('declineButton').addEventListener('click', handleDecline);
  
  // Mini stats screen
  document.getElementById('viewDashboardButton').addEventListener('click', openDashboard);
  
  // Error screen
  document.getElementById('retryButton').addEventListener('click', initializePopup);
}

// Initialize popup and determine which screen to show
async function initializePopup() {
  try {
    console.log('Initializing popup...');
    showScreen('loading');
    
    // Check authentication status
    const authStatus = await checkAuthenticationStatus();
    console.log('Auth status:', authStatus);
    
    if (authStatus.isAuthenticated) {
      console.log('User is authenticated, loading mini stats');
      // User is authenticated, show mini stats
      await loadUserData();
      await loadMiniStats();
      showScreen('miniStats');
    } else {
      console.log('User not authenticated, showing onboarding');
      // User not authenticated, show onboarding
      showScreen('onboarding');
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    showScreen('error');
  }
}

// Show specific screen
function showScreen(screenName) {
  console.log('Showing screen:', screenName);
  // Hide all screens
  Object.values(screens).forEach(screen => {
    if (screen) screen.classList.add('hidden');
  });
  
  // Show target screen
  if (screens[screenName]) {
    screens[screenName].classList.remove('hidden');
    currentScreen = screenName;
  }
}

// Check authentication status
function checkAuthenticationStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['access_token', 'user_data'], (result) => {
      console.log('Storage result:', result);
      const hasToken = !!result.access_token;
      
      if (hasToken && result.user_data) {
        userData = result.user_data;
        isAuthenticated = true;
      }
      
      resolve({
        isAuthenticated: hasToken,
        userData: result.user_data
      });
    });
  });
}

// Handle sign in with Google
async function handleSignIn() {
  try {
    console.log('Starting Google sign in...');
    
    // Show loading state
    const signInButton = document.getElementById('signInButton');
    const originalText = signInButton.textContent;
    signInButton.textContent = 'Signing in...';
    signInButton.disabled = true;
    
    // Request authentication from background script
    const authResult = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    if (authResult && authResult.success) {
      console.log('Authentication successful');
      
      // Load user data and show mini stats
      await loadUserData();
      await loadMiniStats();
      
      // Open dashboard in new tab
      openDashboard();
      
      // Show mini stats for future popup opens
      showScreen('miniStats');
      
    } else {
      throw new Error(authResult?.error || 'Authentication failed');
    }
    
  } catch (error) {
    console.error('Sign in error:', error);
    
    // Reset button
    const signInButton = document.getElementById('signInButton');
    signInButton.textContent = 'Sign in with Google';
    signInButton.disabled = false;
    
    // Show error message
    alert('Sign in failed. Please try again.');
  }
}

// Handle agree and continue (same as sign in for now)
async function handleAgreeAndContinue() {
  await handleSignIn();
}

// Handle decline
function handleDecline() {
  // Close popup
  window.close();
}

// Load user data
async function loadUserData() {
  try {
    console.log('Loading user data...');
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['user_data'], resolve);
    });
    
    if (result.user_data) {
      userData = result.user_data;
      console.log('User data loaded:', userData);
      
      // Update user info display
      const userInfoElement = document.getElementById('userInfo');
      if (userInfoElement) {
        if (userData.email) {
          userInfoElement.textContent = userData.email;
        } else {
          userInfoElement.textContent = 'User';
        }
      }
    } else {
      console.log('No user data found');
      // Set default user info
      const userInfoElement = document.getElementById('userInfo');
      if (userInfoElement) {
        userInfoElement.textContent = 'User';
      }
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load mini stats data
async function loadMiniStats() {
  try {
    console.log('Loading mini stats...');
    
    // Get basic stats from storage
    const storageResult = await new Promise((resolve) => {
      chrome.storage.local.get(['DevHistoryLength', 'user_stats'], resolve);
    });
    
    console.log('Storage stats:', storageResult);
    
    // Set basic stats
    document.getElementById('totalEntries').textContent = storageResult.DevHistoryLength || 0;
    
    // Try to get more detailed stats from backend
    await fetchDetailedStats();
    
    // Load recent activity
    await loadRecentActivity();
    
    console.log('Mini stats loaded successfully');
    
  } catch (error) {
    console.error('Error loading mini stats:', error);
    // Show basic stats even if detailed fetch fails
    document.getElementById('bugsFixed').textContent = '0';
    document.getElementById('conceptsLearned').textContent = '0';
    document.getElementById('timeSpent').textContent = '0h';
  }
}

// Fetch detailed stats from backend
async function fetchDetailedStats() {
  try {
    console.log('Fetching detailed stats from backend...');
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'getStats' 
      }, resolve);
    });
    
    console.log('Stats response:', response);
    
    if (response && response.success) {
      const stats = response.data;
      
      // Update stat cards
      document.getElementById('bugsFixed').textContent = stats.bugsFixed || 0;
      document.getElementById('conceptsLearned').textContent = stats.conceptsLearned || 0;
      document.getElementById('timeSpent').textContent = stats.timeSpent || '0h';
      
      // Store stats for future use
      chrome.storage.local.set({ user_stats: stats });
    } else {
      console.log('Failed to fetch stats, using fallback');
      // Use fallback stats
      document.getElementById('bugsFixed').textContent = '0';
      document.getElementById('conceptsLearned').textContent = '0';
      document.getElementById('timeSpent').textContent = '0h';
    }
  } catch (error) {
    console.error('Error fetching detailed stats:', error);
  }
}

// Load recent activity
async function loadRecentActivity() {
  try {
    console.log('Loading recent activity...');
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'getRecentActivity' 
      }, resolve);
    });
    
    console.log('Recent activity response:', response);
    
    if (response && response.success) {
      displayRecentActivity(response.data);
    } else {
      console.log('Using sample recent activity data');
      // Show sample data if no real data available
      displayRecentActivity([
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
      ]);
    }
  } catch (error) {
    console.error('Error loading recent activity:', error);
  }
}

// Display recent activity
function displayRecentActivity(activities) {
  const container = document.getElementById('recentActivityList');
  
  if (!activities || activities.length === 0) {
    container.innerHTML = '<p style="font-size: 12px; color: #666; text-align: center;">No recent activity</p>';
    return;
  }
  
  container.innerHTML = activities.slice(0, 3).map(activity => {
    const categoryClass = getCategoryClass(activity.category);
    const categoryLabel = getCategoryLabel(activity.category);
    
    return `
      <div class="activity-item">
        <div class="activity-title" title="${activity.title}">${activity.title}</div>
        <div class="activity-category ${categoryClass}">${categoryLabel}</div>
      </div>
    `;
  }).join('');
}

// Get category CSS class
function getCategoryClass(category) {
  const categoryMap = {
    'bug': 'category-bug',
    'learning': 'category-learning',
    'docs': 'category-docs',
    'documentation': 'category-docs',
    'tools': 'category-tools'
  };
  
  return categoryMap[category?.toLowerCase()] || 'category-learning';
}

// Get category display label
function getCategoryLabel(category) {
  const labelMap = {
    'bug': 'Bug Fix',
    'learning': 'Learning',
    'docs': 'Docs',
    'documentation': 'Docs',
    'tools': 'Tools'
  };
  
  return labelMap[category?.toLowerCase()] || 'Learning';
}

// Open dashboard in new tab
function openDashboard() {
  console.log('🚀 Opening React dashboard - checking storage for auth data...');
  
  // Get the access token and user data to pass to dashboard
  chrome.storage.local.get(['access_token', 'user_data'], (result) => {
    console.log('📋 Storage result:', {
      hasToken: !!result.access_token,
      hasUser: !!result.user_data,
      tokenPreview: result.access_token ? result.access_token.substring(0, 20) + '...' : 'None',
      userPreview: result.user_data ? (result.user_data.email || result.user_data.name || 'Unknown') : 'None'
    });
    
    let dashboardUrl = 'https://dashboard.devchronicles.xyz/';
    
    if (result.access_token) {
      // Create user data if missing
      const userData = result.user_data || {
        name: 'User',
        email: 'user@example.com'
      };
      
      const encodedUser = encodeURIComponent(JSON.stringify(userData));
      dashboardUrl += `?token=${result.access_token}&user=${encodedUser}`;
      console.log('✅ React Dashboard URL with auth:', dashboardUrl.replace(result.access_token, 'TOKEN_HIDDEN'));
    } else {
      console.warn('❌ No access token found in storage!');
      console.warn('Available storage keys:', Object.keys(result));
      
      // Try to get all storage data to debug
      chrome.storage.local.get(null, (allData) => {
        console.warn('🔍 All storage data:', allData);
      });
      
      // Still open dashboard but without token
      console.log('📝 Opening React dashboard without auth - user will see login prompt');
    }
    
    console.log('🌐 Final React dashboard URL:', dashboardUrl);
    
    chrome.tabs.create({ 
      url: dashboardUrl,
      active: true 
    });
  });
}

// Test background connection (for debugging)
function testBackgroundConnection() {
  chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
    console.log('Background connection test:', response);
  });
}

// Handle runtime messages (if needed)
chrome.runtime.onMessage?.addListener((message, sender, sendResponse) => {
  console.log('Popup received message:', message);
  
  if (message.action === 'refreshStats') {
    loadMiniStats();
  }
  
  sendResponse({ success: true });
});

// Periodic stats refresh (every 30 seconds when popup is open)
setInterval(() => {
  if (currentScreen === 'miniStats' && isAuthenticated) {
    loadMiniStats();
  }
}, 30000);
