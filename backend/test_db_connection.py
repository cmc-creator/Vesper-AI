#!/usr/bin/env python3
"""
Database connection diagnostic script
Tests Supabase connectivity from Railway environment
"""

import os
import socket
import sys
from urllib.parse import urlparse

def test_dns_resolution(hostname):
    """Test DNS resolution and show both IPv4 and IPv6"""
    print(f"\n📡 Testing DNS resolution for: {hostname}")
    try:
        # Try to resolve all addresses
        results = socket.getaddrinfo(hostname, 5432, socket.AF_UNSPEC, socket.SOCK_STREAM)
        
        ipv4_addrs = []
        ipv6_addrs = []
        
        for family, _type, _proto, _canonname, sockaddr in results:
            if family == socket.AF_INET:
                ipv4_addrs.append(sockaddr[0])
            elif family == socket.AF_INET6:
                ipv6_addrs.append(sockaddr[0])
        
        if ipv4_addrs:
            print(f"   ✅ IPv4 addresses found: {', '.join(set(ipv4_addrs))}")
        else:
            print(f"   ❌ No IPv4 addresses found")
        
        if ipv6_addrs:
            print(f"   ⚠️  IPv6 addresses found: {', '.join(set(ipv6_addrs))}")
            print(f"   💡 Railway containers don't support IPv6!")
        
        return ipv4_addrs, ipv6_addrs
    except Exception as e:
        print(f"   ❌ DNS resolution failed: {e}")
        return [], []

def test_tcp_connection(hostname, port=5432, timeout=5):
    """Test TCP connection to database"""
    print(f"\n🔗 Testing TCP connection to {hostname}:{port} (timeout: {timeout}s)")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((hostname, port))
        sock.close()
        
        if result == 0:
            print(f"   ✅ TCP connection successful!")
            return True
        else:
            print(f"   ❌ TCP connection failed: {result}")
            return False
    except Exception as e:
        print(f"   ❌ TCP test failed: {e}")
        return False

def analyze_database_url(db_url):
    """Parse and analyze DATABASE_URL"""
    print(f"\n🔍 Analyzing DATABASE_URL")
    try:
        parsed = urlparse(db_url)
        print(f"   Scheme: {parsed.scheme}")
        print(f"   Hostname: {parsed.hostname}")
        print(f"   Port: {parsed.port}")
        print(f"   Database: {parsed.path}")
        print(f"   User: {parsed.username}")
        
        return parsed.hostname, parsed.port or 5432
    except Exception as e:
        print(f"   ❌ Failed to parse URL: {e}")
        return None, None

def main():
    print("=" * 60)
    print("DATABASE CONNECTION DIAGNOSTIC TOOL")
    print("=" * 60)
    
    # Get DATABASE_URL
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        print("\n⚠️  DATABASE_URL environment variable not set")
        print("Try running: export DATABASE_URL='your-connection-string'")
        return 1
    
    print(f"\n📋 Environment: {'Railway' if 'railway' in os.getenv('RAILWAY_ENVIRONMENT_NAME', '') else 'Local'}")
    
    # Analyze URL
    hostname, port = analyze_database_url(db_url)
    
    if not hostname:
        return 1
    
    # Test DNS
    ipv4, ipv6 = test_dns_resolution(hostname)
    
    # Test TCP if IPv4 available
    if ipv4:
        test_tcp_connection(hostname, port)
    else:
        print(f"\n⚠️  No IPv4 addresses available. Railway only supports IPv4!")
        print(f"   Solutions:")
        print(f"   1. Check Supabase connection pooler type (use Session Pooler)")
        print(f"   2. Use Supabase IPv4 endpoint if available")
        print(f"   3. Use direct IPv4 address if Supabase provides one")
    
    # Recommendations
    print(f"\n💡 RECOMMENDATIONS FOR RAILWAY + SUPABASE:")
    print(f"   1. ✅ Use Supabase Session Pooler (not Transaction Pooler)")
    print(f"   2. ✅ Add connection parameters: ?sslmode=require&statement_timeout=30000")
    print(f"   3. ✅ Use short connection timeout (10-15 seconds)")
    print(f"   4. ❌ Avoid IPv6-only connections (Railway doesn't support them)")
    print(f"   5. 🔄 The backend will fallback to SQLite if PostgreSQL fails")
    
    print("\n" + "=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
