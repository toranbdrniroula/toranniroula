document.querySelectorAll('.post-body pre > code').forEach(code => {
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block';
  code.parentElement.before(wrapper);
  wrapper.append(code.parentElement);
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'code-copy-btn'; button.textContent = 'Copy';
  button.setAttribute('aria-label','Copy code block');
  button.addEventListener('click', async () => {
    try {await navigator.clipboard.writeText(code.textContent); button.textContent = 'Copied';}
    catch {button.textContent = 'Copy failed';}
    setTimeout(() => {button.textContent = 'Copy';},1600);
  });
  if (navigator.clipboard?.writeText) wrapper.append(button);
});
