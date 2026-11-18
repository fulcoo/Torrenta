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
import time
import socket
import signal
import stat
import struct
import threading
import json
import re
import hmac
import secrets
import urllib.request
import urllib.error
from contextlib import closing
from urllib.parse import urlencode, urlparse
from http.client import HTTPConnection, HTTPSConnection, HTTPException
from http.cookies import CookieError, SimpleCookie
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
        os.path.join(APP_DIR, '..', 'torrenta.env'),
        os.path.join(APP_DIR, '..', 'var', 'torrenta.env'),
        os.path.join(APP_DIR, '..', 'etc', 'torrenta.env'),
        '/var/apps/torrenta/var/torrenta.env',
        '/var/apps/torrenta/etc/torrenta.env',
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
GATEWAY_SOCKET_PATH = os.environ.get('GATEWAY_SOCKET_PATH')
GATEWAY_PREFIX = os.environ.get('GATEWAY_PREFIX', '/app/torrenta').rstrip('/')
QB_COOKIE_NAME = re.compile(r'SID|QBT_SID_[0-9]+')
DIRECT_SESSION_PATH = '/api/torrenta-session'
DIRECT_SESSION_COOKIE = 'torrenta_direct_session'
DIRECT_SESSION_SECONDS = 24 * 60 * 60
DIRECT_USERNAME = 'admin'
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
    """Resolve persistent data directory across version updates for fnOS, Docker, or local environments"""
    import glob
    import shutil

    def is_writable(path):
        if not path:
            return False
        try:
            os.makedirs(path, exist_ok=True)
            test_file = os.path.join(path, '.perm_test')
            with open(test_file, 'w', encoding='utf-8') as f:
                f.write('1')
            os.remove(test_file)
            return True
        except Exception:
            return False

    resolved_dir = None

    # 1. 飞牛私有云官方持久化数据目录 / 显式 DATA_DIR 环境变量
    for env_var in ('TRIM_PKGVAR', 'DATA_DIR'):
        val = os.environ.get(env_var)
        if val and is_writable(val):
            resolved_dir = os.path.abspath(val)
            break

    # 2. 飞牛私有云 (fnOS) 常见原生持久化路径
    if not resolved_dir:
        fnos_candidates = [
            os.path.join(APP_DIR, '..', 'var'),           # /var/apps/torrenta/var
            os.path.join(APP_DIR, '..', 'etc'),           # /var/apps/torrenta/etc
            '/var/apps/torrenta/var',
            '/var/apps/torrenta/etc',
        ]
        # 匹配飞牛存储卷下的 @appdata
        try:
            fnos_candidates.extend(glob.glob('/vol*/@appdata/torrenta'))
        except Exception:
            pass

        for p in fnos_candidates:
            if is_writable(p):
                resolved_dir = os.path.abspath(p)
                break

    # 3. Docker 容器内 /data 挂载点
    if not resolved_dir:
        if os.path.exists('/data') and is_writable('/data'):
            resolved_dir = '/data'

    # 4. 回退到持久化目录 (优先检查 target 的父级 var 避免升级被覆盖)
    if not resolved_dir:
        candidates = []
        if os.path.basename(APP_DIR) in ('target', 'app', 'ui'):
            candidates.append(os.path.join(APP_DIR, '..', 'var'))
            candidates.append(os.path.join(APP_DIR, '..', 'data'))
        candidates.extend([os.path.join(APP_DIR, 'var'), os.path.join(APP_DIR, 'data'), APP_DIR])
        for c in candidates:
            if is_writable(c):
                resolved_dir = os.path.abspath(c)
                break

    if not resolved_dir:
        resolved_dir = APP_DIR

    # 5. 自动无损迁移旧版本配置（若目标目录不存在配置，尝试从历史临时目录迁移）
    try:
        primary_settings = os.path.join(resolved_dir, "user_settings.json")
        if not os.path.isfile(primary_settings):
            history_dirs = [
                os.path.join(APP_DIR, 'var'),
                os.path.join(APP_DIR, 'data'),
                os.path.join(APP_DIR, '..', 'target', 'var'),
                '/data',
                APP_DIR
            ]
            for h_dir in history_dirs:
                if h_dir and os.path.abspath(h_dir) != resolved_dir and os.path.isdir(h_dir):
                    for fname in os.listdir(h_dir):
                        if fname.startswith("user_settings") and fname.endswith(".json"):
                            src_f = os.path.join(h_dir, fname)
                            dst_f = os.path.join(resolved_dir, fname)
                            if os.path.isfile(src_f) and not os.path.exists(dst_f):
                                shutil.copy2(src_f, dst_f)
    except Exception:
        pass

    return resolved_dir

