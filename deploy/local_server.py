#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""岐黄 · 本地静态服务器

只服务 web/ 目录，绑定 127.0.0.1（默认），不依赖外网。
由 deploy/start_local_hidden.vbs 在登录时启动，日志写 deploy/local_server.log。
"""

from __future__ import annotations

import argparse
import functools
import http.server
import logging
import os
import sys
import threading
import webbrowser
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR.parent / "web"
PID_FILE = BASE_DIR / "local_server.pid"
LOG_FILE = BASE_DIR / "local_server.log"

logger = logging.getLogger("tcm-local-server")


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "TCM-Local/1.0"
    sys_version = ""
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
    }

    def end_headers(self) -> None:
        path = self.path.split("?", 1)[0]
        if path in ("", "/") or path.endswith(".html"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        elif path.startswith(("/assets/", "/vendor/")):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif path.endswith((".js", ".css", ".json")):
            # 本地开发/课堂演示：改完代码刷新即可生效，避免 immutable 缓存旧 JS。
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        elif path.startswith("/data/"):
            self.send_header("Cache-Control", "public, max-age=300")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404, "Not found")
        return None

    def log_message(self, fmt: str, *args) -> None:
        logger.info("%s - %s", self.address_string(), fmt % args)


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def setup_logging() -> None:
    logging.basicConfig(
        filename=str(LOG_FILE),
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve the TCM web demo locally.")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--lan", action="store_true", help="bind 0.0.0.0 for LAN access")
    parser.add_argument("--open", action="store_true", help="open the browser after start")
    args = parser.parse_args()

    if not WEB_DIR.is_dir():
        print(f"Web directory not found: {WEB_DIR}", file=sys.stderr)
        return 1

    setup_logging()
    host = "0.0.0.0" if args.lan else "127.0.0.1"
    url = f"http://127.0.0.1:{args.port}/"
    PID_FILE.write_text(str(os.getpid()), encoding="utf-8")

    try:
        handler = functools.partial(Handler, directory=str(WEB_DIR))
        httpd = Server((host, args.port), handler)
        logger.info("Serving %s at %s (bind=%s)", WEB_DIR, url, host)
        if args.open:
            threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        httpd.serve_forever()
    except OSError as exc:
        logger.error("Cannot start server on %s:%s: %s", host, args.port, exc)
        print(f"Cannot start server: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        logger.info("Stopped by keyboard interrupt")
    finally:
        try:
            if PID_FILE.exists() and PID_FILE.read_text(encoding="utf-8").strip() == str(os.getpid()):
                PID_FILE.unlink()
        except OSError:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
