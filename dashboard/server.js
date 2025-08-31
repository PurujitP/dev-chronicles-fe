const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the build directory (for production build)
const buildPath = path.join(__dirname, 'build');
const publicPath = path.join(__dirname, 'public');

// Check if build directory exists (production mode)
const hasBuiltApp = fs.existsSync(buildPath) && fs.existsSync(path.join(buildPath, 'index.html'));

if (hasBuiltApp) {
    console.log('Serving built React app from build directory');
    app.use(express.static(buildPath));
} else {
    console.log('Build not found, serving from public directory (for development)');
    app.use(express.static(publicPath));
}

// API routes (if you have any backend API endpoints)
// app.use('/api', require('./routes/api'));

// API endpoint for health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'DevChronicles React Dashboard is running' });
});

// Handle all other routes by serving the React app (SPA routing)
app.get('*', (req, res) => {
    if (hasBuiltApp) {
        res.sendFile(path.join(buildPath, 'index.html'));
    } else {
        res.sendFile(path.join(publicPath, 'index.html'));
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n🚀 DevChronicles Dashboard server running on http://localhost:${PORT}`);
    
    if (hasBuiltApp) {
        console.log(`✅ Serving built React app (production mode)`);
        console.log(`📱 React Dashboard: http://localhost:${PORT}/`);
    } else {
        console.log(`⚠️  No build found - run 'npm run build' to create production build`);
        console.log(`🔧 Development mode: Use 'npm run dev' for React development server`);
        console.log(`📱 Current serving: http://localhost:${PORT}/`);
    }
    
    console.log(`🔧 Health Check: http://localhost:${PORT}/health`);
    console.log(`\n💡 Commands:`);
    console.log(`   npm run dev        - Start React development server (port 3001)`);
    console.log(`   npm run build      - Build React app for production`);
    console.log(`   npm run build:serve - Build and serve production app`);
    console.log(`   npm start          - Serve built app (or fallback to public)`);
}); 