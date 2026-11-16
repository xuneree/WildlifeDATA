#!/usr/bin/env python3
"""用 Pandoc 从当前业务正文生成同源 Word；保留现有项目模板样式。"""
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = (
    'docs/requirements/platform-requirements-v1_4.md',
    'docs/requirements/module01-camera-management-v2_0.md',
    'docs/requirements/module02-species-recognition-v1_0.md',
    'docs/requirements/module03-individual-recognition-v1_0.md',
    'docs/database/wildlife_database_design_v1_5.md',
)


def main():
    if not shutil.which('pandoc'):
        raise SystemExit('需要安装 Pandoc；尚未修改 Word。')
    with tempfile.TemporaryDirectory(prefix='wildlifedata-docs-') as temporary:
        scratch = Path(temporary)
        fallback = ROOT / SOURCES[0]
        fallback = fallback.with_suffix('.docx')
        # 先复制全部模板、生成全部结果；任一转换失败不替换正式文件。
        jobs = []
        for index, relative in enumerate(SOURCES):
            source = ROOT / relative
            target = source.with_suffix('.docx')
            reference = target if target.is_file() else fallback
            template = scratch / f'reference-{index}.docx'
            shutil.copy2(reference, template)
            generated = scratch / f'generated-{index}.docx'
            jobs.append((source, target, template, generated))
        for source, _, template, generated in jobs:
            subprocess.run([
                'pandoc', '--from=gfm', '--to=docx',
                f'--reference-doc={template}', str(source), '-o', str(generated),
            ], cwd=ROOT, check=True)
        for _, target, _, generated in jobs:
            shutil.copyfile(generated, target)
            print(target.relative_to(ROOT))


if __name__ == '__main__':
    main()
