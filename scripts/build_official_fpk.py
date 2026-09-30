import os
import sys
import shutil
import subprocess
import json
import tarfile
import io

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(ROOT_DIR, "dist", "public")
if not os.path.exists(DIST_DIR):
    DIST_DIR = os.path.join(ROOT_DIR, "dist")

FPK_SRC_DIR = os.path.join(ROOT_DIR, "fpk_src")
BIN_DIR = os.path.join(ROOT_DIR, "bin")
FNPACK_EXE = os.path.join(BIN_DIR, "fnpack.exe" if sys.platform == "win32" else "fnpack")
RELEASE_DIR = os.path.join(ROOT_DIR, "release")
DEFAULT_TORRENTA_PORT = "18322"
DEFAULT_QB_PORT = "8080"

def to_lf(text: str) -> str:
    """强制转换为 Unix LF 换行符"""
    return text.replace("\r\n", "\n").replace("\r", "\n")

def fix_fpk_permissions(fpk_path: str):
    """
    Windows 下由于缺乏 POSIX 权限位，fnpack 生成的归档中文件模式全为 0666。
    在 Linux (fnOS) 上执行 cmd/* 脚本会遭遇 Permission denied。
    本函数将 .fpk 及内层 app.tgz 中的脚本强制设置为 0755 可执行权限。
    """
    temp_path = fpk_path + ".tmp"
    with tarfile.open(fpk_path, "r:gz") as src_tar, tarfile.open(temp_path, "w:gz") as dst_tar:
        for m in src_tar.getmembers():
            if m.name == "app.tgz":
                raw_app_tgz = src_tar.extractfile(m).read()
                app_buf_in = io.BytesIO(raw_app_tgz)
                app_buf_out = io.BytesIO()
                with tarfile.open(fileobj=app_buf_in, mode="r:gz") as in_app, tarfile.open(fileobj=app_buf_out, mode="w:gz") as out_app:
                    for am in in_app.getmembers():
                        if am.isdir():
                            am.mode = 0o755
                        elif am.name.endswith(".py") or am.name.endswith(".sh"):
                            am.mode = 0o755
                        else:
                            am.mode = 0o644
                        f = in_app.extractfile(am) if am.isreg() else None
                        out_app.addfile(am, f)
                fixed_app_bytes = app_buf_out.getvalue()
                m.size = len(fixed_app_bytes)
                m.mode = 0o644
                dst_tar.addfile(m, io.BytesIO(fixed_app_bytes))
            else:
                if m.isdir():
                    m.mode = 0o755
                elif m.name.startswith("cmd/"):
                    m.mode = 0o755
                elif m.name.endswith(".py") or m.name.endswith(".sh"):
                    m.mode = 0o755
                else:
                    m.mode = 0o644
                f = src_tar.extractfile(m) if m.isreg() else None
                dst_tar.addfile(m, f)

    os.replace(temp_path, fpk_path)
    print("🛡️  已成功将 FPK 内部生命周期脚本与程序权限修正为 0755 (rwxr-xr-x)！")

