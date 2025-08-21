const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve React dashboard as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'react-dashboard.html'));
});

// Serve original dashboard
app.get('/original', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle all routes by serving React dashboard (for SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'react-dashboard.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`DevChronicles Dashboard server running on http://localhost:${PORT}`);
    console.log(`React Dashboard: http://localhost:${PORT}/`);
    console.log(`Original Dashboard: http://localhost:${PORT}/original`);
}); 