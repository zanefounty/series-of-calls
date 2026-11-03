/* Optional guided incident practice and source-linked achievement controls. */
const SOC_LEARNING_LABELS={level3:N_('learning.level3'),level4:N_('learning.level4'),level5:N_('learning.level5'),level6:N_('learning.level6'),level8:N_('learning.level8'),level9:N_('learning.level9'),level10:N_('learning.level10'),level11:N_('learning.level11'),level12:N_('learning.level12'),tr:N_('learning.tr'),p5:N_('learning.p5'),ln:N_('learning.ln'),ca:N_('learning.ca'),pn:N_('learning.pn'),scrub:N_('learning.scrub'),df:N_('learning.df'),m2:N_('learning.m2'),gi:N_('learning.gi'),bounded:N_('learning.bounded'),title:N_('learning.title'),issues:N_('learning.issues'),progression:N_('learning.progression'),start:N_('learning.start'),claim:N_('learning.claim'),earned:N_('learning.earned'),ready:N_('learning.ready'),incomplete:N_('learning.incomplete'),pending:N_('learning.pending'),locked:N_('learning.locked'),next:N_('learning.next'),restart:N_('learning.restart'),cancel:N_('learning.cancel'),evidence:N_('learning.evidence'),campaignRequired:N_('learning.campaign_required'),scope:N_('learning.scope'),media:N_('learning.media'),outage:N_('learning.outage'),bb:N_('learning.bb'),ix:N_('learning.ix'),bz:N_('learning.bz'),rd:N_('learning.rd'),tb:N_('learning.tb'),t10:N_('learning.t10'),c3:N_('learning.c3'),c5:N_('learning.c5'),t2:N_('learning.t2'),t1:N_('learning.t1'),level1:N_('learning.level1'),level2:N_('learning.level2'),level7:N_('learning.level7'),level13:N_('learning.level13'),pendingProgression:N_('learning.pending_progression'),practiceHint:N_('learning.practice_hint')};
const socLearningT=key=>tr(SOC_LEARNING_LABELS[key]||key);
function socLearningFlavour(sourceId){const entry=typeof SOC_NARRATIVE!=='undefined'?SOC_NARRATIVE.find(item=>item.source===sourceId):null;return entry?`<p class="soc-flavour" data-narrative="${esc(entry.id)}">${esc(tr(entry.label))}</p>`:'';}
function socLearningExtensionsPanel(s,results){
 const disabled=!SCT.locked||SCT.busy,button=(action,text,off=false,extra='')=>`<button type="button" data-learning="${action}" ${extra}${disabled||off?' disabled':''}>${esc(text)}</button>`;
 const issues=s.issueExercises?results.issueExercises:null;
 const issueBody=issues?issues.exercises.map(exercise=>{
  const definition=SOC.issueExercises.definitions[exercise.exercise],next=definition.steps[exercise.steps.length],active=s.issueExercises.active;
  const blocked=!!active&&active!==exercise.exercise&&s.issueExercises.steps[active]?.length<SOC.issueExercises.definitions[active].steps.length;
  return `<article data-issue-exercise="${esc(exercise.exercise)}"><h3>${socLearningT(exercise.exercise==='directional-media'?'media':'outage')}</h3><p>${socLearningT(exercise.passed?'ready':'incomplete')}</p><p>${socLearningT('practiceHint')}</p>${next?button('issue-step',socLearningT('next')+': '+next.replace(/-/g,' '),blocked,`data-exercise="${esc(exercise.exercise)}" data-step="${esc(next)}"`):''}${button('issue-restart',socLearningT('restart'),false,`data-exercise="${esc(exercise.exercise)}"`)}<details><summary>${socLearningT('evidence')}</summary><pre>${esc(JSON.stringify(exercise.observed,null,2))}</pre></details></article>`;
 }).join('')+button('issue-cancel',socLearningT('cancel'),!issues.active):button('issue-start',socLearningT('start'));
 const progress=results.progression;
 const progressBody=progress?[
  ...Object.entries(progress.goals).filter(([,r])=>r.implementation!=='pending').map(([id,r])=>({id,...r,kind:'goal',name:id.split('.').at(-1),saved:s.progression.goals[id]})),
  ...Object.entries(progress.levels).filter(([,r])=>r.implementation!=='pending').map(([id,r])=>({id,...r,kind:'level',name:'level'+id.split('.').at(-1),saved:s.progression.levels[id]}))
 ].map(row=>`<article><h3>${socLearningT(row.name)}</h3>${socLearningFlavour(row.id)}<p>${socLearningT(row.saved?.status==='earned'?'earned':row.status)}</p>${button('progression-claim',socLearningT('claim'),row.status!=='ready'||row.saved?.status==='earned',`data-kind="${row.kind}" data-source="${esc(row.id)}"`)}<details><summary>${socLearningT('evidence')}</summary><pre>${esc(JSON.stringify(row.evidence,null,2))}</pre></details></article>`).join('')+`<p>${socLearningT('pendingProgression')} ${progress.unimplemented.sourceProgressionLevels} / ${progress.unimplemented.sourceGoals}</p><p>${socLearningT('bounded')}</p>`:`<p>${socLearningT('campaignRequired')}</p>${button('progression-start',socLearningT('start'),!s.campaign)}`;
 return `<section id="soc-learning-extensions" class="soc-business"><h2>${socLearningT('title')}</h2><p>${socLearningT('scope')}</p><h3>${socLearningT('issues')}</h3><div class="soc-op-grid">${issueBody}</div><h3>${socLearningT('progression')}</h3><div class="soc-op-grid">${progressBody}</div></section>`;
}
function socBindLearningExtensions(){
 const root=document.getElementById('soc-learning-extensions');if(!root)return;
 root.querySelectorAll('[data-learning]').forEach(button=>button.onclick=()=>{
  if(!SCT.locked||SCT.busy||button.disabled)return;
  const d=button.dataset;let type,command;
  if(d.learning==='issue-start'){type='issue-exercises';command={action:'start'};}
  else if(d.learning==='issue-step'){type='issue-exercises';command={action:'step',exercise:d.exercise,step:d.step};}
  else if(d.learning==='issue-restart'){type='issue-exercises';command={action:'restart',exercise:d.exercise};}
  else if(d.learning==='issue-cancel'){type='issue-exercises';command={action:'cancel',exercise:(SCT.viewState||SCT.state).issueExercises.active};}
  else if(d.learning==='progression-start'){type='progression';command={action:'start'};}
  else if(d.learning==='progression-claim'){type='progression';command={action:'claim-'+d.kind,[d.kind]:d.source};}
  if(command)try{socApply({type,command});}catch(error){socError(error);}
 });
}