DATA_DIR = find_data_dir()
SETTINGS_WRITE_LOCK = threading.Lock()
GATEWAY_LOGIN_PREFERENCE = os.path.join(DATA_DIR, 'gateway-login.json')

def get_user_settings_file(username=""):
    """Get path to persistent settings file, optionally user-isolated"""
    clean_user = "".join(c for c in username if c.isalnum() or c in ('-', '_')).strip()
    if clean_user:
        return os.path.join(DATA_DIR, f"user_settings_{clean_user}.json")
    return os.path.join(DATA_DIR, "user_settings.json")

class SafeTorrentaHandler(SimpleHTTPRequestHandler):
    timeout = 30  # Prevent zombie worker threads on abandoned connections
    gateway = False
    direct = False
    qb_cookie_prefix = ''
    qb_cookie_path = '/'

    def __init__(self, *args, directory=WEB_ROOT, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def address_string(self):
        try:
            if isinstance(self.client_address, (list, tuple)) and len(self.client_address) >= 1:
                return str(self.client_address[0])
            return "client"
        except:
            return "127.0.0.1"

    def parse_request(self):
        if not super().parse_request():
            return False
        if self.qb_cookie_prefix:
            fetch_site = self.headers.get('Sec-Fetch-Site', '').strip().lower()
            if fetch_site in ('same-site', 'cross-site'):
                path = self.get_app_path(self.path).partition('?')[0]
                if self.gateway or self.command not in ('GET', 'HEAD') or path.startswith('/api/'):
                    self.send_error(403)
                    return False
        return self.authorize_request()

    def authorize_request(self):
        return True

    def get_app_path(self, request_target):
        path, separator, query = request_target.partition('?')
        if path == GATEWAY_PREFIX or path.startswith(f'{GATEWAY_PREFIX}/'):
            path = path[len(GATEWAY_PREFIX):] or '/'
        return f'{path}{separator}{query}'

    def is_qb_api_request(self):
        path = self.get_app_path(self.path).partition('?')[0]
        return path == '/api/v2' or path.startswith('/api/v2/')

    def get_client_ip(self):
        x_forwarded = self.headers.get('X-Forwarded-For', '')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        x_real = self.headers.get('X-Real-IP', '')
        if x_real:
            return x_real.strip()
        return self.address_string()

    def get_user_identity(self):
        if self.direct:
            return {'userId': 'torrenta_direct', 'userName': self.session['username'], 'userType': 'direct_user',
                    'clientIp': self.get_client_ip()}
        fnos_user = self.headers.get('X-Trim-Username', '') if self.gateway else (
            self.headers.get('X-Trim-User-Name') or
            self.headers.get('X-Trim-Username') or
            self.headers.get('X-User-Name') or
            self.headers.get('X-Username') or
            self.headers.get('X-Auth-User') or
            self.headers.get('Trim-User') or
            ''
        )
        fnos_user = fnos_user.strip()

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
        clean_p = self.get_app_path(self.path).partition('?')[0]

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

            if self.gateway or self.direct:
                data = self.with_gateway_login_preference(data, default_file)
            resp = data.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(resp)
            return

        # 4. 反向代理到 qBittorrent
        if self.is_qb_api_request():
            self._proxy_request('GET')
            return

        return super().do_GET()

    def do_POST(self):
        clean_p = self.get_app_path(self.path).partition('?')[0]

        if clean_p == '/api/gateway-login-preference' and (self.gateway or self.direct):
            return self.save_gateway_login_preference()

        # 个性化配置持久化写入 (原子写入防损坏，跨更新/跨重启持久保留)
        if clean_p == '/api/user-settings':
            user_info = self.get_user_identity()
            username = user_info.get('userName', '') if user_info.get('userType') == 'fnos_user' else ''
            target_file = get_user_settings_file(username)
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                if content_len > 2 * 1024 * 1024:
                    self.send_response(413)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(b'{"error": "Payload Too Large"}')
                    return
                body = self.rfile.read(content_len)
                # 校验有效 JSON
                json.loads(body.decode('utf-8'))

                tmp_file = f"{target_file}.tmp"
                with SETTINGS_WRITE_LOCK:
                    with open(tmp_file, 'wb') as f:
                        f.write(body)
                        f.flush()
                        try:
                            os.fsync(f.fileno())
                        except OSError:
                            pass
                    os.replace(tmp_file, target_file)

                    # 同时同步一份到默认配置，确保全局兜底
                    default_file = get_user_settings_file("")
                    if target_file != default_file:
                        try:
                            default_tmp = f"{default_file}.tmp"
                            with open(default_tmp, 'wb') as df:
                                df.write(body)
                            os.replace(default_tmp, default_file)
                        except OSError:
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

        if self.is_qb_api_request():
            self._proxy_request('POST')
            return
        self.send_error(404)

    def with_gateway_login_preference(self, raw_settings, default_file):
        try:
            settings = json.loads(raw_settings)
        except ValueError:
            return raw_settings
        if not isinstance(settings, dict):
            return raw_settings
        if not isinstance(settings.get('security'), dict):
            settings['security'] = {}
        security = settings['security']
        try:
            with open(GATEWAY_LOGIN_PREFERENCE, encoding='utf-8') as file:
                preference = json.load(file)
            security.update({
                'authEnabled': preference['authEnabled'] is True,
                'skipGatewayPassword': preference['skipGatewayPassword'] is True,
            })
        except (OSError, ValueError, TypeError, KeyError):
            # 0.4.7 stored this preference in user settings.
            try:
                with open(default_file, encoding='utf-8') as file:
                    previous_security = json.load(file).get('security', {})
            except (OSError, ValueError, AttributeError):
                previous_security = {}
            if not isinstance(previous_security, dict) or 'skipGatewayPassword' not in previous_security:
                previous_security = security
            security['skipGatewayPassword'] = (previous_security.get('authEnabled') is True
                                               and previous_security.get('skipGatewayPassword') is True)
        return json.dumps(settings, ensure_ascii=False)

    def save_gateway_login_preference(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 128 or self.headers.get_content_type() != 'application/json':
                raise ValueError()
            preference = json.loads(self.rfile.read(length))
            if not isinstance(preference, dict) or any(
                type(preference.get(key)) is not bool for key in ('authEnabled', 'skipGatewayPassword')
            ):
                raise ValueError()
            preference = {key: preference[key] for key in ('authEnabled', 'skipGatewayPassword')}
        except ValueError:
            self.send_error(400)
            return

        try:
            with SETTINGS_WRITE_LOCK:
                temp_path = f'{GATEWAY_LOGIN_PREFERENCE}.tmp'
                with open(temp_path, 'w', encoding='utf-8') as file:
                    json.dump(preference, file)
                os.replace(temp_path, GATEWAY_LOGIN_PREFERENCE)
        except OSError:
            self.send_error(500)
            return
        self.send_response(204)
        self.end_headers()

    def do_PUT(self):
        if self.is_qb_api_request():
            self._proxy_request('PUT')
            return
        self.send_error(404)

    def do_DELETE(self):
        if self.is_qb_api_request():
            self._proxy_request('DELETE')
            return
        self.send_error(404)

    def _proxy_request(self, method):
        target_url = f"{QBITTORRENT_URL}{self.get_app_path(self.path)}"
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
        if self.qb_cookie_prefix:
            blocked_headers.update(('cookie', 'authorization'))
            qb_cookies = []
            for cookie_header in self.headers.get_all('Cookie', []):
                for cookie in cookie_header.split(';'):
                    name, separator, value = cookie.strip().partition('=')
                    if separator and name.startswith(self.qb_cookie_prefix):
                        qb_name = name[len(self.qb_cookie_prefix):]
                        if QB_COOKIE_NAME.fullmatch(qb_name):
                            qb_cookies.append(f'{qb_name}={value}')
            if qb_cookies:
                req.add_header('Cookie', '; '.join(qb_cookies))

        for k, v in self.headers.items():
            k_low = k.lower()
            if k_low in blocked_headers or k_low.startswith('x-forwarded-'):
                continue
            if self.qb_cookie_prefix and k_low.startswith('x-trim-'):
                continue
            req.add_header(k, v)

        # 强制注入针对 qBittorrent 的本地域名与来源以通过安全检查
        req.add_header('Host', QBITTORRENT_HOST)
        req.add_header('Origin', f"http://{QBITTORRENT_HOST}")
        req.add_header('Referer', f"http://{QBITTORRENT_HOST}/")
        req.add_header('Connection', 'close')

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                self.send_response(resp.status)
                self.send_proxy_headers(resp.getheaders())
                self.end_headers()
                
                # 流式写回响应内容
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                    except (BrokenPipeError, ConnectionResetError):
                        return
        except urllib.error.HTTPError as e:
            try:
                with e:
                    body = e.read()
                    self.send_response(e.code)
                    self.send_proxy_headers(e.headers.items())
                    self.end_headers()
                    self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass
            except Exception:
                pass
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as ex:
            try:
                self.send_response(502)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(f"Torrenta 代理连接 qBittorrent ({target_url}) 失败: {str(ex)}".encode('utf-8'))
            except (BrokenPipeError, ConnectionResetError):
                pass
            except Exception:
                pass

    def send_proxy_headers(self, headers):
        is_https = self.headers.get('X-Forwarded-Proto', '').lower() == 'https'
        for name, value in headers:
            lower_name = name.lower()
            if lower_name in ('transfer-encoding', 'connection'):
                continue
            if self.direct and lower_name == 'www-authenticate':
                continue
            if lower_name == 'set-cookie':
                if self.qb_cookie_prefix:
                    self.send_scoped_qb_cookies(value, is_https)
                    continue
                if is_https:
                    if 'samesite=' in value.lower():
                        value = re.sub(r'samesite=\w+', 'SameSite=None; Secure', value, flags=re.IGNORECASE)
                    elif 'secure' not in value.lower():
                        value = f'{value}; SameSite=None; Secure'
            self.send_header(name, value)

    def send_scoped_qb_cookies(self, value, is_https):
        cookies = SimpleCookie()
        try:
            cookies.load(value)
        except CookieError:
            return
        for name, upstream in cookies.items():
            if not QB_COOKIE_NAME.fullmatch(name):
                continue
            client_cookie = SimpleCookie()
            client_name = f'{self.qb_cookie_prefix}{name}'
            client_cookie[client_name] = upstream.value
            scoped = client_cookie[client_name]
            for key in ('expires', 'max-age'):
                scoped[key] = upstream[key]
            scoped['path'] = self.qb_cookie_path
            scoped['samesite'] = 'Strict'
            scoped['httponly'] = True
            scoped['secure'] = is_https or bool(upstream['secure'])
            self.send_header('Set-Cookie', scoped.OutputString())

    def translate_path(self, path):
        try:
            path = self.get_app_path(path).split('?')[0].split('#')[0]
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
            if not self.qb_cookie_prefix:
                self._apply_cors_headers()
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie')
            if self.direct:
                self.send_header('X-Frame-Options', 'DENY')
            self.send_header('Cache-Control', 'private, no-store' if self.direct else 'no-cache')
            super().end_headers()
        except Exception:
            pass

    def log_message(self, format, *args):
        try:
            sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), format % args))
            sys.stdout.flush()
        except:
            pass

