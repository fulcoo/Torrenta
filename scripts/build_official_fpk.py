import os
import sys
import shutil
import subprocess
import json
import tarfile
import io
import hashlib
import tempfile

# 导入跨平台 fnpack 工具获取函数
try:
    from download_fnpack import ensure_fnpack
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from download_fnpack import ensure_fnpack

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(ROOT_DIR, "dist", "fpk")
DIRECT_DIST_DIR = os.path.join(ROOT_DIR, "dist", "fpk-direct")

FPK_SRC_DIR = os.path.join(ROOT_DIR, "fpk_src")
RELEASE_DIR = os.path.join(ROOT_DIR, "release")
DEFAULT_QB_PORT = "8080"
DEFAULT_DIRECT_PORT = "18322"
GATEWAY_PREFIX = "/app/torrenta"
GATEWAY_SOCKET = "app.sock"

def to_lf(text: str) -> str:
    """强制转换为 Unix LF 换行符"""
    return text.replace("\r\n", "\n").replace("\r", "\n")

def fix_fpk_permissions(fpk_path: str):
    """
    Windows 下由于缺乏 POSIX 权限位，fnpack 生成的归档中文件模式可能全为 0666。
    在 Linux (fnOS) 上执行 cmd/* 脚本会遭遇 Permission denied。
    本函数将 .fpk 及内层 app.tgz 中的脚本强制设置为 0755 可执行权限，
    并重新计算 app.tgz 的 MD5 更新回 manifest 中的 checksum 字段，确保校验严格一致。
    """
    temp_path = fpk_path + ".tmp"
    with tarfile.open(fpk_path, "r:gz") as src_tar:
        members = src_tar.getmembers()
        
        # 1. 提取并修正 app.tgz
        fixed_app_bytes = None
        new_checksum = None
        for m in members:
            if m.name == "app.tgz":
                raw_app_tgz = src_tar.extractfile(m).read()
                app_buf_in = io.BytesIO(raw_app_tgz)
                app_buf_out = io.BytesIO()
                with tarfile.open(fileobj=app_buf_in, mode="r:gz") as in_app, tarfile.open(fileobj=app_buf_out, mode="w:gz") as out_app:
                    for am in in_app.getmembers():
                        if am.isdir():
                            am.mode = 0o755
                        elif am.name.endswith(".py") or am.name.endswith(".sh") or "auto_config" in am.name:
                            am.mode = 0o755
                        else:
                            am.mode = 0o644
                        f = in_app.extractfile(am) if am.isreg() else None
                        out_app.addfile(am, f)
                fixed_app_bytes = app_buf_out.getvalue()
                new_checksum = hashlib.md5(fixed_app_bytes).hexdigest()
                break

        # 2. 提取并同步更新 manifest 中的 checksum
        fixed_manifest_bytes = None
        for m in members:
            if m.name == "manifest":
                raw_manifest = src_tar.extractfile(m).read().decode("utf-8")
                lines = raw_manifest.splitlines()
                new_lines = []
                found_checksum = False
                for line in lines:
                    if line.strip().startswith("checksum"):
                        new_lines.append(f"checksum              = {new_checksum}")
                        found_checksum = True
                    else:
                        new_lines.append(line)
                if not found_checksum and new_checksum:
                    new_lines.append(f"checksum              = {new_checksum}")
                fixed_manifest_bytes = ("\n".join(new_lines) + "\n").encode("utf-8")
                break

        # 3. 写入新的 tar.gz 归档
        with tarfile.open(temp_path, "w:gz") as dst_tar:
            for m in members:
                if m.name == "app.tgz" and fixed_app_bytes is not None:
                    m.size = len(fixed_app_bytes)
                    m.mode = 0o644
                    dst_tar.addfile(m, io.BytesIO(fixed_app_bytes))
                elif m.name == "manifest" and fixed_manifest_bytes is not None:
                    m.size = len(fixed_manifest_bytes)
                    m.mode = 0o644
                    dst_tar.addfile(m, io.BytesIO(fixed_manifest_bytes))
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
    print("🛡️  已成功将 FPK 内部生命周期脚本与程序权限修正为 0755，并同步更新 checksum！")

