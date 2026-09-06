'use client';
import { useState } from 'react';

export const CSV_HEADERS = ['Customer_Name','Contact_Number','Delivery_Address','Product_SKU_Or_Name','Quantity','Unit_Price_BDT','Expected_Delivery_Date','Payment_Status','Notes'];
export type CSVRow = Record<string, string> & { _row: string; _errors: string };

const parseLine = (line: string) => { const cells:string[]=[]; let value=''; let quoted=false; for(let i=0;i<line.length;i++){const c=line[i]; if(c==='"'&&line[i+1]==='"'){value+='"';i++;}else if(c==='"')quoted=!quoted;else if(c===','&&!quoted){cells.push(value.trim());value='';}else value+=c;} cells.push(value.trim()); return cells; };
export function useCSVImport() {
  const [rows,setRows]=useState<CSVRow[]>([]); const [fileName,setFileName]=useState('');
  const parseFile=async(file:File)=>{setFileName(file.name);const lines=(await file.text()).replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);const headers=parseLine(lines.shift()||'');const missing=CSV_HEADERS.filter(h=>!headers.includes(h));if(missing.length)throw new Error(`Missing columns: ${missing.join(', ')}`);setRows(lines.map((line,index)=>{const values=parseLine(line);const row:any={_row:String(index+2),_errors:''};headers.forEach((h,i)=>row[h]=values[i]||'');const errors=[];if(!row.Customer_Name)errors.push('Missing customer');if(!row.Contact_Number)errors.push('Missing phone');if(!row.Delivery_Address)errors.push('Missing address');if(!row.Product_SKU_Or_Name)errors.push('Missing product');if(!Number.isInteger(Number(row.Quantity))||Number(row.Quantity)<1)errors.push('Invalid quantity');if(!/^\d{4}-\d{2}-\d{2}$/.test(row.Expected_Delivery_Date)||Number.isNaN(Date.parse(row.Expected_Delivery_Date)))errors.push('Invalid date');row._errors=errors.join(', ');return row;}));};
  const downloadTemplate=()=>{const csv=[CSV_HEADERS.join(','),'Rahim Ahmed,01711000000,Dhanmondi 32 Dhaka,MUSH-BTN-02,5,250,2026-09-10,PENDING,Urgent Delivery','Tanvir Hossain,01822000000,Uttara Sector 7 Dhaka,MUSH-OYSTER-01,2,500,2026-09-12,PAID,Handle with care'].join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='orders_import_template.csv';a.click();URL.revokeObjectURL(url);};
  return {rows,fileName,parseFile,downloadTemplate,reset:()=>{setRows([]);setFileName('');}};
}
