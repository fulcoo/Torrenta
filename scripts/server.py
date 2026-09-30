#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Torrenta High-Availability Web & Proxy Server for fnOS
Supports:
- SPA static files hosting with HTML5 history mode fallback
- Built-in qBittorrent reverse proxy (/api/v2/*) bypassing CORS and CSRF
- Multi-user isolation integration (/api/whoami, /api/user_identity)
- Autologin endpoint (/api/torrenta-autologin)
- Unix domain socket gateway support
"""

import os
import sys
import mimetypes
import threading
import time
import socket
import json
import urllib.request
import urllib.error
from urllib.parse import urlparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import socketserver

# Configure stdout / stderr for Windows/Linux
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='ignore')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='ignore')
except:
    pass

# Ignore SIGPIPE signal on Linux
if hasattr(socket, 'SIGPIPE'):
    try:
        import signal
        signal.signal(signal.SIGPIPE, signal.SIG_IGN)
    except:
        pass

# Initialize MIME types
mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('image/png', '.png')
mimetypes.add_type('image/jpeg', '.jpg')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('text/html', '.html')

APP_DIR = os.path.dirname(os.path.abspath(__file__))

def load_env_file():
    """Load persistent environment file if created by installation wizard"""
    candidates = [
        os.path.join(os.environ.get('TRIM_PKGVAR', ''), 'torrenta.env'),
        os.path.join(os.environ.get('TRIM_PKGETC', ''), 'torrenta.env'),
        os.path.join(os.environ.get('TRIM_APPDEST', ''), 'torrenta.env'),
        os.path.join(APP_DIR, 'torrenta.env'),
        os.path.join(APP_DIR, '..', 'torrenta.env')
    ]
    for env_path in candidates:
        if env_path and os.path.isfile(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8', errors='ignore') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            k, v = line.split('=', 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k and not os.environ.get(k):
                                os.environ[k] = v
                break
            except Exception:
                pass

load_env_file()

# Port configuration
PORT = int(os.environ.get('SERVICE_PORT', '18322'))
QB_PORT = os.environ.get('QBITTORRENT_PORT', '8080')
QBITTORRENT_URL = os.environ.get('QBITTORRENT_URL', f'http://127.0.0.1:{QB_PORT}').rstrip('/')
parsed_qb = urlparse(QBITTORRENT_URL)
QBITTORRENT_HOST = os.environ.get('QBITTORRENT_HOST', parsed_qb.netloc or f'127.0.0.1:{QB_PORT}')

def find_web_root():
    if os.environ.get('WEB_ROOT') and os.path.isdir(os.environ.get('WEB_ROOT')):
        return os.environ.get('WEB_ROOT')
    
    app_dest = os.environ.get('TRIM_APPDEST', '')
    candidates = []
    if app_dest:
        candidates.extend([
            os.path.join(app_dest, 'ui'),
            app_dest,
            os.path.join(app_dest, 'app', 'ui')
        ])
    
    candidates.extend([
        os.path.join(APP_DIR, 'ui'),
        os.path.join(APP_DIR, 'target', 'ui'),
        os.path.join(APP_DIR, 'target'),
        os.path.join(APP_DIR, 'app', 'ui'),
        os.path.join(APP_DIR, 'dist', 'public'),
        os.path.join(APP_DIR, 'dist'),
        '/var/apps/torrenta/target/ui',
        '/var/apps/torrenta/target',
        '/var/apps/torrenta/ui',
        APP_DIR
    ])
    for d in candidates:
        if os.path.exists(d) and os.path.isfile(os.path.join(d, 'index.html')):
            return d
    return APP_DIR

WEB_ROOT = find_web_root()

def find_data_dir():
    """Resolve persistent data directory for fnOS, Docker, or local environments"""
    # 1. 飞牛私有云官方持久化数据目录
    if os.environ.get('TRIM_PKGVAR'):
        try:
            os.makedirs(os.environ.get('TRIM_PKGVAR'), exist_ok=True)
            return os.environ.get('TRIM_PKGVAR')
        except:
            pass

    # 2. Docker / 外部指定数据目录
    if os.environ.get('DATA_DIR'):
        try:
            os.makedirs(os.environ.get('DATA_DIR'), exist_ok=True)
            return os.environ.get('DATA_DIR')
        except:
            pass

    # 3. 容器内默认 /data 挂载点
    if os.path.exists('/data') or (sys.platform != 'win32' and os.path.isdir('/')):
        try:
            os.makedirs('/data', exist_ok=True)
            return '/data'
        except:
            pass

    # 4. 回退到本地 data 或 var 目录
    for sub in ('data', 'var'):
        d = os.path.join(APP_DIR, sub)
        try:
            os.makedirs(d, exist_ok=True)
            return d
        except:
            pass
    return APP_DIR

DATA_DIR = find_data_dir()

def get_user_settings_file(username=""):
    """Get path to persistent settings file, optionally user-isolated"""
    clean_user = "".join(c for c in username if c.isalnum() or c in ('-', '_')).strip()
    if clean_user:
        return os.path.join(DATA_DIR, f"user_settings_{clean_user}.json")
    return os.path.join(DATA_DIR, "user_settings.json")

class SafeTorrentaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_ROOT, **kwargs)

    def address_string(self):
        try:
            if isinstance(self.client_address, (list, tuple)) and len(self.client_address) >= 1:
                return str(self.client_address[0])
            return "client"
        except:
            return "127.0.0.1"

    def get_clean_path(self):
        p = self.path
        if p.startswith('/app/torrenta'):
            p = p[len('/app/torrenta'):]
        return p

    def get_client_ip(self):
        x_forwarded = self.headers.get('X-Forwarded-For', '')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        x_real = self.headers.get('X-Real-IP', '')
        if x_real:
            return x_real.strip()
        return self.address_string()

    def get_user_identity(self):
        fnos_user = (
            self.headers.get('X-Trim-User-Name') or
            self.headers.get('X-Trim-Username') or
            self.headers.get('X-User-Name') or
            self.headers.get('X-Username') or
            self.headers.get('X-Auth-User') or
            self.headers.get('Trim-User') or
            ''
        ).strip()

        client_ip = self.get_client_ip()

        if fnos_user:
            return {
                'userId': f"user_{fnos_user}",
                'userName': fnos_user,
                'userType': 'fnos_user',
                'clientIp': client_ip
            }
        else:
            clean_ip = client_ip.replace(':', '_').replace('.', '_')
            return {
                'userId': f"ip_{clean_ip}",
                'userName': f"访客 ({client_ip})",
                'userType': 'ip_client',
                'clientIp': client_ip
            }

    def _apply_cors_headers(self):
        if getattr(self, '_cors_applied', False):
            return
        origin = self.headers.get('Origin')
        if origin:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Vary', 'Origin')
        else:
            self.send_header('Access-Control-Allow-Origin', '*')
        self._cors_applied = True

    def do_OPTIONS(self):
        try:
            self.send_response(200, "OK")
            self.end_headers()
        except Exception:
            pass

    def do_GET(self):
        clean_p = self.get_clean_path().split('?')[0]

        # 1. fnOS 用户身份感知
        if clean_p in ('/api/whoami', '/api/user_identity'):
            user_info = self.get_user_identity()
            resp = json.dumps(user_info, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(resp)
            return

        # 2. 自动登录凭据支持
        if clean_p == '/api/torrenta-autologin':
            u = os.environ.get('QBITTORRENT_USER', '')
            p = os.environ.get('QBITTORRENT_PASS', '')
            resp = json.dumps({'username': u, 'password': p}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(resp)
            return

        # 3. 个性化配置持久化读取 (支持 fnOS 与 Docker)
        if clean_p == '/api/user-settings':
            user_info = self.get_user_identity()
            username = user_info.get('userName', '') if user_info.get('userType') == 'fnos_user' else ''
            target_file = get_user_settings_file(username)
            default_file = get_user_settings_file("")

            data = "{}"
            if os.path.isfile(target_file):
                try:
                    with open(target_file, 'r', encoding='utf-8') as f:
                        data = f.read().strip() or "{}"
                except:
                    data = "{}"
            elif os.path.isfile(default_file):
                try:
                    with open(default_file, 'r', encoding='utf-8') as f:
                        data = f.read().strip() or "{}"
                except:
                    data = "{}"

            resp = data.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(resp)
            return

        # 4. 反向代理到 qBittorrent
        if self.path.startswith('/api/v2/') or self.path.startswith('/api/v2'):
            self._proxy_request('GET')
            return

        return super().do_GET()

    def do_POST(self):
        clean_p = self.get_clean_path().split('?')[0]

        # 个性化配置持久化写入 (原子写入防损坏，跨更新/跨重启持久保留)
        if clean_p == '/api/user-settings':
            user_info = self.get_user_identity()
            username = user_info.get('userName', '') if user_info.get('userType') == 'fnos_user' else ''
            target_file = get_user_settings_file(username)
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_len)
                # 校验有效 JSON
                json.loads(body.decode('utf-8'))

                tmp_file = f"{target_file}.tmp"
                with open(tmp_file, 'wb') as f:
                    f.write(body)
                    f.flush()
                    try:
                        os.fsync(f.fileno())
                    except:
                        pass
                os.replace(tmp_file, target_file)

                # 同时同步一份到默认配置，确保全局兜底
                default_file = get_user_settings_file("")
                if target_file != default_file:
                    try:
                        with open(default_file, 'wb') as df:
                            df.write(body)
                    except:
                        pass

                resp = b'{"success": true}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                err_msg = json.dumps({'error': str(e)}).encode('utf-8')
                self.wfile.write(err_msg)
            return

        if self.path.startswith('/api/v2/') or self.path.startswith('/api/v2'):
            self._proxy_request('POST')
            return
        self.send_error(404)

    def do_PUT(self):
        if self.path.startswith('/api/v2/'):
            self._proxy_request('PUT')
            return
        self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith('/api/v2/'):
            self._proxy_request('DELETE')
            return
        self.send_error(404)

    def _proxy_request(self, method):
        target_path = self.path
        if target_path.startswith('/app/torrenta'):
            target_path = target_path[len('/app/torrenta'):]
            
        target_url = f"{QBITTORRENT_URL}{target_path}"
        req_body = None
        if 'Content-Length' in self.headers:
            try:
                content_len = int(self.headers['Content-Length'])
                req_body = self.rfile.read(content_len)
            except Exception:
                pass

        req = urllib.request.Request(target_url, data=req_body, method=method)

        # 过滤代理头 (NPM/网关传入的 x-forwarded-* 会导致 qBittorrent 触发 Host 校验报 401)
        blocked_headers = {
            'host', 'origin', 'referer', 'content-length', 'connection',
            'transfer-encoding', 'x-real-ip', 'forwarded'
        }
        for k, v in self.headers.items():
            k_low = k.lower()
            if k_low in blocked_headers or k_low.startswith('x-forwarded-'):
                continue
            req.add_header(k, v)

        # 强制注入针对 qBittorrent 的本地域名与来源以通过安全检查
        req.add_header('Host', QBITTORRENT_HOST)
        req.add_header('Origin', f"http://{QBITTORRENT_HOST}")
        req.add_header('Referer', f"http://{QBITTORRENT_HOST}/")

        is_https = (self.headers.get('X-Forwarded-Proto', '').lower() == 'https')

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                self.send_response(resp.status)
                for hk, hv in resp.getheaders():
                    hk_low = hk.lower()
                    if hk_low in ('transfer-encoding', 'connection'):
                        continue
                    if hk_low == 'set-cookie' and is_https:
                        import re
                        if 'samesite=' in hv.lower():
                            hv = re.sub(r'samesite=\w+', 'SameSite=None; Secure', hv, flags=re.IGNORECASE)
                        elif 'secure' not in hv.lower():
                            hv = f"{hv}; SameSite=None; Secure"
                    self.send_header(hk, hv)
                self.end_headers()
                
                # 流式写回响应内容
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for hk, hv in e.headers.items():
                hk_low = hk.lower()
                if hk_low in ('transfer-encoding', 'connection'):
                    continue
                if hk_low == 'set-cookie' and is_https:
                    import re
                    if 'samesite=' in hv.lower():
                        hv = re.sub(r'samesite=\w+', 'SameSite=None; Secure', hv, flags=re.IGNORECASE)
                    elif 'secure' not in hv.lower():
                        hv = f"{hv}; SameSite=None; Secure"
                self.send_header(hk, hv)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as ex:
            self.send_response(502)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(f"Torrenta 代理连接 qBittorrent ({target_url}) 失败: {str(ex)}".encode('utf-8'))

    def translate_path(self, path):
        try:
            if path.startswith('/app/torrenta'):
                path = path[len('/app/torrenta'):]

            path = path.split('?')[0].split('#')[0]
            if not path or path == '/':
                path = '/index.html'

            target_file = super().translate_path(path)
            # SPA 历史模式 fallback: 若请求的非文件资源不存在，返回 index.html
            if not os.path.exists(target_file) and not os.path.splitext(path)[1]:
                return super().translate_path('/index.html')

            return target_file
        except Exception:
            return super().translate_path('/index.html')

    def end_headers(self):
        try:
            self._apply_cors_headers()
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie')
            self.send_header('Cache-Control', 'no-cache')
            super().end_headers()
        except Exception:
            pass

    def log_message(self, format, *args):
        try:
            sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), format % args))
            sys.stdout.flush()
        except:
            pass

def start_tcp_server():
    socketserver.TCPServer.allow_reuse_address = True
    while True:
        try:
            httpd = ThreadingHTTPServer(('0.0.0.0', PORT), SafeTorrentaHandler)
            httpd.daemon_threads = True
            print(f"[OK] Torrenta TCP Server running at http://0.0.0.0:{PORT} (WebRoot: {WEB_ROOT}, qB Proxy: {QBITTORRENT_URL})")
            sys.stdout.flush()
            httpd.serve_forever()
        except Exception as e:
            print(f"[WARN] TCP Server error: {e}, restarting in 1s...", file=sys.stderr)
            sys.stderr.flush()
            time.sleep(1)

def start_unix_socket():
    socket_path = os.environ.get('GATEWAY_SOCKET_PATH')
    if not socket_path or sys.platform == 'win32' or not hasattr(socketserver, 'UnixStreamServer'):
        return

    class ThreadingUnixServer(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
        daemon_threads = True
        def get_request(self):
            request, client_address = self.socket.accept()
            return (request, ["unix_client", 0])

    while True:
        try:
            if os.path.exists(socket_path):
                try:
                    os.remove(socket_path)
                except:
                    pass
            server = ThreadingUnixServer(socket_path, SafeTorrentaHandler)
            try:
                os.chmod(socket_path, 0o777)
            except:
                pass
            print(f"[OK] Unix Socket Server listening at {socket_path}")
            sys.stdout.flush()
            server.serve_forever()
        except Exception as e:
            print(f"[WARN] Unix Socket notice: {e}, retrying in 3s...", file=sys.stderr)
            sys.stderr.flush()
            time.sleep(3)

if __name__ == '__main__':
    print(f"[INIT] Initializing Torrenta server on port {PORT}, qBittorrent target: {QBITTORRENT_URL}...")
    sys.stdout.flush()

    if os.environ.get('GATEWAY_SOCKET_PATH'):
        t_sock = threading.Thread(target=start_unix_socket, daemon=True)
        t_sock.start()

    start_tcp_server()
