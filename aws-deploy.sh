#!/bin/bash

# Vocastant AWS Deployment Script
# This script sets up the complete AWS infrastructure for Vocastant

set -e

# Configuration
PROJECT_NAME="vocastant"
AWS_REGION="${AWS_REGION:-ap-south-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"

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

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_status "Prerequisites check passed!"
}

# Create S3 bucket for documents
create_s3_bucket() {
    print_step "Creating S3 bucket for documents..."
    
    BUCKET_NAME="${PROJECT_NAME}-documents-${RANDOM}"
    
    if aws s3 mb s3://${BUCKET_NAME} --region ${AWS_REGION}; then
        print_status "S3 bucket created: ${BUCKET_NAME}"
        
        # Configure bucket policy
        cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyInsecureConnections",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::${BUCKET_NAME}/*",
                "arn:aws:s3:::${BUCKET_NAME}"
            ],
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }
    ]
}
EOF
        
        aws s3api put-bucket-policy --bucket ${BUCKET_NAME} --policy file://bucket-policy.json
        rm bucket-policy.json
        
        print_status "S3 bucket policy applied"
    else
        print_error "Failed to create S3 bucket"
        exit 1
    fi
    
    echo "export S3_BUCKET_NAME=${BUCKET_NAME}" >> deployment.env
}

# Create RDS PostgreSQL instance
create_rds_instance() {
    print_step "Creating RDS PostgreSQL instance..."
    
    DB_INSTANCE_ID="${PROJECT_NAME}-db"
    DB_NAME="vocastant"
    DB_USERNAME="vocastant_admin"
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Create DB subnet group
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region ${AWS_REGION})
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[*].SubnetId' --output text --region ${AWS_REGION})
    
    SUBNET_GROUP_NAME="${PROJECT_NAME}-db-subnet-group"
    aws rds create-db-subnet-group \
        --db-subnet-group-name ${SUBNET_GROUP_NAME} \
        --db-subnet-group-description "Subnet group for ${PROJECT_NAME}" \
        --subnet-ids ${SUBNET_IDS} \
        --region ${AWS_REGION} || true
    
    # Create security group for RDS
    SG_NAME="${PROJECT_NAME}-rds-sg"
    SG_ID=$(aws ec2 create-security-group \
        --group-name ${SG_NAME} \
        --description "Security group for ${PROJECT_NAME} RDS" \
        --vpc-id ${VPC_ID} \
        --region ${AWS_REGION} \
        --query 'GroupId' --output text 2>/dev/null || aws ec2 describe-security-groups --filters "Name=group-name,Values=${SG_NAME}" --query 'SecurityGroups[0].GroupId' --output text --region ${AWS_REGION})
    
    # Allow PostgreSQL access from within VPC
    aws ec2 authorize-security-group-ingress \
        --group-id ${SG_ID} \
        --protocol tcp \
        --port 5432 \
        --cidr 10.0.0.0/16 \
        --region ${AWS_REGION} 2>/dev/null || true
    
    print_status "Creating RDS instance (this may take 10-15 minutes)..."
    
    aws rds create-db-instance \
        --db-instance-identifier ${DB_INSTANCE_ID} \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 15.14 \
        --master-username ${DB_USERNAME} \
        --master-user-password ${DB_PASSWORD} \
        --allocated-storage 20 \
        --storage-type gp2 \
        --db-name ${DB_NAME} \
        --db-subnet-group-name ${SUBNET_GROUP_NAME} \
        --vpc-security-group-ids ${SG_ID} \
        --backup-retention-period 7 \
        --storage-encrypted \
        --region ${AWS_REGION} || print_warning "RDS instance might already exist"
    
    print_status "Waiting for RDS instance to be available..."
    aws rds wait db-instance-available --db-instance-identifier ${DB_INSTANCE_ID} --region ${AWS_REGION}
    
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier ${DB_INSTANCE_ID} \
        --region ${AWS_REGION} \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    print_status "RDS instance created: ${DB_ENDPOINT}"
    
    cat >> deployment.env << EOF
export DB_HOST=${DB_ENDPOINT}
export DB_NAME=${DB_NAME}
export DB_USER=${DB_USERNAME}
export DB_PASSWORD=${DB_PASSWORD}
export DB_PORT=5432
EOF
}

