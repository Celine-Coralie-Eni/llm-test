#!/bin/bash

# llm-test App - AWS Deployment Script
# This script deploys the Next.js app to AWS using Terraform

set -e  # Exit on any error

echo "🚀 Starting llm-test App Deployment to AWS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js first."
        exit 1
    fi
    
    print_success "All requirements are met!"
}

# Check AWS credentials
check_aws_credentials() {
    print_status "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "us-east-1")
    
    print_success "AWS credentials configured for account: $AWS_ACCOUNT in region: $AWS_REGION"
}

# Build the Next.js application
build_app() {
    print_status "Building Next.js application..."
    
    # Install dependencies
    npm install
    
    # Build the application
    npm run build
    
    print_success "Application built successfully!"
}

# Initialize and apply Terraform
deploy_infrastructure() {
    print_status "Deploying infrastructure with Terraform..."
    
    cd terraform
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init
    
    # Plan the deployment
    print_status "Planning Terraform deployment..."
    terraform plan -out=tfplan
    
    # Apply the deployment
    print_status "Applying Terraform configuration..."
    terraform apply tfplan
    
    print_success "Infrastructure deployed successfully!"
    
    cd ..
}

# Get deployment URLs
get_deployment_info() {
    print_status "Getting deployment information..."
    
    cd terraform
    
    LAMBDA_URL=$(terraform output -raw lambda_function_url)
    CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
    CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
    
    print_success "Deployment completed successfully!"
    echo ""
    echo "📋 Deployment Information:"
    echo "=========================="
    echo "🔗 Lambda Function URL: $LAMBDA_URL"
    echo "🌐 CloudFront URL: $CLOUDFRONT_URL"
    echo "📡 CloudFront Domain: $CLOUDFRONT_DOMAIN"
    echo ""
    echo "🧪 Test your app:"
    echo "curl -s $CLOUDFRONT_URL | grep -c -i 'eldrin|wizard|enchanted'"
    echo "Expected result: 0 (story hidden from crawlers)"
    echo ""
    echo "curl -s $CLOUDFRONT_URL | grep -c -i 'welcome'"
    echo "Expected result: >0 (welcome message visible)"
    
    cd ..
}

# Main deployment process
main() {
    echo "🎯 llm-test App - AWS Deployment"
    echo "================================="
    echo ""
    
    check_requirements
    check_aws_credentials
    build_app
    deploy_infrastructure
    get_deployment_info
    
    print_success "🎉 Deployment completed! Your llm-test app is now live on AWS!"
}

# Run the deployment
main "$@"
