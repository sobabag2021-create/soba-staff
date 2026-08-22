"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  employment_type: string;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  employees: {
    full_name: string;
    employment_type: string;
  } | null;
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [workDate, setWorkDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("17:00");

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const hash = window.location.hash;

      // Nếu đang mở từ link reset password
      if (
        hash.includes("access_token") ||
        hash.includes("type=recovery") ||
        hash.includes("type%3Drecovery")
      ) {
        setIsResetMode(true);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const { data: employee, error } = await supabase
        .from("employees")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .single();

      if (error || !employee) {
        alert("Không tìm thấy tài khoản nhân viên.");
        setLoading(false);
        return;
      }

      if (employee.role !== "admin") {
        alert("Tài khoản này không có quyền quản trị.");
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      await loadData();

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!newPassword || !confirmPassword) {
      alert("Vui lòng nhập đầy đủ mật khẩu.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        alert(error.message);
        setResetLoading(false);
        return;
      }

      alert("Đặt lại mật khẩu thành công!");

      await supabase.auth.signOut();

      window.history.replaceState(
        null,
        "",
        window.location.pathname
      );

      window.location.href = "/login";
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi đặt lại mật khẩu.");
    }

    setResetLoading(false);
  }

  async function loadData() {
    const { data: employeeData } = await supabase
      .from("employees")
      .select("*")
      .order("full_name");

    setEmployees(employeeData || []);

    const { data: scheduleData } = await supabase
      .from("work_schedules")
      .select(`
        *,
        employees (
          full_name,
          employment_type
        )
      `)
      .order("work_date", { ascending: false });

    setSchedules((scheduleData as Schedule[]) || []);
  }

  async function createSchedule() {
    if (!selectedEmployee) {
      alert("Vui lòng chọn nhân viên.");
      return;
    }

    if (!workDate || !startTime || !endTime) {
      alert("Vui lòng nhập đầy đủ thông tin ca làm.");
      return;
    }

    const { error } = await supabase
      .from("work_schedules")
      .insert({
        employee_id: selectedEmployee,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Đã thêm ca làm việc.");

    setSelectedEmployee("");
    await loadData();
  }

  async function deleteSchedule(id: string) {
    const confirmDelete = confirm("Bạn có chắc muốn xóa ca này?");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial",
        }}
      >
        Đang tải...
      </main>
    );
  }

  // =========================
  // TRANG RESET MẬT KHẨU
  // =========================
  if (isResetMode) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f5f5f5",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            background: "white",
            padding: 30,
            borderRadius: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <h1
            style={{
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Đặt lại mật khẩu
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#666",
              marginBottom: 25,
            }}
          >
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>

          <label>Mật khẩu mới</label>

          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới"
            style={{
              width: "100%",
              padding: 12,
              marginTop: 8,
              marginBottom: 20,
              boxSizing: "border-box",
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          />

          <label>Nhập lại mật khẩu</label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            style={{
              width: "100%",
              padding: 12,
              marginTop: 8,
              marginBottom: 25,
              boxSizing: "border-box",
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          />

          <button
            onClick={handleResetPassword}
            disabled={resetLoading}
            style={{
              width: "100%",
              padding: 14,
              background: "#1f6b45",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            {resetLoading
              ? "Đang cập nhật..."
              : "Đặt lại mật khẩu"}
          </button>
        </div>
      </main>
    );
  }

  // =========================
  // TRANG ADMIN
  // =========================
  return (
    <main
      style={{
        padding: 30,
        fontFamily: "Arial",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <h1>QUẢN LÝ CA LÀM VIỆC</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
          gap: 10,
          marginTop: 20,
          marginBottom: 30,
        }}
      >
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          style={{ padding: 10 }}
        >
          <option value="">Chọn nhân viên</option>

          {employees.map((employee) => (
            <option
              key={employee.id}
              value={employee.id}
            >
              {employee.full_name} ({employee.employment_type})
            </option>
          ))}
        </select>

        <input
          type="date"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          style={{ padding: 10 }}
        />

        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          style={{ padding: 10 }}
        />

        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          style={{ padding: 10 }}
        />

        <button
          onClick={createSchedule}
          style={{
            background: "#1f6b45",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Thêm ca
        </button>
      </div>

      <h2>Danh sách ca làm</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Nhân viên</th>
            <th style={thStyle}>Loại</th>
            <th style={thStyle}>Ngày</th>
            <th style={thStyle}>Bắt đầu</th>
            <th style={thStyle}>Kết thúc</th>
            <th style={thStyle}>Thao tác</th>
          </tr>
        </thead>

        <tbody>
          {schedules.map((schedule) => (
            <tr key={schedule.id}>
              <td style={tdStyle}>
                {schedule.employees?.full_name}
              </td>

              <td style={tdStyle}>
                {schedule.employees?.employment_type}
              </td>

              <td style={tdStyle}>
                {schedule.work_date}
              </td>

              <td style={tdStyle}>
                {schedule.start_time}
              </td>

              <td style={tdStyle}>
                {schedule.end_time}
              </td>

              <td style={tdStyle}>
                <button
                  onClick={() =>
                    deleteSchedule(schedule.id)
                  }
                  style={{
                    background: "#c0392b",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: 5,
                    cursor: "pointer",
                  }}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const thStyle = {
  border: "1px solid #ddd",
  padding: 12,
  textAlign: "left" as const,
  background: "#f3f3f3",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: 12,
};