class GatewayTorrentaHandler(SafeTorrentaHandler):
    gateway = True
    qb_cookie_prefix = 'torrenta_qb_'
    qb_cookie_path = f'{GATEWAY_PREFIX}/'

    def authorize_request(self):
        is_admin = self.headers.get('X-Trim-Isadmin', '').strip().lower()
        if is_admin in ('true', '1') and self.server.is_gateway_peer(self.connection):
            return True
        self.send_error(403)
        return False


class DirectTorrentaHandler(SafeTorrentaHandler):
    direct = True
    qb_cookie_prefix = 'torrenta_direct_qb_'

    def __init__(self, request, client_address, server):
        super().__init__(request, client_address, server, directory=server.web_root)

    def direct_session_token(self):
        cookies = SimpleCookie()
        try:
            for header in self.headers.get_all('Cookie', []):
                cookies.load(header)
        except CookieError:
            return ''
        cookie = cookies.get(DIRECT_SESSION_COOKIE)
        return cookie.value if cookie else ''

    def authorize_request(self):
        path = self.get_app_path(self.path).partition('?')[0]
        if self.command in ('GET', 'HEAD') and not (path == '/api' or path.startswith('/api/')):
            return True
        if self.command == 'POST' and path == DIRECT_SESSION_PATH:
            return True
        self.session_token = self.direct_session_token()
        with self.server.session_lock:
            self.session = self.server.sessions.get(self.session_token)
        if self.session and self.session['expiresAt'] > int(time.time() * 1000):
            return True

        self.send_direct_session(401, {'error': 'authRequired'})
        return False

    def send_direct_session(self, status, payload, *, token=None, max_age=DIRECT_SESSION_SECONDS, qb_cookies=()):
        data = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        is_https = self.headers.get('X-Forwarded-Proto', '').lower() == 'https'
        if token is not None:
            cookies = SimpleCookie()
            cookies[DIRECT_SESSION_COOKIE] = token
            cookie = cookies[DIRECT_SESSION_COOKIE]
            cookie['path'] = '/'
            cookie['httponly'] = True
            cookie['samesite'] = 'Lax'
            cookie['secure'] = is_https
            cookie['max-age'] = max_age
            self.send_header('Set-Cookie', cookie.OutputString())
        for cookie in qb_cookies:
            self.send_scoped_qb_cookies(cookie, is_https)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.get_app_path(self.path).partition('?')[0] == DIRECT_SESSION_PATH:
            return self.send_direct_session(200, self.session)
        return super().do_GET()

    def do_POST(self):
        if self.get_app_path(self.path).partition('?')[0] != DIRECT_SESSION_PATH:
            return super().do_POST()

        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4096 or self.headers.get_content_type() != 'application/json':
                raise ValueError()
            params = json.loads(self.rfile.read(length))
            username, password = params['username'].strip(), params['password']
            if not username or not isinstance(password, str) or not password:
                raise ValueError()
            typed_password = password.encode('utf-8')
        except (AttributeError, KeyError, TypeError, ValueError):
            return self.send_direct_session(400, {'error': 'invalidCredentials'})

        qb_username = os.environ.get('QBITTORRENT_USER', '')
        qb_password = os.environ.get('QBITTORRENT_PASS', '')
        qb_cookies = ()
        if username == DIRECT_USERNAME and self.server.direct_password and hmac.compare_digest(
            typed_password, self.server.direct_password.encode('utf-8')
        ):
            qb_credentials = False
        elif username == qb_username and qb_password and hmac.compare_digest(
            typed_password, qb_password.encode('utf-8')
        ):
            qb_credentials = True
        else:
            try:
                qb_cookies = self.verify_qb_login(username, password)
            except (OSError, HTTPException, ValueError):
                return self.send_direct_session(502, {'error': 'directBackendUnavailable'})
            if qb_cookies is None:
                return self.send_direct_session(401, {'error': 'directPasswordRequired'})
            if not qb_cookies:
                return self.send_direct_session(401, {'error': 'invalidCredentials'})
            qb_credentials = True

        token = secrets.token_urlsafe(32)
        now = int(time.time() * 1000)
        session = {'username': username, 'expiresAt': now + DIRECT_SESSION_SECONDS * 1000}
        with self.server.session_lock:
            sessions = self.server.sessions
            sessions.pop(self.direct_session_token(), None)
            for expired in [key for key, value in sessions.items() if value['expiresAt'] <= now]:
                del sessions[expired]
            if len(sessions) >= 256:
                sessions.pop(next(iter(sessions)))
            sessions[token] = session

        self.send_direct_session(200, {**session, 'qbCredentials': qb_credentials},
                                 token=token, qb_cookies=qb_cookies)

    def do_DELETE(self):
        if self.get_app_path(self.path).partition('?')[0] != DIRECT_SESSION_PATH:
            return super().do_DELETE()
        with self.server.session_lock:
            self.server.sessions.pop(self.session_token, None)
        self.send_direct_session(200, {}, token='', max_age=0)

    def verify_qb_login(self, username, password):
        # With localhost or subnet bypass, qBittorrent may issue a session for any password.
        connection = HTTPSConnection if parsed_qb.scheme == 'https' else HTTPConnection
        qb_origin = f'{parsed_qb.scheme}://{QBITTORRENT_HOST}'
        headers = {'Host': QBITTORRENT_HOST, 'Origin': qb_origin, 'Referer': f'{qb_origin}/'}
        api_path = f"{parsed_qb.path.rstrip('/')}/api/v2"
        with closing(connection(parsed_qb.hostname, parsed_qb.port, timeout=5)) as qb:
            qb.request('GET', f'{api_path}/app/version', headers=headers)
            with qb.getresponse() as response:
                if response.status == 200:
                    return None
                if response.status not in (401, 403):
                    raise HTTPException('qBittorrent API unavailable')

        with closing(connection(parsed_qb.hostname, parsed_qb.port, timeout=5)) as qb:
            qb.request('POST', f'{api_path}/auth/login', urlencode({'username': username, 'password': password}),
                       {**headers, 'Content-Type': 'application/x-www-form-urlencoded'})
            with qb.getresponse() as response:
                if response.status != 200 or response.read(16).strip() not in (b'Ok.', b''):
                    return ()
                return tuple(value for name, value in response.getheaders()
                             if name.lower() == 'set-cookie' and QB_COOKIE_NAME.fullmatch(value.partition('=')[0]))


