(() => {
  document.querySelectorAll('.schlieren-play').forEach(button => {
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
})();
