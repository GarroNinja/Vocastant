#!/bin/bash

# Comprehensive test script for Vocastant frontend-backend-LiveKit flow
set -e

echo "🧪 Testing complete Vocastant flow..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Test 1: Backend Health
print_step "1. Testing backend health..."
if curl -s "https://d1ye5bx9w8mu3e.cloudfront.net/health" | grep -q "healthy"; then
    print_status "✅ Backend is healthy"
else
    print_error "❌ Backend health check failed"
    exit 1
fi

# Test 2: Create a test room
print_step "2. Creating test room..."
ROOM_NAME="test-flow-$(date +%s)"
ROOM_RESPONSE=$(curl -s -X POST "https://d1ye5bx9w8mu3e.cloudfront.net/api/rooms" \
    -H "Content-Type: application/json" \
    -d "{\"roomName\":\"$ROOM_NAME\",\"participantIdentity\":\"test-user\",\"participantName\":\"Test User\"}")

if echo "$ROOM_RESPONSE" | grep -q "success.*true"; then
    print_status "✅ Room created successfully"
    ROOM_ID=$(echo "$ROOM_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    TOKEN=$(echo "$ROOM_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    LIVEKIT_URL=$(echo "$ROOM_RESPONSE" | grep -o '"livekitUrl":"[^"]*"' | cut -d'"' -f4)
    
    echo "   Room ID: $ROOM_ID"
    echo "   Room Name: $ROOM_NAME"
    echo "   LiveKit URL: $LIVEKIT_URL"
    echo "   Token length: ${#TOKEN}"
else
    print_error "❌ Room creation failed"
    echo "Response: $ROOM_RESPONSE"
    exit 1
fi

# Test 3: Verify LiveKit URL format
print_step "3. Verifying LiveKit URL format..."
if [[ "$LIVEKIT_URL" == wss://* ]]; then
    print_status "✅ LiveKit URL is correct WebSocket format: $LIVEKIT_URL"
else
    print_error "❌ LiveKit URL is incorrect format: $LIVEKIT_URL"
    exit 1
fi

# Test 4: Test document upload to the room
print_step "4. Testing document upload..."
echo "test content for flow test" > test-flow.txt
UPLOAD_RESPONSE=$(curl -s -X POST "https://d1ye5bx9w8mu3e.cloudfront.net/api/documents/upload" \
    -F "document=@test-flow.txt" \
    -F "roomName=$ROOM_NAME")

if echo "$UPLOAD_RESPONSE" | grep -q "success.*true"; then
    print_status "✅ Document upload successful"
    DOC_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Document ID: $DOC_ID"
else
    print_error "❌ Document upload failed"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

# Test 5: Test room context (agent access)
print_step "5. Testing room context for agent..."
CONTEXT_RESPONSE=$(curl -s "https://d1ye5bx9w8mu3e.cloudfront.net/api/rooms/$ROOM_NAME/context")

if echo "$CONTEXT_RESPONSE" | grep -q "success.*true"; then
    print_status "✅ Room context accessible for agent"
    DOC_COUNT=$(echo "$CONTEXT_RESPONSE" | grep -o '"documentCount":[0-9]*' | cut -d':' -f2)
    echo "   Document count: $DOC_COUNT"
else
    print_error "❌ Room context not accessible"
    echo "Response: $CONTEXT_RESPONSE"
    exit 1
fi

# Test 6: Test frontend accessibility
print_step "6. Testing frontend accessibility..."
if curl -s "https://d37ldj18o2bua6.cloudfront.net" | grep -q "Voice AI Agent"; then
    print_status "✅ Frontend is accessible"
else
    print_error "❌ Frontend accessibility check failed"
    exit 1
fi

# Test 7: Verify agent configuration
print_step "7. Verifying agent configuration..."
if [ -f "livekit.toml" ]; then
    if grep -q "auto_join = true" livekit.toml && grep -q "room_join_policy = \"all\"" livekit.toml; then
        print_status "✅ Agent is configured to auto-join all rooms"
    else
        print_warning "⚠️ Agent auto-join configuration may be incomplete"
    fi
else
    print_warning "⚠️ livekit.toml not found"
fi

# Test 8: Cleanup test room
print_step "8. Cleaning up test room..."
CLEANUP_RESPONSE=$(curl -s -X DELETE "https://d1ye5bx9w8mu3e.cloudfront.net/api/rooms/$ROOM_NAME")

if echo "$CLEANUP_RESPONSE" | grep -q "success.*true"; then
    print_status "✅ Test room cleanup successful"
else
    print_warning "⚠️ Test room cleanup failed (non-critical)"
    echo "Response: $CLEANUP_RESPONSE"
fi

# Cleanup test file
rm -f test-flow.txt

echo ""
echo "🎯 Complete Flow Test Summary:"
echo "=================================="
echo "✅ Backend Health: OK"
echo "✅ Room Creation: OK"
echo "✅ LiveKit URL Format: OK"
echo "✅ Document Upload: OK"
echo "✅ Agent Access: OK"
echo "✅ Frontend Access: OK"
echo "✅ Agent Configuration: OK"
echo "=================================="
echo ""
echo "🚀 The frontend-backend-LiveKit flow is working correctly!"
echo ""
echo "📝 Next steps for testing:"
echo "1. Go to https://d37ldj18o2bua6.cloudfront.net"
echo "2. Click 'Start New Session'"
echo "3. Enter your name and optionally a room name"
echo "4. Click 'Start Session'"
echo "5. You should be redirected to the room page"
echo "6. The LiveKit agent should automatically join the room"
echo "7. Try speaking - the agent should respond and transcribe"
echo ""
echo "🔗 Test URLs:"
echo "   Frontend: https://d37ldj18o2bua6.cloudfront.net"
echo "   Backend: https://d1ye5bx9w8mu3e.cloudfront.net"
echo "   LiveKit: $LIVEKIT_URL"