def start_tcp_server(port, handler=SafeTorrentaHandler, direct_config=None):
    while True:
        try:
            with ThreadingHTTPServer(('0.0.0.0', port), handler) as httpd:
                if direct_config:
                    httpd.web_root, httpd.direct_password = direct_config
                    httpd.sessions = {}
                    httpd.session_lock = threading.Lock()
                print(f'[OK] Torrenta TCP Server running at http://0.0.0.0:{port}', flush=True)
                httpd.serve_forever()
        except Exception as e:
            print(f"[WARN] TCP Server error: {e}, restarting in 1s...", file=sys.stderr)
            sys.stderr.flush()
            time.sleep(1)


def start_fpk_direct_listener():
    port_text = os.environ.get('TORRENTA_DIRECT_PORT', '0')
    if not re.fullmatch(r'[0-9]{1,5}', port_text) or int(port_text) > 65535:
        print('[WARN] Invalid Torrenta direct port', file=sys.stderr, flush=True)
        return
    port = int(port_text)
    if not port:
        return

    web_root = os.environ.get('TORRENTA_DIRECT_WEB_ROOT', '')
    if not web_root or not os.path.isfile(os.path.join(web_root, 'index.html')):
        print('[WARN] Torrenta direct UI is missing', file=sys.stderr, flush=True)
        return

    direct_config = (web_root, os.environ.get('TORRENTA_DIRECT_PASSWORD', ''))
    threading.Thread(target=start_tcp_server, args=(port, DirectTorrentaHandler, direct_config), daemon=True).start()


