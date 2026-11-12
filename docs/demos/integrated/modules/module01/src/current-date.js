import {useEffect,useState} from 'react';
import {chinaToday} from './samples';
export function useCurrentDate(){const [date,setDate]=useState(chinaToday);useEffect(()=>{const refresh=()=>setDate(chinaToday());const timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};},[]);return date;}
