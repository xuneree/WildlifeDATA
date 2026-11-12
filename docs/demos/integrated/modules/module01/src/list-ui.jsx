import React,{useEffect,useState} from 'react';
export const LIST_THEME={token:{fontSize:13},components:{Table:{cellFontSizeSM:13,cellPaddingBlockSM:8,cellPaddingInlineSM:12},Tag:{fontSizeSM:12}}};
export function ListValue({children}){const value=String(children??'—');return <span className={/^[\x20-\x7e]+$/.test(value)&&value!=='—'?'list-latin':undefined}>{children??'—'}</span>;}
export function recordInteraction(open,label){return {tabIndex:0,'aria-label':label,onClick:event=>{if(!event.target.closest('button,a,input,label,[role="checkbox"],.ant-table-selection-column'))open();},onKeyDown:event=>{if(event.target===event.currentTarget&&['Enter',' '].includes(event.key)){event.preventDefault();open();}}};}
export function useListPagination(total,resetKey='',unit='条'){
 const [page,setPage]=useState(1);useEffect(()=>setPage(1),[resetKey]);
 return {current:Math.min(page,Math.max(1,Math.ceil(total/10))),pageSize:10,showSizeChanger:false,onChange:next=>setPage(next),showTotal:(n,range)=>n?`共 ${n} ${unit}，显示 ${range[0]}–${range[1]} ${unit}`:`共 0 ${unit}`};
}
