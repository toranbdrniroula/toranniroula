import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chartCSV}=require('./chart-csv.cjs');
test('CSV retains full precision, units, quoted labels and missing values',()=>{
  const data={layout:{xaxis:{title:{text:'Angle, degrees'}},yaxis:{title:'C_p'}},data:[
    {name:'CFD "inviscid"',x:[0,1.25],y:[1.81948410489933,-0.015]},
    {name:'Two\nlines',x:[2],y:[null]}
  ]};
  assert.equal(chartCSV(data),'Series,"Angle, degrees",C_p\r\n"CFD ""inviscid""",0,1.81948410489933\r\n"CFD ""inviscid""",1.25,-0.015\r\n"Two\nlines",2,\r\n');
  assert.throws(()=>chartCSV({data:[{x:[1,2],y:[3]}]}),/equal lengths/);
});
