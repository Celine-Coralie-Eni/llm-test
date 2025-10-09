#!/bin/bash

# Terraform Fast Operations Script
# This script provides optimized Terraform commands for faster execution

set -e

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

# Function to check if we're in the terraform directory
check_terraform_dir() {
    if [[ ! -f "main.tf" ]]; then
        print_error "Not in terraform directory. Please run from terraform/ directory."
        exit 1
    fi
}

# Function for fast plan (no refresh)
fast_plan() {
    print_status "Running fast Terraform plan (no refresh)..."
    terraform plan -refresh=false -out=tfplan
    print_success "Fast plan completed. Plan saved to tfplan"
}

# Function for fast apply (no refresh)
fast_apply() {
    print_status "Running fast Terraform apply (no refresh)..."
    if [[ -f "tfplan" ]]; then
        terraform apply tfplan
        rm -f tfplan
        print_success "Fast apply completed using existing plan"
    else
        terraform apply -refresh=false -auto-approve
        print_success "Fast apply completed"
    fi
}

# Function for targeted operations
targeted_apply() {
    if [[ -z "$1" ]]; then
        print_error "Please specify a target resource"
        echo "Usage: $0 target <resource_name>"
        echo "Example: $0 target aws_lambda_function.app"
        exit 1
    fi
    
    print_status "Running targeted apply for: $1"
    terraform apply -target="$1" -auto-approve
    print_success "Targeted apply completed for $1"
}

# Function to clean up temporary files
cleanup() {
    print_status "Cleaning up temporary files..."
    rm -f tfplan
    rm -f terraform.tfplan
    rm -f .terraform.lock.hcl.backup
    print_success "Cleanup completed"
}

# Function to optimize Terraform state
optimize_state() {
    print_status "Optimizing Terraform state..."
    terraform refresh
    terraform state list > /dev/null
    print_success "State optimization completed"
}

# Function to validate configuration quickly
validate() {
    print_status "Validating Terraform configuration..."
    terraform validate
    terraform fmt -check=true -diff=true
    print_success "Validation completed"
}

# Function to show help
show_help() {
    echo "Terraform Fast Operations Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  plan          Run fast plan (no refresh)"
    echo "  apply         Run fast apply (no refresh)"
    echo "  target <res>  Run targeted apply for specific resource"
    echo "  validate      Validate and format check configuration"
    echo "  cleanup       Clean up temporary files"
    echo "  optimize      Optimize Terraform state"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 plan"
    echo "  $0 apply"
    echo "  $0 target aws_lambda_function.app"
    echo "  $0 validate"
    echo ""
    echo "Environment Variables:"
    echo "  TF_LOG=DEBUG    Enable debug logging"
    echo "  TF_LOG=INFO     Enable info logging"
}

# Main script logic
main() {
    check_terraform_dir
    
    case "${1:-help}" in
        "plan")
            fast_plan
            ;;
        "apply")
            fast_apply
            ;;
        "target")
            targeted_apply "$2"
            ;;
        "validate")
            validate
            ;;
        "cleanup")
            cleanup
            ;;
        "optimize")
            optimize_state
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
