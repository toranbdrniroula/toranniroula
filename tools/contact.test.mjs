import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync(new URL('../js/static-contact.js',import.meta.url),'utf8');
function setup(fetchResponse,{valid=true,honeypot=''}={}) {
  let submit,calls=0,resets=0;
  const form={hidden:true,dataset:{endpoint:'https://example.invalid/contact'},elements:{namedItem:()=>({value:honeypot})},
    reportValidity:()=>valid,addEventListener:(_,handler)=>{submit=handler;},setAttribute(){},removeAttribute(){},reset(){resets++;}};
  const button={disabled:true,textContent:'Submit'},feedback={textContent:''};
  vm.runInNewContext(script,{document:{getElementById:id=>({'sheet-form':form,'submit-btn':button,'form-feedback':feedback})[id]},
    FormData:class {},fetch:async (...args)=>{calls++;assert.equal(args[0],form.dataset.endpoint);assert.equal(args[1].method,'POST');return await fetchResponse();}});
  return {form,button,feedback,submit:()=>submit({preventDefault(){}}),calls:()=>calls,resets:()=>resets};
}
test('contact success resets only after an accepted HTTP response',async()=>{
  const state=setup(()=>({ok:true}));
  assert.equal(state.form.hidden,false);await state.submit();
  assert.equal(state.resets(),1);assert.match(state.feedback.textContent,/submitted/);assert.equal(state.button.disabled,false);
});
test('HTTP and network failure preserve the message and allow retry',async()=>{
  for (const response of [()=>({ok:false}),()=>{throw new Error('offline');}]) {
    const state=setup(response);await state.submit();assert.equal(state.resets(),0);assert.match(state.feedback.textContent,/could not/);assert.equal(state.button.disabled,false);
  }
});
test('invalid or honeypot entries never send',async()=>{
  for (const options of [{valid:false},{honeypot:'bot'}]) {const state=setup(()=>({ok:true}),options);await state.submit();assert.equal(state.calls(),0);}
});
test('duplicate submits are ignored while a request is pending',async()=>{
  let resolve;
  const state=setup(()=>new Promise(done=>{resolve=done;}));
  const pending=state.submit();await state.submit();assert.equal(state.calls(),1);assert.equal(state.button.disabled,true);resolve({ok:true});await pending;
});