# Create ECS cluster and service
create_ecs_infrastructure() {
    print_step "Creating ECS infrastructure..."
    
    CLUSTER_NAME="${PROJECT_NAME}-cluster"
    
    # Create ECS cluster
    aws ecs create-cluster --cluster-name ${CLUSTER_NAME} --region ${AWS_REGION} || true
    
    # Create ECR repository
    ECR_REPO=$(aws ecr create-repository --repository-name ${PROJECT_NAME} --region ${AWS_REGION} --query 'repository.repositoryUri' --output text 2>/dev/null || aws ecr describe-repositories --repository-names ${PROJECT_NAME} --region ${AWS_REGION} --query 'repositories[0].repositoryUri' --output text)
    
    print_status "ECR repository: ${ECR_REPO}"
    
    # Build and push Docker image
    print_step "Building and pushing Docker image..."
    
    # Get ECR login
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}
    
    # Build Docker image
    cd backend
    docker build -t ${PROJECT_NAME} .
    docker tag ${PROJECT_NAME}:latest ${ECR_REPO}:latest
    docker push ${ECR_REPO}:latest
    cd ..
    
    print_status "Docker image pushed to ECR"
    
    echo "export ECR_REPO=${ECR_REPO}" >> deployment.env
    echo "export ECS_CLUSTER=${CLUSTER_NAME}" >> deployment.env
}

# Create ECS task definition and service
create_ecs_service() {
    print_step "Creating ECS task definition and service..."
    
    # Source environment variables
    source deployment.env
    
    # Create IAM role for ECS tasks
    TASK_ROLE_NAME="${PROJECT_NAME}-ecs-task-role"
    
    cat > trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ecs-tasks.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    aws iam create-role --role-name ${TASK_ROLE_NAME} --assume-role-policy-document file://trust-policy.json 2>/dev/null || true
    
    # Attach policies
    aws iam attach-role-policy --role-name ${TASK_ROLE_NAME} --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy || true
    aws iam attach-role-policy --role-name ${TASK_ROLE_NAME} --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess || true
    
    TASK_ROLE_ARN=$(aws iam get-role --role-name ${TASK_ROLE_NAME} --query 'Role.Arn' --output text)
    
    # Create task definition
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

    # Create CloudWatch log group
    aws logs create-log-group --log-group-name "/ecs/${PROJECT_NAME}" --region ${AWS_REGION} 2>/dev/null || true
    
    # Register task definition
    TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://task-definition.json --region ${AWS_REGION} --query 'taskDefinition.taskDefinitionArn' --output text)
    
    print_status "Task definition registered: ${TASK_DEF_ARN}"
    
    # Clean up temporary files
    rm trust-policy.json task-definition.json
}

# Create Application Load Balancer
create_load_balancer() {
    print_step "Creating Application Load Balancer..."
    
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region ${AWS_REGION})
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[*].SubnetId' --output text --region ${AWS_REGION})
    
    # Create security group for ALB
    ALB_SG_NAME="${PROJECT_NAME}-alb-sg"
    ALB_SG_ID=$(aws ec2 create-security-group \
        --group-name ${ALB_SG_NAME} \
        --description "Security group for ${PROJECT_NAME} ALB" \
        --vpc-id ${VPC_ID} \
        --region ${AWS_REGION} \
        --query 'GroupId' --output text 2>/dev/null || aws ec2 describe-security-groups --filters "Name=group-name,Values=${ALB_SG_NAME}" --query 'SecurityGroups[0].GroupId' --output text --region ${AWS_REGION})
    
    # Allow HTTP/HTTPS traffic
    aws ec2 authorize-security-group-ingress --group-id ${ALB_SG_ID} --protocol tcp --port 80 --cidr 0.0.0.0/0 --region ${AWS_REGION} 2>/dev/null || true
    aws ec2 authorize-security-group-ingress --group-id ${ALB_SG_ID} --protocol tcp --port 443 --cidr 0.0.0.0/0 --region ${AWS_REGION} 2>/dev/null || true
    
    # Create ALB
    ALB_ARN=$(aws elbv2 create-load-balancer \
        --name ${PROJECT_NAME}-alb \
        --subnets ${SUBNET_IDS} \
        --security-groups ${ALB_SG_ID} \
        --region ${AWS_REGION} \
        --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || aws elbv2 describe-load-balancers --names ${PROJECT_NAME}-alb --region ${AWS_REGION} --query 'LoadBalancers[0].LoadBalancerArn' --output text)
    
    ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns ${ALB_ARN} --region ${AWS_REGION} --query 'LoadBalancers[0].DNSName' --output text)
    
    print_status "Load balancer created: ${ALB_DNS}"
    
    echo "export ALB_DNS=${ALB_DNS}" >> deployment.env
}

