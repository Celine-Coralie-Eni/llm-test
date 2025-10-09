# Terraform Optimization Aliases
# Source this file in your ~/.bashrc or ~/.zshrc to use these aliases
# Usage: source terraform-aliases.sh

# Fast Terraform operations (no refresh)
alias tfp='terraform plan -refresh=false'
alias tfa='terraform apply -refresh=false -auto-approve'
alias tfpa='terraform plan -refresh=false -out=tfplan && terraform apply tfplan && rm -f tfplan'

# Quick validation and formatting
alias tfv='terraform validate && terraform fmt'
alias tff='terraform fmt -recursive'

# State operations
alias tfs='terraform state list'
alias tfshow='terraform show'

# Cleanup operations
alias tfclean='rm -f tfplan terraform.tfplan .terraform.lock.hcl.backup'

# Targeted operations (use with resource name)
# Example: tft aws_lambda_function.app
alias tft='terraform apply -target'

echo "Terraform aliases loaded:"
echo "  tfp     - Fast plan (no refresh)"
echo "  tfa     - Fast apply (no refresh, auto-approve)"
echo "  tfpa    - Fast plan + apply"
echo "  tfv     - Validate + format"
echo "  tff     - Format recursively"
echo "  tfs     - List state"
echo "  tfshow  - Show current state"
echo "  tfclean - Clean temporary files"
echo "  tft     - Targeted apply (use with resource name)"
