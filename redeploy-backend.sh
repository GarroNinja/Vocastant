#!/bin/bash

# Quick backend redeployment script for Vocastant
# This script rebuilds and redeploys only the backend service with updated environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Source deployment environment
if [ ! -f "backend/deployment.env" ]; then
    print_error "deployment.env not found in backend directory!"
    exit 1
fi

print_step "Loading deployment environment..."
source backend/deployment.env

# Check required variables
if [ -z "$ECR_REPO" ] || [ -z "$ECS_CLUSTER" ] || [ -z "$LIVEKIT_API_KEY" ] || [ -z "$LIVEKIT_API_SECRET" ]; then
    print_error "Required environment variables missing from deployment.env!"
    print_error "Required: ECR_REPO, ECS_CLUSTER, LIVEKIT_API_KEY, LIVEKIT_API_SECRET"
    exit 1
fi

# Build and push updated Docker image
print_step "Building and pushing updated backend image..."

# Get ECR login
aws ecr get-login-password --region ${AWS_REGION:-ap-south-1} | docker login --username AWS --password-stdin $ECR_REPO

# Build Docker image
cd backend
docker build -t vocastant .
docker tag vocastant:latest $ECR_REPO:latest
docker push $ECR_REPO:latest
cd ..

print_status "Updated Docker image pushed to ECR"

# Create new task definition with all environment variables
print_step "Creating updated ECS task definition..."

PROJECT_NAME="vocastant"
AWS_REGION=${AWS_REGION:-ap-south-1}

# Get existing task role ARN
TASK_ROLE_ARN=$(aws iam get-role --role-name ${PROJECT_NAME}-ecs-task-role --query 'Role.Arn' --output text)

# Create updated task definition
cat > task-definition.json << EOF
{
    "family": "${PROJECT_NAME}-task",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "${TASK_ROLE_ARN}",
    "taskRoleArn": "${TASK_ROLE_ARN}",
    "containerDefinitions": [
        {
            "name": "${PROJECT_NAME}",
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
                    "awslogs-group": "/ecs/${PROJECT_NAME}",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
EOF

# Register new task definition
print_step "Registering updated task definition..."
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://task-definition.json --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)

print_status "New task definition registered: $NEW_TASK_DEF_ARN"

# Update ECS service with new task definition
print_step "Updating ECS service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service ${PROJECT_NAME}-service \
    --task-definition $NEW_TASK_DEF_ARN \
    --region $AWS_REGION

print_status "ECS service update initiated"

# Wait for deployment to complete
print_step "Waiting for deployment to stabilize..."
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services ${PROJECT_NAME}-service \
    --region $AWS_REGION

print_status "Deployment completed successfully!"

# Clean up
rm task-definition.json

print_step "Backend redeployment summary:"
echo "=================================="
echo "🐳 ECR Repository: $ECR_REPO"
echo "📊 ECS Cluster: $ECS_CLUSTER"
echo "⚖️  Load Balancer: $ALB_DNS"
echo "🔗 Backend URL: https://d1ye5bx9w8mu3e.cloudfront.net"
echo "=================================="
echo ""
echo "✅ Backend has been redeployed with LiveKit credentials!"
echo "🔍 Check CloudWatch logs at: /ecs/${PROJECT_NAME}"