#!/bin/bash

# DevChronicles Frontend Setup Script

echo "🚀 Setting up DevChronicles Frontend..."
echo "======================================"

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Please run this script from the dev-chronicles-fe directory"
    exit 1
fi

echo "✅ Found manifest.json - we're in the right directory"

# Check for required files
echo ""
echo "📋 Checking required files..."

FILES=("background.js" "manifest.json" "popup/popup.html" "popup/popup.js" "dashboard/public/index.html" "dashboard/public/dashboard.js")

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (missing)"
    fi
done

echo ""
echo "🎯 Setup Instructions:"
echo "====================="

echo "1. Load Chrome Extension:"
echo "   - Open Chrome and go to chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select this directory: $(pwd)"

echo ""
echo "2. Start Backend Server:"
echo "   cd ../dev-chronicles-be"
echo "   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo ""
echo "3. Start Dashboard Server:"
echo "   cd dashboard"
echo "   python3 -m http.server 3000 --directory public"

echo ""
echo "4. Test Authentication:"
echo "   cd dashboard"
echo "   node test-flow.js"

echo ""
echo "🔧 Quick Commands:"
echo "=================="
echo "Start dashboard: cd dashboard && python3 -m http.server 3000 --directory public"
echo "Test auth flow:  cd dashboard && node test-flow.js"
echo "Debug auth:      Visit http://localhost:3000 and click 'Debug Auth'"

echo ""
echo "📚 Documentation:"
echo "================="
echo "Full setup guide: README.md"
echo "Dashboard docs:   dashboard/README.md"

echo ""
echo "🎉 Setup complete! Follow the instructions above to get started." 