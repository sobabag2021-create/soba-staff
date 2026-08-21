"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [fullName, setFullName] = useState("...");
  const [scheduleText, setScheduleText] = useState("Đang tải...");
  const [status, setStatus] = useState("Chưa check-in");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Lấy user đang đăng nhập
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Nếu chưa đăng nhập thì chuyển về trang login
      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Lấy thông tin nhân viên
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name, auth_user_id")
        .eq("auth_user_id", user.id)
        .single();

      if (employeeError || !employee) {
        console.error("Không tìm thấy nhân viên:", employeeError);
        setFullName("Nhân viên");
        setScheduleText("Chưa tìm thấy hồ sơ nhân viên");
        return;
      }

      // Hiển thị tên
      setFullName(employee.full_name || "Nhân viên");

      // Lấy ngày hôm nay theo giờ Việt Nam
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      console.log("Ngày hôm nay:", today);
      console.log("Employee ID:", employee.id);

      // Lấy lịch làm việc hôm nay
      const { data: schedule, error: scheduleError } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .maybeSingle();

      console.log("Lịch làm:", schedule);
      console.log("Lỗi lịch:", scheduleError);

      if (scheduleError) {
        setScheduleText("Không tải được lịch");
        return;
      }

      if (!schedule) {
        setScheduleText("Chưa có lịch hôm nay");
        return;
      }

      // Hiển thị giờ làm
      const startTime = schedule.start_time
        ? schedule.start_time.substring(0, 5)
        : "";

      const endTime = schedule.end_time
        ? schedule.end_time.substring(0, 5)
        : "";

      if (startTime && endTime) {
        setScheduleText(`${startTime} - ${endTime}`);
      } else {
        setScheduleText("Đã có lịch");
      }

      // Hiển thị trạng thái
      if (schedule.status === "working") {
        setStatus("Đang làm việc");
      } else if (schedule.status === "completed") {
        setStatus("Đã hoàn thành");
      } else {
        setStatus("Chưa check-in");
      }
    } catch (error) {
      console.error("Lỗi:", error);
      setScheduleText("Có lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    alert("Chức năng check-in sẽ kết nối API ở bước tiếp theo.");
  }

  async function handleCheckOut() {
    alert("Chức năng check-out sẽ kết nối API ở bước tiếp theo.");
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

      <button onClick={handleCheckIn}>
        CHECK IN
      </button>

      <div className="card">
        <button onClick={handleCheckOut}>
          CHECK OUT
        </button>

        <p>
          Bước tiếp theo: thêm kiểm tra WiFi/IP cửa hàng và ghi nhận check-in.
        </p>
      </div>
    </main>
  );
}
