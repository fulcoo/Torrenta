import os
import sys
from PIL import Image

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_ICON = os.path.join(ROOT_DIR, "public", "logo.png")
OUTPUT_DIR = os.path.join(ROOT_DIR, "public")

def main():
    if not os.path.exists(SRC_ICON):
        # 尝试调用 create_torrenta_logo 自动生成高清源图
        import subprocess
        create_script = os.path.join(ROOT_DIR, "scripts", "create_torrenta_logo.py")
        if os.path.exists(create_script):
            subprocess.run([sys.executable, create_script], cwd=ROOT_DIR, check=True)
            
    if not os.path.exists(SRC_ICON):
        print(f"❌ 未找到源图标: {SRC_ICON}")
        sys.exit(1)
        
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    img = Image.open(SRC_ICON).convert("RGBA")
    
    # 尺寸生成
    sizes = [(64, "icon-64.png"), (256, "icon-256.png")]
    for size, name in sizes:
        dest_path = os.path.join(OUTPUT_DIR, name)
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(dest_path, "PNG", optimize=True)
        print(f"✅ 成功生成图标: {dest_path} ({size}x{size})")

if __name__ == "__main__":
    main()
