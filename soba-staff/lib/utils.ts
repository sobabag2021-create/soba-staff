export const LATE_FINE = 50000;

export const vnDate = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);

export const vnTime = (d = new Date()) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(d);

export function money(v:number){ return `${Number(v||0).toLocaleString("vi-VN")}đ`; }

export function monday(offset=0){
  const d=new Date(); const day=d.getDay()||7;
  d.setDate(d.getDate()-day+1+offset*7); d.setHours(0,0,0,0); return d;
}

export function key(d:Date){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

export function addMinutes(time:string, minutes:number){
  const [h,m]=time.slice(0,5).split(":").map(Number);
  const total=h*60+m+minutes;
  return `${String(Math.floor((total%1440)/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}

export function diffMinutes(a:string,b:string){
  const [ah,am]=a.slice(0,5).split(":").map(Number);
  const [bh,bm]=b.slice(0,5).split(":").map(Number);
  return Math.max(0,bh*60+bm-ah*60-am);
}

export function lock15(minutes:number){ return Math.max(0,Math.floor(minutes/15)*15); }

export const label=(t:string)=>({
  leave:"Xin nghỉ", late:"Xin đi muộn", early_leave:"Xin về sớm", overtime:"Xin tăng ca"
} as Record<string,string>)[t]||t;
