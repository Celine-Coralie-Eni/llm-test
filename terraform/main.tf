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

# S3 bucket for Lambda deployment package
resource "aws_s3_bucket" "lambda_bucket" {
  bucket        = "${var.project_name}-lambda-${random_id.bucket_suffix.hex}"
  force_destroy = true

  tags = {
    Name        = "${var.project_name}-lambda-bucket"
    Environment = var.environment
    Project     = "llm-test"
  }
}

# Random ID for unique bucket naming
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "lambda_bucket_versioning" {
  bucket = aws_s3_bucket.lambda_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "lambda_bucket_pab" {
  bucket = aws_s3_bucket.lambda_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
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
      NODE_ENV = "production"
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
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "app_distribution" {
  origin {
    domain_name = replace(replace(aws_lambda_function_url.app_url.function_url, "https://", ""), "/", "")
    origin_id   = "lambda-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = ""
  comment             = "CloudFront distribution for ${var.project_name} app"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "lambda-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Host", "User-Agent", "Referer"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "lambda-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 31536000
    default_ttl = 31536000
    max_ttl     = 31536000
  }

  price_class = "PriceClass_100"

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
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.app_distribution.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.app_distribution.id
}

output "cloudfront_url" {
  description = "Full CloudFront URL"
  value       = "https://${aws_cloudfront_distribution.app_distribution.domain_name}"
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.app_repo.repository_url
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket (kept for compatibility)"
  value       = aws_s3_bucket.lambda_bucket.id
}
