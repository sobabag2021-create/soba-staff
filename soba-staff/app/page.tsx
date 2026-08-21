"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  status: string;
  note: string | null;
};

export default function Home() {
  const [fullName, setFullName] = useState("Nhân viên");
  const [scheduleText, setScheduleText] = useState("Đang tải...");
  const [status, setStatus] = useState("Chưa check-in");
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  const [checkInTime, setCheckInTime] = useState("");
  const [lateMinutes, setLateMinutes] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [minCheckOut, setMinCheckOut] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  function getToday() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date());
  }

  function getVietnamTime() {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  }

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  }

  async function loadData() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Lấy thông tin nhân viên
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("auth_user_id", user.id)
        .single();

      if (employeeError || !employee) {
        console.error(employeeError);
        setScheduleText("Không tìm thấy nhân viên");
        return;
      }

      setFullName(employee.full_name || "Nhân viên");

      const today = getToday();

      // Lấy lịch làm việc hôm nay
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scheduleError) {
        console.error(scheduleError);
        setScheduleText("Lỗi tải lịch");
        return;
      }

      if (!scheduleData) {
        setScheduleText("Chưa có lịch");
        return;
      }

      setSchedule(scheduleData);

      setScheduleText(
        `${scheduleData.start_time.slice(0, 5)} - ${scheduleData.end_time.slice(
          0,
          5
        )}`
      );

      // Kiểm tra đã check-in hôm nay chưa
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (attendanceError) {
        console.error("Lỗi attendance:", attendanceError);
      }

      if (attendanceData) {
        if (attendanceData.check_in_time) {
          setCheckInTime(
            String(attendanceData.check_in_time).slice(0, 5)
          );

          setLateMinutes(attendanceData.late_minutes || 0);
          setPenalty(attendanceData.penalty || 0);
          setStatus("Đã check-in");

          const checkIn = attendanceData.check_in_time;
          const [hour, minute] = String(checkIn)
            .slice(0, 5)
            .split(":")
            .map(Number);

          const date = new Date();
          date.setHours(hour + 9);
          date.setMinutes(minute);

          const minTime = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(date);

          setMinCheckOut(minTime);
        }

        if (attendanceData.check_out_time) {
          setStatus("Đã check-out");
        }
      }
    } catch (error) {
      console.error(error);
      setScheduleText("Lỗi tải lịch");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    try {
      if (!schedule) {
        alert("Hôm nay bạn chưa có lịch làm việc");
        return;
      }

      if (status === "Đã check-in" || status === "Đã check-out") {
        alert("Bạn đã check-in rồi");
        return;
      }

      setCheckingIn(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (employeeError || !employee) {
        throw new Error("Không tìm thấy thông tin nhân viên");
      }

      const today = getToday();
      const nowTime = getVietnamTime();

      // Tính đi muộn
      const [currentHour, currentMinute] = nowTime
        .split(":")
        .map(Number);

      const [startHour, startMinute] = schedule.start_time
        .slice(0, 5)
        .split(":")
        .map(Number);

      const currentTotal = currentHour * 60 + currentMinute;
      const startTotal = startHour * 60 + startMinute;

      const late = Math.max(0, currentTotal - startTotal);

      // Phạt 5.000đ mỗi phút đi muộn
      const penaltyAmount = late * 5000;

      // Check out tối thiểu = giờ check-in + 9 tiếng
      const minCheckOutDate = new Date();
      minCheckOutDate.setHours(currentHour + 9);
      minCheckOutDate.setMinutes(currentMinute);

      const minimumCheckOut = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(minCheckOutDate);

      // Ghi vào bảng attendance
      const { error: insertError } = await supabase
        .from("attendance")
        .insert({
          employee_id: employee.id,
          work_date: today,
          check_in_time: nowTime + ":00",
          late_minutes: late,
          penalty: penaltyAmount,
        });

      if (insertError) {
        console.error(insertError);
        throw new Error(insertError.message);
      }

      setCheckInTime(nowTime);
      setLateMinutes(late);
      setPenalty(penaltyAmount);
      setMinCheckOut(minimumCheckOut);
      setStatus("Đã check-in");

      setMessage("Check-in thành công!");
    } catch (error: any) {
      console.error(error);
      alert("Không thể check-in: " + (error.message || "Có lỗi xảy ra"));
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    try {
      if (!schedule) {
        alert("Hôm nay bạn chưa có lịch làm việc");
        return;
      }

      if (status === "Chưa check-in") {
        alert("Bạn cần check-in trước");
        return;
      }

      if (status === "Đã check-out") {
        alert("Bạn đã check-out rồi");
        return;
      }

      setCheckingOut(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!employee) {
        throw new Error("Không tìm thấy nhân viên");
      }

      const today = getToday();
      const nowTime = getVietnamTime();

      const { error } = await supabase
        .from("attendance")
        .update({
          check_out_time: nowTime + ":00",
        })
        .eq("employee_id", employee.id)
        .eq("work_date", today);

      if (error) {
        throw new Error(error.message);
      }

      setStatus("Đã check-out");
      setMessage("Check-out thành công!");
    } catch (error: any) {
      console.error(error);
      alert("Không thể check-out: " + (error.message || "Có lỗi xảy ra"));
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <main>
      <h1>SOBA STAFF</h1>

      <div className="card">
        <h2>Xin chào, {fullName} 👋</h2>

        <div className="row">
          <span>Ca hôm nay</span>
          <b>{loading ? "Đang tải..." : scheduleText}</b>
        </div>

        <div className="row">
          <span>Trạng thái</span>
          <b>{status}</b>
        </div>
      </div>

      {checkInTime && (
        <div className="card">
          <h2>Thông tin hôm nay</h2>

          <div className="row">
            <span>Nhân viên</span>
            <b>{fullName}</b>
          </div>

          <div className="row">
            <span>Check in</span>
            <b>{checkInTime}</b>
          </div>

          <div className="row">
            <span>Đi muộn</span>
            <b>{lateMinutes} phút</b>
          </div>

          <div className="row">
            <span>Phạt</span>
            <b>{formatMoney(penalty)}</b>
          </div>

          <div className="row">
            <span>Check out tối thiểu</span>
            <b>{minCheckOut}</b>
          </div>
        </div>
      )}

      <button
        onClick={handleCheckIn}
        disabled={checkingIn || status === "Đã check-in" || status === "Đã check-out"}
      >
        {checkingIn ? "ĐANG CHECK IN..." : "CHECK IN"}
      </button>

      <div className="card">
        <button
          onClick={handleCheckOut}
          disabled={
            checkingOut ||
            status === "Chưa check-in" ||
            status === "Đã check-out"
          }
        >
          {checkingOut ? "ĐANG CHECK OUT..." : "CHECK OUT"}
        </button>
      </div>

      {message && <p>{message}</p>}
    </main>
  );
}
