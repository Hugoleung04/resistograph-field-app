#!/usr/bin/env python3
"""Serve the Resistograph field app on the local network."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import socket
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


if __name__ == "__main__":
    port = 8080
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    ip = lan_ip()
    print(f"Resistograph Field Record")
    print(f"On this computer:  http://127.0.0.1:{port}/")
    print(f"On your phone:     http://{ip}:{port}/")
    print("Keep this window open. Ctrl+C to stop.")
    httpd.serve_forever()
