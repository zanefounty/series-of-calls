/* Observed attendance and dimensioned forecasting use the shared command path. */
const SOC_ATTENDANCE_LABELS={title:N_('attendance.title'),note:N_('attendance.note'),person:N_('attendance.person'),state:N_('attendance.state'),available:N_('attendance.available'),away:N_('attendance.away'),offline:N_('attendance.offline'),submit:N_('attendance.submit'),forecast:N_('attendance.forecast'),channel:N_('attendance.channel'),skill:N_('attendance.skill'),language:N_('attendance.language'),horizon:N_('attendance.horizon'),arrivals:N_('attendance.arrivals'),sampleMinutes:N_('attendance.sample_minutes'),observe:N_('attendance.observe')};
const socAttendanceT=k=>tr(SOC_ATTENDANCE_LABELS[k]);
function socWorkforcePresencePanel(s,results){
 if(!s.workforceOps)return '';
 const w=s.workforceOps,r=results.workforce,authorised=SOC.business.authorise(s,'people','configure'),editable=SCT.locked&&!SCT.busy&&authorised&&w.operator!=='customer'&&(w.operator!=='bpo'||w.agreements.some(a=>a.expires>s.clock&&a.actions.includes('attendance')&&a.resources.includes('workforce')));
 const field=(name,value,type='text')=>`<label>${socAttendanceT(name)}<input name="${name}" type="${type}" value="${esc(String(value))}" required${type==='number'?' min="1" max="1440"':''}></label>`;
 const dimensions=()=>`<label>${socAttendanceT('channel')}<select name="channel"><option value="voice">${socServiceAdminT('voice')}</option><option value="digital">${socServiceAdminT('digital')}</option></select></label>${field('skill','service')}${field('language','en')}`;
 return `<section id="soc-attendance" class="soc-business"><h2>${socAttendanceT('title')}</h2><p>${socAttendanceT('note')}</p><form data-attendance="presence"><fieldset${!editable?' disabled':''}><label>${socAttendanceT('person')}<select name="person">${r.presence.map(p=>`<option value="${esc(p.person)}">${esc(p.person)} · ${socAttendanceT(p.state)}</option>`).join('')}</select></label><label>${socAttendanceT('state')}<select name="state">${['available','away','offline'].map(k=>`<option value="${k}">${socAttendanceT(k)}</option>`).join('')}</select></label><button type="submit">${socAttendanceT('submit')}</button></fieldset></form><form data-attendance="arrival"><fieldset${!SCT.locked||SCT.busy?' disabled':''}>${dimensions()}${field('arrivals',1,'number')}${field('sampleMinutes',60,'number')}<button type="submit">${socAttendanceT('observe')}</button></fieldset></form><form data-attendance="staffing-forecast"><fieldset${!SCT.locked||SCT.busy||!authorised?' disabled':''}>${dimensions()}${field('horizon',60,'number')}<button type="submit">${socAttendanceT('forecast')}</button></fieldset></form><pre>${esc(JSON.stringify({adherence:r.adherence,forecasts:r.forecasts},null,2))}</pre></section>`;
}
function socBindWorkforcePresence(){
 for(const form of document.querySelectorAll('[data-attendance]'))form.onsubmit=e=>{
  e.preventDefault();try{const f=form.elements,action=form.dataset.attendance;let command;
   if(action==='presence')command={action,person:f.person.value,state:f.state.value};
   else {command={action,channel:f.channel.value,skill:f.skill.value,language:f.language.value};if(action==='arrival')Object.assign(command,{count:Number(f.arrivals.value),sampleMinutes:Number(f.sampleMinutes.value)});else Object.assign(command,{horizon:Number(f.horizon.value),method:'mean'});}
   socApply({type:'workforce',command});
  }catch(error){socError(error);}
 };
}