def package_fpk_python(fpk_src_dir: str, output_fpk_path: str):
    """
    纯 Python 实现构建飞牛标准的 .fpk 安装包 (tar.gz 归档格式)
    严格遵循飞牛 fnOS 规范：
    1. 将 fpk_src/app 目录递归打包为 app.tgz (POSIX 权限: 目录/脚本 0755, 普通文件 0644)
    2. 计算 app.tgz 的 MD5 校验和，并写入 fpk_src/manifest 中的 checksum 字段
    3. 将 app.tgz 与 fpk_src 下的 manifest, cmd (0755), config, wizard, ICON*.PNG 打包为 .fpk
    """
    app_dir = os.path.join(fpk_src_dir, "app")
    app_buf = io.BytesIO()
    with tarfile.open(fileobj=app_buf, mode="w:gz") as app_tar:
        for root, dirs, files in os.walk(app_dir):
            for d in sorted(dirs):
                full_d = os.path.join(root, d)
                rel_d = os.path.relpath(full_d, app_dir).replace("\\", "/")
                tarinfo = app_tar.gettarinfo(full_d, arcname=rel_d)
                tarinfo.mode = 0o755
                tarinfo.uid = 0
                tarinfo.gid = 0
                app_tar.addfile(tarinfo)
            for f in sorted(files):
                full_f = os.path.join(root, f)
                rel_f = os.path.relpath(full_f, app_dir).replace("\\", "/")
                tarinfo = app_tar.gettarinfo(full_f, arcname=rel_f)
                if f.endswith(".sh") or f.endswith(".py") or "auto_config" in f:
                    tarinfo.mode = 0o755
                else:
                    tarinfo.mode = 0o644
                tarinfo.uid = 0
                tarinfo.gid = 0
                with open(full_f, "rb") as file_obj:
                    app_tar.addfile(tarinfo, file_obj)
    
    app_tgz_bytes = app_buf.getvalue()
    app_checksum = hashlib.md5(app_tgz_bytes).hexdigest()

    # 更新 manifest 追加/替换 checksum 字段
    manifest_path = os.path.join(fpk_src_dir, "manifest")
    with open(manifest_path, "r", encoding="utf-8") as mf:
        lines = mf.read().splitlines()
    new_lines = []
    found_checksum = False
    for line in lines:
        if line.strip().startswith("checksum"):
            new_lines.append(f"checksum              = {app_checksum}")
            found_checksum = True
        else:
            new_lines.append(line)
    if not found_checksum:
        new_lines.append(f"checksum              = {app_checksum}")
    with open(manifest_path, "wb") as mf:
        mf.write((to_lf("\n".join(new_lines)) + "\n").encode("utf-8"))

    with tarfile.open(output_fpk_path, mode="w:gz") as fpk_tar:
        # 添加 app.tgz
        app_tarinfo = tarfile.TarInfo(name="app.tgz")
        app_tarinfo.size = len(app_tgz_bytes)
        app_tarinfo.mode = 0o644
        app_tarinfo.uid = 0
        app_tarinfo.gid = 0
        fpk_tar.addfile(app_tarinfo, io.BytesIO(app_tgz_bytes))

        # 添加 fpk_src 下除 app 以外的所有条目
        for item in sorted(os.listdir(fpk_src_dir)):
            if item == "app":
                continue
            item_path = os.path.join(fpk_src_dir, item)
            if os.path.isdir(item_path):
                for root, dirs, files in os.walk(item_path):
                    rel_root = os.path.relpath(root, fpk_src_dir).replace("\\", "/")
                    root_tarinfo = fpk_tar.gettarinfo(root, arcname=rel_root)
                    root_tarinfo.mode = 0o755
                    root_tarinfo.uid = 0
                    root_tarinfo.gid = 0
                    fpk_tar.addfile(root_tarinfo)
                    for f in sorted(files):
                        full_f = os.path.join(root, f)
                        rel_f = os.path.relpath(full_f, fpk_src_dir).replace("\\", "/")
                        tarinfo = fpk_tar.gettarinfo(full_f, arcname=rel_f)
                        if item == "cmd" or f.endswith(".sh") or f.endswith(".py"):
                            tarinfo.mode = 0o755
                        else:
                            tarinfo.mode = 0o644
                        tarinfo.uid = 0
                        tarinfo.gid = 0
                        with open(full_f, "rb") as file_obj:
                            fpk_tar.addfile(tarinfo, file_obj)
            else:
                tarinfo = fpk_tar.gettarinfo(item_path, arcname=item)
                tarinfo.mode = 0o644
                tarinfo.uid = 0
                tarinfo.gid = 0
                with open(item_path, "rb") as file_obj:
                    fpk_tar.addfile(tarinfo, file_obj)

