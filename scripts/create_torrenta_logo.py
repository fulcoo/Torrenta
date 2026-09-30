import os
import sys
import subprocess
from PIL import Image

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE_PATH):
    EDGE_PATH = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

# 原始 favicon.svg 内部的核心矢量路径定义 (viewBox: 0 0 48 46)
FAVICON_SVG_PATH = os.path.join(PUBLIC_DIR, "favicon.svg")

def build_icon_html():
    with open(FAVICON_SVG_PATH, "r", encoding="utf-8") as f:
        svg_content = f.read()

    # 构造 1024x1024 高清现代 Squircle 桌面图标渲染页面
    # 采用轻盈优雅的深色微光玻璃底座，中心完美呈现原始轻巧灵动的 Torrenta 种子流光矢量图腾
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: 1024px;
    height: 1024px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}
  .icon-container {{
    position: relative;
    width: 880px;
    height: 880px;
    border-radius: 200px;
    background: radial-gradient(circle at 50% 35%, #1f143d 0%, #0d081f 70%, #06040f 100%);
    box-shadow: 
      0 40px 80px rgba(0, 0, 0, 0.6),
      0 0 0 3px rgba(134, 59, 255, 0.35),
      inset 0 1px 2px rgba(255, 255, 255, 0.25),
      inset 0 -2px 6px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  /* 背后柔和的环境极光晕染 */
  .glow-backdrop {{
    position: absolute;
    width: 580px;
    height: 580px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(126, 20, 255, 0.35) 0%, rgba(71, 191, 255, 0.15) 50%, transparent 70%);
    filter: blur(40px);
    z-index: 1;
  }}
  .emblem-wrapper {{
    position: relative;
    width: 540px;
    height: 540px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 15px 30px rgba(126, 20, 255, 0.45));
  }}
  .emblem-wrapper svg {{
    width: 100%;
    height: 100%;
    overflow: visible;
  }}
</style>
</head>
<body>
  <div class="icon-container">
    <div class="glow-backdrop"></div>
    <div class="emblem-wrapper">
      {svg_content}
    </div>
  </div>
</body>
</html>
"""
    return html

def main():
    print("🎨 正在基于原版优雅矢量图腾生成 Torrenta 飞牛官方图标...")
    temp_html = os.path.join(ROOT_DIR, "temp_render_icon.html")
    temp_png = os.path.join(ROOT_DIR, "temp_render_icon.png")

    try:
        html_content = build_icon_html()
        with open(temp_html, "w", encoding="utf-8") as f:
            f.write(html_content)

        # 调用无头 Edge 浏览器进行 1024x1024 矢量高保真渲染
        subprocess.run([
            EDGE_PATH,
            "--headless",
            "--disable-gpu",
            "--force-device-scale-factor=1",
            "--window-size=1024,1024",
            "--default-background-color=00000000",
            f"--screenshot={temp_png}",
            os.path.abspath(temp_html)
        ], check=True)

        if not os.path.exists(temp_png):
            print("❌ 渲染失败，未找到输出图像。")
            sys.exit(1)

        # 加载渲染出的 1024x1024 高清母图
        img_1024 = Image.open(temp_png).convert("RGBA")
        
        # 1. 保存 1024x1024 主 Logo
        logo_path = os.path.join(PUBLIC_DIR, "logo.png")
        img_1024.save(logo_path, "PNG", optimize=True)
        print(f"✨ 成功生成 1024x1024 优雅官方 Logo: {logo_path}")

        # 2. 生成 256x256 飞牛大图标
        icon_256_path = os.path.join(PUBLIC_DIR, "icon-256.png")
        img_256 = img_1024.resize((256, 256), Image.Resampling.LANCZOS)
        img_256.save(icon_256_path, "PNG", optimize=True)
        print(f"✨ 成功生成 256x256 飞牛大图标: {icon_256_path}")

        # 3. 生成 64x64 飞牛标准图标
        icon_64_path = os.path.join(PUBLIC_DIR, "icon-64.png")
        img_64 = img_1024.resize((64, 64), Image.Resampling.LANCZOS)
        img_64.save(icon_64_path, "PNG", optimize=True)
        print(f"✨ 成功生成 64x64 飞牛标准图标: {icon_64_path}")

        # 4. 生成 32x32 小图标
        img_32 = img_1024.resize((32, 32), Image.Resampling.LANCZOS)
        img_32.save(os.path.join(PUBLIC_DIR, "favicon-32.png"), "PNG", optimize=True)

        print("🎉 图标生成完成，已恢复原本灵动优雅、无厚重肌肉感的轻盈设计！")

    finally:
        # 清理临时文件
        if os.path.exists(temp_html):
            try: os.remove(temp_html)
            except Exception: pass
        if os.path.exists(temp_png):
            try: os.remove(temp_png)
            except Exception: pass

if __name__ == "__main__":
    main()
