#!/usr/bin/env python3
"""核实开工基线；只 fetch 和读取，不修改工作文件或分支。"""
import argparse
import hashlib
from pathlib import Path
import subprocess
import sys


def git(*args):
    return subprocess.run(['git', *args], text=True, capture_output=True, check=True).stdout.strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', required=True, help='实际修改对象，如 docs/demos/module02')
    parser.add_argument('--ui', action='store_true', help='加入界面任务的设计基准检查')
    parser.add_argument('--read', action='append', default=[], help='本次需求或 guide 路径，可重复')
    args = parser.parse_args()
    root = Path(git('rev-parse', '--show-toplevel'))
    print(f'仓库：{root}\n分支：{git("branch", "--show-current")}\nHEAD：{git("rev-parse", "HEAD")}\n对象：{args.target}')
    status = git('status', '--short')
    print('工作区：\n' + (status or '干净'))
    print('未提交修改保持原样；本脚本不会 reset、clean、切分支或套用 stash。')
    git('fetch', 'origin')
    try:
        remote = git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD')
    except subprocess.CalledProcessError:
        remote = 'origin/main'
    remote_sha = git('rev-parse', remote)
    print(f'远端：{remote} {remote_sha}')
    if subprocess.run(['git', 'merge-base', '--is-ancestor', remote, 'HEAD'], capture_output=True).returncode:
        print('未通过：当前分支尚未包含远端基线。先保留修改并核实远端差异，不能直接设计或继续编号。', file=sys.stderr)
        return 2
    paths = ['AGENTS.md', 'docs/PROJECT_STATUS.md']
    if args.ui:
        paths.append('docs/design/ant-design.md')
    paths.extend(args.read)
    for relative in dict.fromkeys(paths):
        path = root / relative
        if not path.is_file():
            print(f'未通过：必读文件缺失 {relative}', file=sys.stderr)
            return 2
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
        print(f'待读取并核对：{relative} [sha256 {digest}]')
    print('基线检查通过；不代表已阅读正文或设计/业务符合性通过。')
    print('继续：读取上述正文与目标路径的子目录指令；核对未合并 PR；开工说明基线、实际对象与已知差异。')
    if args.ui:
        print('交付前：按 ant-design.md 核对实际依赖、组件、Token、业务文案；完成构建、交互及截图检查，并记录在目标 README。')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except subprocess.CalledProcessError:
        print('基线未核实：Git 读取或 fetch 失败。请说明限制，不能将未核实当成已同步。', file=sys.stderr)
        sys.exit(2)
