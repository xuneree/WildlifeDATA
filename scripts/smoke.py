#!/usr/bin/env python3
"""Read-only functional check through the deployed Nginx frontend. Never print credentials/tokens."""
import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser()
parser.add_argument('--env-file', required=True)
args = parser.parse_args()
values = dict(line.split('=', 1) for line in Path(args.env_file).read_text().splitlines()
              if line and not line.startswith('#'))
base = 'http://127.0.0.1:8080'
with urlopen(base, timeout=10) as response:
    html = response.read().decode()
    assert '红外相机数据管理平台' in html and '/assets/' in html
with urlopen(base + '/api/health', timeout=10) as response:
    assert json.load(response)['status'] == 'ok'
request = Request(base + '/api/auth/login', headers={'Content-Type': 'application/json'}, data=json.dumps({
    'username': values['ADMIN_USERNAME'], 'password': values['ADMIN_PASSWORD']}).encode())
with urlopen(request, timeout=10) as response:
    token = json.load(response)['token']
request = Request(base + '/api/dashboard', headers={'Authorization': 'Bearer ' + token})
with urlopen(request, timeout=10) as response:
    data = json.load(response)
    assert all(key in data for key in ('site_count', 'deployment_count', 'media_count', 'sites'))
print('Functional smoke passed: frontend assets, PostGIS health, administrator login, authorized dashboard.')
