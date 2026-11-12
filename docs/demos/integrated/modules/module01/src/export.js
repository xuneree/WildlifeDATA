import JSZip from 'jszip';
import {loadLocationFiles} from './files.js';
const xml=value=>String(value??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const safe=value=>String(value).replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/^\.+$/,'_');
export function locationsKml(rows){return '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>相机位点</name>'+rows.map(({data:d})=>{
 if(d.loc_lon==null||d.loc_lat==null||!Number.isFinite(Number(d.loc_lon))||!Number.isFinite(Number(d.loc_lat)))throw Error('位点 '+d.loc_code+' 缺少有效坐标，请先补全。');
 return '<Placemark><name>'+xml(d.loc_code)+'</name><description>'+xml([d.loc_region,d.loc_place,d.loc_alias].filter(Boolean).join(' · '))+'</description><Point><coordinates>'+Number(d.loc_lon)+','+Number(d.loc_lat)+','+Number(d.loc_elevation||0)+'</coordinates></Point></Placemark>';
}).join('')+'</Document></kml>';}
export async function exportSites(rows,types,format){
 if(!rows.length||!types.length)throw Error('请选择位点和导出内容。');
 const zip=new JSZip();let count=0;
 if(types.includes('locations')){const kml=locationsKml(rows);if(format==='kmz'){const kmz=new JSZip();kmz.file('doc.kml',kml);zip.file('相机位点.kmz',await kmz.generateAsync({type:'uint8array'}));}else zip.file('相机位点.kml',kml);count++;}
 for(const row of types.some(t=>t==='tracks'||t==='photos')?rows:[]){const files=await loadLocationFiles(row.id);for(const [type,key,folder] of [['tracks','loc_tracks','轨迹'],['photos','loc_photos','照片']]){if(!types.includes(type))continue;let i=0;for(const file of files[key]||[]){zip.file(safe(row.data.loc_code)+'/'+folder+'/'+String(++i).padStart(2,'0')+'/'+safe(file.name),await file.arrayBuffer());count++;}}}
 if(!count)throw Error('所选位点没有对应的轨迹或照片附件。');
 return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
