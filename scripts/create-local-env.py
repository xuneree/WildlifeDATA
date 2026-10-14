#!/usr/bin/env python3
"""Generate local development credentials once, without printing their values."""
import argparse
import os
from pathlib import Path
import secrets

parser = argparse.ArgumentParser()
parser.add_argument('--path', default='.env')
args = parser.parse_args()
path = Path(args.path)
try:
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
except FileExistsError:
    print('Existing environment file preserved.')
else:
    with os.fdopen(fd, 'w') as file:
        file.write('POSTGRES_DB=wildlife\nPOSTGRES_USER=wildlife\n'
                   f'POSTGRES_PASSWORD={secrets.token_urlsafe(32)}\n'
                   f'AUTH_SECRET={secrets.token_urlsafe(48)}\n'
                   'ADMIN_USERNAME=admin\n'
                   f'ADMIN_PASSWORD={secrets.token_urlsafe(24)}\n')
    print('Local environment file created with mode 0600; credential values were not printed.')
