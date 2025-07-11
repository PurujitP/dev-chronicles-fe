// Debug authentication helper
window.debugAuth = {
    // Check all possible token sources
    async checkAllSources() {
        console.log('=== AUTHENTICATION DEBUG ===');
        
        // 1. Check extension storage
        let extensionToken = null;
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get(['user_data', 'access_token'], resolve);
                });
                extensionToken = result.access_token;
                console.log('Extension token:', extensionToken ? `${extensionToken.substring(0, 20)}...` : 'None');
                console.log('Extension user data:', result.user_data);
            } else {
                console.log('Chrome extension API not available');
            }
        } catch (error) {
            console.error('Extension storage error:', error);
        }
        
        // 2. Check local storage
        const localToken = localStorage.getItem('devchronicles_token');
        const localUser = localStorage.getItem('devchronicles_user');
        console.log('Local storage token:', localToken ? `${localToken.substring(0, 20)}...` : 'None');
        console.log('Local storage user:', localUser);
        
        // 3. Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        const urlUser = urlParams.get('user');
        console.log('URL token:', urlToken ? `${urlToken.substring(0, 20)}...` : 'None');
        console.log('URL user:', urlUser);
        
        // 4. Test API with each token
        const tokens = [
            { source: 'extension', token: extensionToken },
            { source: 'localStorage', token: localToken },
            { source: 'url', token: urlToken }
        ];
        
        for (const { source, token } of tokens) {
            if (token) {
                console.log(`Testing ${source} token...`);
                await this.testToken(token);
            }
        }
        
        console.log('=== END AUTHENTICATION DEBUG ===');
    },
    
    // Test a specific token
    async testToken(token) {
        if (!token) {
            console.log('No token provided');
            return;
        }
        
        console.log(`Testing token: ${token.substring(0, 20)}...`);
        
        try {
            const response = await fetch('http://localhost:8000/backend-api/chrome/stats', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`Response status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Token valid! Data:', data);
                return true;
            } else {
                console.log('Token invalid or expired');
                return false;
            }
        } catch (error) {
            console.error('API call error:', error);
            return false;
        }
    },
    
    // Generate a curl command for testing
    generateCurl(token) {
        if (!token) {
            console.log('No token provided');
            return;
        }
        
        const curl = `curl 'http://localhost:8000/backend-api/chrome/stats' \\
  -H 'Accept: */*' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${token}'`;
        
        console.log('Test curl command:');
        console.log(curl);
        return curl;
    },
    
    // Clear all tokens
    clearTokens() {
        localStorage.removeItem('devchronicles_token');
        localStorage.removeItem('devchronicles_user');
        
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.remove(['user_data', 'access_token']);
        }
        
        console.log('All tokens cleared');
    },
    
    // Force reload dashboard with debugging
    async reloadDashboard() {
        console.log('Reloading dashboard with debugging...');
        
        // Clear existing dashboard instance
        if (window.dashboard) {
            window.dashboard = null;
        }
        
        // Create new dashboard instance
        window.dashboard = new Dashboard();
        await window.dashboard.init();
    }
};

// Auto-run debug on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Debug auth helper loaded. Use debugAuth.checkAllSources() to test authentication.');
}); 