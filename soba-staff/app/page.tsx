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
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  late_minutes: number | null;
  makeup_minutes: number | null;
  penalty_amount: number | null;
  status: string | null;
};

export default function Home() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);

  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Lấy ngày hiện tại theo giờ Việt Nam: YYYY-MM-DD
  const getVietnamDate = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    return `${year}-${month}-${day}`;
  };

  // Hiển thị giờ Việt Nam
  const formatTime = (time: string | null) => {
    if (!time) return "--:--";

    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(time));
  };

  // Tải dữ liệu
  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Lấy user đang đăng nhập
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      // 2. Tìm nhân viên có auth_user_id = user.id
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("auth_user_id", user.id)
        .single();

      if (employeeError || !employeeData) {
        alert(
          "Không tìm thấy thông tin nhân viên. Vui lòng kiểm tra bảng employees."
        );
        return;
      }

      setEmployee(employeeData);

      // 3. Lấy ngày hôm nay
      const today = getVietnamDate();

      // 4. Kiểm tra hôm nay đã có bản ghi chấm công chưa
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeData.id)
        .eq("work_date", today)
        .maybeSingle();

      if (attendanceError) {
        console.error(attendanceError);
      }

      setAttendance(attendanceData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // CHECK IN
  const handleCheckIn = async () => {
    if (!employee) {
      alert("Chưa tìm thấy thông tin nhân viên");
      return;
    }

    if (attendance?.check_in) {
      alert("Bạn đã check-in hôm nay rồi");
      return;
    }

    try {
      setCheckingIn(true);

      const now = new Date().toISOString();
      const today = getVietnamDate();

      // Nếu đã có bản ghi attendance nhưng chưa check-in
      if (attendance) {
        const { data, error } = await supabase
          .from("attendance")
          .update({
            check_in: now,
            status: "working",
          })
          .eq("id", attendance.id)
          .select()
          .single();

        if (error) {
          alert("Không thể check-in: " + error.message);
          return;
        }

        setAttendance(data);
        alert("Check-in thành công!");
        return;
      }

      // Nếu chưa có bản ghi hôm nay thì tạo mới
      const { data, error } = await supabase
        .from("attendance")
        .insert([
          {
            employee_id: employee.id,
            work_date: today,
            check_in: now,
            late_minutes: 0,
            makeup_minutes: 0,
            penalty_amount: 0,
            status: "working",
          },
        ])
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Không thể check-in: " + error.message);
        return;
      }

      setAttendance(data);

      alert("Check-in thành công!");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi check-in");
    } finally {
      setCheckingIn(false);
    }
  };

  // CHECK OUT
  const handleCheckOut = async () => {
    if (!attendance?.id) {
      alert("Bạn chưa check-in");
      return;
    }

    if (attendance.check_out) {
      alert("Bạn đã check-out rồi");
      return;
    }

    try {
      setCheckingOut(true);

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out: now,
          status: "completed",
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

      alert("Check-out thành công!");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi check-out");
    } finally {
      setCheckingOut(false);
    }
  };

  const checkedIn = !!attendance?.check_in;
  const checkedOut = !!attendance?.check_out;

  if (loading) {
    return (
      <main className="container">
        <h1>SOBA STAFF</h1>
        <p>Đang tải dữ liệu...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>SOBA STAFF</h1>

      <section className="card">
        <h2>
          Xin chào, {employee?.full_name || "Nhân viên"} 👋
        </h2>

        <div className="row">
          <span>Ca hôm nay</span>
          <strong>00:00 - 23:59</strong>
        </div>

        <div className="row">
          <span>Trạng thái</span>

          <strong>
            {!checkedIn && "Chưa check-in"}
            {checkedIn && !checkedOut && "Đang làm việc"}
            {checkedIn && checkedOut && "Đã hoàn thành"}
          </strong>
        </div>

        {checkedIn && (
          <div className="row">
            <span>Giờ check-in</span>
            <strong>{formatTime(attendance.check_in)}</strong>
          </div>
        )}

        {checkedOut && (
          <div className="row">
            <span>Giờ check-out</span>
            <strong>{formatTime(attendance.check_out)}</strong>
          </div>
        )}
      </section>

      <button
        className="check-button"
        onClick={handleCheckIn}
        disabled={checkingIn || checkedIn}
      >
        {checkingIn
          ? "ĐANG CHECK IN..."
          : checkedIn
          ? "ĐÃ CHECK IN"
          : "CHECK IN"}
      </button>

      <section className="card checkout-card">
        <button
          className="check-button"
          onClick={handleCheckOut}
          disabled={checkingOut || !checkedIn || checkedOut}
        >
          {checkingOut
            ? "ĐANG CHECK OUT..."
            : checkedOut
            ? "ĐÃ CHECK OUT"
            : "CHECK OUT"}
        </button>

        <p>
          {!checkedIn && "Check-in để bắt đầu ghi nhận thời gian làm việc."}
          {checkedIn &&
            !checkedOut &&
            "Bạn đang trong ca làm việc."}
          {checkedIn &&
            checkedOut &&
            "Bạn đã hoàn thành ca làm việc hôm nay."}
        </p>
      </section>
    </main>
  );
}
