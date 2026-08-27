"use client";
import {useEffect,useMemo,useState} from "react";import {useRouter} from "next/navigation";import {supabase} from "@/lib/supabase";import {LATE_FINE,addMinutes,diffMinutes,key,label,monday,money,vnDate,vnTime} from "@/lib/utils";

export default function Employee(){
 const r=useRouter();const [emp,setEmp]=useState<any>();const [shifts,setShifts]=useState<any[]>([]);const [week,setWeek]=useState(0);const[msg,setMsg]=useState("");const[type,setType]=useState("leave");const[reqDate,setReqDate]=useState(vnDate());const[start,setStart]=useState("");const[end,setEnd]=useState("");const[reason,setReason]=useState("");const[penalty,setPenalty]=useState(0);
 const mon=useMemo(()=>monday(week),[week]);const days=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(d.getDate()+i);return d}),[mon]);
 async function load(){
  const {data:{user}}=await supabase.auth.getUser();if(!user)return r.replace("/login");
  const {data:e}=await supabase.from("employees").select("*").eq("auth_user_id",user.id).maybeSingle();if(!e)return r.replace("/login");if(e.role==="admin")return r.replace("/admin");setEmp(e);
  const from=key(days[0]),to=key(days[6]);const {data:s}=await supabase.from("work_schedules").select("*").eq("employee_id",e.id).gte("work_date",from).lte("work_date",to).order("work_date");setShifts(s||[]);
  const month=vnDate().slice(0,7);const {data:p}=await supabase.from("work_schedules").select("penalty_amount").eq("employee_id",e.id).gte("work_date",`${month}-01`).lte("work_date",`${month}-31`);setPenalty((p||[]).reduce((a,x)=>a+Number(x.penalty_amount||0),0));
 }
 useEffect(()=>{load()},[week]);
 const today=shifts.filter(x=>x.work_date===vnDate());const tomorrowDate=key(new Date(Date.now()+86400000));const tomorrow=shifts.filter(x=>x.work_date===tomorrowDate);
 async function checkIn(){
  if(!today.length)return setMsg("Hôm nay bạn không có ca.");
  const x=today[0];if(x.check_in_at)return setMsg("Bạn đã check-in.");
  const now=vnTime();const late=diffMinutes(x.start_time,now);const {data:approved}=await supabase.from("employee_requests").select("id").eq("employee_id",emp.id).eq("request_type","late").eq("request_date",vnDate()).eq("status","approved").limit(1);
  const excused=(approved||[]).length>0;const fine=late>0&&!excused?LATE_FINE:0;
  const {error}=await supabase.from("work_schedules").update({check_in_at:new Date().toISOString(),late_minutes:late,late_excused:excused,penalty_amount:fine}).eq("id",x.id);
  if(error)return setMsg(error.message);setMsg(excused&&late>0?"Check-in thành công. Đi muộn đã được duyệt, không bị phạt.":"Check-in thành công.");load();
 }
 async function checkOut(){const x=today[0];if(!x?.check_in_at)return setMsg("Bạn chưa check-in.");const {error}=await supabase.from("work_schedules").update({check_out_at:new Date().toISOString()}).eq("id",x.id);if(error)return setMsg(error.message);setMsg("Check-out thành công.");load()}
 async function submit(){
  if(!emp)return;let table=type==="leave"?"leave_requests":"employee_requests";
  const payload:any={employee_id:emp.id,request_date:reqDate,reason,status:"pending"};
  if(type==="leave"){payload.leave_type="leave"}else{payload.request_type=type;payload.start_time=start||null;payload.end_time=end||null}
  const {error}=await supabase.from(table).insert(payload);if(error)return setMsg(error.message);setMsg("Đã gửi yêu cầu, đang chờ Admin duyệt.");setReason("");setStart("");setEnd("");
 }
 async function logout(){await supabase.auth.signOut();r.replace("/login")}
 return <><div className="top"><div className="topin"><div><div className="brand">SOBA STAFF</div><div className="muted">{emp?.full_name}</div></div><button className="btn secondary" onClick={logout}>Đăng xuất</button></div></div><main className="page grid">
 <section className="hero"><h1 style={{margin:0}}>Trang nhân viên</h1><p>Tiền phạt đi muộn tháng này: <b>{money(penalty)}</b></p></section>
 {tomorrow.length>0&&<div className="notice"><b>Thông báo:</b> Ngày mai bạn làm ca {tomorrow.map(x=>`${x.start_time?.slice(0,5)}-${x.end_time?.slice(0,5)}`).join(", ")}. Tiền phạt hiện tại trong tháng: <b>{money(penalty)}</b>.</div>}
 <section className="card"><h2>Ca làm hôm nay</h2>{today.length?today.map(x=><div key={x.id}><div className="row"><span>Ca làm</span><b>{x.start_time?.slice(0,5)} - {x.end_time?.slice(0,5)}</b></div><div className="row"><span>Đi muộn</span><b>{x.late_minutes||0} phút</b></div><div className="row"><span>Phạt hôm nay</span><b>{money(x.penalty_amount||0)}</b></div><div className="g2 grid" style={{marginTop:14}}><button className="btn" onClick={checkIn} disabled={!!x.check_in_at}>{x.check_in_at?"Đã check-in":"Check in"}</button><button className="btn secondary" onClick={checkOut} disabled={!x.check_in_at||!!x.check_out_at}>{x.check_out_at?"Đã check-out":"Check out"}</button></div></div>):<p className="muted">Hôm nay không có ca.</p>}{msg&&<p className="notice">{msg}</p>}</section>
 <section className="card"><div className="row"><h2>Lịch làm việc</h2><div><button className="btn secondary" onClick={()=>setWeek(week-1)}>←</button> <button className="btn secondary" onClick={()=>setWeek(0)}>Tuần này</button> <button className="btn secondary" onClick={()=>setWeek(week+1)}>→</button></div></div><div className="week">{days.map((d,i)=>{const list=shifts.filter(x=>x.work_date===key(d));return <div className={`day ${key(d)===vnDate()?"today":""}`} key={key(d)}><b>{["T2","T3","T4","T5","T6","T7","CN"][i]}</b><div className="muted">{d.toLocaleDateString("vi-VN")}</div>{list.map(x=><div className="shift" key={x.id}>{x.start_time?.slice(0,5)} - {x.end_time?.slice(0,5)}</div>)}</div>})}</div></section>
 <section className="card"><h2>Gửi yêu cầu</h2><div className="tabs">{["leave","late","early_leave","overtime"].map(x=><button className={`tab ${type===x?"active":""}`} key={x} onClick={()=>setType(x)}>{label(x)}</button>)}</div><div className="grid g2"><input className="input" type="date" value={reqDate} onChange={e=>setReqDate(e.target.value)}/>{type!=="leave"&&<input className="input" type="time" value={start} onChange={e=>setStart(e.target.value)}/>} {type==="overtime"&&<input className="input" type="time" value={end} onChange={e=>setEnd(e.target.value)}/>}</div><textarea className="input" style={{marginTop:12,minHeight:90}} placeholder="Lý do" value={reason} onChange={e=>setReason(e.target.value)}/><button className="btn" style={{marginTop:12}} onClick={submit}>Gửi yêu cầu</button></section>
 </main></>
}