"""Local preview server for the Luoxiang platform repo.

Serves the platform web/ tree directly, and maps the four model files from an
external model directory.  This keeps models out of the platform Git tree while
letting /structure.html load the integrated teaching model locally.

Run:
  python deploy/preview_server.py --port 8020
"""
from __future__ import annotations

import argparse
import http.server
import mimetypes
import os
import socketserver
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DEFAULT_ROOT = REPO / "web"
DEFAULT_MODELS = REPO.parent / "tcm-human-model" / "web" / "assets"
MODEL_FILES = {
    "anatomy_male.glb",
    "anatomy_female.glb",
    "meridians.json",
    "meridians_female.json",
}
MIME = {
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".woff2": "font/woff2",
}


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "LuoxiangPreview/1.0"

    def __init__(self, *args, root: Path, models: Path, **kwargs):
        self.root = root
        self.models = models
        super().__init__(*args, directory=str(root), **kwargs)

    def translate_path(self, path: str) -> str:
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if clean.startswith("/assets/"):
            name = clean[len("/assets/"):]
            if name in MODEL_FILES:
                local = self.root / "assets" / name
                if local.is_file():
                    return str(local)
                candidate = self.models / name
                if candidate.is_file():
                    return str(candidate)
        return super().translate_path(path)

    def guess_type(self, path):
        suffix = Path(path).suffix.lower()
        return MIME.get(suffix) or mimetypes.guess_type(path)[0] or "application/octet-stream"

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        if self.path.endswith((".html", ".js", ".css", ".json")) or self.path == "/":
            self.send_header("Cache-Control", "no-cache")
        elif self.path.startswith("/assets/"):
            self.send_header("Cache-Control", "public, max-age=3600")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404, "Not found")
        return None

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, addr, handler, root: Path, models: Path):
        self.root = root
        self.models = models
        super().__init__(addr, handler)

    def finish_request(self, request, client_address):
        self.RequestHandlerClass(request, client_address, self, root=self.root, models=self.models)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8020)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--models-dir", type=Path, default=DEFAULT_MODELS)
    args = parser.parse_args()
    root, models = args.root.resolve(), args.models_dir.resolve()
    if not (root / "index.html").is_file():
        raise SystemExit(f"platform web root not found: {root}")
    if not models.is_dir():
        print(f"[WARN] model dir not found: {models}; /structure.html will need a local GLB")
    print(f"[LUOXIANG] root={root}")
    print(f"[LUOXIANG] models={models}")
    print(f"[LUOXIANG] http://{args.bind}:{args.port}/")
    with Server((args.bind, args.port), PreviewHandler, root, models) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    main()
