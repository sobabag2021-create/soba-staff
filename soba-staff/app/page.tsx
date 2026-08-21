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

type Attendance = {
  id: string;
  employee_id: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  late_minutes: number;
  penalty_amount: number;
  min_checkout_at: string | null;
  status: string;
};

export default function Home() {
  const [fullName, setFullName] = useState("Nhân viên");
  const [employeeId, setEmployeeId] = useState("");

  const [scheduleText, setScheduleText] = useState("Đang tải...");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  function getVietnamDate() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function formatTime(dateString: string | null) {
    if (!dateString) return "--:--";

    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString));
  }

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  }

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Lấy nhân viên
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("auth_user_id", user.id)
        .single();

      if (employeeError || !employee) {
        console.error(employeeError);
        setMessage("Không tìm thấy thông tin nhân viên");
        return;
      }

      setEmployeeId(employee.id);
      setFullName(employee.full_name || "Nhân viên");

      const today = getVietnamDate();

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
        `${scheduleData.start_time.slice(0, 5)} - ${scheduleData.end_time.slice(0, 5)}`
      );

      // Lấy dữ liệu chấm công hôm nay
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .maybeSingle();

      if (attendanceError) {
        console.error(attendanceError);
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
    if (!schedule) {
      alert("Hôm nay bạn chưa có lịch làm việc");
      return;
    }

    if (!employeeId) {
      alert("Không tìm thấy thông tin nhân viên");
      return;
    }

    if (attendance?.check_in_at) {
      alert("Bạn đã check-in hôm nay rồi");
      return;
    }

    try {
      setActionLoading(true);
      setMessage("");

      const now = new Date();

      // Ngày hôm nay theo Việt Nam
      const today = getVietnamDate();

      // Giờ bắt đầu ca
      const scheduledStart = new Date(
        `${today}T${schedule.start_time}+07:00`
      );

      // Giờ kết thúc ca
      const scheduledEnd = new Date(
        `${today}T${schedule.end_time}+07:00`
      );

      // Tính số phút đi muộn
      let lateMinutes = Math.floor(
        (now.getTime() - scheduledStart.getTime()) / 60000
      );

      if (lateMinutes < 0) {
        lateMinutes = 0;
      }

      /*
        QUY TẮC PHẠT HIỆN TẠI:

        Đi muộn > 0 phút = 50.000đ

        Sau này có thể sửa thành:
        1-10 phút = 50.000đ
        11-30 phút = 100.000đ
        ...
      */

      let penaltyAmount = 0;

      if (lateMinutes > 0) {
        penaltyAmount = 50000;
      }

      // Check out tối thiểu = giờ tan ca + số phút đi muộn
      const minCheckout = new Date(
        scheduledEnd.getTime() + lateMinutes * 60000
      );

      const { data, error } = await supabase
        .from("attendance")
        .insert({
          employee_id: employeeId,
          work_date: today,
          check_in_at: now.toISOString(),
          late_minutes: lateMinutes,
          penalty_amount: penaltyAmount,
          min_checkout_at: minCheckout.toISOString(),
          status: "checked_in",
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Không thể check-in: " + error.message);
        return;
      }

      setAttendance(data);
      setMessage("Check-in thành công");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi check-in");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!attendance?.check_in_at) {
      alert("Bạn chưa check-in");
      return;
    }

    if (attendance.check_out_at) {
      alert("Bạn đã check-out hôm nay rồi");
      return;
    }

    try {
      setActionLoading(true);
      setMessage("");

      const now = new Date();

      // Kiểm tra giờ checkout tối thiểu
      if (attendance.min_checkout_at) {
        const minCheckout = new Date(attendance.min_checkout_at);

        if (now.getTime() < minCheckout.getTime()) {
          alert(
            `Bạn chưa thể check-out.\n\nCheck-out tối thiểu: ${formatTime(
              attendance.min_checkout_at
            )}`
          );
          return;
        }
      }

      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out_at: now.toISOString(),
          status: "checked_out",
          updated_at: now.toISOString(),
        })
        .eq("id", attendance.id)
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Không thể check-out: " + error.message);
        return;
      }

      setAttendance(data);
      setMessage("Check-out thành công");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi check-out");
    } finally {
      setActionLoading(false);
    }
  }

  const isCheckedIn = Boolean(attendance?.check_in_at);
  const isCheckedOut = Boolean(attendance?.check_out_at);

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

          <b>
            {isCheckedOut
              ? "Đã check-out"
              : isCheckedIn
              ? "Đã check-in"
              : "Chưa check-in"}
          </b>
        </div>
      </div>

      {/* THÔNG TIN SAU KHI CHECK IN */}

      {isCheckedIn && (
        <div className="card attendance-card">
          <h2>Thông tin chấm công</h2>

          <div className="row">
            <span>Nhân viên</span>
            <b>{fullName}</b>
          </div>

          <div className="row">
            <span>Check in</span>
            <b>{formatTime(attendance?.check_in_at || null)}</b>
          </div>

          <div className="row">
            <span>Đi muộn</span>
            <b>{attendance?.late_minutes || 0} phút</b>
          </div>

          <div className="row">
            <span>Phạt</span>
            <b>{formatMoney(attendance?.penalty_amount || 0)}</b>
          </div>

          <div className="row">
            <span>Check out tối thiểu</span>
            <b>{formatTime(attendance?.min_checkout_at || null)}</b>
          </div>

          {isCheckedOut && (
            <div className="row">
              <span>Check out thực tế</span>
              <b>{formatTime(attendance?.check_out_at || null)}</b>
            </div>
          )}
        </div>
      )}

      {/* NÚT CHECK IN */}

      <button
        onClick={handleCheckIn}
        disabled={actionLoading || isCheckedIn || !schedule}
      >
        {actionLoading && !isCheckedIn
          ? "ĐANG XỬ LÝ..."
          : isCheckedIn
          ? "ĐÃ CHECK IN"
          : "CHECK IN"}
      </button>

      {/* NÚT CHECK OUT */}

      <div className="card">
        <button
          onClick={handleCheckOut}
          disabled={
            actionLoading ||
            !isCheckedIn ||
            isCheckedOut
          }
        >
          {actionLoading && isCheckedIn && !isCheckedOut
            ? "ĐANG XỬ LÝ..."
            : isCheckedOut
            ? "ĐÃ CHECK OUT"
            : "CHECK OUT"}
        </button>

        {message && (
          <p
            style={{
              marginTop: 16,
              fontWeight: 600,
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
