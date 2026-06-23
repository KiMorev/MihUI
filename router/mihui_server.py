#!/usr/bin/env python3
import argparse
import os
import subprocess
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class MihuiHandler(SimpleHTTPRequestHandler):
    app_dir: Path

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/cgi-bin/mihui-update":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        script = self.app_dir / "www" / "cgi-bin" / "mihui-update"
        if not script.is_file():
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "message": "update script not found"})
            return

        env = os.environ.copy()
        env["REQUEST_METHOD"] = "POST"
        env["MIHUI_DIR"] = str(self.app_dir)

        try:
            result = subprocess.run(
                ["/bin/sh", str(script)],
                cwd=str(self.app_dir),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=300,
                check=False,
            )
        except Exception as error:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "message": str(error)})
            return

        if result.stderr:
            self.log_error("%s", result.stderr.decode("utf-8", "replace").strip())

        status, headers, body = parse_cgi_response(result.stdout)
        if result.returncode != 0 and status == HTTPStatus.OK:
            status = HTTPStatus.INTERNAL_SERVER_ERROR
        self.send_response(status)
        for name, value in headers:
            if name.lower() not in {"status", "connection", "transfer-encoding"}:
                self.send_header(name, value)
        if not any(name.lower() == "content-type" for name, _ in headers):
            self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, payload):
        import json

        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def parse_cgi_response(raw):
    separator = b"\r\n\r\n" if b"\r\n\r\n" in raw else b"\n\n"
    if separator in raw:
        header_bytes, body = raw.split(separator, 1)
    else:
        return HTTPStatus.OK, [("Content-Type", "application/json")], raw

    status = HTTPStatus.OK
    headers = []
    for line in header_bytes.decode("iso-8859-1", "replace").splitlines():
        if ":" not in line:
            continue
        name, value = line.split(":", 1)
        name = name.strip()
        value = value.strip()
        if name.lower() == "status":
            try:
                status = int(value.split()[0])
            except (ValueError, IndexError):
                status = HTTPStatus.INTERNAL_SERVER_ERROR
        else:
            headers.append((name, value))
    return status, headers, body


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--app-dir", required=True)
    args = parser.parse_args()

    app_dir = Path(args.app_dir).resolve()
    www_dir = app_dir / "www"

    handler = lambda *handler_args, **handler_kwargs: MihuiHandler(
        *handler_args,
        directory=str(www_dir),
        **handler_kwargs,
    )
    MihuiHandler.app_dir = app_dir

    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"MihUI listening on {args.host}:{args.port}, app_dir={app_dir}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
