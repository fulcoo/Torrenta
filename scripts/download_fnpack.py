import urllib.request
import os
import sys
import shutil
import subprocess

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN_DIR = os.path.join(ROOT_DIR, "bin")
FNPACK_EXE = os.path.join(BIN_DIR, "fnpack.exe" if sys.platform == "win32" else "fnpack")
URL = "https://static2.fnnas.com/fnpack/fnpack-1.2.3-windows-amd64" if sys.platform == "win32" else "https://static2.fnnas.com/fnpack/fnpack-1.2.3-linux-amd64"

# 优先从本地已存在的参考工程快速复制以节省时间
LOCAL_REF_EXE = r"D:\Project\VUE\ImageStitcher\bin\fnpack.exe"

os.makedirs(BIN_DIR, exist_ok=True)

if not os.path.exists(FNPACK_EXE) or os.path.getsize(FNPACK_EXE) < 1000:
    if os.path.exists(LOCAL_REF_EXE) and os.path.getsize(LOCAL_REF_EXE) > 1000:
        print(f"📦 从本地参考工程复制官方 fnpack: {LOCAL_REF_EXE} -> {FNPACK_EXE}")
        shutil.copyfile(LOCAL_REF_EXE, FNPACK_EXE)
    else:
        print(f"🌐 正在从飞牛官方下载最新 fnpack 官方打包工具: {URL} ...")
        req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp, open(FNPACK_EXE, "wb") as f:
            f.write(resp.read())
            
    if sys.platform != "win32":
        os.chmod(FNPACK_EXE, 0o755)
    print(f"✅ fnpack 官方工具就绪: {FNPACK_EXE} ({os.path.getsize(FNPACK_EXE)} 字节)")

# 验证运行
res = subprocess.run([FNPACK_EXE, "--help"], capture_output=True, text=True)
if res.returncode == 0:
    print("✅ 飞牛官方 fnpack 工具检测正常")
else:
    print("❌ fnpack 运行异常:\n", res.stderr)
