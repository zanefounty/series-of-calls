#!/usr/bin/env python3
"""Observe public upstream without classifying, approving or resolving its changes."""
import datetime,json,pathlib,subprocess,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE='48e6200c532d486f79bc8376de0aecbf6169123b'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode()
def dump(path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,indent=2)+'\n')
def main():
    # Complete history is required; shallow comparisons can silently omit commits.
    if git('rev-parse','--is-shallow-repository').strip()!='false':raise RuntimeError('Full upstream history required')
    subprocess.run(['git','fetch','--no-tags','https://github.com/fjaeckel/seriesoftubes.git','main'],cwd=ROOT,check=True)
    head=git('rev-parse','FETCH_HEAD').strip();git('merge-base','--is-ancestor',BASE,head)
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    commits=[{'sha':sha,'commit':{'message':git('show','-s','--format=%B',sha).strip()}} for sha in git('rev-list','--reverse',BASE+'..'+head).splitlines()]
    files=[]
    for entry in git('ls-tree','-r','-l','-z',head).split('\0'):
        if not entry:continue
        meta,path=entry.split('\t',1);mode,kind,sha,size=meta.split();files.append({'path':path,'mode':mode,'type':kind,'sha':sha,'size':int(size)})
    parts=iter(git('diff','--name-status','--find-renames','-z',BASE,head).split('\0'));changes=[]
    for status in parts:
        if not status:continue
        old=next(parts);new=next(parts) if status[0] in 'RC' else old
        changes.append({'filename':new,'status':{'A':'added','D':'removed','M':'modified','R':'renamed','C':'copied','T':'changed'}.get(status[0],status),'previous_filename':old if old!=new else None})
    # Paginate releases too; a page cap must never masquerade as a successful complete check.
    releases=[];page=1
    while True:
        url=f'https://api.github.com/repos/fjaeckel/seriesoftubes/releases?per_page=100&page={page}'
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'series-of-calls-maintenance'}),timeout=30) as response:batch=json.load(response)
        releases.extend({'id':r['id'],'tag':r['tag_name'],'publishedAt':r['published_at'],'prerelease':r['prerelease'],'target':r['target_commitish']} for r in batch)
        if len(batch)<100:break
        page+=1
    # target_commitish may be "main"; pin each tag's immutable object instead.
    with urllib.request.urlopen(urllib.request.Request('https://api.github.com/repos/fjaeckel/seriesoftubes/git/matching-refs/tags/',headers={'User-Agent':'series-of-calls-maintenance'}),timeout=30) as response:tags=json.load(response)
    tags={r['ref']:r['object'] for r in tags}
    for release in releases:
        obj=tags['refs/tags/'+release['tag']];release['tagObject']=obj['sha']
        for depth in range(32):
            if obj['type']=='commit':break
            if obj['type']!='tag':raise RuntimeError('Release tag does not resolve to a commit')
            with urllib.request.urlopen(urllib.request.Request(obj['url'],headers={'User-Agent':'series-of-calls-maintenance'}),timeout=30) as response:obj=json.load(response)['object']
        if obj['type']!='commit':raise RuntimeError('Release tag chain too deep')
        release.update(sha=obj['sha'],type='commit')
    directory=ROOT/'maintenance/upstream';register=json.loads((directory/'register.json').read_text())
    history={'observedAt':now,'base':BASE,'head':head,'commits':commits,'files':files,'changes':changes,'releases':releases}
    # Persist one immutable successful observation before moving the current pointer.
    target=directory/'history'/(now.replace(':','-')+'-'+head+'.json');dump(target,history)
    def merge(previous,observed,key):
        existing={x[key]:x for x in previous}
        for x in observed:
            if x[key] not in existing:existing[x[key]]={**x,'detectedAt':now,'classifiedAt':None,'disposition':None,'status':'pending','urgent':False,'evidence':[]}
        return list(existing.values())
    register['commits']=merge(register['commits'],[{**c,'subject':c['commit']['message'].splitlines()[0]} for c in commits],'sha')
    register['files']=merge(register['files'],[{'path':f['path'],'blob':f['sha']} for f in files],'path')
    versions={ (f['path'],f['blob']):f for f in register.get('fileVersions',[]) }
    for f in files:
        key=(f['path'],f['sha'])
        if key not in versions:versions[key]={'path':f['path'],'blob':f['sha'],'detectedAt':now,'classifiedAt':None,'disposition':None,'status':'pending','urgent':False,'evidence':[]}
    register['fileVersions']=list(versions.values())
    register['changes']=[{'path':f['filename'],'change':f['status'],'previousPath':f.get('previous_filename')} for f in changes]
    register.update(latestObserved=head,lastSuccessfulCheck=now,latestReleaseCheck=now,fullHistoryAvailable=True)
    stable=sorted((r for r in releases if not r['prerelease']),key=lambda r:r['publishedAt'] or '',reverse=True)
    if stable:register['latestRelease']={'tag':stable[0]['tag'],'commit':stable[0]['sha'],'note':'Latest observed stable release; adoption status is tracked separately.'}
    register.setdefault('observations',[]).append(str(target.relative_to(ROOT)))
    dump(directory/'commits.json',commits);dump(directory/'tree.json',{'sha':head,'tree':files,'truncated':False});dump(directory/'comparison.json',{'total_commits':len(commits),'files':changes});dump(directory/'releases.json',releases);dump(directory/'register.json',register)
    print(f'Observed {head}: {len(commits)} commits, {len(files)} files, {len(releases)} releases; adoption unchanged')
if __name__=='__main__':main()