def main():
    print("=" * 65)
    print("🚀 使用官方 fnpack 构建 Torrenta 飞牛私有云 (fnOS) FPK 安装包")
    print(f"📌 默认服务端口: {DEFAULT_TORRENTA_PORT} | 默认 qBittorrent 端口: {DEFAULT_QB_PORT}")
    print("=" * 65)

    # 1. 确保打包工具就绪
    print("📦 步骤 1/5: 检查官方 fnpack 打包工具...")
    subprocess.run([sys.executable, "scripts/download_fnpack.py"], cwd=ROOT_DIR, check=True)

    # 2. 生成多规格图标
    print("🎨 步骤 2/5: 从源图生成各规格应用图标...")
    subprocess.run([sys.executable, "scripts/generate_icons.py"], cwd=ROOT_DIR, check=True)

    # 3. 前端编译检查
    print("🔨 步骤 3/5: 执行 Vite 前端构建产物检查...")
    if not os.path.exists(os.path.join(DIST_DIR, "index.html")):
        print("未检测到 index.html，正在执行前端编译 (npm run build)...")
        subprocess.run(["npm", "run", "build"], cwd=ROOT_DIR, shell=True, check=True)
    else:
        print(f"✅ 前端构建产物已就绪: {DIST_DIR}")

    # 4. 组装 fpk_src 源码结构
    print("📂 步骤 4/5: 组装官方规范源码目录 fpk_src/ ...")
    if os.path.exists(FPK_SRC_DIR):
        shutil.rmtree(FPK_SRC_DIR)
    os.makedirs(FPK_SRC_DIR, exist_ok=True)

    # 4.1 复制根目录图标 (ICON.PNG 64x64, ICON_256.PNG 256x256)
    shutil.copyfile(os.path.join(ROOT_DIR, "public", "icon-64.png"), os.path.join(FPK_SRC_DIR, "ICON.PNG"))
    shutil.copyfile(os.path.join(ROOT_DIR, "public", "icon-256.png"), os.path.join(FPK_SRC_DIR, "ICON_256.PNG"))

    # 4.2 写入 manifest 清单 (统一从 package.json 读取版本号，实现单一数据源维护)
    pkg_path = os.path.join(ROOT_DIR, "package.json")
    app_version = "0.2.4"
    if os.path.exists(pkg_path):
        try:
            with open(pkg_path, "r", encoding="utf-8") as pf:
                pkg_data = json.load(pf)
                app_version = pkg_data.get("version", "0.2.4")
        except Exception as e:
            print(f"⚠️ 读取 package.json 版本号失败，使用默认版本: {e}")

    manifest_lines = [
        'appname="torrenta"',
        f'version="{app_version}"',
        'display_name="Torrenta"',
        'desc="✨ 优雅、现代化且轻量的 qBittorrent 专业 WebUI 客户端"',
        'platform="x86"',
        'source="thirdparty"',
        'maintainer="fulco"',
        'distributor="fulco"',
        f'service_port="{DEFAULT_TORRENTA_PORT}"',
        'checkport="true"',
        'ctl_stop="true"',
        'desktop_uidir="ui"',
        'desktop_applaunchname="torrenta.Application"'
    ]
    with open(os.path.join(FPK_SRC_DIR, "manifest"), "wb") as f:
        f.write((to_lf("\n".join(manifest_lines)) + "\n").encode("utf-8"))

    # 4.3 组装 app/ 目录 (包含 app/ui/ 与 app/ 根冗余)
    app_dir = os.path.join(FPK_SRC_DIR, "app")
    app_ui_dir = os.path.join(app_dir, "ui")
    os.makedirs(app_ui_dir, exist_ok=True)

    # 复制前端编译产物到 app/ui/
    for item in os.listdir(DIST_DIR):
        s = os.path.join(DIST_DIR, item)
        d = os.path.join(app_ui_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)

    # 同时复制一份到 app/ 根目录做绝对兼容
    for item in os.listdir(DIST_DIR):
        s = os.path.join(DIST_DIR, item)
        d = os.path.join(app_dir, item)
        if not os.path.exists(d):
            if os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
            else:
                shutil.copy2(s, d)

    # 写入 app/ui/config 桌面快捷方式定义
    ui_config = {
        ".url": {
            "torrenta.Application": {
                "title": "Torrenta",
                "icon": "images/icon_{0}.png",
                "type": "url",
                "protocol": "http",
                "port": DEFAULT_TORRENTA_PORT,
                "url": "/",
                "allUsers": True
            }
        }
    }
    with open(os.path.join(app_ui_dir, "config"), "wb") as f:
        f.write(to_lf(json.dumps(ui_config, ensure_ascii=False, indent=4)).encode("utf-8"))

    # 放置桌面图标
    images_dir = os.path.join(app_ui_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    shutil.copyfile(os.path.join(ROOT_DIR, "public", "icon-64.png"), os.path.join(images_dir, "icon_64.png"))
    shutil.copyfile(os.path.join(ROOT_DIR, "public", "icon-256.png"), os.path.join(images_dir, "icon_256.png"))

    # 复制 server.py 脚本 (同时放入 fpk_src 根目录、app/ 根目录与 app/ui/ 目录)
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "server.py"), os.path.join(FPK_SRC_DIR, "server.py"))
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "server.py"), os.path.join(app_dir, "server.py"))
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "server.py"), os.path.join(app_ui_dir, "server.py"))

    # 复制 auto_config_qb.sh 自动化配置脚本
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "auto_config_qb.sh"), os.path.join(FPK_SRC_DIR, "auto_config_qb.sh"))
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "auto_config_qb.sh"), os.path.join(app_dir, "auto_config_qb.sh"))
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "auto_config_qb.sh"), os.path.join(app_ui_dir, "auto_config_qb.sh"))

    # 4.4 组装 wizard 安装向导 (严格遵循飞牛 fnOS 官方规范)
    wizard_dir = os.path.join(FPK_SRC_DIR, "wizard")
    os.makedirs(wizard_dir, exist_ok=True)

    wizard_spec = [
        {
            "stepTitle": "服务与网络端口设置",
            "items": [
                {
                    "type": "text",
                    "field": "wizard_service_port",
                    "label": "Torrenta 访问端口",
                    "desc": f"设置 Torrenta Web界面的访问端口（默认: {DEFAULT_TORRENTA_PORT}）",
                    "initValue": DEFAULT_TORRENTA_PORT,
                    "rules": [
                        {
                            "required": True,
                            "message": "请输入 Torrenta 端口号"
                        },
                        {
                            "pattern": "^[0-9]+$",
                            "message": "端口必须为纯数字"
                        }
                    ]
                },
                {
                    "type": "text",
                    "field": "wizard_qb_port",
                    "label": "qBittorrent 端口",
                    "desc": f"设置飞牛私有云上运行的 qBittorrent 服务端口（默认: {DEFAULT_QB_PORT}）",
                    "initValue": DEFAULT_QB_PORT,
                    "rules": [
                        {
                            "required": True,
                            "message": "请输入 qBittorrent 端口号"
                        },
                        {
                            "pattern": "^[0-9]+$",
                            "message": "端口必须为纯数字"
                        }
                    ]
                }
            ]
        }
    ]

    wizard_json_str = to_lf(json.dumps(wizard_spec, ensure_ascii=False, indent=2))
    # 官方文档规范标准命名：wizard/install, wizard/upgrade, wizard/config
    with open(os.path.join(wizard_dir, "install"), "wb") as f:
        f.write(wizard_json_str.encode("utf-8"))
    with open(os.path.join(wizard_dir, "upgrade"), "wb") as f:
        f.write(wizard_json_str.encode("utf-8"))
    with open(os.path.join(wizard_dir, "config"), "wb") as f:
        f.write(wizard_json_str.encode("utf-8"))

    # 同时保留兼容文件
    with open(os.path.join(wizard_dir, "install_uifile"), "wb") as f:
        f.write(wizard_json_str.encode("utf-8"))
    with open(os.path.join(wizard_dir, "upgrade_uifile"), "wb") as f:
        f.write(wizard_json_str.encode("utf-8"))

    # 4.5 组装 config (权限与系统资源 - 遵循最小权限原则 run-as package)
    config_dir = os.path.join(FPK_SRC_DIR, "config")
    os.makedirs(config_dir, exist_ok=True)
    privilege_content = '{\n    "defaults": {\n        "run-as": "package"\n    }\n}\n'
    resource_content = f'{{\n    "port-config": {{\n        "service-port": {DEFAULT_TORRENTA_PORT}\n    }}\n}}\n'
    with open(os.path.join(config_dir, "privilege"), "wb") as f:
        f.write(to_lf(privilege_content).encode("utf-8"))
    with open(os.path.join(config_dir, "resource"), "wb") as f:
        f.write(to_lf(resource_content).encode("utf-8"))

    # 4.6 组装 cmd/ 目录与生命周期脚本
    cmd_dir = os.path.join(FPK_SRC_DIR, "cmd")
    os.makedirs(cmd_dir, exist_ok=True)

    # 4.6.1 cmd/main 脚本 (全面适配 TRIM_APPDEST 目标目录与持久运行)
    cmd_main = f"""#!/bin/bash
# ==============================================================================
# Torrenta fnOS (飞牛私有云) FPK 进程生命周期主控脚本
# ==============================================================================

APP_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")/.." && pwd)"
TARGET_DIR="${{TRIM_APPDEST:-${{APP_DIR}}/target}}"

# 初始化日志与运行时路径 (优先使用飞牛应用持久化目录 TRIM_PKGVAR，如 /vol1/@appdata/torrenta)
if [ -n "${{TRIM_PKGVAR}}" ]; then
    mkdir -p "${{TRIM_PKGVAR}}" 2>/dev/null || true
    LOG_FILE="${{TRIM_PKGVAR}}/info.log"
    PID_FILE="${{TRIM_PKGVAR}}/app.pid"
    ENV_FILE="${{TRIM_PKGVAR}}/torrenta.env"
else
    mkdir -p "${{APP_DIR}}/var" 2>/dev/null || true
    mkdir -p "/tmp/torrenta" 2>/dev/null || true
    LOG_FILE="${{APP_DIR}}/var/info.log"
    PID_FILE="${{APP_DIR}}/var/app.pid"
    ENV_FILE="${{APP_DIR}}/torrenta.env"
fi

log_msg() {{
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "${{LOG_FILE}}" 2>/dev/null || true
}}

# 加载向导持久化的配置
for f in "${{ENV_FILE}}" "${{TRIM_PKGETC}}/torrenta.env" "${{TARGET_DIR}}/torrenta.env" "${{APP_DIR}}/torrenta.env"; do
    if [ -n "$f" ] && [ -f "$f" ]; then
        log_msg "Loading configuration from $f"
        set -a
        source "$f" 2>/dev/null || true
        set +a
        break
    fi
done

# 动态多重寻径 Web 根目录 (优先检测官方目标目录 TARGET_DIR/ui 和 TARGET_DIR)
find_web_root() {{
    for d in \\
        "${{TARGET_DIR}}/ui" \\
        "${{TARGET_DIR}}" \\
        "${{TARGET_DIR}}/app/ui" \\
        "${{APP_DIR}}/target/ui" \\
        "${{APP_DIR}}/target" \\
        "${{APP_DIR}}/ui" \\
        "${{APP_DIR}}/app/ui" \\
        "/var/apps/torrenta/target/ui" \\
        "/var/apps/torrenta/target" \\
        "/var/apps/torrenta/ui" \\
        "${{APP_DIR}}"; do
        if [ -d "$d" ] && [ -f "$d/index.html" ]; then
            echo "$d"
            return
        fi
    done
    if [ -d "${{TARGET_DIR}}/ui" ]; then
        echo "${{TARGET_DIR}}/ui"
    elif [ -d "${{TARGET_DIR}}" ]; then
        echo "${{TARGET_DIR}}"
    else
        echo "${{APP_DIR}}/ui"
    fi
}}

# 动态多重寻径 Python 服务端脚本
find_server_script() {{
    for s in \\
        "${{TARGET_DIR}}/server.py" \\
        "${{TARGET_DIR}}/ui/server.py" \\
        "${{TARGET_DIR}}/app/server.py" \\
        "${{APP_DIR}}/target/server.py" \\
        "${{APP_DIR}}/target/ui/server.py" \\
        "${{APP_DIR}}/server.py" \\
        "${{APP_DIR}}/ui/server.py" \\
        "${{APP_DIR}}/app/server.py" \\
        "/var/apps/torrenta/target/server.py" \\
        "/var/apps/torrenta/target/ui/server.py" \\
        "/var/apps/torrenta/server.py"; do
        if [ -f "$s" ]; then
            echo "$s"
            return
        fi
    done
    echo ""
}}

# 动态探测 Python 解释器
find_python() {{
    for py in \\
        python3 \\
        /usr/bin/python3 \\
        /bin/python3 \\
        /usr/local/bin/python3 \\
        python \\
        /usr/bin/python; do
        if command -v "$py" >/dev/null 2>&1; then
            echo "$py"
            return
        fi
        if [ -x "$py" ]; then
            echo "$py"
            return
        fi
    done
    echo ""
}}

check_process() {{
    local pid=$1
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}}

status() {{
    if [ -f "${{PID_FILE}}" ]; then
        local pid
        pid=$(head -n 1 "${{PID_FILE}}" 2>/dev/null | tr -d '[:space:]')
        if [ -n "$pid" ] && check_process "$pid"; then
            return 0
        else
            rm -f "${{PID_FILE}}"
        fi
    fi
    return 1
}}

start_process() {{
    if status; then
        log_msg "Torrenta is already running (PID: $(cat "${{PID_FILE}}"))"
        return 0
    fi

    # 清理旧 PID
    if [ -r "${{PID_FILE}}" ]; then
        local old_pid
        old_pid=$(head -n 1 "${{PID_FILE}}" 2>/dev/null | tr -d '[:space:]')
        if [ -n "$old_pid" ] && check_process "$old_pid"; then
            kill -9 "$old_pid" 2>/dev/null || true
        fi
        rm -f "${{PID_FILE}}"
    fi

    local web_root
    web_root=$(find_web_root)
    local server_script
    server_script=$(find_server_script)
    local py_bin
    py_bin=$(find_python)

    # 导出端口变量（用户向导输入 > 环境变量 > 默认 18322）
    export SERVICE_PORT="${{SERVICE_PORT:-{DEFAULT_TORRENTA_PORT}}}"
    export QBITTORRENT_PORT="${{QBITTORRENT_PORT:-{DEFAULT_QB_PORT}}}"
    export WEB_ROOT="${{web_root}}"
    export TRIM_APPDEST="${{TARGET_DIR}}"

    log_msg "Discovered Target Dir: ${{TARGET_DIR}}"
    log_msg "Discovered Web Root: ${{web_root}}"
    log_msg "Discovered Server Script: ${{server_script}}"
    log_msg "Discovered Python: ${{py_bin}}"
    log_msg "Starting Torrenta on port ${{SERVICE_PORT}}, targeting qBittorrent on port ${{QBITTORRENT_PORT}}..."

    local p_id=""

    # 优先方案 A: Python 高可用服务 (自带反向代理与多用户支持)
    if [ -n "$py_bin" ] && [ -n "$server_script" ]; then
        log_msg "Launching via Python server ($py_bin $server_script)..."
        nohup "$py_bin" -u "$server_script" >> "${{LOG_FILE}}" 2>&1 &
        p_id=$!
        sleep 0.8
        if check_process "$p_id"; then
            printf "%s" "$p_id" > "${{PID_FILE}}"
            log_msg "Torrenta successfully running on Python (PID: $p_id)"
            return 0
        fi
        log_msg "Python launch did not stay active, checking fallback engines..."
    fi

    # 方案 B: Busybox httpd (飞牛 NAS 原生内置)
    if command -v busybox >/dev/null 2>&1; then
        log_msg "Launching fallback Busybox httpd on port ${{SERVICE_PORT}} (Root: ${{web_root}})..."
        nohup busybox httpd -f -p "${{SERVICE_PORT}}" -h "${{web_root}}" >> "${{LOG_FILE}}" 2>&1 &
        p_id=$!
        sleep 0.8
        if check_process "$p_id"; then
            printf "%s" "$p_id" > "${{PID_FILE}}"
            log_msg "Torrenta running on Busybox httpd (PID: $p_id)"
            return 0
        fi
    fi

    log_msg "ERROR: Failed to launch Torrenta web service with any available engine!"
    return 1
}}

stop_process() {{
    log_msg "Stopping Torrenta ..."
    if [ -r "${{PID_FILE}}" ]; then
        local pid
        pid=$(head -n 1 "${{PID_FILE}}" 2>/dev/null | tr -d '[:space:]')
        if [ -n "$pid" ] && check_process "$pid"; then
            kill -TERM "$pid" 2>/dev/null || true
            local count=0
            while check_process "$pid" && [ $count -lt 5 ]; do
                sleep 1
                count=$((count + 1))
            done
            if check_process "$pid"; then
                kill -KILL "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "${{PID_FILE}}"
    fi
    log_msg "Torrenta stopped."
    return 0
}}

case $1 in
start)
    start_process
    ;;
stop)
    stop_process
    ;;
status)
    if status; then
        exit 0
    else
        exit 3
    fi
    ;;
restart)
    stop_process
    sleep 1
    start_process
    ;;
*)
    echo "Usage: $0 {{start|stop|status|restart}}"
    exit 1
    ;;
esac
"""
    with open(os.path.join(cmd_dir, "main"), "wb") as f:
        f.write(to_lf(cmd_main).encode("utf-8"))

    # 4.6.2 cmd/install_callback 与 upgrade_callback (捕获向导设置并更新配置)
    callback_script = f"""#!/bin/bash
APP_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")/.." && pwd)"
TARGET_DIR="${{TRIM_APPDEST:-${{APP_DIR}}/target}}"

if [ -n "${{TRIM_PKGVAR}}" ]; then
    mkdir -p "${{TRIM_PKGVAR}}" 2>/dev/null || true
    ENV_FILE="${{TRIM_PKGVAR}}/torrenta.env"
else
    mkdir -p "${{APP_DIR}}/var" 2>/dev/null || true
    ENV_FILE="${{APP_DIR}}/torrenta.env"
fi

# 获取向导输入的变量（兼容 wizard_service_port 与 service_port 前缀）
USER_TORRENTA_PORT="${{wizard_service_port:-${{service_port:-${{WIZARD_service_port:-${{WIZARD_SERVICE_PORT:-${{SERVICE_PORT:-{DEFAULT_TORRENTA_PORT}}}}}}}}}}}"
USER_QB_PORT="${{wizard_qb_port:-${{qbittorrent_port:-${{qb_port:-${{WIZARD_qb_port:-${{WIZARD_qbittorrent_port:-${{QBITTORRENT_PORT:-{DEFAULT_QB_PORT}}}}}}}}}}}}}"

cat <<EOF > "${{ENV_FILE}}"
SERVICE_PORT=${{USER_TORRENTA_PORT}}
QBITTORRENT_PORT=${{USER_QB_PORT}}
QBITTORRENT_URL=http://127.0.0.1:${{USER_QB_PORT}}
QBITTORRENT_HOST=127.0.0.1:${{USER_QB_PORT}}
EOF

# 同时同步写入 TARGET_DIR 和 APP_DIR 下作为备份
cp -f "${{ENV_FILE}}" "${{TARGET_DIR}}/torrenta.env" 2>/dev/null || true
cp -f "${{ENV_FILE}}" "${{APP_DIR}}/torrenta.env" 2>/dev/null || true
if [ -n "${{TRIM_PKGETC}}" ]; then
    mkdir -p "${{TRIM_PKGETC}}" 2>/dev/null || true
    cp -f "${{ENV_FILE}}" "${{TRIM_PKGETC}}/torrenta.env" 2>/dev/null || true
fi

# 动态改写桌面快捷方式配置 ui/config 中的端口，确保桌面图标打开的 URL 与实际端口一致
for cfg in \\
    "${{TARGET_DIR}}/ui/config" \\
    "${{TARGET_DIR}}/app/ui/config" \\
    "${{APP_DIR}}/target/ui/config" \\
    "${{APP_DIR}}/ui/config" \\
    "${{APP_DIR}}/app/ui/config" \\
    "/var/apps/torrenta/target/ui/config" \\
    "/var/apps/torrenta/ui/config"; do
    if [ -f "$cfg" ]; then
        sed -i "s/\\\"port\\\": *\\\"[0-9]*\\\"/\\\"port\\\": \\\"${{USER_TORRENTA_PORT}}\\\"/g" "$cfg" 2>/dev/null || true
    fi
done

exit 0
"""
    with open(os.path.join(cmd_dir, "install_callback"), "wb") as f:
        f.write(to_lf(callback_script).encode("utf-8"))
    with open(os.path.join(cmd_dir, "upgrade_callback"), "wb") as f:
        f.write(to_lf(callback_script).encode("utf-8"))
    with open(os.path.join(cmd_dir, "config_callback"), "wb") as f:
        f.write(to_lf(callback_script).encode("utf-8"))

    # 生成其余生命周期空钩子
    for hook in ["install_init", "uninstall_callback", "uninstall_init", "upgrade_init", "config_init"]:
        with open(os.path.join(cmd_dir, hook), "wb") as f:
            f.write(to_lf("#!/bin/bash\nexit 0\n").encode("utf-8"))

    # 5. 执行官方 fnpack build 构建
    print("🗜️  步骤 5/5: 调用官方 fnpack 工具构建 .fpk 安装包...")
    os.makedirs(RELEASE_DIR, exist_ok=True)
    
    result = subprocess.run([FNPACK_EXE, "build", "-d", "fpk_src"], cwd=ROOT_DIR, capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print("❌ fnpack 构建失败:\n", result.stderr)
        sys.exit(1)

    fpk_found = False
    for f in os.listdir(ROOT_DIR):
        if f.endswith(".fpk"):
            fpk_found = True
            src_fpk = os.path.join(ROOT_DIR, f)
            dest_fpk = os.path.join(RELEASE_DIR, f)
            shutil.move(src_fpk, dest_fpk)
            
            # 关键：修正 FPK 归档内的 POSIX 权限为 0755
            fix_fpk_permissions(dest_fpk)
            
            file_size_kb = os.path.getsize(dest_fpk) / 1024
            print("=" * 65)
            print("🎉 飞牛官方 FPK 安装包构建成功！")
            print(f"📦 安装包文件名: {f}")
            print(f"📁 完整保存路径: {dest_fpk}")
            print(f"📊 安装包大小  : {file_size_kb:.2f} KB ({file_size_kb/1024:.2f} MB)")
            print(f"⚙️ 默认端口设定: Torrenta -> {DEFAULT_TORRENTA_PORT} | qBittorrent -> {DEFAULT_QB_PORT}")
            print(f"📋 安装向导文件: wizard/install (已注入端口输入交互界面)")
            print("=" * 65)
            break

    if not fpk_found:
        print("⚠️ 未在根目录下找到构建好的 .fpk 文件，请检查打包输出。")

if __name__ == "__main__":
    main()
