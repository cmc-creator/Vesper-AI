import sys
import subprocess
import time
import os
import signal

def run_server():
    """
    Runs the uvicorn server in a subprocess.
    Returns the exit code of the process.
    """
    # Use the same python executable as the manager script
    python_executable = sys.executable
    
    host = os.getenv("VESPER_HOST", os.getenv("HOST", "0.0.0.0"))
    port = os.getenv("PORT", os.getenv("VESPER_PORT", "8000"))

    # Command to run the uvicorn server
    # We use sys.executable to ensure we use the same environment
    cmd = [
        python_executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        host,
        "--port",
        str(port),
        "--reload",
    ]
    
    print(f"[Manager] Starting Vesper Backend System on {host}:{port}...")
    
    try:
        # Run the process
        process = subprocess.Popen(cmd)
        
        # Wait for it to complete
        process.wait()
        
        return process.returncode
    except KeyboardInterrupt:
        print("\n🛑 [Manager] Stopping Vesper Backend...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        return 0

def main():
    """
    Main loop that restarts the server if it exits with code 100.
    """
    RESTART_CODE = 100
    
    while True:
        exit_code = run_server()
        
        if exit_code == RESTART_CODE:
            print("\n🔄 [Manager] Restart requested by Vesper AI. Rebooting system in 2 seconds...")
            time.sleep(2)
            continue
            
        elif exit_code == 0:
            print("\n✅ [Manager] System shutdown complete.")
            break
            
        else:
            print(f"\n⚠️ [Manager] Server crashed with exit code {exit_code}. Restarting in 5 seconds...")
            time.sleep(5)
            # You might want to break here in production to avoid infinite crash loops, 
            # but for an AI agent that might fix its own code, we loop.
            continue

if __name__ == "__main__":
    # Change to the directory of this script to ensure relative imports work
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main()
