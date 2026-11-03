/* Authored fictional campaign imagery. Presentation never changes simulation state. */
const SOC_ARTWORK_LABELS={
 launch:N_('artwork.launch'),smb:N_('artwork.smb'),enterprise:N_('artwork.enterprise'),
 government:N_('artwork.government'),defence:N_('artwork.defence'),sp:N_('artwork.sp')
};
function socArtwork(id,compact=false){
 if(!Object.prototype.hasOwnProperty.call(SOC_ARTWORK_LABELS,id))return '';
 const alt=esc(tr(SOC_ARTWORK_LABELS[id]));
 return `<figure class="soc-artwork${compact?' soc-artwork-compact':''}"><img src="images/${id}-640.webp" srcset="images/${id}-640.webp 640w, images/${id}-1280.webp 1280w" sizes="${compact?'(max-width: 640px) 100vw, 900px':'(max-width: 640px) 100vw, 680px'}" width="1280" height="720" alt="${alt}" decoding="async"${compact?' loading="lazy"':' fetchpriority="high"'}></figure>`;
}
