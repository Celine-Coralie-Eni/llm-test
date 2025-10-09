# Terraform configuration for llm-test app deployment
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Data source for AWS region
data "aws_region" "current" {}

# Variables
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "llm-test"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

# ECR Repository for Docker images
resource "aws_ecr_repository" "app_repo" {
  name                 = "${var.project_name}-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.project_name}-ecr-repo"
    Environment = var.environment
    Project     = "llm-test"
  }
}

# ECR Repository Policy
resource "aws_ecr_repository_policy" "app_repo_policy" {
  repository = aws_ecr_repository.app_repo.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "LambdaECRImageRetrievalPolicy"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
      }
    ]
  })
}

# Build and push Docker image
resource "null_resource" "docker_build_push" {
  triggers = {
    # Rebuild when source files change
    source_hash = filemd5("${path.module}/../package.json")
    dockerfile_hash = filemd5("${path.module}/../Dockerfile")
    src_hash = sha256(join("", [for f in fileset("${path.module}/../src", "**/*.{ts,tsx,js,jsx}") : filesha256("${path.module}/../src/${f}")]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.module}/..
      
      # Get ECR login token
      aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.app_repo.repository_url}
      
      # Build Docker image
      docker build -t llm-test .
      
      # Tag for ECR
      docker tag llm-test:latest ${aws_ecr_repository.app_repo.repository_url}:latest
      
      # Push to ECR
      docker push ${aws_ecr_repository.app_repo.repository_url}:latest
      
      echo "Docker image pushed to ECR: ${aws_ecr_repository.app_repo.repository_url}:latest"
    EOT
  }

  depends_on = [aws_ecr_repository.app_repo]
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-lambda-role"
    Environment = var.environment
  }
}

# IAM policy attachment for Lambda basic execution
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# IAM policy for ECR access
resource "aws_iam_policy" "lambda_ecr_policy" {
  name        = "${var.project_name}-lambda-ecr-policy"
  description = "IAM policy for Lambda to access ECR"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = aws_ecr_repository.app_repo.arn
      }
    ]
  })
}

# Attach ECR policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_ecr" {
  policy_arn = aws_iam_policy.lambda_ecr_policy.arn
  role       = aws_iam_role.lambda_role.name
}

# Lambda function using container image
resource "aws_lambda_function" "app" {
  function_name = "${var.project_name}-app"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.app_repo.repository_url}:latest"
  timeout       = 60
  memory_size   = 1024

  environment {
    variables = {
      NODE_ENV            = "production"
      PORT                = "3000"
      AWS_LWA_INVOKE_MODE = "buffered"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    null_resource.docker_build_push
  ]
  
  lifecycle {
    # Ignore changes to image digest when not needed
    ignore_changes = [
      image_uri
    ]
  }

  tags = {
    Name        = "${var.project_name}-lambda"
    Environment = var.environment
    Project     = "llm-test"
  }
}

# Lambda function URL (for direct access)
resource "aws_lambda_function_url" "app_url" {
  function_name      = aws_lambda_function.app.function_name
  authorization_type = "NONE"
  invoke_mode        = "BUFFERED"
  
  cors {
    allow_credentials = false
    allow_methods     = ["*"]
    allow_origins     = ["*"]
    allow_headers     = ["*"]
  }
}

# CloudFront Function (enables Lambda Function URL compatibility)
resource "aws_cloudfront_function" "request_processor" {
  name    = "${var.project_name}-request-processor"
  runtime = "cloudfront-js-1.0"
  comment = "Processes requests for Lambda Function URL compatibility"
  publish = true

  code = <<EOT
function handler(event) {
    var request = event.request;
    var headers = request.headers;

    // Simple request processing - just pass through
    // This preprocessing makes Lambda Function URLs work with CloudFront
    
    return request;
}
EOT
}

# CloudFront Distribution (working configuration)
resource "aws_cloudfront_distribution" "app_distribution_working" {
  origin {
    domain_name = trimsuffix(trimprefix(aws_lambda_function_url.app_url.function_url, "https://"), "/")
    origin_id   = "LambdaFunctionURL"
    origin_path = ""

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for ${var.project_name} Lambda Function URL"
  default_root_object = ""

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "LambdaFunctionURL"
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Origin", "User-Agent", "Referer"]
      
      cookies {
        forward = "all"
      }
    }

    # KEY: CloudFront Function association (makes Lambda URLs work)
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.request_processor.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-cloudfront"
    Environment = var.environment
    Project     = "llm-test"
  }
}

# Outputs
output "lambda_function_url" {
  description = "URL of the Lambda function"
  value       = aws_lambda_function_url.app_url.function_url
}

output "cloudfront_domain_name" {
  description = "Domain name of the working CloudFront distribution"
  value       = aws_cloudfront_distribution.app_distribution_working.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the working CloudFront distribution"
  value       = aws_cloudfront_distribution.app_distribution_working.id
}

output "cloudfront_url" {
  description = "Full working CloudFront URL"
  value       = "https://${aws_cloudfront_distribution.app_distribution_working.domain_name}"
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.app_repo.repository_url
}

# S3 bucket output removed - using ECR instead
