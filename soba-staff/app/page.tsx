"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  status: string | null;
};

type Attendance = {
  id: string;
  employee_id: string;
  schedule_id: string | null;
  work_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  late_minutes: number | null;
  fine_amount: number | null;
};

export default function Home() {
  const [fullName, setFullName] = useState("Nhân viên");
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  function getToday() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date());
  }

  function getVietnamTime() {
    return new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
      })
    );
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  async function loadData() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      // Lấy nhân viên
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (employeeError) {
        console.error("Lỗi nhân viên:", employeeError);
        setMessage("Không thể tải thông tin nhân viên");
        return;
      }

      if (!employee) {
        setMessage("Không tìm thấy tài khoản nhân viên");
        return;
      }

      setEmployeeId(employee.id);
      setFullName(employee.full_name || "Nhân viên");

      const today = getToday();

      // Lấy lịch làm hôm nay
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scheduleError) {
        console.error("Lỗi lịch:", scheduleError);
        setMessage("Lỗi tải lịch làm việc");
        return;
      }

      if (scheduleData) {
        setSchedule(scheduleData);
      }

      // Lấy dữ liệu chấm công hôm nay
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
        setAttendance(attendanceData);
      }
    } catch (error) {
      console.error(error);
      setMessage("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    try {
      setMessage("");

      if (!employeeId) {
        alert("Không tìm thấy thông tin nhân viên");
        return;
      }

      if (!schedule) {
        alert("Hôm nay bạn chưa có lịch làm việc");
        return;
      }

      if (attendance?.check_in_time) {
        alert("Bạn đã check-in rồi");
        return;
      }

      const now = getVietnamTime();
      const today = getToday();
      const currentTime = formatTime(now);

      // Giờ bắt đầu ca
      const [startHour, startMinute] = schedule.start_time
        .slice(0, 5)
        .split(":")
        .map(Number);

      const workStart = new Date(now);
      workStart.setHours(startHour, startMinute, 0, 0);

      // Tính đi muộn
      let lateMinutes = 0;

      if (now > workStart) {
        lateMinutes = Math.floor(
          (now.getTime() - workStart.getTime()) / 60000
        );
      }

      // Mức phạt
      // Ví dụ: đi muộn > 0 phút = phạt 50.000đ
      let fineAmount = 0;

      if (lateMinutes > 0) {
        fineAmount = 50000;
      }

      const { data, error } = await supabase
        .from("attendance")
        .insert({
          employee_id: employeeId,
          schedule_id: schedule.id,
          work_date: today,
          check_in_time: currentTime,
          late_minutes: lateMinutes,
          fine_amount: fineAmount,
        })
        .select()
        .single();

      if (error) {
        console.error("CHECK IN ERROR:", error);
        alert("Không thể check-in: " + error.message);
        return;
      }

      setAttendance(data);

      alert("Check-in thành công");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi check-in");
    }
  }

  async function handleCheckOut() {
    try {
      if (!attendance?.id) {
        alert("Bạn chưa check-in");
        return;
      }

      if (attendance.check_out_time) {
        alert("Bạn đã check-out rồi");
        return;
      }

      const now = getVietnamTime();
      const currentTime = formatTime(now);

      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out_time: currentTime,
        })
        .eq("id", attendance.id)
        .select()
        .single();

      if (error) {
        console.error("CHECK OUT ERROR:", error);
        alert("Không thể check-out: " + error.message);
        return;
      }

      setAttendance(data);

      alert("Check-out thành công");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi check-out");
    }
  }

  function getMinimumCheckOut() {
    if (!schedule || !attendance?.check_in_time) return "--:--";

    const [checkInHour, checkInMinute] = attendance.check_in_time
      .slice(0, 5)
      .split(":")
      .map(Number);

    const [startHour, startMinute] = schedule.start_time
      .slice(0, 5)
      .split(":")
      .map(Number);

    const [endHour, endMinute] = schedule.end_time
      .slice(0, 5)
      .split(":")
      .map(Number);

    const scheduledMinutes =
      endHour * 60 +
      endMinute -
      (startHour * 60 + startMinute);

    const checkInMinutes = checkInHour * 60 + checkInMinute;

    const minimumMinutes = checkInMinutes + scheduledMinutes;

    const hour = Math.floor(minimumMinutes / 60);
    const minute = minimumMinutes % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}`;
  }

  function getScheduleText() {
    if (!schedule) return "Chưa có lịch";

    return `${schedule.start_time.slice(
      0,
      5
    )} - ${schedule.end_time.slice(0, 5)}`;
  }

  return (
    <main>
      <h1>SOBA STAFF</h1>

      <div className="card">
        <h2>Xin chào, {fullName} 👋</h2>

        <div className="row">
          <span>Ca hôm nay</span>

          <b>
            {loading ? "Đang tải..." : getScheduleText()}
          </b>
        </div>

        <div className="row">
          <span>Trạng thái</span>

          <b>
            {!attendance
              ? "Chưa check-in"
              : attendance.check_out_time
              ? "Đã check-out"
              : "Đã check-in"}
          </b>
        </div>
      </div>

      {!attendance?.check_in_time && (
        <button onClick={handleCheckIn} disabled={loading}>
          CHECK IN
        </button>
      )}

      {attendance?.check_in_time && (
        <div className="card">
          <h2>Thông tin check-in</h2>

          <div className="row">
            <span>Check in</span>
            <b>{attendance.check_in_time.slice(0, 5)}</b>
          </div>

          <div className="row">
            <span>Đi muộn</span>
            <b>{attendance.late_minutes || 0} phút</b>
          </div>

          <div className="row">
            <span>Phạt</span>

            <b>
              {Number(attendance.fine_amount || 0).toLocaleString(
                "vi-VN"
              )}
              đ
            </b>
          </div>

          <div className="row">
            <span>Check out tối thiểu</span>
            <b>{getMinimumCheckOut()}</b>
          </div>
        </div>
      )}

      <div className="card">
        <button
          onClick={handleCheckOut}
          disabled={!attendance?.check_in_time || !!attendance?.check_out_time}
        >
          {attendance?.check_out_time
            ? "ĐÃ CHECK OUT"
            : "CHECK OUT"}
        </button>

        <p>
          {message ||
            (attendance?.check_out_time
              ? `Check-out lúc ${attendance.check_out_time.slice(0, 5)}`
              : "Check-in để bắt đầu ghi nhận thời gian làm việc.")}
        </p>
      </div>
    </main>
  );
}