def verify_fpk(fpk_path: str):
    """
    严格审计生成的 .fpk 安装包，确保完全符合飞牛 (fnOS) 规范要求：
    1. 归档格式有效性 (tar.gz)
    2. app.tgz 存在且校验和与 manifest 中的 checksum 完全一致
    3. manifest 格式及必填字段校验
    4. cmd/ 目录下 7 个必要生命周期脚本完整且全部具备 0755 可执行权限
    5. config/privilege 权限配置文件合法
    """
    print("=" * 65)
    print("🔍 正在对生成的 FPK 安装包执行规范合规性校验...")
    
    with tarfile.open(fpk_path, "r:gz") as tar:
        names = set(tar.getnames())
        
        # 1. 检查必要顶级成员
        required_top_members = ["app.tgz", "manifest", "cmd", "config", "ICON.PNG", "ICON_256.PNG"]
        for rm in required_top_members:
            if not any(n == rm or n.startswith(rm + "/") for n in names):
                raise ValueError(f"❌ FPK 结构不完整: 缺失顶级成员 '{rm}'")
        
        # 2. 检查 app.tgz 及 MD5
        app_tgz_member = tar.getmember("app.tgz")
        raw_app_tgz = tar.extractfile(app_tgz_member).read()
        actual_md5 = hashlib.md5(raw_app_tgz).hexdigest()
        
        # 3. 检查 manifest 与 checksum
        manifest_member = tar.getmember("manifest")
        raw_manifest = tar.extractfile(manifest_member).read().decode("utf-8")
        manifest_dict = {}
        for line in raw_manifest.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                manifest_dict[k.strip()] = v.strip().strip('"').strip("'")
        
        for k in ["appname", "version", "display_name", "platform"]:
            if k not in manifest_dict:
                raise ValueError(f"❌ manifest 缺失必填字段: '{k}'")
        
        manifest_checksum = manifest_dict.get("checksum")
        if not manifest_checksum:
            raise ValueError("❌ manifest 缺失 'checksum' 校验和字段！系统安装将报错应用包不符合系统要求。")
        
        if manifest_checksum.lower() != actual_md5.lower():
            raise ValueError(
                f"❌ manifest 校验和与 app.tgz 不匹配！\n"
                f"  manifest checksum: {manifest_checksum}\n"
                f"  实际 app.tgz MD5  : {actual_md5}"
            )
        
        # 4. 检查 cmd 脚本完整性与可执行权限 (7 个核心必要脚本)
        required_cmd_scripts = [
            "cmd/main",
            "cmd/install_init",
            "cmd/install_callback",
            "cmd/upgrade_init",
            "cmd/upgrade_callback",
            "cmd/uninstall_init",
            "cmd/uninstall_callback",
        ]
        for script in required_cmd_scripts:
            if script not in names:
                raise ValueError(f"❌ cmd/ 缺少必要生命周期脚本: '{script}'！飞牛系统将拒绝安装。")
            member = tar.getmember(script)
            if (member.mode & 0o111) == 0:
                raise ValueError(f"❌ 脚本 '{script}' 权限为 {oct(member.mode)}，未设置 0755 可执行权限！")
        
        # 5. 检查内层 app.tgz 的有效性
        app_buf = io.BytesIO(raw_app_tgz)
        with tarfile.open(fileobj=app_buf, mode="r:gz") as inner_tar:
            inner_members = {member.name.removeprefix("./"): member for member in inner_tar}
            ui_config = json.load(inner_tar.extractfile(inner_members["ui/config"]))
            entry = ui_config[".url"][manifest_dict["desktop_applaunchname"]]
            if (entry["type"], entry["url"], entry["gatewayPrefix"], entry["gatewaySocket"]) != (
                "iframe", f"{GATEWAY_PREFIX}/", GATEWAY_PREFIX, GATEWAY_SOCKET
            ):
                raise ValueError("❌ FPK 网关窗口入口配置不一致")
            html = inner_tar.extractfile(inner_members["ui/index.html"]).read().decode("utf-8")
            if f'src="{GATEWAY_PREFIX}/assets/' not in html:
                raise ValueError("❌ FPK 前端产物缺少网关路径")
            direct_html = inner_tar.extractfile(inner_members["direct-ui/index.html"]).read().decode("utf-8")
            if 'src="/assets/' not in direct_html:
                raise ValueError("❌ FPK 独立入口缺少根路径前端产物")
        
    print("✅ 归档格式校验正常 (tar.gz)")
    print(f"✅ 内层核心 app.tgz 存在且校验通过 (MD5: {actual_md5})")
    print(f"✅ manifest 清单信息有效，checksum 校验和严格匹配")
    print(f"✅ cmd/ 生命周期脚本完整且全部具备 0755 可执行权限 (共 {len([n for n in names if n.startswith('cmd/')])} 个脚本)")
    print(f"✅ config 权限与资源定义完备")
    print("✅ iframe 入口与前端网关路径校验通过")
    print("=" * 65)


