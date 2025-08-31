#!/bin/bash
echo "=== DevChronicles Refresh Token Test ==="
echo
echo "1. Testing backend connectivity..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/)
echo "Backend status: $BACKEND_STATUS"

echo
echo "2. Testing refresh token endpoint..."
REFRESH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:8000/backend-api/auth/refresh-token -H "Content-Type: application/json" -d '{"refresh_token":"test"}')
echo "Refresh endpoint status: $REFRESH_STATUS"

if [ "$REFRESH_STATUS" = "404" ]; then
    echo "❌ ISSUE: Refresh token endpoint not implemented in backend!"
    echo "   Please add POST /backend-api/auth/refresh-token to your backend"
elif [ "$REFRESH_STATUS" = "401" ] || [ "$REFRESH_STATUS" = "400" ]; then
    echo "✅ Refresh endpoint exists (responds to requests)"
fi

echo
echo "3. Testing other API endpoints..."
curl -s -o /dev/null -w "Stats API: %{http_code}
" http://127.0.0.1:8000/backend-api/chrome/stats
curl -s -o /dev/null -w "Test API: %{http_code}
" http://127.0.0.1:8000/backend-api/chrome/test
curl -s -o /dev/null -w "Activity API: %{http_code}
" http://127.0.0.1:8000/backend-api/chrome/recent-activity

echo
echo "=== Open the test page for interactive testing ==="
echo "http://localhost:8080/test-refresh-tokens.html"

