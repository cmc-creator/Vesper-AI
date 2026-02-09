#!/bin/bash
# Vesper AI Deployment Script
# This script helps deploy Vesper AI to Railway and Vercel

set -e

echo "🌟 Vesper AI Deployment Tool"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Check prerequisites
echo "Checking prerequisites..."
echo ""

MISSING_TOOLS=0

if ! command_exists railway; then
    print_error "Railway CLI not found"
    echo "  Install: npm install -g @railway/cli"
    MISSING_TOOLS=1
else
    print_success "Railway CLI found"
fi

if ! command_exists vercel; then
    print_error "Vercel CLI not found"
    echo "  Install: npm install -g vercel"
    MISSING_TOOLS=1
else
    print_success "Vercel CLI found"
fi

if ! command_exists node; then
    print_error "Node.js not found"
    echo "  Install from: https://nodejs.org/"
    MISSING_TOOLS=1
else
    print_success "Node.js found"
fi

if ! command_exists python3; then
    print_error "Python 3 not found"
    echo "  Install from: https://www.python.org/"
    MISSING_TOOLS=1
else
    print_success "Python 3 found"
fi

echo ""

if [ $MISSING_TOOLS -eq 1 ]; then
    print_error "Please install missing tools before proceeding"
    exit 1
fi

# Check environment variables
echo "Checking environment variables..."
echo ""

if [ -f ".env" ]; then
    print_success ".env file found"
    source .env
else
    print_warning ".env file not found"
    echo "  Create one from .env.example"
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    print_warning "ANTHROPIC_API_KEY not set in .env"
fi

echo ""

# Deployment menu
echo "What would you like to deploy?"
echo "1) Backend only (Railway)"
echo "2) Frontend only (Vercel)"
echo "3) Both (Backend + Frontend)"
echo "4) Check deployment status"
echo "5) Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚂 Deploying Backend to Railway..."
        echo "=================================="
        echo ""
        
        if railway status > /dev/null 2>&1; then
            print_success "Railway project linked"
        else
            print_warning "No Railway project linked"
            echo "Initializing new Railway project..."
            railway init
        fi
        
        echo ""
        echo "Deploying..."
        railway up
        
        echo ""
        print_success "Backend deployment complete!"
        echo ""
        echo "Get your Railway URL:"
        echo "  railway status"
        ;;
    
    2)
        echo ""
        echo "▲ Deploying Frontend to Vercel..."
        echo "=================================="
        echo ""
        
        cd frontend
        
        if [ ! -d "node_modules" ]; then
            echo "Installing dependencies..."
            npm install
        fi
        
        echo ""
        echo "Deploying to production..."
        vercel --prod
        
        cd ..
        
        echo ""
        print_success "Frontend deployment complete!"
        ;;
    
    3)
        echo ""
        echo "🚀 Deploying Full Stack Application..."
        echo "======================================="
        echo ""
        
        # Deploy backend first
        echo "Step 1: Deploying Backend to Railway..."
        echo ""
        
        if railway status > /dev/null 2>&1; then
            print_success "Railway project linked"
        else
            print_warning "No Railway project linked"
            echo "Initializing new Railway project..."
            railway init
        fi
        
        railway up
        print_success "Backend deployed!"
        
        echo ""
        echo "⚠️  IMPORTANT: Update your Railway URL in frontend/.env"
        echo "   VITE_API_URL=https://your-app.railway.app"
        echo ""
        read -p "Press Enter after updating the URL..."
        
        # Deploy frontend
        echo ""
        echo "Step 2: Deploying Frontend to Vercel..."
        echo ""
        
        cd frontend
        
        if [ ! -d "node_modules" ]; then
            echo "Installing dependencies..."
            npm install
        fi
        
        vercel --prod
        cd ..
        
        echo ""
        print_success "Full deployment complete!"
        echo ""
        echo "📱 Your application is live!"
        ;;
    
    4)
        echo ""
        echo "📊 Deployment Status"
        echo "===================="
        echo ""
        
        echo "Backend (Railway):"
        if railway status > /dev/null 2>&1; then
            railway status
        else
            print_warning "Not deployed or not linked"
        fi
        
        echo ""
        echo "Frontend (Vercel):"
        cd frontend
        if vercel ls > /dev/null 2>&1; then
            vercel ls
        else
            print_warning "Not deployed or not logged in"
        fi
        cd ..
        ;;
    
    5)
        echo "Goodbye! 👋"
        exit 0
        ;;
    
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✨ Done!"
