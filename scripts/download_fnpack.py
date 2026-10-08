import urllib.request
import os
import sys
import shutil
import subprocess
import platform

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN_DIR = os.path.join(ROOT_DIR, "bin")
FNPACK_EXE = os.path.join(BIN_DIR, "fnpack.exe" if sys.platform == "win32" else "fnpack")

def get_fnpack_url() -> str:
    mach = platform.machine().lower()
    if sys.platform == "win32":
        return "https://static2.fnnas.com/fnpack/fnpack-1.2.3-windows-amd64"
    elif sys.platform == "darwin":
        if "arm" in mach or "aarch64" in mach:
            return "https://static2.fnnas.com/fnpack/fnpack-1.2.3-darwin-arm64"
        return "https://static2.fnnas.com/fnpack/fnpack-1.2.3-darwin-amd64"
    else:
        # Default Linux
        return "https://static2.fnnas.com/fnpack/fnpack-1.2.3-linux-amd64"

# 优先从本地已存在的参考工程快速复制以节省时间 (兼容 Windows 本地开发环境)
LOCAL_REF_EXE = r"D:\Project\VUE\ImageStitcher\bin\fnpack.exe"

def ensure_fnpack() -> str | None:
    """确保 fnpack 工具可用并返回其绝对路径，若无法使用则返回 None"""
    # 0. 优先检测系统 PATH 中是否有现成的 fnpack
    system_fnpack = shutil.which("fnpack.exe" if sys.platform == "win32" else "fnpack")
    if system_fnpack:
        try:
            res = subprocess.run([system_fnpack, "--help"], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                return system_fnpack
        except Exception:
            pass

    os.makedirs(BIN_DIR, exist_ok=True)

    # 1. 检测本地 bin 目录是否已有可用可执行文件
    if os.path.exists(FNPACK_EXE) and os.path.getsize(FNPACK_EXE) > 1000:
        if sys.platform != "win32":
            os.chmod(FNPACK_EXE, 0o755)
        try:
            res = subprocess.run([FNPACK_EXE, "--help"], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                return FNPACK_EXE
        except Exception:
            pass

    # 2. 从本地参考工程快速复制 (Windows 缓存)
    if os.path.exists(LOCAL_REF_EXE) and os.path.getsize(LOCAL_REF_EXE) > 1000:
        print(f"📦 从本地参考工程复制官方 fnpack: {LOCAL_REF_EXE} -> {FNPACK_EXE}")
        try:
            shutil.copyfile(LOCAL_REF_EXE, FNPACK_EXE)
            if sys.platform != "win32":
                os.chmod(FNPACK_EXE, 0o755)
            res = subprocess.run([FNPACK_EXE, "--help"], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                return FNPACK_EXE
        except Exception:
            pass

    # 3. 从飞牛官方 CDN 下载对应系统架构的二进制文件
    url = get_fnpack_url()
    print(f"🌐 正在从飞牛官方下载最新 fnpack 官方打包工具 ({platform.system()} {platform.machine()}): {url} ...")
    
    # 构建兼容的 SSL 上下文 (解决部分环境 Python 未配置根证书问题)
    import ssl
    try:
        ssl_ctx = ssl.create_default_context()
    except Exception:
        ssl_ctx = None

    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                resp = urllib.request.urlopen(req, timeout=30, context=ssl_ctx)
            except urllib.error.URLError as ssl_err:
                if "CERTIFICATE_VERIFY_FAILED" in str(ssl_err) or "certificate" in str(ssl_err).lower():
                    unverified_ctx = ssl._create_unverified_context()
                    resp = urllib.request.urlopen(req, timeout=30, context=unverified_ctx)
                else:
                    raise ssl_err

            with resp, open(FNPACK_EXE, "wb") as f:
                f.write(resp.read())

            if sys.platform != "win32":
                os.chmod(FNPACK_EXE, 0o755)

            res = subprocess.run([FNPACK_EXE, "--help"], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                print(f"✅ fnpack 官方工具就绪: {FNPACK_EXE} ({os.path.getsize(FNPACK_EXE)} 字节)")
                return FNPACK_EXE
            else:
                print(f"⚠️ fnpack 运行检测失败: {res.stderr}")
        except Exception as e:
            # 尝试使用系统的 curl 工具下载
            curl_bin = shutil.which("curl")
            if curl_bin:
                try:
                    print(f"🔄 尝试使用 curl 工具下载: {url} -> {FNPACK_EXE}")
                    subprocess.run([curl_bin, "-sSL", "-k", url, "-o", FNPACK_EXE], check=True, timeout=30)
                    if sys.platform != "win32":
                        os.chmod(FNPACK_EXE, 0o755)
                    res = subprocess.run([FNPACK_EXE, "--help"], capture_output=True, text=True, timeout=5)
                    if res.returncode == 0:
                        print(f"✅ fnpack 官方工具就绪 (via curl): {FNPACK_EXE}")
                        return FNPACK_EXE
                except Exception as curl_err:
                    print(f"⚠️ curl 下载失败: {curl_err}")
            print(f"⚠️ 下载 fnpack 尝试 {attempt + 1}/3 失败: {e}")


    print("⚠️ 无法获取官方 fnpack 工具，将自动切换为 Python 原生规范打包引擎。")
    return None

if __name__ == "__main__":
    exe = ensure_fnpack()
    if exe:
        print(f"🎉 成功就绪: {exe}")
    else:
        print("❌ 未能获取 fnpack")

