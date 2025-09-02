// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.apiBaseUrl = 'https://api.devchronicles.xyz/backend-api';
        this.isLoading = false;
        this.userData = null;
        this.stats = null;
        this.recentActivity = null;
        this.accessToken = null;
        
        this.init();
    }

    async init() {
        console.log('Initializing dashboard...');
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Setup event listeners
            this.setupEventListeners();
            
            // Load user data
            await this.loadUserData();
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Hide loading overlay
            this.hideLoading();
            
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    setupEventListeners() {
        // Sync button
        document.getElementById('syncButton').addEventListener('click', () => {
            this.syncData();
        });

        // Export button
        document.getElementById('exportButton').addEventListener('click', () => {
            this.exportReport();
        });

        // Refresh activity button
        document.getElementById('refreshActivity').addEventListener('click', () => {
            this.loadRecentActivity();
        });

        // Category time filter
        document.getElementById('categoryTimeFilter').addEventListener('change', (e) => {
            this.loadCategoryData(e.target.value);
        });

        // Quick action buttons
        document.getElementById('viewHistoryBtn').addEventListener('click', () => {
            this.showNotification('History view coming soon!');
        });

        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.exportReport();
        });

        document.getElementById('manageDataBtn').addEventListener('click', () => {
            this.showNotification('Data management coming soon!');
        });

        document.getElementById('shareInsightsBtn').addEventListener('click', () => {
            this.showNotification('Sharing feature coming soon!');
        });

        // Add logout functionality to user profile area
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.addEventListener('click', () => {
                if (this.accessToken) {
                    this.logout();
                }
            });
            userProfile.style.cursor = 'pointer';
            userProfile.title = 'Click to logout';
        }

        // Search functionality
        const searchInput = document.querySelector('.search-box input');
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
    }

    async loadUserData() {
        try {
            console.log('Loading user data from various sources...');
            
            // Try to get user data and token from Chrome extension storage first
            if (typeof chrome !== 'undefined' && chrome.storage) {
                console.log('Chrome extension API detected, checking storage...');
                
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get(['user_data', 'access_token'], (result) => {
                        console.log('Extension storage result:', result);
                        resolve(result);
                    });
                });
                
                if (result.access_token && result.user_data) {
                    console.log('Found token in extension storage!');
                    this.userData = result.user_data;
                    this.accessToken = result.access_token;
                    this.updateUserInfo();
                    
                    // Also store in localStorage for backup
                    localStorage.setItem('devchronicles_token', this.accessToken);
                    localStorage.setItem('devchronicles_user', JSON.stringify(this.userData));
                    
                    return;
                } else {
                    console.log('No valid auth data in extension storage');
                }
            } else {
                console.log('Chrome extension API not available');
            }
            
            // Check for token in URL params (from extension redirect)
            console.log('Checking URL parameters...');
            const urlParams = new URLSearchParams(window.location.search);
            console.log('Current URL:', window.location.href);
            console.log('URL parameters:', Object.fromEntries(urlParams));
            
            // Check for token parameter (standard) or auth_token (fallback)
            const tokenFromUrl = urlParams.get('token') || urlParams.get('auth_token');
            const userFromUrl = urlParams.get('user');
            
            console.log('Token from URL:', tokenFromUrl ? `${tokenFromUrl.substring(0, 20)}...` : 'None');
            console.log('User from URL:', userFromUrl ? 'Present' : 'None');
            
            if (tokenFromUrl && userFromUrl) {
                console.log('Found token in URL parameters!');
                this.accessToken = tokenFromUrl;
                this.userData = JSON.parse(decodeURIComponent(userFromUrl));
                this.updateUserInfo();
                
                // Store in localStorage for future use
                localStorage.setItem('devchronicles_token', this.accessToken);
                localStorage.setItem('devchronicles_user', JSON.stringify(this.userData));
                
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            } else {
                console.log('No token found in URL parameters');
            }
            
            // Check localStorage for stored auth
            console.log('Checking localStorage...');
            const storedToken = localStorage.getItem('devchronicles_token');
            const storedUser = localStorage.getItem('devchronicles_user');
            
            if (storedToken && storedUser) {
                console.log('Found token in localStorage!');
                this.accessToken = storedToken;
                this.userData = JSON.parse(storedUser);
                this.updateUserInfo();
                return;
            } else {
                console.log('No token found in localStorage');
            }
            
            // Set default user info (no authentication)
            console.log('No authentication found, using default user');
            this.userData = { name: 'User', email: 'user@example.com' };
            this.updateUserInfo();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.userData = { name: 'User', email: 'user@example.com' };
            this.updateUserInfo();
        }
        
        console.log('Final authentication state:', {
            hasToken: !!this.accessToken,
            tokenPreview: this.accessToken ? this.accessToken.substring(0, 20) + '...' : 'None',
            user: this.userData
        });
    }

    updateUserInfo() {
        const userNameElement = document.getElementById('userName');
        if (userNameElement && this.userData) {
            userNameElement.textContent = this.userData.name || this.userData.email || 'User';
        }
        
        // Show login button if not authenticated
        if (!this.accessToken && !this.isLoading) {
            this.showLoginPrompt();
        }
        
        // Validate token if available
        if (this.accessToken) {
            this.validateToken();
        }
    }

    async refreshToken() {
        try {
            console.log('Attempting to refresh token...');
            
            // Try to get refresh token from Chrome extension storage
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get(['refresh_token'], resolve);
                });
                
                if (result.refresh_token) {
                    const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: result.refresh_token })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Store new tokens
                        await new Promise((resolve) => {
                            chrome.storage.local.set({
                                access_token: data.access_token,
                                refresh_token: data.refresh_token || result.refresh_token
                            }, resolve);
                        });
                        
                        this.accessToken = data.access_token;
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
    }

    async validateToken() {
        if (!this.accessToken) {
            console.log('No token to validate');
            return false;
        }
        
        try {
            console.log('Validating token...');
            const response = await fetch(`${this.apiBaseUrl}/chrome/test`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
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
                        await this.refreshToken();
                        console.log('Token refreshed successfully');
                        return true;
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        this.accessToken = null;
                        localStorage.removeItem('devchronicles_token');
                        this.showLoginPrompt();
                        return false;
                    }
                }
                return false;
            }
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    async loadDashboardData() {
        console.log('Loading dashboard data...');
        console.log('Token status before API calls:', this.accessToken ? 'Available' : 'Missing');
        
        // Make sure we have a valid token before making API calls
        if (!this.accessToken) {
            console.warn('No access token available, using sample data');
            this.useSampleData();
            return;
        }
        
        // Load data sequentially to avoid race conditions
        try {
            await this.loadStats();
            await this.loadRecentActivity();
            await this.loadCategoryData();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.useSampleData();
        }
    }
    
    useSampleData() {
        console.log('Using sample data for all components');
        
        // Use sample stats
        this.stats = {
            titlesExplored: 12,
            conceptsLearned: 8,
            timeSpent: '24h',
            totalEntries: 156
        };
        this.updateStatsDisplay();
        
        // Use sample activity
        this.recentActivity = this.getSampleActivity();
        this.updateActivityDisplay();
        
        // Use sample category data
        this.useSampleCategoryData();
    }

    async loadStats() {
        try {
            console.log('Loading stats...');
            console.log('Access token:', this.accessToken ? 'Present' : 'Missing');
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add authorization header if token is available
            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                console.log('Added Authorization header');
            } else {
                console.log('No access token - will get 401 error');
            }
            
            console.log('Request headers:', headers);
            
            const response = await fetch(`${this.apiBaseUrl}/chrome/stats`, {
                method: 'GET',
                headers: headers
            });
            
            if (response.ok) {
                this.stats = await response.json();
                this.updateStatsDisplay();
                
                // Store auth data if successful
                if (this.accessToken && this.userData) {
                    localStorage.setItem('devchronicles_token', this.accessToken);
                    localStorage.setItem('devchronicles_user', JSON.stringify(this.userData));
                }
            } else {
                console.log('Failed to load stats, using sample data. Status:', response.status);
                this.stats = {
                    titlesExplored: 12,
                    conceptsLearned: 8,
                    timeSpent: '24h',
                    totalEntries: 156
                };
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            // Use sample data as fallback
            this.stats = {
                titlesExplored: 12,
                conceptsLearned: 8,
                timeSpent: '24h',
                totalEntries: 156
            };
            this.updateStatsDisplay();
        }
    }

    updateStatsDisplay() {
        if (!this.stats) return;
        
        // Helper function to parse both old and new API formats
        const parseMetric = (metric) => {
            if (typeof metric === 'object' && metric.value !== undefined) {
                // New format: { value: X, meta_data: { percentage_increased: Y } }
                return {
                    value: metric.value,
                    percentage: metric.meta_data?.percentage_increased || 0
                };
            } else {
                // Old format: simple value
                return {
                    value: metric,
                    percentage: 0
                };
            }
        };

        const titlesExplored = parseMetric(this.stats.titlesExplored);
        const conceptsLearned = parseMetric(this.stats.conceptsLearned);
        const timeSpent = parseMetric(this.stats.timeSpent);
        const totalEntries = parseMetric(this.stats.totalEntries);

        // Update values
        document.getElementById('titlesExplored').textContent = titlesExplored.value || 0;
        document.getElementById('conceptsLearned').textContent = conceptsLearned.value || 0;
        document.getElementById('timeSpent').textContent = timeSpent.value || '0h';
        document.getElementById('totalEntries').textContent = totalEntries.value || 0;

        // Update percentage indicators
        this.updatePercentageIndicator('titles-percentage', titlesExplored.percentage);
        this.updatePercentageIndicator('concepts-percentage', conceptsLearned.percentage);
        this.updatePercentageIndicator('time-percentage', timeSpent.percentage);
        this.updatePercentageIndicator('entries-percentage', totalEntries.percentage);
    }

    updatePercentageIndicator(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (element) {
            const isPositive = percentage > 0;
            const isNegative = percentage < 0;
            
            // Update the text content
            element.textContent = percentage === 0 ? '0%' : `${isPositive ? '+' : ''}${percentage}%`;
            
            // Update the styling based on positive/negative/neutral
            element.className = 'percentage';
            if (isPositive) {
                element.classList.add('positive');
            } else if (isNegative) {
                element.classList.add('negative');
            } else {
                element.classList.add('neutral');
            }
            
            // Update the arrow icon in the parent metric-change div
            const parentChange = element.closest('.metric-change');
            if (parentChange) {
                const icon = parentChange.querySelector('i');
                if (icon) {
                    // Remove all existing arrow classes
                    icon.classList.remove('fa-arrow-up', 'fa-arrow-down', 'fa-minus');
                    
                    // Add appropriate arrow based on percentage
                    if (isPositive) {
                        icon.classList.add('fa-arrow-up');
                    } else if (isNegative) {
                        icon.classList.add('fa-arrow-down');
                    } else {
                        icon.classList.add('fa-minus');
                    }
                }
            }
        }
    }

    async loadRecentActivity() {
        try {
            console.log('Loading recent activity...');
            console.log('Access token for recent activity:', this.accessToken ? 'Present' : 'Missing');
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add authorization header if token is available
            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                console.log('Added Authorization header for recent activity');
            } else {
                console.log('No access token - recent activity will get 401 error');
            }
            
            const response = await fetch(`${this.apiBaseUrl}/chrome/recent-activity`, {
                method: 'GET',
                headers: headers
            });
            
            if (response.ok) {
                this.recentActivity = await response.json();
                console.log('Recent activity data:', this.recentActivity);
                this.updateActivityDisplay();
            } else {
                console.log('Failed to load activity, using sample data. Status:', response.status);
                if (response.status === 401) {
                    console.error('Authentication failed for recent activity - token may be invalid');
                }
                this.recentActivity = this.getSampleActivity();
                this.updateActivityDisplay();
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            this.recentActivity = this.getSampleActivity();
            this.updateActivityDisplay();
        }
    }

    getSampleActivity() {
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
    }

    updateActivityDisplay() {
        const activityList = document.getElementById('activityList');
        
        if (!this.recentActivity || this.recentActivity.length === 0) {
            activityList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No recent activity found.</p>';
            return;
        }

        activityList.innerHTML = this.recentActivity.slice(0, 10).map(item => {
            // Handle different timestamp formats and fields
            const timestamp = item.timestamp || item.created_at || item.date || new Date();
            const timeAgo = this.formatTimeAgo(timestamp);
            
            // Handle different category field names and values
            const category = item.category || item.main_category || item.type || 'learning';
            const categoryClass = this.getCategoryClass(category);
            const categoryIcon = this.getCategoryIcon(category);
            
            // Extract domain from URL if not provided
            const domain = item.domain || this.extractDomain(item.url || item.link || '');
            
            // Handle different URL field names
            const url = item.url || item.link || '';
            
            return `
                <div class="activity-item" data-url="${url}">
                    <div class="activity-icon ${categoryClass}">
                        <i class="${categoryIcon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title" title="${item.title || 'Untitled'}">${item.title || 'Untitled'}</div>
                        <div class="activity-meta">
                            <span>${domain || 'Unknown source'}</span>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers for activity items
        activityList.querySelectorAll('.activity-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                if (url) {
                    window.open(url, '_blank');
                }
            });
        });
    }

    async loadCategoryData(days = 7) {
        try {
            console.log(`Loading category data for ${days} days...`);
            console.log('Access token for category data:', this.accessToken ? 'Present' : 'Missing');
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add authorization header if token is available
            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                console.log('Added Authorization header for category data');
            } else {
                console.log('No access token - category data will get 401 error');
            }
            
            const response = await fetch(`${this.apiBaseUrl}/chrome/category-wise-breakdown?days=${days}`, {
                method: 'GET',
                headers: headers
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Category breakdown data:', data);
                this.updateCategoryDisplay(data);
            } else {
                console.log('Failed to load category data, using sample data. Status:', response.status);
                if (response.status === 401) {
                    console.error('Authentication failed for category data - token may be invalid');
                } else if (response.status === 404) {
                    console.error('Category breakdown endpoint not found - API not implemented yet');
                }
                this.useSampleCategoryData();
            }
        } catch (error) {
            console.error('Error loading category data:', error);
            this.useSampleCategoryData();
        }
    }

    useSampleCategoryData() {
        // Fallback sample data in the expected API format
        const sampleData = {
            period: {
                days: 7,
                start_date: "2025-06-28T00:00:00Z",
                end_date: "2025-07-05T23:59:59Z"
            },
            categories: {
                "1": {
                    value: 23,
                    label: "data systems",
                    metadata: {
                        percentage_change: -15
                    }
                },
                "2": {
                    value: 44,
                    label: "infrastructure",
                    metadata: {
                        percentage_change: 15
                    }
                },
                "3": {
                    value: 33,
                    label: "gen-ai",
                    metadata: {
                        percentage_change: -25
                    }
                },
                "4": {
                    value: 42,
                    label: "scaling",
                    metadata: {
                        percentage_change: 45
                    }
                }
            },
            total_entries: 98,
            summary: {
                most_active_category: "infrastructure",
                growth_category: "scaling",
                decline_category: "gen-ai"
            }
        };
        
        this.updateCategoryDisplay(sampleData);
    }

    updateCategoryDisplay(data) {
        const categoryList = document.getElementById('categoryList');
        
        if (!data || !data.categories) {
            categoryList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No category data available.</p>';
            return;
        }
        
        // Convert categories object to array for easier processing
        const categoryArray = Object.entries(data.categories).map(([key, cat]) => ({
            id: key,
            name: cat.label,
            value: cat.value,
            percentage_change: cat.metadata?.percentage_change || 0,
            category: this.mapLabelToCategory(cat.label)
        }));
        
        // Sort by value (descending)
        categoryArray.sort((a, b) => b.value - a.value);
        
        categoryList.innerHTML = categoryArray.map(cat => `
            <div class="category-item">
                <div class="category-info">
                    <div class="category-color ${cat.category}"></div>
                    <span class="category-name">${cat.name}</span>
                </div>
                <div class="category-stats">
                    <div class="category-count">${cat.value}</div>
                    <div class="category-change ${cat.percentage_change >= 0 ? 'positive' : 'negative'}">
                        ${cat.percentage_change >= 0 ? '+' : ''}${cat.percentage_change}%
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    mapLabelToCategory(label) {
        if (!label) return 'learning';
        
        const labelLower = label.toLowerCase();
        const categoryMap = {
            'data systems': 'tools',
            'infrastructure': 'tools', 
            'gen-ai': 'learning',
            'scaling': 'docs',
            'programming': 'learning',
            'development': 'learning',
            'documentation': 'docs',
            'tutorial': 'learning',
            'guide': 'docs',
            'tools': 'tools',
            'learning': 'learning'
        };
        
        // Check for exact matches first
        if (categoryMap[labelLower]) {
            return categoryMap[labelLower];
        }
        
        // Check for partial matches
        for (const [key, value] of Object.entries(categoryMap)) {
            if (labelLower.includes(key)) {
                return value;
            }
        }
        
        return 'learning'; // default fallback
    }

    getCategoryClass(category) {
        if (!category) return 'learning';
        
        const categoryLower = category.toLowerCase();
        const classMap = {
            'titles': 'titles',
            'learning': 'learning',
            'docs': 'docs',
            'documentation': 'docs',
            'tools': 'tools',
            'technology': 'learning',
            'computing': 'learning',
            'programming': 'learning',
            'development': 'learning',
            'web development': 'learning',
            'tutorial': 'learning',
            'guide': 'docs',
            'reference': 'docs',
            'api': 'docs',
            'stackoverflow': 'tools',
            'github': 'tools'
        };
        
        // Check for partial matches
        for (const [key, value] of Object.entries(classMap)) {
            if (categoryLower.includes(key)) {
                return value;
            }
        }
        
        return 'learning';
    }

    getCategoryIcon(category) {
        if (!category) return 'fas fa-circle';
        
        const categoryLower = category.toLowerCase();
        const iconMap = {
            'titles': 'fas fa-book-open',
            'learning': 'fas fa-graduation-cap',
            'docs': 'fas fa-book',
            'documentation': 'fas fa-book',
            'tools': 'fas fa-tools',
            'technology': 'fas fa-graduation-cap',
            'computing': 'fas fa-graduation-cap',
            'programming': 'fas fa-code',
            'development': 'fas fa-code',
            'web development': 'fas fa-code',
            'tutorial': 'fas fa-play-circle',
            'guide': 'fas fa-book',
            'reference': 'fas fa-book',
            'api': 'fas fa-book',
            'stackoverflow': 'fas fa-stack-overflow',
            'github': 'fas fa-code-branch'
        };
        
        // Check for partial matches
        for (const [key, value] of Object.entries(iconMap)) {
            if (categoryLower.includes(key)) {
                return value;
            }
        }
        
        return 'fas fa-circle';
    }

    extractDomain(url) {
        if (!url) return '';
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch (e) {
            return url.split('/')[0] || '';
        }
    }

    formatTimeAgo(timestamp) {
        try {
            const now = new Date();
            const time = new Date(timestamp);
            
            // Check if the date is valid
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
    }

    async syncData() {
        try {
            this.showLoading();
            
            // Simulate sync process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Reload dashboard data
            await this.loadDashboardData();
            
            this.hideLoading();
            this.showNotification('Data synchronized successfully!');
        } catch (error) {
            console.error('Error syncing data:', error);
            this.hideLoading();
            this.showError('Failed to sync data');
        }
    }

    exportReport() {
        try {
            const reportData = {
                user: this.userData,
                stats: this.stats,
                recentActivity: this.recentActivity,
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
            
            this.showNotification('Report exported successfully!');
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showError('Failed to export report');
        }
    }

    handleSearch(query) {
        if (!query.trim()) {
            // Show all activities
            this.updateActivityDisplay();
            return;
        }
        
        // Filter activities based on search query
        if (this.recentActivity) {
            const filtered = this.recentActivity.filter(item => 
                item.title.toLowerCase().includes(query.toLowerCase()) ||
                item.domain.toLowerCase().includes(query.toLowerCase())
            );
            
            const activityList = document.getElementById('activityList');
            
            if (filtered.length === 0) {
                activityList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No matching activities found.</p>';
            } else {
                // Update display with filtered results
                const originalActivity = this.recentActivity;
                this.recentActivity = filtered;
                this.updateActivityDisplay();
                this.recentActivity = originalActivity;
            }
        }
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.remove('hidden');
        this.isLoading = true;
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.add('hidden');
        this.isLoading = false;
    }

    showNotification(message, type = 'success') {
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
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showLoginPrompt() {
        // Add login prompt to the page header
        const pageHeader = document.querySelector('.page-header');
        if (pageHeader && !document.getElementById('loginPrompt')) {
            const loginPrompt = document.createElement('div');
            loginPrompt.id = 'loginPrompt';
            loginPrompt.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 14px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            `;
            
            loginPrompt.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-info-circle"></i>
                    <span>For real data, use the <strong>DevChronicles Chrome Extension</strong> and click "View Full Dashboard"</span>
                </div>
                <button onclick="this.parentElement.remove()" style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">&times;</button>
            `;
            
            pageHeader.insertBefore(loginPrompt, pageHeader.firstChild);
        }
    }

    logout() {
        // Clear stored authentication data
        localStorage.removeItem('devchronicles_token');
        localStorage.removeItem('devchronicles_user');
        this.accessToken = null;
        this.userData = { name: 'User', email: 'user@example.com' };
        
        // Update UI
        this.updateUserInfo();
        
        // Reload with dummy data
        this.loadDashboardData();
        
        this.showNotification('Logged out successfully');
    }


}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Refresh data when page becomes visible
        if (window.dashboard && !window.dashboard.isLoading) {
            window.dashboard.loadDashboardData();
        }
    }
}); 