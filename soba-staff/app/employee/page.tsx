"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  employment_type: string;
  salary: number;
};

export default function EmployeePage() {
  const router = useRouter();

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [todaySchedule, setTodaySchedule] =
    useState<any[]>([]);

  const [attendance, setAttendance] =
    useState<any>(null);

  const [notifications, setNotifications] =
    useState<any[]>([]);

  const [reports, setReports] =
    useState<any[]>([]);

  const [leaveReason, setLeaveReason] =
    useState("");

  const [leaveStart, setLeaveStart] =
    useState("");

  const [leaveEnd, setLeaveEnd] =
    useState("");

  const [reportContent, setReportContent] =
    useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: employeeData } =
      await supabase
        .from("employees")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!employeeData) {
      alert("Không tìm thấy thông tin nhân viên.");
      await supabase.auth.signOut();
      router.push("/login");
      return;
    }

    if (employeeData.role === "admin") {
      router.push("/admin");
      return;
    }

    setEmployee(employeeData);

    const today = new Date()
      .toISOString()
      .split("T")[0];

    const { data: scheduleData } =
      await supabase
        .from("schedules")
        .select("*")
        .eq("employee_id", user.id)
        .eq("work_date", today);

    setTodaySchedule(scheduleData || []);

    const { data: attendanceData } =
      await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user.id)
        .eq("work_date", today)
        .maybeSingle();

    setAttendance(attendanceData);

    const { data: notificationData } =
      await supabase
        .from("notifications")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(5);

    setNotifications(notificationData || []);

    const { data: reportData } =
      await supabase
        .from("task_reports")
        .select("*")
        .eq("employee_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(5);

    setReports(reportData || []);
  }

  async function checkIn() {
    if (!employee) return;

    const today = new Date()
      .toISOString()
      .split("T")[0];

    if (attendance?.check_in) {
      alert("Bạn đã check-in hôm nay.");
      return;
    }

    const { data, error } =
      await supabase
        .from("attendance")
        .insert({
          employee_id: employee.id,
          work_date: today,
          check_in: new Date().toISOString(),
          status: "working",
        })
        .select()
        .single();

    if (error) {
      alert(error.message);
      return;
    }

    setAttendance(data);

    alert("Check-in thành công.");
  }

  async function checkOut() {
    if (!employee) return;

    if (!attendance?.id) {
      alert("Bạn chưa check-in.");
      return;
    }

    const { data, error } =
      await supabase
        .from("attendance")
        .update({
          check_out: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", attendance.id)
        .select()
        .single();

    if (error) {
      alert(error.message);
      return;
    }

    setAttendance(data);

    alert("Check-out thành công.");
  }

  async function submitLeave() {
    if (!employee) return;

    if (!leaveStart || !leaveEnd || !leaveReason) {
      alert("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    const { error } =
      await supabase
        .from("leave_requests")
        .insert({
          employee_id: employee.id,
          request_type: "leave",
          start_date: leaveStart,
          end_date: leaveEnd,
          reason: leaveReason,
          status: "pending",
        });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Đã gửi đơn.");

    setLeaveReason("");
    setLeaveStart("");
    setLeaveEnd("");
  }

  async function submitReport() {
    if (!employee) return;

    if (!reportContent) {
      alert("Vui lòng nhập nội dung báo cáo.");
      return;
    }

    const { error } =
      await supabase
        .from("task_reports")
        .insert({
          employee_id: employee.id,
          content: reportContent,
        });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Đã gửi báo cáo.");

    setReportContent("");

    loadData();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!employee) {
    return (
      <div className="loading">
        Đang tải...
      </div>
    );
  }

  return (
    <main className="employee-page">

      <header className="topbar">

        <div>
          <h1>SOBA STAFF</h1>

          <p>Giao diện nhân viên</p>
        </div>

        <button onClick={logout}>
          Đăng xuất
        </button>

      </header>

      <section className="hero">

        <p>Xin chào</p>

        <h2>{employee.full_name}</h2>

        <span>
          Nhân viên{" "}
          {employee.employment_type === "full_time"
            ? "Full-time"
            : "Part-time"}
        </span>

      </section>

      <section className="card">

        <h2>Chấm công hôm nay</h2>

        <div className="attendance-grid">

          <div>
            <p>Check-in</p>

            <strong>
              {attendance?.check_in
                ? new Date(
                    attendance.check_in
                  ).toLocaleTimeString("vi-VN")
                : "--:--"}
            </strong>
          </div>

          <div>
            <p>Check-out</p>

            <strong>
              {attendance?.check_out
                ? new Date(
                    attendance.check_out
                  ).toLocaleTimeString("vi-VN")
                : "--:--"}
            </strong>
          </div>

        </div>

        <div className="button-grid">

          <button onClick={checkIn}>
            CHECK-IN
          </button>

          <button onClick={checkOut}>
            CHECK-OUT
          </button>

        </div>

      </section>

      <section className="card">

        <h2>Lịch làm hôm nay</h2>

        {todaySchedule.length === 0 ? (
          <p>Hôm nay chưa có lịch làm.</p>
        ) : (
          todaySchedule.map((schedule) => (
            <div
              className="schedule-item"
              key={schedule.id}
            >
              <strong>
                {schedule.start_time} -{" "}
                {schedule.end_time}
              </strong>

              <p>{schedule.note}</p>
            </div>
          ))
        )}

      </section>

      <section className="card">

        <h2>Gửi đơn xin nghỉ</h2>

        <input
          type="date"
          value={leaveStart}
          onChange={(e) =>
            setLeaveStart(e.target.value)
          }
        />

        <input
          type="date"
          value={leaveEnd}
          onChange={(e) =>
            setLeaveEnd(e.target.value)
          }
        />

        <textarea
          placeholder="Lý do xin nghỉ"
          value={leaveReason}
          onChange={(e) =>
            setLeaveReason(e.target.value)
          }
        />

        <button onClick={submitLeave}>
          Gửi đơn
        </button>

      </section>

      <section className="card">

        <h2>Báo cáo công việc</h2>

        <textarea
          placeholder="Hôm nay bạn đã làm những công việc gì?"
          value={reportContent}
          onChange={(e) =>
            setReportContent(e.target.value)
          }
        />

        <button onClick={submitReport}>
          Gửi báo cáo
        </button>

      </section>

      <section className="card">

        <h2>Thông báo</h2>

        {notifications.map((item) => (
          <div
            className="notification-item"
            key={item.id}
          >
            <strong>{item.title}</strong>

            <p>{item.content}</p>
          </div>
        ))}

      </section>

      <section className="card">

        <h2>Thông tin lương</h2>

        <p>
          Lương cơ bản:{" "}
          <strong>
            {Number(
              employee.salary || 0
            ).toLocaleString("vi-VN")}{" "}
            VNĐ
          </strong>
        </p>

      </section>

    </main>
  );
}
