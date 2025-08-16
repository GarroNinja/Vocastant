#!/bin/bash

# Full-stack deployment script for Vocastant with room-based routing
# This script deploys both frontend and backend with the updated Google Meet-style UI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verify we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "frontend/package.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

print_step "=== VOCASTANT FULL-STACK DEPLOYMENT ==="
print_status "Deploying room-based routing system with Google Meet-style UI"

# Load environment variables
if [ -f "deployment.env" ]; then
    source deployment.env
    print_status "Loaded deployment environment variables"
else
    print_error "deployment.env file not found!"
    exit 1
fi

# 1. Install frontend dependencies if needed
print_step "1. Installing frontend dependencies..."
cd frontend

# Update package-lock.json if needed
if ! npm ci 2>/dev/null; then
    print_warning "package-lock.json out of sync, updating..."
    npm install
fi

print_status "Frontend dependencies installed"

# 2. Build frontend with production environment
print_step "2. Building frontend for production..."
npm run build
print_status "Frontend build completed"

# 3. Deploy frontend to S3
print_step "3. Deploying frontend to S3..."
aws s3 sync dist/ s3://vocastant-frontend-3873/ --delete --cache-control "no-cache" --region ap-south-1
print_status "Frontend deployed to S3"

# 4. Invalidate CloudFront distribution
print_step "4. Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id EDGIPITDMV9N1 --paths "/*" --region ap-south-1 > /dev/null
print_status "CloudFront cache invalidated"

# 5. Build and deploy backend
print_step "5. Building and deploying backend..."
cd ../backend

# Build Docker image
docker build -t vocastant .
docker tag vocastant:latest $ECR_REPO:latest

# Login to ECR and push
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
docker push $ECR_REPO:latest
print_status "Backend Docker image pushed to ECR"

# 6. Update ECS service with new backend
print_step "6. Updating ECS service..."

# Create task definition
cat > ../task-definition.json << EOF
{
    "family": "vocastant-task",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::503238928459:role/vocastant-ecs-task-role",
    "taskRoleArn": "arn:aws:iam::503238928459:role/vocastant-ecs-task-role",
    "containerDefinitions": [
        {
            "name": "vocastant",
            "image": "${ECR_REPO}:latest",
            "portMappings": [
                {
                    "containerPort": 3001,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {"name": "NODE_ENV", "value": "production"},
                {"name": "PORT", "value": "3001"},
                {"name": "DB_HOST", "value": "${DB_HOST}"},
                {"name": "DB_NAME", "value": "${DB_NAME}"},
                {"name": "DB_USER", "value": "${DB_USER}"},
                {"name": "DB_PASSWORD", "value": "${DB_PASSWORD}"},
                {"name": "DB_PORT", "value": "5432"},
                {"name": "S3_BUCKET_NAME", "value": "${S3_BUCKET_NAME}"},
                {"name": "AWS_REGION", "value": "${AWS_REGION}"},
                {"name": "LIVEKIT_URL", "value": "${LIVEKIT_URL}"},
                {"name": "LIVEKIT_API_KEY", "value": "${LIVEKIT_API_KEY}"},
                {"name": "LIVEKIT_API_SECRET", "value": "${LIVEKIT_API_SECRET}"},
                {"name": "FRONTEND_URL", "value": "${FRONTEND_URL}"}
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/vocastant",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
EOF

# Register new task definition and update service
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://../task-definition.json --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)

aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service vocastant-service \
    --task-definition $NEW_TASK_DEF_ARN \
    --force-new-deployment \
    --region $AWS_REGION > /dev/null

print_status "ECS service updated with new backend"

# 7. Wait for deployment to stabilize
print_step "7. Waiting for deployment to stabilize..."
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services vocastant-service \
    --region $AWS_REGION

print_status "Backend deployment completed successfully"

# Clean up
cd ..
rm -f task-definition.json

print_step "=== DEPLOYMENT SUMMARY ==="
echo "🎉 Full-stack deployment completed successfully!"
echo ""
echo "📱 Frontend URL: https://d37ldj18o2bua6.cloudfront.net"
echo "🔗 Backend URL: https://d1ye5bx9w8mu3e.cloudfront.net"
echo "🏠 Room URLs: https://d37ldj18o2bua6.cloudfront.net/room/[room-name]"
echo ""
echo "✨ New Features:"
echo "• 🎥 Google Meet-style interface"
echo "• 📁 Document viewer in main area"
echo "• 💬 Live transcription sidebar"
echo "• 🏠 Room-based URL routing (/room/room-name)"
echo "• 📱 Mobile-responsive design"
echo "• 🔧 Improved error handling and diagnostics"
echo ""
echo "🔍 To test:"
echo "1. Visit https://d37ldj18o2bua6.cloudfront.net"
echo "2. Click 'Start New Session'"
echo "3. Upload a document"
echo "4. Ask the agent about your document"
echo ""
print_status "Deployment logs available in CloudWatch: /ecs/vocastant"