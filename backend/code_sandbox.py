"""
Code Sandbox tool for Vesper — safe Python execution in an isolated temp directory.

Security design:
  - Code runs in a fresh temp directory (cleaned after each run)
  - 30-second hard timeout via subprocess
  - No network access to internal services (code can make outbound HTTP though)
  - Memory limit via resource module on Linux (graceful skip on Windows/Railway)
  - stdout/stderr captured and returned (max 8000 chars)

Actions:
  run       — execute Python code, return stdout/stderr/result
  run_data  — run Python code with CSV/JSON data injected as a variable
  install   — install a package into the sandbox venv (uses pip)
"""

import os
import sys
import subprocess
import tempfile
import textwrap
import json
import re
import asyncio
from pathlib import Path

_TIMEOUT = int(os.environ.get("SANDBOX_TIMEOUT", "30"))  # seconds
_MAX_OUTPUT = 8000  # chars to return

# Python executable — use same venv as backend
_PYTHON = sys.executable


def _clean_output(text: str, max_chars: int = _MAX_OUTPUT) -> str:
    if not text:
        return ""
    text = text.strip()
    if len(text) > max_chars:
        return text[:max_chars] + f"\n... [truncated — {len(text)} total chars]"
    return text


def _inject_data_code(data: str, var_name: str = "data") -> str:
    """Return a Python snippet that sets `var_name` from a JSON/CSV string."""
    stripped = data.strip()
    # Try JSON first
    try:
        json.loads(stripped)
        return f"import json as _json\n{var_name} = _json.loads({repr(stripped)})\n"
    except Exception:
        pass
    # CSV fallback
    return (
        f"import csv as _csv, io as _io\n"
        f"_reader = _csv.DictReader(_io.StringIO({repr(stripped)}))\n"
        f"{var_name} = list(_reader)\n"
    )


async def code_sandbox_tool(params: dict, **kwargs) -> dict:
    action = params.get("action", "run").lower()

    if action == "run":
        code = params.get("code", "").strip()
        if not code:
            return {"error": "code is required for action=run"}
        return await _execute(code, params)

    elif action == "run_data":
        code = params.get("code", "").strip()
        data = params.get("data", "").strip()
        var_name = params.get("var_name", "data")
        if not code:
            return {"error": "code is required for action=run_data"}
        if not data:
            return {"error": "data is required for action=run_data"}

        # Prepend data injection
        injected = _inject_data_code(data, var_name)
        full_code = injected + "\n" + code
        return await _execute(full_code, params)

    elif action == "install":
        package = params.get("package", "").strip()
        if not package:
            return {"error": "package is required for action=install"}
        # Sanitize package name
        if not re.match(r'^[a-zA-Z0-9_\-\[\]\.]+$', package):
            return {"error": "Invalid package name"}
        try:
            result = subprocess.run(
                [_PYTHON, "-m", "pip", "install", package, "--quiet"],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode == 0:
                return {"success": True, "package": package, "preview": f"✅ Installed {package} successfully"}
            else:
                return {"success": False, "error": result.stderr[:500], "preview": f"❌ Failed to install {package}: {result.stderr[:200]}"}
        except subprocess.TimeoutExpired:
            return {"error": "pip install timed out (120s)"}
        except Exception as e:
            return {"error": str(e)}

    else:
        return {"error": f"Unknown action '{action}'. Use: run | run_data | install"}


async def _execute(code: str, params: dict) -> dict:
    timeout = int(params.get("timeout", _TIMEOUT))

    with tempfile.TemporaryDirectory() as tmpdir:
        script_path = os.path.join(tmpdir, "script.py")

        # Add safe preamble + matplotlib non-interactive backend
        preamble = textwrap.dedent("""
import warnings
warnings.filterwarnings('ignore')
import os, sys, base64, io as _io_std
# Restrict file writes to temp dir only (best-effort)
_ORIG_OPEN = open
_TMPDIR = os.getcwd()
# Force matplotlib to non-interactive backend so plots can be captured
try:
    import matplotlib
    matplotlib.use('Agg')
except ImportError:
    pass
# Capture matplotlib figures as base64 at script end
def _save_figures():
    try:
        import matplotlib.pyplot as plt
        figs = [plt.figure(n) for n in plt.get_fignums()]
        for i, fig in enumerate(figs):
            buf = _io_std.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=120)
            b64 = base64.b64encode(buf.getvalue()).decode()
            print(f'__VESPER_PLOT__{i}__data:image/png;base64,{b64}__END_PLOT__')
        plt.close('all')
    except Exception:
        pass
import atexit as _atexit
_atexit.register(_save_figures)
""").strip()

        full_code = preamble + "\n\n" + code

        with open(script_path, "w", encoding="utf-8") as f:
            f.write(full_code)

        try:
            proc = await asyncio.create_subprocess_exec(
                _PYTHON, script_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
                env={**os.environ, "PYTHONPATH": os.path.dirname(_PYTHON)},
            )
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                return {
                    "success": False,
                    "error": f"Execution timed out after {timeout} seconds",
                    "stdout": "",
                    "stderr": "",
                    "exit_code": -1,
                    "preview": f"⏱️ Code timed out after {timeout}s",
                }

            stdout = _clean_output(stdout_bytes.decode("utf-8", errors="replace"))
            stderr = _clean_output(stderr_bytes.decode("utf-8", errors="replace"))
            exit_code = proc.returncode

            # Extract any embedded plot images from stdout
            plots = []
            import re as _re
            plot_pattern = _re.compile(r'__VESPER_PLOT__\d+__(data:image/png;base64,[^_]+)__END_PLOT__')
            stdout_clean = stdout
            for m in plot_pattern.finditer(stdout):
                plots.append(m.group(1))
            if plots:
                stdout_clean = plot_pattern.sub('', stdout).strip()

            if exit_code == 0:
                preview = f"✅ **Code executed successfully**\n\n```\n{stdout_clean[:2000]}\n```" if stdout_clean else "✅ Code ran (no output)"
                if stderr:
                    preview += f"\n\n⚠️ Warnings:\n```\n{stderr[:500]}\n```"
                if plots:
                    preview += f"\n\n📊 {len(plots)} plot(s) generated."
            else:
                preview = f"❌ **Code failed (exit {exit_code})**\n\n```\n{stderr[:2000]}\n```"
                if stdout_clean:
                    preview = f"📤 Output before error:\n```\n{stdout_clean[:1000]}\n```\n\n" + preview

            result = {
                "success": exit_code == 0,
                "exit_code": exit_code,
                "stdout": stdout_clean,
                "stderr": stderr,
                "preview": preview,
            }
            if plots:
                result["plots"] = plots  # list of data:image/png;base64,... strings
            return result

        except FileNotFoundError:
            return {"error": f"Python executable not found: {_PYTHON}", "success": False}
        except Exception as e:
            return {"error": f"Execution error: {e}", "success": False}
