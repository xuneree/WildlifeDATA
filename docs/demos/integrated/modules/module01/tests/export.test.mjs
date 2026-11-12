import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {locationsKml,exportSites} from '../src/export.js';
const rows=[{id:'one',data:{loc_code:'001<&',loc_region:'和顺',loc_lon:'113.2',loc_lat:'37.5',loc_elevation:'1200'}}];
test('KML uses WGS84 longitude/latitude order and escapes user content',()=>{
 const kml=locationsKml(rows);assert.match(kml,/<coordinates>113.2,37.5,1200<\/coordinates>/);assert.match(kml,/<name>001&lt;&amp;<\/name>/);assert.match(kml,/xmlns="http:\/\/www.opengis.net\/kml\/2.2"/);
});
test('KMZ contains doc.kml and is packaged in the outer ZIP',async()=>{
 const blob=await exportSites(rows,['locations'],'kmz');const outer=await JSZip.loadAsync(await blob.arrayBuffer());const inner=await JSZip.loadAsync(await outer.file('相机位点.kmz').async('uint8array'));assert.equal(await inner.file('doc.kml').async('string'),locationsKml(rows));
});
test('KML ZIP and invalid export selections',async()=>{
 const blob=await exportSites(rows,['locations'],'kml');const zip=await JSZip.loadAsync(await blob.arrayBuffer());assert.equal(await zip.file('相机位点.kml').async('string'),locationsKml(rows));await assert.rejects(exportSites([],['locations'],'kml'));await assert.rejects(exportSites(rows,[],'kml'));assert.throws(()=>locationsKml([{data:{loc_code:'bad',loc_lon:'invalid',loc_lat:0}}]));
});
