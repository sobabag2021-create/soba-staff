"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  full_name: string;
  type: string;
};

type Schedule = {
  work_date: string;
  start_time: string;
  end_time: string;
};

const getLocalISOString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${date}`;
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [schedules, setSchedules] = useState<{ [key: string]: string }>({});
  
  // Trạng thái ngày check-in/out hôm nay
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);

  // Quản lý tuần
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, [currentWeekStart]);

  async function checkUserAndFetchData() {
    setLoading(true);
    // 1. Kiểm tra session đăng nhập
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const userId = session.user.id;

    // 2. Lấy thông tin nhân viên
    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (emp) {
      setUser(emp);
    } else {
      setUser({ id: userId, full_name: session.user.email || "Nhân viên", type: "part_time" });
    }

    // 3. Lấy lịch làm việc trong tuần
    const startDateStr = getLocalISOString(weekDays[0]);
    const endDateStr = getLocalISOString(weekDays[6]);

    const { data: schedData } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", userId)
      .gte("work_date", startDateStr)
      .lte("work_date", endDateStr);

    const schedMap: { [key: string]: string } = {};
    schedData?.forEach((item: Schedule) => {
      if (item.start_time === "Nghỉ" || item.start_time === "OFF") {
        schedMap[item.work_date] = "Nghỉ";
      } else if (item.start_time && item.end_time) {
        schedMap[item.work_date] = `${item.start_time} - ${item.end_time}`;
      } else {
        schedMap[item.work_date] = "Nghỉ";
      }
    });

    setSchedules(schedMap);
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const changeWeek = (days: number) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + days);
    setCurrentWeekStart(newStart);
  };

  const handleCheckIn = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    setCheckInTime(timeStr);
  };

  const handleCheckOut = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    setCheckOutTime(timeStr);
  };

  const todayStr = getLocalISOString(new Date());

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>Đang tải...</div>;
  }

  return (
    <div style={containerStyle}>
      {/* Top Bar */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#1e293b" }}>SOBA STAFF</h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Giao diện nhân viên</p>
        </div>
        <button onClick={handleLogout} style={btnLogoutStyle}>
          Đăng xuất
        </button>
      </div>

      {/* User Info Banner */}
      <div style={userCardStyle}>
        <div style={{ fontSize: "13px", opacity: 0.8 }}>Xin chào</div>
        <div style={{ fontSize: "26px", fontWeight: "bold", margin: "2px 0" }}>{user?.full_name || "test"}</div>
        <div style={{ fontSize: "12px", opacity: 0.8 }}>{user?.type || "full_time"}</div>
      </div>

      {/* Section Chấm công */}
      <div style={cardSectionStyle}>
        <h3 style={sectionTitleStyle}>Chấm công hôm nay</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={timeDisplayBoxStyle}>
            <span style={timeLabelStyle}>Check-in</span>
            <span style={timeValueStyle}>{checkInTime || "--:--"}</span>
          </div>
          <div style={timeDisplayBoxStyle}>
            <span style={timeLabelStyle}>Check-out</span>
            <span style={timeValueStyle}>{checkOutTime || "--:--"}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <button onClick={handleCheckIn} style={btnCheckInStyle}>
            CHECK-IN
          </button>
          <button onClick={handleCheckOut} disabled={!checkInTime} style={checkInTime ? btnCheckInStyle : btnDisabledStyle}>
            CHECK-OUT
          </button>
        </div>
      </div>

      {/* Section Lịch làm việc */}
      <div style={cardSectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={sectionTitleStyle}>Lịch làm việc</h3>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => changeWeek(-7)} style={btnWeekNavStyle}>
              ← Tuần trước
            </button>
            <span style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>
              {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1}/{weekDays[0].getFullYear()} -{" "}
              {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1}/{weekDays[6].getFullYear()}
            </span>
            <button onClick={() => changeWeek(7)} style={btnWeekNavStyle}>
              Tuần sau →
            </button>
          </div>
        </div>

        {/* Danh sách các ngày dạng Card Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
          {weekDays.map((d, index) => {
            const dateISO = getLocalISOString(d);
            const isToday = dateISO === todayStr;
            const dayNames = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
            const dayText = dayNames[d.getDay()];
            const shiftText = schedules[dateISO] || "Nghỉ";

            return (
              <div
                key={dateISO}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: isToday ? "2px solid #2d5240" : "1px solid #e2e8f0",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  justify: "space-between",
                  minHeight: "80px",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "14px", color: "#1e293b" }}>{dayText}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {d.getDate()}/{d.getMonth() + 1}/{d.getFullYear()}
                  </div>
                </div>
                <div style={{ textAlign: "center", fontWeight: "500", fontSize: "13px", color: "#475569", marginTop: "16px" }}>
                  {shiftText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Inline Styles chuẩn UI Soba Staff
const containerStyle = {
  padding: "24px",
  maxWidth: "900px",
  margin: "0 auto",
  fontFamily: "system-ui, -apple-system, sans-serif",
  background: "#f4f4f0",
  minHeight: "100vh",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const btnLogoutStyle = {
  background: "#2d5240",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold" as const,
  fontSize: "13px",
};

const userCardStyle = {
  background: "#2d5240",
  color: "#fff",
  borderRadius: "16px",
  padding: "20px 24px",
  marginBottom: "20px",
};

const cardSectionStyle = {
  background: "#fff",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const sectionTitleStyle = {
  margin: "0 0 16px 0",
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#1e293b",
};

const timeDisplayBoxStyle = {
  background: "#f1f5f9",
  borderRadius: "10px",
  padding: "12px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "4px",
};

const timeLabelStyle = {
  fontSize: "12px",
  color: "#64748b",
};

const timeValueStyle = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  color: "#0f172a",
};

const btnCheckInStyle = {
  background: "#2d5240",
  color: "#fff",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  fontWeight: "bold" as const,
  cursor: "pointer",
  fontSize: "14px",
  width: "100%",
};

const btnDisabledStyle = {
  background: "#e2e8f0",
  color: "#94a3b8",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  fontWeight: "bold" as const,
  cursor: "not-allowed",
  fontSize: "14px",
  width: "100%",
};

const btnWeekNavStyle = {
  background: "#e2e8f0",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "bold" as const,
  cursor: "pointer",
  color: "#334155",
};
