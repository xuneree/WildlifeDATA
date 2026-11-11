import tempfile,subprocess,pathlib,shutil
script=str(pathlib.Path(__file__).resolve().parents[1]/'task-preflight.py')
with tempfile.TemporaryDirectory() as temp:
 root=pathlib.Path(temp); remote=root/'remote';repo=root/'repo'
 def run(*args,cwd=None): return subprocess.run(args,cwd=cwd,text=True,capture_output=True,check=True)
 run('git','init','--bare',str(remote));run('git','init','-b','main',str(repo));run('git','config','user.email','test@example.invalid',cwd=repo);run('git','config','user.name','Test',cwd=repo)
 for p in ['AGENTS.md','docs/PROJECT_STATUS.md','docs/design/ant-design.md']:
  file=repo/p;file.parent.mkdir(parents=True,exist_ok=True);file.write_text('test contract')
 run('git','add','.',cwd=repo);run('git','commit','-m','baseline',cwd=repo);first=run('git','rev-parse','HEAD',cwd=repo).stdout.strip();run('git','remote','add','origin',str(remote),cwd=repo);run('git','push','origin','main',cwd=repo)
 command=['python',script,'--target','docs/demos/module02','--ui']
 assert subprocess.run(command,cwd=repo,capture_output=True).returncode==0
 (repo/'dirty.txt').write_text('must remain');(repo/'extra.txt').write_text('new remote');run('git','add','extra.txt',cwd=repo);run('git','commit','-m','new remote',cwd=repo);run('git','push','origin','main',cwd=repo);run('git','checkout',first,cwd=repo)
 assert subprocess.run(command,cwd=repo,capture_output=True).returncode==2
 assert (repo/'dirty.txt').read_text()=='must remain'
 print('PASS preflight accepts current baseline, rejects stale baseline, preserves uncommitted files')
