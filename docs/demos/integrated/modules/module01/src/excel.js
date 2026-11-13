import ExcelJS from 'exceljs';
import {importSchemas} from './import-data.js';
export async function templateBuffer(kind){
 const schema=importSchemas[kind],book=new ExcelJS.Workbook();const sheet=book.addWorksheet(schema.sheet);sheet.columns=schema.columns.map(c=>({header:c.title,key:c.key,width:c.type==='list'?28:20,style:{numFmt:['loc_lon','loc_lat'].includes(c.key)?'0.000000':c.type==='number'?'0.########':'@'}}));sheet.views=[{state:'frozen',ySplit:1}];sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1677FF'}};sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:schema.columns.length}};
 const notes=book.addWorksheet('填写说明');notes.columns=[{header:'字段',width:28},{header:'要求',width:100}];
 notes.addRow(['导入规则','在数据工作表填写记录；本表仅为说明，不导入。每批最多 1000 条；所有记录通过后整批写入，不覆盖已有记录。']);
 notes.addRow(['编号与日期','编号和网格按文本填写，保留前导零；日期填写 YYYY-MM-DD。多选项用“、”分隔。工作组由当前上下文带入。']);
 if(kind==='locations')notes.addRow(['坐标精度','WGS84 十进制度，经纬度统一保留小数点后 6 位；超出部分四舍五入。']);
 if(kind==='locations')notes.addRow(['附件与状态','轨迹和照片请在位点中另行上传；在位状态由操作记录计算，不填写状态列。']);
 else{notes.addRow(['操作类型','安装：填写相机型号（条形码选填），拍摄参数可采用默认视频15秒、间隔10秒、灵敏度中。检查/撤回：带入此前相机信息；操作人员和现场状态必填，记录人员选填。']);notes.addRow(['条件字段','检查的更换相机/丢失重补可填写新型号与条形码，参数调整可填写新拍摄参数；选择其他时填写对应说明。撤回填写原因，不填操作内容。']);notes.addRow(['重复处理','相同位点、相机、日期、类型的操作视为同键冲突，需核对，不覆盖。先导入位点，再导入操作记录；操作导入后周期自动生成。']);}
 for(const c of schema.columns)notes.addRow([c.title,`${c.required?'必填':'选填或按操作类型条件填写'}${c.options?'；选项：'+c.options.join('、'):''}${c.type==='number'&&c.min!==undefined?'；最小值 '+c.min:''}${c.type==='number'&&c.max!==undefined?'；最大值 '+c.max:''}`]);
 return book.xlsx.writeBuffer();
}
function valueOf(cell,c){const v=cell.value;if(v===null||v===undefined)return null;if(v instanceof Date)return v;if(typeof v==='object'){if(v.formula||v.sharedFormula||v.error)throw Error(c.title+'不能含公式或错误值，请粘贴为值');if(v.richText)return v.richText.map(p=>p.text).join('');if(v.text!==undefined)return v.text;throw Error(c.title+'包含无法识别的单元格');}if(typeof v==='number'&&c.type==='text'&&/^0+$/.test(cell.numFmt||'')&&Number.isInteger(v))return String(v).padStart(cell.numFmt.length,'0');return v;}
export async function readImportWorkbook(kind,input){
 const schema=importSchemas[kind],buffer=input instanceof ArrayBuffer||ArrayBuffer.isView(input)?input:await input.arrayBuffer();if(buffer.byteLength>10*1024*1024)throw Error('文件不能超过 10MB');
 const book=new ExcelJS.Workbook();try{await book.xlsx.load(buffer);}catch{throw Error('无法读取 Excel，请上传有效的 .xlsx 工作簿');}
 const sheet=book.getWorksheet(schema.sheet);if(!sheet)throw Error('未找到“'+schema.sheet+'”工作表，请使用对应模板');if(sheet.rowCount>10001)throw Error('工作表行数过多，请删除无用空白行后重试');
 const headers=new Map();sheet.getRow(1).eachCell((cell,index)=>{const title=String(valueOf(cell,{title:'表头',type:'text'})??'').trim();if(!title)return;if(headers.has(title))throw Error('表头重复：'+title);if(!schema.columns.some(c=>c.title===title))throw Error('不支持的表头：'+title+'，请使用对应模板');headers.set(title,index);});
 for(const c of schema.columns)if(c.required&&!headers.has(c.title))throw Error('缺少必填列：'+c.title);
 const rows=[];for(let n=2;n<=sheet.rowCount;n++){const row=sheet.getRow(n),data={},parseErrors=[];let hasData=false;for(const c of schema.columns){const index=headers.get(c.title);if(!index)continue;const cell=row.getCell(index);if(cell.value!==null&&cell.value!==undefined&&cell.value!=='')hasData=true;try{data[c.key]=valueOf(cell,c);}catch(e){parseErrors.push(e.message);}}if(hasData)rows.push({rowNumber:n,data,parseErrors});if(rows.length>1000)throw Error('每批最多导入 1000 条记录');}
 return rows;
}
export function downloadBytes(bytes,name,mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){const url=URL.createObjectURL(new Blob([bytes],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
