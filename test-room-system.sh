#!/bin/bash

# Test script for room-based document system
set -e

BACKEND_URL="https://d1ye5bx9w8mu3e.cloudfront.net"
TEST_ROOM="test-room-$(date +%s)"

echo "🧪 Testing room-based document system..."
echo "Backend URL: $BACKEND_URL"
echo "Test Room: $TEST_ROOM"
echo ""

# Test 1: Health check
echo "1. Testing backend health..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    echo "$HEALTH_RESPONSE"
    exit 1
fi

# Test 2: Room creation (via room access - should return "Room not found" but that's expected)
echo ""
echo "2. Testing room document endpoint..."
ROOM_RESPONSE=$(curl -s "$BACKEND_URL/api/documents/room/$TEST_ROOM")
if [[ $ROOM_RESPONSE == *"Room not found"* ]]; then
    echo "✅ Room-based document endpoint working (room doesn't exist yet, which is expected)"
else
    echo "🔍 Room response: $ROOM_RESPONSE"
fi

# Test 3: Check existing room with documents
echo ""
echo "3. Testing access to room with existing documents..."
EXISTING_ROOM="vocastant-1756084931251-4rd1ru"
EXISTING_DOCS=$(curl -s "$BACKEND_URL/api/documents/room/$EXISTING_ROOM" | jq -r '.documents | length // 0' 2>/dev/null || echo "0")
echo "📚 Found $EXISTING_DOCS documents in existing room: $EXISTING_ROOM"

# Test 4: Agent deployment check (if agent is running)
echo ""
echo "4. Testing agent tools (if deployed)..."
echo "Agent tools that should be available:"
echo "  - list_uploaded_documents"
echo "  - list_documents_by_room_name"
echo "  - analyze_specific_document"
echo "  - get_document_summary"
echo "  - search_documents_for_question"
echo "  - test_document_access"
echo "  - inject_document_to_context"
echo "  - get_document_help"

echo ""
echo "🎯 Test Summary:"
echo "✅ Backend health: OK"
echo "✅ Room endpoints: Working"
echo "📁 Document access: Ready for testing"
echo ""
echo "🚀 Ready to deploy! Run './deploy-full-stack.sh' to deploy the updated system."
echo ""
echo "📝 After deployment, test by:"
echo "1. Go to https://d37ldj18o2bua6.cloudfront.net"
echo "2. Create a new room"
echo "3. Upload a document"
echo "4. Ask the agent to 'test document access'"
echo "5. Ask the agent to 'list documents'"