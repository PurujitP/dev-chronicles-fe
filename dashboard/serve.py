#!/usr/bin/env python3
"""
Simple HTTP server to serve the DevChronicles dashboard
"""
import http.server
import socketserver
import os
from urllib.parse import urlparse

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='public', **kwargs)
    
    def end_headers(self):
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        # Handle all routes by serving index.html (for SPA routing)
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/' or parsed_path.path.startswith('/dashboard'):
            self.path = '/index.html'
        
        return super().do_GET()

if __name__ == "__main__":
    PORT = 3000
    
    # Change to the directory containing this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        with socketserver.TCPServer(("", PORT), DashboardHandler) as httpd:
            print(f"DevChronicles Dashboard server running on http://localhost:{PORT}")
            print(f"Dashboard URL: http://localhost:{PORT}/dashboard")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Port {PORT} is already in use. Please stop the existing server or use a different port.")
        else:
            print(f"Error starting server: {e}") 