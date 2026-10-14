#!/usr/bin/env python3
import argparse
import os
from pathlib import Path
import subprocess
from urllib.parse import quote

parser = argparse.ArgumentParser()
parser.add_argument('--env-file')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
env = os.environ.copy()
if args.env_file:
    values = dict(line.split('=', 1) for line in Path(args.env_file).read_text().splitlines()
                  if line and not line.startswith('#'))
    env['TEST_DATABASE_URL'] = ('postgresql+psycopg://' + quote(values['POSTGRES_USER'], safe='') + ':' +
        quote(values['POSTGRES_PASSWORD'], safe='') + '@127.0.0.1:55432/postgres')
raise SystemExit(subprocess.run([str(repo / 'backend/.venv/bin/python'), '-m', 'pytest', '-q', '--tb=short', '-x'],
                               cwd=repo / 'backend', env=env).returncode)
