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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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

      console.log("USER ID:", user.id);

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("auth_user_id", user.id)
        .single();

      console.log("EMPLOYEE:", employee);
      console.log("EMPLOYEE ERROR:", employeeError);

      if (employeeError || !employee) {
        setScheduleText("Không tìm thấy nhân viên");
        return;
      }

      setFullName(employee.full_name || "Nhân viên");

      // Lấy ngày hiện tại theo múi giờ Việt Nam
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date());

      console.log("TODAY:", today);
      console.log("EMPLOYEE ID:", employee.id);

      const { data: scheduleData, error: scheduleError } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("SCHEDULE:", scheduleData);
      console.log("SCHEDULE ERROR:", scheduleError);

      if (scheduleError) {
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
    } catch (error) {
      console.error(error);
      setScheduleText("Lỗi tải lịch");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    if (!schedule) {
      alert("Hôm nay bạn chưa có lịch làm việc");
      return;
    }

    alert("Check-in thành công");
    setStatus("Đã check-in");
  }

  async function handleCheckOut() {
    if (!schedule) {
      alert("Hôm nay bạn chưa có lịch làm việc");
      return;
    }

    alert("Check-out thành công");
    setStatus("Đã check-out");
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
