(() => {
  const form=document.getElementById('sheet-form');
  if (!form) return;
  const feedback=document.getElementById('form-feedback');
  const button=document.getElementById('submit-btn');
  let sending=false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || form.elements.namedItem('_honeypot').value || !form.reportValidity()) return;
    sending=true; button.disabled=true; button.textContent='Sending…';
    form.setAttribute('aria-busy','true'); feedback.textContent='';
    try {
      const response=await fetch(form.dataset.endpoint,{method:'POST',body:new FormData(form)});
      if (!response.ok) throw new Error('Submission rejected');
      feedback.textContent='Thank you. Your message was submitted.';
      form.reset();
    } catch {
      feedback.textContent='Your message could not be submitted. Please try again or use the email link.';
    } finally {
      sending=false; button.disabled=false; button.textContent='Submit'; form.removeAttribute('aria-busy');
    }
  });
  button.disabled=false;
  form.hidden=false;
})();