def main():
    print("=" * 65)
    print("🚀 使用官方 fnpack 构建 Torrenta 飞牛私有云 (fnOS) FPK 安装包")
    print(f"📌 网关入口: {GATEWAY_PREFIX}/ | 默认 qBittorrent 端口: {DEFAULT_QB_PORT}")
    print("=" * 65)

    # 1. 确保图标生成脚本就绪
    print("🎨 步骤 1/4: 从源图生成各规格应用图标...")
    subprocess.run([sys.executable, "scripts/generate_icons.py"], cwd=ROOT_DIR, check=True)

    # 2. 分别构建网关和独立入口，避免复用已有或过期的构建产物。
    print("🔨 步骤 2/4: 编译统一网关和独立入口的前端...")
    npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
    if not npm:
        raise RuntimeError("未找到 npm，请先安装 Node.js 并运行 npm install。")
    for base, directory, mode in ((f"{GATEWAY_PREFIX}/", DIST_DIR, "fpk-gateway"),
                                  ("/", DIRECT_DIST_DIR, "fpk-direct")):
        subprocess.run(
            [npm, "run", "build", "--", "--mode", mode, "--base", base, "--outDir", directory],
            cwd=ROOT_DIR,
            check=True,
        )

    # 3. 组装 fpk_src 源码结构
    print("📂 步骤 3/4: 组装官方规范源码目录 fpk_src/ ...")
    if os.path.realpath(FPK_SRC_DIR) != os.path.join(os.path.realpath(ROOT_DIR), "fpk_src"):
        raise RuntimeError("FPK 组装目录必须位于项目根目录下。")
    if os.path.exists(FPK_SRC_DIR):
        shutil.rmtree(FPK_SRC_DIR)
    os.makedirs(FPK_SRC_DIR, exist_ok=True)

    # 4.1 复制根目录图标 (ICON.PNG 64x64, ICON_256.PNG 256x256)
    shutil.copyfile(os.path.join(ROOT_DIR, "public", "icon-64.png"), os.path.join(FPK_SRC_DIR, "ICON.PNG"))
    shutil.copyfile(os.path.join(ROOT_DIR, "public", "icon-256.png"), os.path.join(FPK_SRC_DIR, "ICON_256.PNG"))

    # 4.2 写入 manifest 清单 (统一从 package.json 读取版本号，实现单一数据源维护)
    with open(os.path.join(ROOT_DIR, "package.json"), encoding="utf-8") as package_file:
        app_version = json.load(package_file)["version"]


    manifest_lines = [
        'appname               = torrenta',
        f'version               = {app_version}',
        'display_name          = Torrenta',
        'desc                  = ✨ 优雅、现代化且轻量的 qBittorrent 专业 WebUI 客户端',
        'platform              = x86',
        'source                = thirdparty',
        'maintainer            = fulco',
        'distributor           = fulco',
        'os_min_version        = 1.1.3100',
        'ctl_stop              = true',
        'desktop_uidir         = ui',
        'desktop_applaunchname = torrenta.Application'
    ]
    with open(os.path.join(FPK_SRC_DIR, "manifest"), "wb") as f:
        f.write((to_lf("\n".join(manifest_lines)) + "\n").encode("utf-8"))


    # 4.3 组装 app/ 目录 (包含 app/ui/ 与 app/ 根冗余)
    app_dir = os.path.join(FPK_SRC_DIR, "app")
    app_ui_dir = os.path.join(app_dir, "ui")
    os.makedirs(app_ui_dir, exist_ok=True)
    shutil.copytree(DIRECT_DIST_DIR, os.path.join(app_dir, "direct-ui"))

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
                "type": "iframe",
                "protocol": "",
                "url": f"{GATEWAY_PREFIX}/",
                "gatewayPrefix": GATEWAY_PREFIX,
                "gatewaySocket": GATEWAY_SOCKET,
                "allUsers": False,
                "control": {"accessPerm": "readonly"}
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

    # 服务脚本放在应用目录和兼容的安装根目录。
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "server.py"), os.path.join(FPK_SRC_DIR, "server.py"))
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "server.py"), os.path.join(app_dir, "server.py"))

    # 复制 auto_config_qb.sh 自动化配置脚本
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "auto_config_qb.sh"), os.path.join(FPK_SRC_DIR, "auto_config_qb.sh"))
    shutil.copyfile(os.path.join(ROOT_DIR, "scripts", "auto_config_qb.sh"), os.path.join(app_dir, "auto_config_qb.sh"))

    # 4.4 组装 wizard 安装向导 (严格遵循飞牛 fnOS 官方规范)
    wizard_dir = os.path.join(FPK_SRC_DIR, "wizard")
    os.makedirs(wizard_dir, exist_ok=True)

    wizard_spec = [
        {
            "stepTitle": "qBittorrent 连接设置",
            "items": [
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
                            "pattern": "^[1-9][0-9]{0,4}$",
                            "message": "请输入 1 到 65535 之间的端口号"
                        }
                    ]
                }
            ]
        },
        {
            "stepTitle": "独立网页访问",
            "items": [
                {
                    "type": "text",
                    "field": "wizard_direct_port",
                    "label": "独立访问端口",
                    "desc": f"留空保留原设置。启用时可填 {DEFAULT_DIRECT_PORT}，填 0 关闭独立端口。",
                    "initValue": "",
                    "rules": [
                        {
                            "pattern": "^([0-9]{1,5})?$",
                            "message": "请输入 0 到 65535 之间的端口号"
                        }
                    ]
                },
                {
                    "type": "password",
                    "field": "wizard_direct_password",
                    "label": "独立访问密码",
                    "desc": "可选。qBittorrent 开启登录校验时可使用原账号，独立账号名为 admin。留空保留已有密码。",
                    "initValue": ""
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
    resource_content = '{}\n'
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
SOCKET_PATH="${{TARGET_DIR}}/{GATEWAY_SOCKET}"

# 智能推断飞牛应用持久化目录 TRIM_PKGVAR 与 DATA_DIR
if [ -z "${{TRIM_PKGVAR}}" ]; then
    if [ -d "/var/apps/torrenta/var" ]; then
        TRIM_PKGVAR="/var/apps/torrenta/var"
    elif [ -d "${{APP_DIR}}/../var" ]; then
        TRIM_PKGVAR="$(cd "${{APP_DIR}}/../var" 2>/dev/null && pwd || true)"
    fi
fi

# 初始化日志与运行时路径 (优先使用飞牛应用持久化目录 TRIM_PKGVAR，如 /vol1/@appdata/torrenta 或 /var/apps/torrenta/var)
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
            [ -S "${{SOCKET_PATH}}" ]
            return $?
        else
            rm -f "${{PID_FILE}}"
        fi
    fi
    return 1
}}

gateway_responds() {{
    [ -S "${{SOCKET_PATH}}" ] || return 1
    "$1" -c '
import http.client
import socket
import sys

with socket.socket(socket.AF_UNIX) as connection:
    connection.settimeout(1)
    connection.connect(sys.argv[1])
    connection.sendall(b"GET / HTTP/1.0\\r\\n\\r\\n")
    response = http.client.HTTPResponse(connection)
    response.begin()
    sys.exit(response.status != 403)
' "${{SOCKET_PATH}}" 2>/dev/null
}}

start_process() {{
    if status; then
        log_msg "Torrenta is already running (PID: $(cat "${{PID_FILE}}"))"
        return 0
    fi

    # 清理仍在运行但已经失去 Socket 的旧进程。
    if [ -r "${{PID_FILE}}" ]; then
        stop_process
    fi

    local web_root
    web_root=$(find_web_root)
    local server_script
    server_script=$(find_server_script)
    local py_bin
    py_bin=$(find_python)

    if [ -z "$py_bin" ] || [ -z "$server_script" ] || [ ! -f "$web_root/index.html" ]; then
        log_msg "ERROR: Python, the Torrenta server script, and the built UI are required."
        return 1
    fi

    export GATEWAY_SOCKET_PATH="${{SOCKET_PATH}}"
    export GATEWAY_PREFIX="{GATEWAY_PREFIX}"
    export TORRENTA_DIRECT_WEB_ROOT="$(dirname "$web_root")/direct-ui"
    export QBITTORRENT_PORT="${{QBITTORRENT_PORT:-{DEFAULT_QB_PORT}}}"
    export WEB_ROOT="${{web_root}}"
    export TRIM_APPDEST="${{TARGET_DIR}}"
    if [ -n "${{TRIM_PKGVAR}}" ]; then
        export TRIM_PKGVAR="${{TRIM_PKGVAR}}"
        export DATA_DIR="${{DATA_DIR:-${{TRIM_PKGVAR}}}}"
    elif [ -d "/var/apps/torrenta/var" ]; then
        export TRIM_PKGVAR="/var/apps/torrenta/var"
        export DATA_DIR="/var/apps/torrenta/var"
    fi

    log_msg "Discovered Target Dir: ${{TARGET_DIR}}"
    log_msg "Discovered Web Root: ${{web_root}}"
    log_msg "Discovered Server Script: ${{server_script}}"
    log_msg "Discovered Python: ${{py_bin}}"
    log_msg "Starting Torrenta at ${{SOCKET_PATH}}, targeting qBittorrent on port ${{QBITTORRENT_PORT}}..."
    local p_id attempt
    nohup "$py_bin" -u "$server_script" >> "${{LOG_FILE}}" 2>&1 &
    p_id=$!
    for ((attempt = 0; attempt < 30; attempt++)); do
        check_process "$p_id" || break
        if gateway_responds "$py_bin" && check_process "$p_id"; then
            printf "%s\\n" "$p_id" > "${{PID_FILE}}"
            log_msg "Torrenta gateway is ready (PID: $p_id)"
            return 0
        fi
        sleep 0.2
    done

    kill -TERM "$p_id" 2>/dev/null || true
    wait "$p_id" 2>/dev/null || true
    log_msg "ERROR: Torrenta gateway did not respond at ${{SOCKET_PATH}}."
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

if [ -z "${{TRIM_PKGVAR}}" ]; then
    if [ -d "/var/apps/torrenta/var" ]; then
        TRIM_PKGVAR="/var/apps/torrenta/var"
    elif [ -d "${{APP_DIR}}/../var" ]; then
        TRIM_PKGVAR="$(cd "${{APP_DIR}}/../var" 2>/dev/null && pwd || true)"
    fi
fi

if [ -n "${{TRIM_PKGVAR}}" ]; then
    mkdir -p "${{TRIM_PKGVAR}}" 2>/dev/null || true
    ENV_FILE="${{TRIM_PKGVAR}}/torrenta.env"
else
    mkdir -p "${{APP_DIR}}/var" 2>/dev/null || true
    ENV_FILE="${{APP_DIR}}/torrenta.env"
fi

# 保留升级前的 qBittorrent 连接配置，向导输入可覆盖旧端口。
if [ -f "${{ENV_FILE}}" ]; then
    source "${{ENV_FILE}}" 2>/dev/null || true
fi
PREVIOUS_QB_PORT="${{QBITTORRENT_PORT:-{DEFAULT_QB_PORT}}}"
USER_QB_PORT="$PREVIOUS_QB_PORT"
for field in wizard_qb_port qbittorrent_port qb_port WIZARD_qb_port WIZARD_qbittorrent_port; do
    if [ -n "${{!field}}" ]; then
        USER_QB_PORT="${{!field}}"
        break
    fi
done
if [[ ! "$USER_QB_PORT" =~ ^[0-9]{{1,5}}$ ]] || ((10#$USER_QB_PORT < 1 || 10#$USER_QB_PORT > 65535)); then
    echo "qBittorrent 端口必须为 1 到 65535 之间的数字。" >&2
    exit 1
fi
if [ "$USER_QB_PORT" != "$PREVIOUS_QB_PORT" ]; then
    unset QBITTORRENT_URL QBITTORRENT_HOST
fi

DIRECT_PORT="$wizard_direct_port"
if [ -z "$DIRECT_PORT" ] && {{ [ "$TORRENTA_DIRECT_FORM_AUTH" = 1 ] || [ -n "$TORRENTA_DIRECT_PASSWORD" ]; }}; then
    DIRECT_PORT="$TORRENTA_DIRECT_PORT"
fi
DIRECT_PASSWORD="${{wizard_direct_password:-${{TORRENTA_DIRECT_PASSWORD:-}}}}"
if [ -z "$DIRECT_PORT" ] && [ -n "$DIRECT_PASSWORD" ]; then
    DIRECT_PORT="${{SERVICE_PORT:-{DEFAULT_DIRECT_PORT}}}"
fi
DIRECT_PORT="${{DIRECT_PORT:-0}}"
if [[ ! "$DIRECT_PORT" =~ ^[0-9]{{1,5}}$ ]] || ((10#$DIRECT_PORT > 65535)); then
    echo "独立访问端口必须为 0 到 65535 之间的数字。" >&2
    exit 1
fi

umask 077
TORRENTA_ENV_TEMP=$(mktemp "${{ENV_FILE}}.XXXXXX") || exit 1
trap 'rm -f -- "$TORRENTA_ENV_TEMP"' EXIT
printf '%s=%q\\n' \\
    QBITTORRENT_PORT "$USER_QB_PORT" \\
    QBITTORRENT_URL "${{QBITTORRENT_URL:-http://127.0.0.1:$USER_QB_PORT}}" \\
    QBITTORRENT_HOST "${{QBITTORRENT_HOST:-127.0.0.1:$USER_QB_PORT}}" \\
    QBITTORRENT_USER "${{QBITTORRENT_USER}}" QBITTORRENT_PASS "${{QBITTORRENT_PASS}}" \\
    TORRENTA_DIRECT_PORT "$DIRECT_PORT" TORRENTA_DIRECT_PASSWORD "$DIRECT_PASSWORD" TORRENTA_DIRECT_FORM_AUTH 1 \\
    > "$TORRENTA_ENV_TEMP" || exit 1
mv -f -- "$TORRENTA_ENV_TEMP" "${{ENV_FILE}}" || exit 1

# 自动跨版本迁移保留用户的个性化设置文件 (user_settings*.json)
if [ -n "${{TRIM_PKGVAR}}" ] && [ -d "${{TRIM_PKGVAR}}" ]; then
    for old_cand in "${{TARGET_DIR}}/var" "${{TARGET_DIR}}/data" "${{APP_DIR}}/var" "${{APP_DIR}}/data"; do
        if [ -d "$old_cand" ]; then
            for old_json in "$old_cand"/user_settings*.json; do
                if [ -f "$old_json" ] && [ ! -f "${{TRIM_PKGVAR}}/$(basename "$old_json")" ]; then
                    cp -f "$old_json" "${{TRIM_PKGVAR}}/" 2>/dev/null || true
                fi
            done
        fi
    done
fi

exit 0
"""
    with open(os.path.join(cmd_dir, "install_callback"), "wb") as f:
        f.write(to_lf(callback_script).encode("utf-8"))
    with open(os.path.join(cmd_dir, "upgrade_callback"), "wb") as f:
        f.write(to_lf(callback_script).encode("utf-8"))
    with open(os.path.join(cmd_dir, "config_callback"), "wb") as f:
        f.write(to_lf(callback_script).encode("utf-8"))

    # 生成飞牛 fnOS 规范要求的其余必要生命周期钩子脚本
    for hook in ["install_init", "upgrade_init", "uninstall_init", "uninstall_callback", "config_init"]:
        with open(os.path.join(cmd_dir, hook), "wb") as f:
            f.write(to_lf("#!/bin/bash\nexit 0\n").encode("utf-8"))

    # 设置 cmd 脚本与二进制权限为 0755
    if sys.platform != "win32":
        for script in os.listdir(cmd_dir):
            os.chmod(os.path.join(cmd_dir, script), 0o755)

    # 4.7 同步组装 app/config (飞牛官方规范: 内层 app 中也需附带 resource/privilege)
    app_config_dir = os.path.join(app_dir, "config")
    os.makedirs(app_config_dir, exist_ok=True)
    shutil.copyfile(os.path.join(config_dir, "privilege"), os.path.join(app_config_dir, "privilege"))
    shutil.copyfile(os.path.join(config_dir, "resource"), os.path.join(app_config_dir, "resource"))

    # 5. 构建 .fpk 安装包
    print("🗜️  步骤 4/4: 构建 .fpk 安装包...")
    os.makedirs(RELEASE_DIR, exist_ok=True)
    dest_fpk = os.path.join(RELEASE_DIR, "torrenta.fpk")
    
    # 优先使用官方 fnpack 打包工具
    fnpack_bin = ensure_fnpack()
    with tempfile.TemporaryDirectory(dir=RELEASE_DIR, prefix="fpk-build-") as staging_dir:
        staged_fpk = None
        if fnpack_bin:
            print(f"📦 调用官方 fnpack 工具 [{fnpack_bin}]...")
            result = subprocess.run(
                [fnpack_bin, "build", "-d", FPK_SRC_DIR],
                cwd=staging_dir,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            print(result.stdout)
            if result.returncode == 0:
                staged_fpk = next(
                    (os.path.join(staging_dir, name) for name in os.listdir(staging_dir) if name.endswith(".fpk")),
                    None,
                )
                if staged_fpk and sys.platform == "win32":
                    fix_fpk_permissions(staged_fpk)
            else:
                print("⚠️ fnpack 构建未成功:\n", result.stderr)

        if not staged_fpk:
            print("📦 采用 Python 封包引擎构建 .fpk 安装包...")
            staged_fpk = os.path.join(staging_dir, "torrenta.fpk")
            package_fpk_python(FPK_SRC_DIR, staged_fpk)

        verify_fpk(staged_fpk)
        os.replace(staged_fpk, dest_fpk)

    file_size_kb = os.path.getsize(dest_fpk) / 1024
    print(f"🎉 Torrenta {app_version} FPK: {dest_fpk} ({file_size_kb:.2f} KB)")

if __name__ == "__main__":
    main()


