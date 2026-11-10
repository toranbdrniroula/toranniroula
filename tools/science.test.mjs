import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parseCSV,chartFromCSV,validateChart,cleanDiagram,chartSnippet,diagramSnippet}=require('./studio/science.cjs');
const {chartCSV}=require('./chart-csv.cjs');

test('3D CSV import handles quoted headers, units, precision and line order',()=>{
 const text='\uFEFF"x, mm",y_mm,T_K\r\n1.81948410489933,2,300\r\n-1,3,500\r\n';
 assert.deepEqual(parseCSV(text).headers,['x, mm','y_mm','T_K']);
 const data=chartFromCSV({text,kind:'line3d',columns:{x:'x, mm',y:'y_mm',z:'T_K'},labels:{z:'Temperature [K]'}});
 assert.equal(data.data[0].mode,'lines');assert.deepEqual(data.data[0].x,[1.81948410489933,-1]);
 assert.equal(chartCSV(data),'Series,"x, mm",y_mm,Temperature [K]\r\nSeries 1,1.81948410489933,2,300\r\nSeries 1,-1,3,500\r\n');
 for(const csv of ['x,x,z\n1,2,3','x,y,z\n1,2','x,y,z\n1,"2,3','x,y,z\n1,2,NaN','x,y,z\n1,2,'])assert.throws(()=>chartFromCSV({text:csv,columns:{x:'x',y:'y',z:'z'}}));
});
test('surface import reconstructs an unordered grid and exports every XYZ value',()=>{
 const input={text:'x,y,z\n1,1,4\n0,0,1\n1,0,2\n0,1,3',kind:'surface',columns:{x:'x',y:'y',z:'z'}};
 const data=chartFromCSV(input);assert.deepEqual(data.data[0],{type:'surface',x:[0,1],y:[0,1],z:[[1,2],[3,4]]});
 assert.equal(validateChart(data),4);assert.equal(chartCSV(data),'Series,x,y,z\r\nSeries 1,0,0,1\r\nSeries 1,1,0,2\r\nSeries 1,0,1,3\r\nSeries 1,1,1,4\r\n');
 assert.throws(()=>chartFromCSV({...input,text:input.text.replace('0,1,3','1,1,5')}),/duplicate|missing|rectangular/);
 assert.throws(()=>validateChart({data:[{type:'surface',x:[0,1],y:[0,1],z:[[1],[2]]}]}),/columns/);
 assert.throws(()=>validateChart({data:[{type:'scatter3d',x:[0],y:[0],z:[Infinity]}]}),/finite/);
});
test('diagram keeps editable XML and labels while stripping active SVG content',()=>{
 const xml='<mxfile><diagram>compressed-source</diagram></mxfile>';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" onload="bad()"><script>bad()</script><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">Controller</div></foreignObject><a href="javascript:bad()"><text>Plant</text></a><image href="https://evil.test/tracker"/><rect fill="url(https://evil.test)"/><g style="fill:red; background:url(https://evil.test)"/></svg>';
 const result=cleanDiagram(xml,svg);assert.equal(result.xml,xml);assert.match(result.svg,/Controller/);assert.match(result.svg,/Plant/);assert.doesNotMatch(result.svg,/bad\(|script|onload|evil\.test/);
 for(const source of ['<!DOCTYPE mxfile><mxfile/>','<html/>','<?xml-stylesheet href="x"?><mxfile/>'])assert.throws(()=>cleanDiagram(source,svg));
 assert.throws(()=>cleanDiagram(xml,'<html/>'));
 assert.match(chartSnippet('/content/data/a.json','Test "plot"'),/&quot;/);
 assert.doesNotMatch(diagramSnippet('/assets/a.svg','/assets/a.xml','<script>'),/<script>/);
});
