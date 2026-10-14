#!/usr/bin/env python3
"""Cloud-only Docker build overrides. No proxy credentials or CA files enter the checkout/image."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
from urllib.parse import urlsplit

repo = Path(__file__).resolve().parents[1]
config = {"services": {"api": {"build": {}}, "web": {"build": {}}}}
hosts = {}
for name in ("HTTP_PROXY", "HTTPS_PROXY"):
    value = os.environ.get(name)
    if value:
        host = urlsplit(value).hostname
        if host:
            hosts[host] = socket.gethostbyname(host)
ca_file = Path(os.environ.get("SSL_CERT_FILE", "/etc/ssl/certs/ca-certificates.crt"))
if not ca_file.is_file():
    raise SystemExit("Trusted CA bundle is missing; configure SSL_CERT_FILE before building.")
config["secrets"] = {"build_ca": {"file": str(ca_file)}}
for value in config["services"].values():
    value["build"] = {"args": ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY"],
                      "extra_hosts": hosts, "secrets": ["build_ca"]}
override = Path('/workspace/.wildlife-data-build.json')
override.write_text(json.dumps(config))
env = os.environ.copy()
env['DOCKER_CONFIG'] = '/workspace/.cache/docker'
command = ['docker', 'compose', '--env-file', '/workspace/.wildlife-data.env',
           '-f', str(repo / 'compose.yaml'), '-f', str(repo / 'compose.test.yaml'),
           '-f', str(override), *sys.argv[1:]]
raise SystemExit(subprocess.run(command, cwd=repo, env=env).returncode)