def start_unix_socket(socket_path):
    if not hasattr(socketserver, 'UnixStreamServer') or not hasattr(socket, 'SO_PEERCRED'):
        raise RuntimeError('The fnOS gateway requires Linux Unix sockets with peer credentials')

    import pwd

    gateway_uids = {0}
    try:
        gateway_uids.add(pwd.getpwnam('www-data').pw_uid)
    except KeyError:
        pass
    peer_credentials = struct.Struct('iII')  # Linux struct ucred: pid, uid, gid

    class ThreadingUnixServer(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
        daemon_threads = True

        def get_request(self):
            request, _ = self.socket.accept()
            return request, ('unix_client', 0)

        def is_gateway_peer(self, connection):
            credentials = connection.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, peer_credentials.size)
            _, uid, _ = peer_credentials.unpack(credentials)
            if uid in gateway_uids:
                return True
            print(f'[WARN] Gateway socket rejected peer UID {uid}', file=sys.stderr, flush=True)
            return False

    if os.path.lexists(socket_path):
        if not stat.S_ISSOCK(os.lstat(socket_path).st_mode):
            raise RuntimeError(f'Gateway path is occupied by a non-socket file: {socket_path}')
        with socket.socket(socket.AF_UNIX) as probe:
            probe.settimeout(1)
            try:
                probe.connect(socket_path)
            except ConnectionRefusedError:
                os.unlink(socket_path)
            else:
                raise RuntimeError(f'Gateway socket is already accepting connections: {socket_path}')

    def stop_server(_signum, _frame):
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, stop_server)
    with ThreadingUnixServer(socket_path, GatewayTorrentaHandler) as server:
        try:
            # fnOS connects from a separate account. Validate the peer UID before trusting its headers.
            os.chmod(socket_path, 0o666)
            print(f'[OK] Unix Socket Server listening at {socket_path}', flush=True)
            start_fpk_direct_listener()
            server.serve_forever()
        finally:
            if os.path.exists(socket_path):
                os.unlink(socket_path)

if __name__ == '__main__':
    if GATEWAY_SOCKET_PATH:
        start_unix_socket(GATEWAY_SOCKET_PATH)
    else:
        start_tcp_server(int(os.environ.get('SERVICE_PORT', '18322')))
