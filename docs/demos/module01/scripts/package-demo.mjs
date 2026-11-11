import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
const root=process.cwd();
const html=await readFile(path.join(root,'dist/index.html'),'utf8');
let standalone=html;
for(const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]){
 const js=await readFile(path.join(root,'dist',match[1].replace(/^\//,'')),'utf8');
 standalone=standalone.replace(match[0],()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script>');
}
for(const match of [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]){
 const css=await readFile(path.join(root,'dist',match[1].replace(/^\//,'')),'utf8');
 standalone=standalone.replace(match[0],()=>'<style>'+css+'</style>');
}
await mkdir('release',{recursive:true});
await writeFile('release/module01-demo.html',standalone);
const zip=new JSZip();
for(const entry of ['src','scripts','tests','dist','index.html','package.json','package-lock.json','vite.config.js','README.md'])await include(entry);
async function include(relative){const full=path.join(root,relative);try{const children=await readdir(full);for(const child of children)await include(path.join(relative,child));}catch(e){if(e.code!=='ENOTDIR')throw e;zip.file(relative,await readFile(full));}}
zip.file('demo.html',standalone);
await writeFile('module01-demo.zip',await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('Packaged: release/module01-demo.html and module01-demo.zip');
