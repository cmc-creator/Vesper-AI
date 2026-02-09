#!/usr/bin/env python3
"""
Vesper AI Deployment Validation Script

This script validates that the deployment configuration is correct.
"""

import json
import os
import sys
from pathlib import Path

def print_status(check_name, passed, message=""):
    """Print check status with color"""
    status = "✓" if passed else "✗"
    color = "\033[92m" if passed else "\033[91m"
    reset = "\033[0m"
    
    print(f"{color}{status}{reset} {check_name}")
    if message:
        print(f"  {message}")

def main():
    print("🔍 Vesper AI Deployment Configuration Validation")
    print("=" * 50)
    print()
    
    checks_passed = 0
    checks_total = 0
    
    # Check 1: Deployment files exist
    print("📁 Checking deployment files...")
    checks_total += 1
    files_to_check = [
        "DEPLOY.md",
        "QUICKSTART-DEPLOY.md",
        "deploy.sh",
        "deploy.ps1",
        "Dockerfile",
        "railway.json",
        "vercel.json",
        "Procfile",
        ".railwayignore",
        ".vercelignore"
    ]
    
    missing_files = []
    for file in files_to_check:
        if not Path(file).exists():
            missing_files.append(file)
    
    if not missing_files:
        print_status("All deployment files present", True)
        checks_passed += 1
    else:
        print_status("Missing deployment files", False, f"Missing: {', '.join(missing_files)}")
    
    print()
    
    # Check 2: Backend health endpoints
    print("🏥 Checking health endpoints...")
    checks_total += 2
    
    # Check main backend
    main_backend = Path("backend/main.py")
    if main_backend.exists():
        content = main_backend.read_text()
        if '@app.get("/health")' in content and 'health_check' in content:
            print_status("Main backend health endpoint found", True)
            checks_passed += 1
        else:
            print_status("Main backend health endpoint missing", False)
    else:
        print_status("Main backend not found", False)
    
    # Check vesper-web backend
    web_backend = Path("vesper-web/backend/main.py")
    if web_backend.exists():
        content = web_backend.read_text()
        if '@app.get("/health")' in content and 'health_check' in content:
            print_status("Vesper-web backend health endpoint found", True)
            checks_passed += 1
        else:
            print_status("Vesper-web backend health endpoint missing", False)
    else:
        print_status("Vesper-web backend not found", False)
    
    print()
    
    # Check 3: Railway configuration
    print("🚂 Checking Railway configuration...")
    checks_total += 1
    
    railway_json = Path("railway.json")
    if railway_json.exists():
        try:
            config = json.loads(railway_json.read_text())
            if "deploy" in config and "healthcheck" in config:
                print_status("Railway configuration valid", True)
                checks_passed += 1
            else:
                print_status("Railway configuration incomplete", False)
        except json.JSONDecodeError:
            print_status("Railway configuration invalid JSON", False)
    else:
        print_status("Railway configuration missing", False)
    
    print()
    
    # Check 4: Vercel configuration
    print("▲ Checking Vercel configuration...")
    checks_total += 1
    
    vercel_json = Path("vercel.json")
    if vercel_json.exists():
        try:
            config = json.loads(vercel_json.read_text())
            if "builds" in config and "routes" in config:
                print_status("Vercel configuration valid", True)
                checks_passed += 1
            else:
                print_status("Vercel configuration incomplete", False)
        except json.JSONDecodeError:
            print_status("Vercel configuration invalid JSON", False)
    else:
        print_status("Vercel configuration missing", False)
    
    print()
    
    # Check 5: Environment variables documentation
    print("📝 Checking environment variables documentation...")
    checks_total += 1
    
    env_example = Path(".env.example")
    env_deployment = Path(".env.deployment")
    
    if env_example.exists() or env_deployment.exists():
        print_status("Environment variables documented", True)
        checks_passed += 1
    else:
        print_status("Environment variables not documented", False)
    
    print()
    
    # Check 6: Scripts are executable
    print("🔐 Checking script permissions...")
    checks_total += 1
    
    deploy_sh = Path("deploy.sh")
    if deploy_sh.exists():
        if os.access(deploy_sh, os.X_OK):
            print_status("deploy.sh is executable", True)
            checks_passed += 1
        else:
            print_status("deploy.sh is not executable", False, "Run: chmod +x deploy.sh")
    else:
        print_status("deploy.sh not found", False)
    
    print()
    
    # Summary
    print("=" * 50)
    print(f"📊 Results: {checks_passed}/{checks_total} checks passed")
    print()
    
    if checks_passed == checks_total:
        print("✅ All deployment checks passed!")
        print("🚀 Ready to deploy!")
        print()
        print("Next steps:")
        print("  1. Set environment variables (see .env.deployment)")
        print("  2. Run: ./deploy.sh (Unix) or .\\deploy.ps1 (Windows)")
        print("  3. See DEPLOY.md for detailed instructions")
        return 0
    else:
        print("⚠️  Some checks failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
