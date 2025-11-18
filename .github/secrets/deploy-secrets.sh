#!/bin/bash
# ============================================
# GitHub Secrets Deployment Script
# ============================================
# This script deploys your secrets and variables to GitHub Actions
# Usage: source .env && ./deploy-secrets.sh

set -e  # Exit on any error

# ============================================
# AUTO-LOAD .env FILE
# ============================================

# Check if .env exists in current directory
if [ -f ".env" ]; then
    echo "📂 Loading environment variables from .env..."
    set -a  # Automatically export all variables
    source .env
    set +a  # Stop auto-exporting
    echo ""
elif [ -f "../secrets/.env" ]; then
    echo "📂 Loading environment variables from ../secrets/.env..."
    set -a
    source ../secrets/.env
    set +a
    echo ""
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# VALIDATION
# ============================================

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}🔐 GitHub Secrets Deployment${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ Error: GitHub CLI (gh) is not installed${NC}"
    echo ""
    echo "Please install it first:"
    echo "  macOS:   brew install gh"
    echo "  Windows: winget install GitHub.CLI"
    echo "  Linux:   https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo ""
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Error: Not authenticated with GitHub${NC}"
    echo ""
    echo "Please run: gh auth login"
    echo ""
    exit 1
fi

# Check if REPO is set
if [ -z "${REPO}" ]; then
    echo -e "${RED}❌ Error: REPO environment variable is not set${NC}"
    echo ""
    echo "Please make sure you have:"
    echo "  1. Created a .env file from .env.example"
    echo "  2. Set the REPO variable in .env"
    echo "  3. Run: source .env"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} GitHub CLI: Installed and authenticated"
echo -e "${GREEN}✓${NC} Target repository: ${REPO}"
echo ""

# Verify required variables are set
MISSING_VARS=()
REQUIRED_VARS=(
    "SUPABASE_DB_URL"
    "R2_ACCOUNT_ID"
    "R2_ACCESS_KEY_ID"
    "R2_SECRET_ACCESS_KEY"
    "R2_BUCKET_NAME"
    "APP_NAME"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Error: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set these in your .env file and run: source .env"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} All required variables are set"
echo ""

# ============================================
# DEPLOYMENT CONFIRMATION
# ============================================

echo -e "${YELLOW}⚠️  You are about to deploy secrets to:${NC}"
echo -e "   Repository: ${BLUE}${REPO}${NC}"
echo ""
echo "Secrets that will be set:"
echo "  • SUPABASE_DB_URL"
echo "  • R2_ACCOUNT_ID"
echo "  • R2_ACCESS_KEY_ID"
echo "  • R2_SECRET_ACCESS_KEY"
echo "  • R2_BUCKET_NAME"
echo "  • APP_NAME"
if [ -n "${SMTP_USERNAME}" ]; then
    echo "  • SMTP_USERNAME"
    echo "  • SMTP_PASSWORD"
fi
echo ""

if [ -n "${BACKUP_NOTIFICATION_EMAIL}" ]; then
    echo "Variables that will be set:"
    echo "  • BACKUP_NOTIFICATION_EMAIL"
    echo ""
fi

read -p "Continue with deployment? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# ============================================
# DEPLOY SECRETS
# ============================================

echo -e "${BLUE}📦 Deploying secrets...${NC}"
echo ""

# Function to set secret with error handling
set_secret() {
    local name=$1
    local value=$2
    
    echo -n "  Setting ${name}... "
    if echo "${value}" | gh secret set "${name}" --repo "${REPO}" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

# Deploy required secrets
FAILED_SECRETS=()

set_secret "SUPABASE_DB_URL" "${SUPABASE_DB_URL}" || FAILED_SECRETS+=("SUPABASE_DB_URL")
set_secret "R2_ACCOUNT_ID" "${R2_ACCOUNT_ID}" || FAILED_SECRETS+=("R2_ACCOUNT_ID")
set_secret "R2_ACCESS_KEY_ID" "${R2_ACCESS_KEY_ID}" || FAILED_SECRETS+=("R2_ACCESS_KEY_ID")
set_secret "R2_SECRET_ACCESS_KEY" "${R2_SECRET_ACCESS_KEY}" || FAILED_SECRETS+=("R2_SECRET_ACCESS_KEY")
set_secret "R2_BUCKET_NAME" "${R2_BUCKET_NAME}" || FAILED_SECRETS+=("R2_BUCKET_NAME")
set_secret "APP_NAME" "${APP_NAME}" || FAILED_SECRETS+=("APP_NAME")

# Deploy optional SMTP secrets
if [ -n "${SMTP_USERNAME}" ] && [ -n "${SMTP_PASSWORD}" ]; then
    set_secret "SMTP_USERNAME" "${SMTP_USERNAME}" || FAILED_SECRETS+=("SMTP_USERNAME")
    set_secret "SMTP_PASSWORD" "${SMTP_PASSWORD}" || FAILED_SECRETS+=("SMTP_PASSWORD")
fi

echo ""

# ============================================
# DEPLOY VARIABLES
# ============================================

if [ -n "${BACKUP_NOTIFICATION_EMAIL}" ]; then
    echo -e "${BLUE}📋 Deploying variables...${NC}"
    echo ""
    
    echo -n "  Setting BACKUP_NOTIFICATION_EMAIL... "
    if gh variable set BACKUP_NOTIFICATION_EMAIL --body "${BACKUP_NOTIFICATION_EMAIL}" --repo "${REPO}" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        FAILED_SECRETS+=("BACKUP_NOTIFICATION_EMAIL")
    fi
    echo ""
fi

# ============================================
# VERIFICATION
# ============================================

echo -e "${BLUE}🔍 Verifying deployment...${NC}"
echo ""

echo "Secrets in repository:"
gh secret list --repo "${REPO}" | head -n 20

if [ -n "${BACKUP_NOTIFICATION_EMAIL}" ]; then
    echo ""
    echo "Variables in repository:"
    gh variable list --repo "${REPO}" | head -n 20
fi

echo ""

# ============================================
# SUMMARY
# ============================================

if [ ${#FAILED_SECRETS[@]} -eq 0 ]; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Verify secrets at: https://github.com/${REPO}/settings/secrets/actions"
    echo "  2. Test your workflow by triggering it manually"
    echo "  3. Check the Actions tab for results"
    echo ""
else
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}❌ Deployment completed with errors${NC}"
    echo -e "${RED}============================================${NC}"
    echo ""
    echo "Failed to set the following secrets/variables:"
    for secret in "${FAILED_SECRETS[@]}"; do
        echo -e "  ${RED}✗${NC} $secret"
    done
    echo ""
    echo "Please check:"
    echo "  1. Your GitHub authentication: gh auth status"
    echo "  2. Repository permissions"
    echo "  3. Repository name is correct: ${REPO}"
    echo ""
    exit 1
fi