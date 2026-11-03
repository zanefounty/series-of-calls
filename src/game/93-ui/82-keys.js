/* Adapt the upstream 48ba004 helpClose/pregame fix to this title screen's Help overlay.
   The reference lists only keyboard controls implemented by Series of Calls itself. */
addEventListener('keydown',e=>{
  if(e.key!=='?'||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
  const modal=$('modal');if(modal.hidden||modal.className!=='keys')return;
  e.preventDefault();ACT.helpClose({});
});
