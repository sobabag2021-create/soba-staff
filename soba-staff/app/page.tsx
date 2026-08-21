"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Attendance = {
  id: string;
  user_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  fine_amount: number | null;
  late_minutes: number | null;
};

export default function Home() {
  const [userName, setUserName] = useState("Nhân viên");
  const [userId, setUserId] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<Attendance | null>(null);

  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Lấy thời gian hiện tại
  const getVietnamTime = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  };

  // Hiển thị giờ
  const formatTime = (time: string | null) => {
    if (!time) return "--:--";

    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(time));
  };

  // Lấy thông tin người dùng và trạng thái chấm công
  const loadData = async () => {
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

      setUserId(user.id);

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Nhân viên";

      setUserName(name);

      // Lấy đầu ngày theo giờ Việt Nam
      const now = new Date();

      const vietnamDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);

      const startOfDay = new Date(
        `${vietnamDate}T00:00:00+07:00`
      ).toISOString();

      const endOfDay = new Date(
        `${vietnamDate}T23:59:59+07:00`
      ).toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .gte("check_in_time", startOfDay)
        .lte("check_in_time", endOfDay)
        .order("check_in_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Lỗi tải dữ liệu:", error.message);
      }

      setAttendance(data);
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
    if (!userId) {
      alert("Không tìm thấy thông tin đăng nhập");
      return;
    }

    if (attendance?.check_in_time) {
      alert("Bạn đã check-in hôm nay rồi");
      return;
    }

    try {
      setCheckingIn(true);

      // QUAN TRỌNG:
      // Dùng ngày + giờ đầy đủ dạng ISO
      // Không dùng chỉ "21:22"
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .insert([
          {
            user_id: userId,
            check_in_time: now,
            fine_amount: 0,
            late_minutes: 0,
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

    if (attendance.check_out_time) {
      alert("Bạn đã check-out rồi");
      return;
    }

    try {
      setCheckingOut(true);

      // Dùng ngày + giờ đầy đủ
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out_time: now,
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

  const checkedIn = !!attendance?.check_in_time;
  const checkedOut = !!attendance?.check_out_time;

  if (loading) {
    return (
      <main className="container">
        <h1>SOBA STAFF</h1>
        <p>Đang tải...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>SOBA STAFF</h1>

      <section className="card">
        <h2>
          Xin chào, chị {userName} 👋
        </h2>

        <div className="row">
          <span>Ca hôm nay</span>
          <strong>00:00 - 23:59</strong>
        </div>

        <div className="row">
          <span>Trạng thái</span>

          <strong>
            {!checkedIn && "Chưa check-in"}

            {checkedIn && !checkedOut && "Đã check-in"}

            {checkedIn && checkedOut && "Đã hoàn thành"}
          </strong>
        </div>

        {checkedIn && (
          <div className="row">
            <span>Giờ check-in</span>
            <strong>
              {formatTime(attendance?.check_in_time || null)}
            </strong>
          </div>
        )}

        {checkedOut && (
          <div className="row">
            <span>Giờ check-out</span>
            <strong>
              {formatTime(attendance?.check_out_time || null)}
            </strong>
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
          {!checkedIn &&
            "Check-in để bắt đầu ghi nhận thời gian làm việc."}

          {checkedIn && !checkedOut &&
            "Bạn đang trong ca làm việc."}

          {checkedIn && checkedOut &&
            "Bạn đã hoàn thành ca làm việc hôm nay."}
        </p>
      </section>
    </main>
  );
}
