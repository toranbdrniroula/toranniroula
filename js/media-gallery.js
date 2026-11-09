(() => {
  const routes=document.getElementById('gallery-route-map');
  if(routes&&location.hash){
    try{const map=JSON.parse(routes.textContent);const key=decodeURIComponent(location.hash.slice(1));if(Object.hasOwn(map,key))location.replace(map[key]);}catch{}
  }
  document.querySelectorAll('.gallery-video-play').forEach(button=>{
    const frame=button.parentElement.querySelector('iframe');
    button.hidden=false;
    button.addEventListener('click',()=>{
      const url=new URL(frame.dataset.src);url.searchParams.set('autoplay','1');url.searchParams.set('rel','0');
      frame.src=url.href;frame.hidden=false;button.hidden=true;button.parentElement.querySelector('img').hidden=true;
    },{once:true});
  });
  document.querySelectorAll('.gallery-play').forEach(button => {
    const image=button.parentElement.querySelector('img');
    const poster=image.getAttribute('src');
    const label=button.getAttribute('aria-label').replace(/^Play /,'').replace(/ GIF$/,'');
    button.hidden=false;
    button.addEventListener('click',() => {
      const playing=button.getAttribute('aria-pressed')!=='true';
      image.src=playing?image.dataset.gif:poster;
      button.setAttribute('aria-pressed',String(playing));
      button.setAttribute('aria-label',(playing?'Stop ':'Play ')+label+' GIF');
      button.textContent=playing?'Stop GIF':'Play GIF';
    });
    image.addEventListener('error',()=>{
      if(button.getAttribute('aria-pressed')==='true'){
        image.src=poster;button.setAttribute('aria-pressed','false');
        button.setAttribute('aria-label','Retry '+label+' GIF');button.textContent='Retry GIF';
      }
    });
  });
  document.querySelectorAll('.gallery-full').forEach(details=>{
    const player=details.querySelector('iframe');
    details.addEventListener('toggle',()=>{
      if(details.open) player.src=player.dataset.src;
      else player.removeAttribute('src');
    });
  });
})();