# Initialize database schema
init_database() {
    print_step "Initializing database schema..."
    
    source deployment.env
    
    # Install psql if not available
    if ! command -v psql &> /dev/null; then
        print_warning "psql not found. Please install PostgreSQL client to run database migrations."
        print_warning "You can manually run backend/database.sql on your RDS instance."
        return
    fi
    
    # Run database migrations
    PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -p 5432 -f backend/database.sql
    
    print_status "Database schema initialized"
}

# Deploy frontend to S3/CloudFront
deploy_frontend() {
    print_step "Deploying frontend to S3 and CloudFront..."
    
    source deployment.env
    
    # Create S3 bucket for frontend
    FRONTEND_BUCKET="${PROJECT_NAME}-frontend-${RANDOM}"
    aws s3 mb s3://${FRONTEND_BUCKET} --region ${AWS_REGION}
    
    # Configure bucket for static website hosting
    aws s3 website s3://${FRONTEND_BUCKET} --index-document index.html --error-document error.html --region ${AWS_REGION}
    
    # Build frontend with production config
    cd frontend
    
    # Create production env file - use CloudFront for HTTPS backend
    cat > .env.production << EOF
VITE_BACKEND_URL=https://d1ye5bx9w8mu3e.cloudfront.net
EOF
    
    # Install dependencies and build
    npm ci
    npm run build
    
    # Deploy to S3
    aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ --delete --region ${AWS_REGION}
    
    # Set bucket policy for public read
    cat > frontend-bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${FRONTEND_BUCKET}/*"
        }
    ]
}
EOF
    
    aws s3api put-bucket-policy --bucket ${FRONTEND_BUCKET} --policy file://frontend-bucket-policy.json
    rm frontend-bucket-policy.json .env.production
    
    cd ..
    
    FRONTEND_URL="http://${FRONTEND_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"
    print_status "Frontend deployed to: ${FRONTEND_URL}"
    
    echo "export FRONTEND_URL=${FRONTEND_URL}" >> deployment.env
}

# Main deployment function
main() {
    print_step "Starting Vocastant AWS deployment..."
    
    # Initialize deployment environment file
    echo "# Vocastant Deployment Environment Variables" > deployment.env
    echo "export AWS_REGION=${AWS_REGION}" >> deployment.env
    echo "export PROJECT_NAME=${PROJECT_NAME}" >> deployment.env
    echo "export ENVIRONMENT=${ENVIRONMENT}" >> deployment.env
    
    check_prerequisites
    create_s3_bucket
    create_rds_instance
    create_ecs_infrastructure
    create_ecs_service
    create_load_balancer
    init_database
    deploy_frontend
    
    print_status "Deployment completed successfully!"
    print_step "Summary of deployed resources:"
    
    source deployment.env
    
    echo "=================================="
    echo "🏗️  Infrastructure Summary"
    echo "=================================="
    echo "📊 Database: ${DB_HOST}"
    echo "☁️  S3 Bucket: ${S3_BUCKET_NAME}"
    echo "🐳 ECR Repository: ${ECR_REPO}"
    echo "⚖️  Load Balancer: ${ALB_DNS}"
    echo "🌐 Frontend URL: ${FRONTEND_URL}"
    echo "=================================="
    echo ""
    echo "🔐 Database credentials are saved in deployment.env"
    echo "📝 Save these URLs and credentials securely!"
    echo ""
    echo "✅ Your Vocastant application is now live!"
}

# Run main function
main "$@"