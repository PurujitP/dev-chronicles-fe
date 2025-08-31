import React, { useState, useEffect, useCallback } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState({ name: 'User', email: 'user@example.com' });
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredActivity, setFilteredActivity] = useState(null);

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  console.log('API Base URL:', apiBaseUrl);
  // Load user data from various sources
  const loadUserData = useCallback(async () => {
    try {
      console.log('Loading user data from various sources...');
      
      // Try Chrome extension storage first
      if (typeof window.chrome !== 'undefined' && window.chrome.storage) {
        console.log('Chrome extension API detected, checking storage...');
        
        const result = await new Promise((resolve) => {
          window.chrome.storage.local.get(['user_data', 'access_token'], (result) => {
            console.log('Extension storage result:', result);
            resolve(result);
          });
        });
        
        if (result.access_token && result.user_data) {
          console.log('Found token in extension storage!');
          setUserData(result.user_data);
          setAccessToken(result.access_token);
          
          // Store in localStorage for backup
          localStorage.setItem('devchronicles_token', result.access_token);
          localStorage.setItem('devchronicles_user', JSON.stringify(result.user_data));
          
          return;
        } else {
          console.log('No valid auth data in extension storage');
        }
      } else {
        console.log('Chrome extension API not available');
      }
      
      // Check URL parameters
      console.log('Checking URL parameters...');
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token') || urlParams.get('auth_token');
      const userFromUrl = urlParams.get('user');
      
      if (tokenFromUrl && userFromUrl) {
        console.log('Found token in URL parameters!');
        setAccessToken(tokenFromUrl);
        setUserData(JSON.parse(decodeURIComponent(userFromUrl)));
        
        // Store in localStorage for future use
        localStorage.setItem('devchronicles_token', tokenFromUrl);
        localStorage.setItem('devchronicles_user', userFromUrl);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      // Check localStorage
      console.log('Checking localStorage...');
      const storedToken = localStorage.getItem('devchronicles_token');
      const storedUser = localStorage.getItem('devchronicles_user');
      
      if (storedToken && storedUser) {
        console.log('Found token in localStorage!');
        setAccessToken(storedToken);
        setUserData(JSON.parse(storedUser));
        return;
      }
      
      // Default user info (no authentication)
      console.log('No authentication found, using default user');
      setUserData({ name: 'User', email: 'user@example.com' });
      
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserData({ name: 'User', email: 'user@example.com' });
    }
  }, []);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      console.log('Attempting to refresh token...');
      
      // Try to get refresh token from Chrome extension storage
      if (typeof window.chrome !== 'undefined' && window.chrome.storage) {
        const result = await new Promise((resolve) => {
          window.chrome.storage.local.get(['refresh_token'], resolve);
        });
        
        if (result.refresh_token) {
          const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: result.refresh_token })
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Store new tokens
            await new Promise((resolve) => {
              window.chrome.storage.local.set({
                access_token: data.access_token,
                refresh_token: data.refresh_token || result.refresh_token
              }, resolve);
            });
            
            setAccessToken(data.access_token);
            localStorage.setItem('devchronicles_token', data.access_token);
            console.log('Token refresh successful');
            return data.access_token;
          } else {
            throw new Error(`Refresh failed with status ${response.status}`);
          }
        } else {
          throw new Error('No refresh token available');
        }
      } else {
        throw new Error('Chrome extension API not available');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }, [apiBaseUrl, setAccessToken]);

  // Validate token with refresh fallback
  const validateToken = useCallback(async () => {
    if (!accessToken) {
      console.log('No token to validate');
      return false;
    }
    
    try {
      console.log('Validating token...');
      const response = await fetch(`${apiBaseUrl}/chrome/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        console.log('Token is valid');
        return true;
      } else {
        console.error('Token validation failed:', response.status);
        if (response.status === 401) {
          console.error('Token is invalid or expired, attempting refresh...');
          
          try {
            await refreshToken();
            console.log('Token refreshed successfully');
            return true;
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            setAccessToken(null);
            localStorage.removeItem('devchronicles_token');
            return false;
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }, [accessToken, apiBaseUrl, refreshToken, setAccessToken]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      console.log('Loading stats...');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(`${apiBaseUrl}/chrome/stats`, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        
        // Store auth data if successful
        if (accessToken && userData) {
          localStorage.setItem('devchronicles_token', accessToken);
          localStorage.setItem('devchronicles_user', JSON.stringify(userData));
        }
      } else {
        console.log('Failed to load stats, using sample data. Status:', response.status);
        setStats({
          titlesExplored: 12,
          conceptsLearned: 8,
          timeSpent: '24h',
          totalEntries: 156
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        titlesExplored: 12,
        conceptsLearned: 8,
        timeSpent: '24h',
        totalEntries: 156
      });
    }
  }, [accessToken, apiBaseUrl, userData]);

  // Load recent activity
  const loadRecentActivity = useCallback(async () => {
    try {
      console.log('Loading recent activity...');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(`${apiBaseUrl}/chrome/recent-activity`, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data);
      } else {
        console.log('Failed to load activity, using sample data. Status:', response.status);
        setRecentActivity(getSampleActivity());
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity(getSampleActivity());
    }
  }, [accessToken, apiBaseUrl]);

  // Get sample activity data
  const getSampleActivity = () => {
    return [
      {
        id: 1,
        title: 'How to fix React useState hook errors',
        url: 'https://stackoverflow.com/questions/react-usestate',
        category: 'titles',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        domain: 'stackoverflow.com'
      },
      {
        id: 2,
        title: 'Python async/await tutorial',
        url: 'https://realpython.com/async-io-python/',
        category: 'learning',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        domain: 'realpython.com'
      },
      {
        id: 3,
        title: 'Docker compose documentation',
        url: 'https://docs.docker.com/compose/',
        category: 'docs',
        timestamp: new Date(Date.now() - 1000 * 60 * 90),
        domain: 'docs.docker.com'
      },
      {
        id: 4,
        title: 'VS Code extensions for Python',
        url: 'https://code.visualstudio.com/docs/python/python-tutorial',
        category: 'tools',
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        domain: 'code.visualstudio.com'
      },
      {
        id: 5,
        title: 'Understanding JavaScript closures',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures',
        category: 'learning',
        timestamp: new Date(Date.now() - 1000 * 60 * 150),
        domain: 'developer.mozilla.org'
      }
    ];
  };

  // Load category data
  const loadCategoryData = useCallback(async (days = 7) => {
    try {
      console.log(`Loading category data for ${days} days...`);
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(`${apiBaseUrl}/chrome/category-wise-breakdown?days=${days}`, {
        method: 'GET',
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategoryData(data);
      } else {
        console.log('Failed to load category data, using sample data. Status:', response.status);
        setCategoryData(getSampleCategoryData());
      }
    } catch (error) {
      console.error('Error loading category data:', error);
      setCategoryData(getSampleCategoryData());
    }
  }, [accessToken, apiBaseUrl]);

  // Get sample category data
  const getSampleCategoryData = () => {
    return {
      period: {
        days: 7,
        start_date: "2025-06-28T00:00:00Z",
        end_date: "2025-07-05T23:59:59Z"
      },
      categories: {
        "1": {
          value: 23,
          label: "data systems",
          metadata: { percentage_change: -15 }
        },
        "2": {
          value: 44,
          label: "infrastructure",
          metadata: { percentage_change: 15 }
        },
        "3": {
          value: 33,
          label: "gen-ai",
          metadata: { percentage_change: -25 }
        },
        "4": {
          value: 42,
          label: "scaling",
          metadata: { percentage_change: 45 }
        }
      },
      total_entries: 98
    };
  };

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('Initializing dashboard...');
      setIsLoading(true);
      
      try {
        await loadUserData();
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeDashboard();
  }, [loadUserData]);

  // Load dashboard data when access token changes
  useEffect(() => {
    if (!isLoading) {
      const loadDashboardData = async () => {
        // First validate token quickly for login
        if (accessToken) {
          const isValid = await validateToken();
          if (!isValid) {
            console.log('Token validation failed');
            return;
          }
        }
        
        // Load dashboard data non-blocking to prevent login delays
        // These calls run in parallel but don't block the UI
        Promise.all([
          loadStats(),
          loadRecentActivity(),
          loadCategoryData()
        ]).catch(error => {
          console.error('Error loading dashboard data:', error);
          // Continue with sample data if API calls fail
        });
      };
      
      loadDashboardData();
    }
  }, [isLoading, accessToken, validateToken, loadStats, loadRecentActivity, loadCategoryData]);

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredActivity(recentActivity);
    } else if (recentActivity) {
      const filtered = recentActivity.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.domain && item.domain.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredActivity(filtered);
    }
  }, [searchQuery, recentActivity]);

  // Utility functions
  const parseMetric = (metric) => {
    if (typeof metric === 'object' && metric.value !== undefined) {
      return {
        value: metric.value,
        percentage: metric.meta_data?.percentage_increased || 0
      };
    } else {
      return {
        value: metric,
        percentage: 0
      };
    }
  };

  const formatTimeAgo = (timestamp) => {
    try {
      const now = new Date();
      const time = new Date(timestamp);
      
      if (isNaN(time.getTime())) {
        return 'Recently';
      }
      
      const diffMs = now - time;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return time.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  const getCategoryClass = (category) => {
    if (!category) return 'learning';
    
    const categoryLower = category.toLowerCase();
    const classMap = {
      'titles': 'titles',
      'learning': 'learning',
      'docs': 'docs',
      'tools': 'tools'
    };
    
    for (const [key, value] of Object.entries(classMap)) {
      if (categoryLower.includes(key)) {
        return value;
      }
    }
    
    return 'learning';
  };

  const getCategoryIcon = (category) => {
    if (!category) return 'fas fa-circle';
    
    const categoryLower = category.toLowerCase();
    const iconMap = {
      'titles': 'fas fa-book-open',
      'learning': 'fas fa-graduation-cap',
      'docs': 'fas fa-book',
      'tools': 'fas fa-tools'
    };
    
    for (const [key, value] of Object.entries(iconMap)) {
      if (categoryLower.includes(key)) {
        return value;
      }
    }
    
    return 'fas fa-circle';
  };

  const extractDomain = (url) => {
    if (!url) return '';
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch (e) {
      return url.split('/')[0] || '';
    }
  };

  // Event handlers
  const handleSync = async () => {
    setIsLoading(true);
    
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reload data
      await Promise.all([
        loadStats(),
        loadRecentActivity(),
        loadCategoryData()
      ]);
      
      showNotification('Data synchronized successfully!');
    } catch (error) {
      console.error('Error syncing data:', error);
      showNotification('Failed to sync data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const reportData = {
        user: userData,
        stats: stats,
        recentActivity: recentActivity,
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devchronicles-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('Report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      showNotification('Failed to export report', 'error');
    }
  };

  const handleActivityClick = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const showNotification = (message, type = 'success') => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10B981' : '#EF4444'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1001;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <i className="fas fa-chart-line"></i>
              <span>DevChronicles</span>
            </div>
            <nav className="nav">
              <button className="nav-link active">Dashboard</button>
              <button className="nav-link">History</button>
              <button className="nav-link">Insights</button>
              <button className="nav-link">Settings</button>
            </nav>
          </div>
          <div className="header-right">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input 
                type="text" 
                placeholder="Search your history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="user-profile">
              <img src="https://via.placeholder.com/32x32/4F46E5/ffffff?text=U" alt="Profile" className="profile-avatar" />
              <span className="user-name">{userData?.name || userData?.email || 'User'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {/* Page Header */}
          <section className="page-header">
            <div className="page-title">
              <h1>Developer Dashboard</h1>
              <p>Track your learning journey and development insights</p>
            </div>
            <div className="page-actions">
              <button className="btn btn-secondary" onClick={handleSync}>
                <i className="fas fa-sync"></i>
                Sync Data
              </button>
              <button className="btn btn-primary" onClick={handleExport}>
                <i className="fas fa-download"></i>
                Export Report
              </button>
            </div>
          </section>

          {/* Login Prompt */}
          {!accessToken && (
            <div className="login-prompt">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-info-circle"></i>
                <span>For real data, use the <strong>DevChronicles Chrome Extension</strong> and click "View Full Dashboard"</span>
              </div>
              <button 
                onClick={() => document.querySelector('.login-prompt').remove()}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Metrics Cards */}
          <section className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon titles-icon">
                <i className="fas fa-book-open"></i>
              </div>
              <div className="metric-content">
                <div className="metric-value">
                  {stats ? parseMetric(stats.titlesExplored).value || 0 : 0}
                </div>
                <div className="metric-label">Titles Explored</div>
                <div className="metric-change">
                  <i className="fas fa-arrow-up"></i>
                  <span className="percentage">
                    {stats ? parseMetric(stats.titlesExplored).percentage : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon concept-icon">
                <i className="fas fa-lightbulb"></i>
              </div>
              <div className="metric-content">
                <div className="metric-value">
                  {stats ? parseMetric(stats.conceptsLearned).value || 0 : 0}
                </div>
                <div className="metric-label">Concepts Learned</div>
                <div className="metric-change">
                  <i className="fas fa-arrow-up"></i>
                  <span className="percentage">
                    {stats ? parseMetric(stats.conceptsLearned).percentage : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon time-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="metric-content">
                <div className="metric-value">
                  {stats ? parseMetric(stats.timeSpent).value || '0h' : '0h'}
                </div>
                <div className="metric-label">Time Spent</div>
                <div className="metric-change">
                  <i className="fas fa-minus"></i>
                  <span className="percentage">
                    {stats ? parseMetric(stats.timeSpent).percentage : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon entries-icon">
                <i className="fas fa-database"></i>
              </div>
              <div className="metric-content">
                <div className="metric-value">
                  {stats ? parseMetric(stats.totalEntries).value || 0 : 0}
                </div>
                <div className="metric-label">Total Entries</div>
                <div className="metric-change">
                  <i className="fas fa-arrow-up"></i>
                  <span className="percentage">
                    {stats ? parseMetric(stats.totalEntries).percentage : 0}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Dashboard Content Grid */}
          <section className="dashboard-grid">
            {/* Activity Feed */}
            <div className="dashboard-card activity-card">
              <div className="card-header">
                <h3>Recent Activity</h3>
                <div className="card-actions">
                  <button className="btn-icon" onClick={loadRecentActivity}>
                    <i className="fas fa-refresh"></i>
                  </button>
                  <button className="btn-icon">
                    <i className="fas fa-ellipsis-h"></i>
                  </button>
                </div>
              </div>
              <div className="card-content">
                <div className="activity-list">
                  {!filteredActivity || filteredActivity.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      {searchQuery ? 'No matching activities found.' : 'No recent activity found.'}
                    </p>
                  ) : (
                    filteredActivity.slice(0, 10).map((item) => {
                      const timestamp = item.timestamp || item.created_at || item.date || new Date();
                      const category = item.category || item.main_category || item.type || 'learning';
                      const domain = item.domain || extractDomain(item.url || item.link || '');
                      const url = item.url || item.link || '';

                      return (
                        <div 
                          key={item.id} 
                          className="activity-item"
                          onClick={() => handleActivityClick(url)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={`activity-icon ${getCategoryClass(category)}`}>
                            <i className={getCategoryIcon(category)}></i>
                          </div>
                          <div className="activity-content">
                            <div className="activity-title" title={item.title || 'Untitled'}>
                              {item.title || 'Untitled'}
                            </div>
                            <div className="activity-meta">
                              <span>{domain || 'Unknown source'}</span>
                              <span className="activity-time">{formatTimeAgo(timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="dashboard-card category-card">
              <div className="card-header">
                <h3>Category Breakdown</h3>
                <div className="card-actions">
                  <select 
                    className="time-filter" 
                    onChange={(e) => loadCategoryData(e.target.value)}
                    defaultValue="7"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 3 months</option>
                  </select>
                </div>
              </div>
              <div className="card-content">
                <div className="category-list">
                  {!categoryData || !categoryData.categories ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      No category data available.
                    </p>
                  ) : (
                    Object.entries(categoryData.categories)
                      .map(([key, cat]) => ({
                        id: key,
                        name: cat.label,
                        value: cat.value,
                        percentage_change: cat.metadata?.percentage_change || 0
                      }))
                      .sort((a, b) => b.value - a.value)
                      .map((cat) => (
                        <div key={cat.id} className="category-item">
                          <div className="category-info">
                            <div className={`category-color ${getCategoryClass(cat.name)}`}></div>
                            <span className="category-name">{cat.name}</span>
                          </div>
                          <div className="category-stats">
                            <div className="category-count">{cat.value}</div>
                            <div className={`category-change ${cat.percentage_change >= 0 ? 'positive' : 'negative'}`}>
                              {cat.percentage_change >= 0 ? '+' : ''}{cat.percentage_change}%
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Learning Progress */}
            <div className="dashboard-card progress-card">
              <div className="card-header">
                <h3>Learning Progress</h3>
                <div className="card-actions">
                  <button className="btn-icon">
                    <i className="fas fa-chart-line"></i>
                  </button>
                </div>
              </div>
              <div className="card-content">
                <div className="progress-item">
                  <div className="progress-label">
                    <span>JavaScript</span>
                    <span className="progress-percent">75%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div className="progress-item">
                  <div className="progress-label">
                    <span>Python</span>
                    <span className="progress-percent">65%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '65%' }}></div>
                  </div>
                </div>
                <div className="progress-item">
                  <div className="progress-label">
                    <span>React</span>
                    <span className="progress-percent">40%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div className="progress-item">
                  <div className="progress-label">
                    <span>DevOps</span>
                    <span className="progress-percent">30%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-card actions-card">
              <div className="card-header">
                <h3>Quick Actions</h3>
              </div>
              <div className="card-content">
                <div className="action-buttons">
                  <button className="action-btn" onClick={() => showNotification('History view coming soon!')}>
                    <i className="fas fa-history"></i>
                    <span>View Full History</span>
                  </button>
                  <button className="action-btn" onClick={handleExport}>
                    <i className="fas fa-file-alt"></i>
                    <span>Generate Report</span>
                  </button>
                  <button className="action-btn" onClick={() => showNotification('Data management coming soon!')}>
                    <i className="fas fa-cog"></i>
                    <span>Manage Data</span>
                  </button>
                  <button className="action-btn" onClick={() => showNotification('Sharing feature coming soon!')}>
                    <i className="fas fa-share-alt"></i>
                    <span>Share Insights</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
