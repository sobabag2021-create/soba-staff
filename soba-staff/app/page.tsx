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

// Lấy ngày hiện tại theo giờ Việt Nam: YYYY-MM-DD
function getVietnamDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((item) => item.type === "year")?.value;
  const month = parts.find((item) => item.type === "month")?.value;
  const day = parts.find((item) => item.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

// Lấy giờ hiện tại theo giờ Việt Nam: HH:MM
function getVietnamTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

// Cộng số phút vào thời gian
function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);

  const totalMinutes = hour * 60 + minute + minutes;

  const newHour = Math.floor(totalMinutes / 60) % 24;
  const newMinute = totalMinutes % 60;

  return `${String(newHour).padStart(2, "0")}:${String(
    newMinute
  ).padStart(2, "0")}`;
}

export default function Home() {
  const [fullName, setFullName] = useState("Nhân viên");
  const [scheduleText, setScheduleText] = useState("Đang tải...");
  const [statusText, setStatusText] = useState("Chưa check-in");

  const [schedule, setSchedule] = useState<Schedule | null>(null);

  const [checkInTime, setCheckInTime] = useState("");
  const [lateMinutes, setLateMinutes] = useState(0);
  const [fineAmount, setFineAmount] = useState(0);
  const [minimumCheckOut, setMinimumCheckOut] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      // Lấy user đang đăng nhập
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log("USER:", user);
      console.log("USER ERROR:", userError);

      if (!user) {
        setMessage("Bạn chưa đăng nhập");
        setScheduleText("Chưa đăng nhập");
        return;
      }

      // Tìm nhân viên tương ứng với tài khoản đăng nhập
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id, full_name, auth_user_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      console.log("EMPLOYEE:", employee);
      console.log("EMPLOYEE ERROR:", employeeError);

      if (employeeError) {
        setMessage("Lỗi tải thông tin nhân viên");
        setScheduleText("Lỗi");
        return;
      }

      if (!employee) {
        setMessage("Không tìm thấy nhân viên");
        setScheduleText("Không tìm thấy nhân viên");
        return;
      }

      setFullName(employee.full_name || "Nhân viên");

      // Lấy ngày hôm nay theo giờ Việt Nam
      const today = getVietnamDate();

      console.log("NGÀY ĐANG TÌM:", today);
      console.log("EMPLOYEE ID:", employee.id);

      // Lấy lịch làm việc hôm nay
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
        setMessage(`Lỗi tải lịch: ${scheduleError.message}`);
        setScheduleText("Lỗi tải lịch");
        return;
      }

      if (!scheduleData) {
        setScheduleText("Chưa có lịch");
        setMessage(`Không tìm thấy lịch ngày ${today}`);
        return;
      }

      setSchedule(scheduleData);

      const start = String(scheduleData.start_time).slice(0, 5);
      const end = String(scheduleData.end_time).slice(0, 5);

      setScheduleText(`${start} - ${end}`);
      setMessage("");
    } catch (error) {
      console.error("LOAD ERROR:", error);

      setScheduleText("Lỗi tải lịch");
      setMessage("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    try {
      setCheckingIn(true);
      setMessage("");

      // Chưa có lịch thì không check-in
      if (!schedule) {
        setMessage("Hôm nay bạn chưa có lịch làm việc");
        return;
      }

      // Nếu đã check-in rồi
      if (checkInTime) {
        setMessage("Bạn đã check-in rồi");
        return;
      }

      const nowTime = getVietnamTime();

      const currentTime = nowTime
        .split(":")
        .map(Number);

      const startTime = String(schedule.start_time)
        .slice(0, 5)
        .split(":")
        .map(Number);

      const currentTotal =
        currentTime[0] * 60 + currentTime[1];

      const startTotal =
        startTime[0] * 60 + startTime[1];

      // Tính số phút đi muộn
      const late =
        currentTotal > startTotal
          ? currentTotal - startTotal
          : 0;

      // Quy định phạt:
      // Muộn từ 10 phút trở lên: phạt 50.000đ
      const fine =
        late >= 10
          ? 50000
          : 0;

      // Check out tối thiểu =
      // Giờ kết thúc ca + số phút đi muộn
      const minimumCheckOutTime = addMinutes(
        String(schedule.end_time),
        late
      );

      // Cập nhật giao diện
      setCheckInTime(nowTime);
      setLateMinutes(late);
      setFineAmount(fine);
      setMinimumCheckOut(minimumCheckOutTime);

      setStatusText("Đã check-in");

      setMessage("Check-in thành công");
    } catch (error) {
      console.error("CHECK IN ERROR:", error);

      setMessage("Check-in thất bại");
    } finally {
      setCheckingIn(false);
    }
  }

  function handleCheckOut() {
    if (!schedule) {
      setMessage("Hôm nay bạn chưa có lịch làm việc");
      return;
    }

    if (!checkInTime) {
      setMessage("Bạn cần check-in trước");
      return;
    }

    const nowTime = getVietnamTime();

    setStatusText(`Đã check-out lúc ${nowTime}`);
    setMessage("Check-out thành công");
  }

  return (
    <main>
      <h1>SOBA STAFF</h1>

      <div className="card">
        <h2>Xin chào, {fullName} 👋</h2>

        <div className="row">
          <span>Ca hôm nay</span>

          <b>
            {loading
              ? "Đang tải..."
              : scheduleText}
          </b>
        </div>

        <div className="row">
          <span>Trạng thái</span>

          <b>{statusText}</b>
        </div>
      </div>

      <button
        onClick={handleCheckIn}
        disabled={checkingIn}
      >
        {checkingIn
          ? "ĐANG CHECK-IN..."
          : "CHECK IN"}
      </button>

      {checkInTime && (
        <div className="card">
          <h2>Thông tin check-in</h2>

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

            <b>
              {fineAmount.toLocaleString("vi-VN")}đ
            </b>
          </div>

          <div className="row">
            <span>Check out tối thiểu</span>
            <b>{minimumCheckOut}</b>
          </div>
        </div>
      )}

      <div className="card">
        <button onClick={handleCheckOut}>
          CHECK OUT
        </button>

        {message && (
          <p>{message}</p>
        )}
      </div>
    </main>
  );
}
