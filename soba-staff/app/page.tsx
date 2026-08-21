"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
};

type Attendance = {
  id: string;
  employee_id: string;
  schedule_id: string | null;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  late_minutes: number | null;
  makeup_minutes: number | null;
  penalty_amount: number | null;
  fine_amount?: number | null;
  status: string;
};

export default function Home() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Lấy user đang đăng nhập
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      // Lấy nhân viên theo auth_user_id
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("auth_user_id", user.id)
        .single();

      if (employeeError || !employeeData) {
        alert(
          "Không tìm thấy thông tin nhân viên: " +
            (employeeError?.message || "")
        );
        return;
      }

      setEmployee(employeeData);

      // Lấy bản ghi chấm công hôm nay
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeData.id)
        .eq("work_date", today)
        .maybeSingle();

      if (attendanceError) {
        console.error(attendanceError);
      }

      if (attendanceData) {
        setAttendance(attendanceData);
      } else {
        setAttendance(null);
      }
    } catch (error: any) {
      alert("Có lỗi xảy ra: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    if (!employee) {
      alert("Chưa tải được thông tin nhân viên");
      return;
    }

    if (attendance?.check_in) {
      alert("Bạn đã check-in hôm nay rồi");
      return;
    }

    try {
      setActionLoading(true);

      const now = new Date().toISOString();

      // Nếu đã có attendance hôm nay nhưng chưa check-in
      if (attendance) {
        const { data, error } = await supabase
          .from("attendance")
          .update({
            check_in: now,
            status: "checked_in",
          })
          .eq("id", attendance.id)
          .select()
          .single();

        if (error) throw error;

        setAttendance(data);
        alert("Check-in thành công!");
      } else {
        // Tạo bản ghi chấm công mới
        const { data, error } = await supabase
          .from("attendance")
          .insert({
            employee_id: employee.id,
            work_date: today,
            check_in: now,
            status: "checked_in",
            late_minutes: 0,
            makeup_minutes: 0,
            penalty_amount: 0,
            fine_amount: 0,
          })
          .select()
          .single();

        if (error) throw error;

        setAttendance(data);
        alert("Check-in thành công!");
      }
    } catch (error: any) {
      console.error(error);
      alert("Không thể check-in: " + error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!employee) {
      alert("Chưa tải được thông tin nhân viên");
      return;
    }

    if (!attendance || !attendance.check_in) {
      alert("Bạn chưa check-in");
      return;
    }

    if (attendance.check_out) {
      alert("Bạn đã check-out hôm nay rồi");
      return;
    }

    try {
      setActionLoading(true);

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out: now,
          status: "checked_out",
        })
        .eq("id", attendance.id)
        .select()
        .single();

      if (error) throw error;

      setAttendance(data);
      alert("Check-out thành công!");
    } catch (error: any) {
      console.error(error);
      alert("Không thể check-out: " + error.message);
    } finally {
      setActionLoading(false);
    }
  }

  function formatTime(value: string | null) {
    if (!value) return "--:--";

    return new Date(value).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusText() {
    if (attendance?.check_out) {
      return "Đã check-out";
    }

    if (attendance?.check_in) {
      return "Đã check-in";
    }

    return "Chưa check-in";
  }

  if (loading) {
    return (
      <main>
        <h1>SOBA STAFF</h1>
        <p>Đang tải...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>SOBA STAFF</h1>

      <div className="card">
        <h2>Xin chào, {employee?.full_name || "nhân viên"} 👋</h2>

        <div className="row">
          <span>Ca hôm nay</span>
          <b>00:00 - 23:59</b>
        </div>

        <div className="row">
          <span>Trạng thái</span>
          <b>{getStatusText()}</b>
        </div>

        {attendance?.check_in && (
          <div className="row">
            <span>Giờ check-in</span>
            <b>{formatTime(attendance.check_in)}</b>
          </div>
        )}

        {attendance?.check_out && (
          <div className="row">
            <span>Giờ check-out</span>
            <b>{formatTime(attendance.check_out)}</b>
          </div>
        )}
      </div>

      <button
        className="check-button"
        onClick={handleCheckIn}
        disabled={actionLoading || !!attendance?.check_in}
      >
        {actionLoading ? "ĐANG XỬ LÝ..." : "CHECK IN"}
      </button>

      <div className="card">
        <button
          className="check-button"
          onClick={handleCheckOut}
          disabled={
            actionLoading ||
            !attendance?.check_in ||
            !!attendance?.check_out
          }
        >
          {actionLoading ? "ĐANG XỬ LÝ..." : "CHECK OUT"}
        </button>

        <p>
          {!attendance?.check_in
            ? "Check-in để bắt đầu ghi nhận thời gian làm việc."
            : attendance?.check_out
            ? "Bạn đã hoàn thành check-out hôm nay."
            : "Bạn đang làm việc. Hãy check-out khi kết thúc."}
        </p>
      </div>
    </main>
  );
}
