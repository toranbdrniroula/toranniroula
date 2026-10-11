import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture() {
  const listeners = {};
  const reference = { hidden: false };
  const shell = { state: 'pending', setAttribute(_, value) { this.state=value; }, querySelector() { return reference; } };
  const viewer = { inert: true, attrs: {'aria-hidden':'true'}, closest() { return shell; },
    setAttribute(key,value) { this.attrs[key]=value; }, removeAttribute(key) { delete this.attrs[key]; } };
  shell.firstElementChild=viewer;
  vm.runInNewContext(fs.readFileSync(new URL('../js/media-fallback.js',import.meta.url),'utf8'),{
    document: { addEventListener(name, listener) { listeners[name]=listener; } }
  });
  return {shell, reference, viewer, listeners, state(state,target=viewer) { listeners['media:state']({target,detail:{state}}); }};
}
test('reference remains until ready, returns on failure, and can recover',()=>{
  const f=fixture();
  assert.equal(f.reference.hidden,false);
  f.state('pending'); assert.equal(f.reference.hidden,false); assert.equal(f.viewer.inert,true);
  f.state('failed'); assert.equal(f.reference.hidden,false);
  f.state('ready'); assert.equal(f.reference.hidden,true); assert.equal(f.viewer.inert,false); assert.equal(f.viewer.attrs['aria-hidden'],undefined);
  f.state('failed'); assert.equal(f.reference.hidden,false); assert.equal(f.viewer.attrs['aria-hidden'],'true');
  f.state('ready'); assert.equal(f.reference.hidden,true);
});
test('nested viewer cannot mark an unfinished parent ready',()=>{
  const f=fixture();
  f.state('ready',{closest(){return f.shell;}});
  assert.equal(f.reference.hidden,false); assert.equal(f.shell.state,'pending');
});
test('lost WebGL context restores the reference',()=>{
  const f=fixture();
  f.state('ready');
  f.viewer.closest=(selector)=>selector==='.scientific-media'?f.shell:null;
  f.listeners.webglcontextlost({target:{closest(){return f.viewer;}}});
  assert.equal(f.reference.hidden,false); assert.equal(f.shell.state,'failed');
});
