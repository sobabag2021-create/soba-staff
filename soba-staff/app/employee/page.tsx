"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
  employment_type?: string | null;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  note?: string | null;
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatTime(time: string | null) {
  if (!time) return "";
  return time.slice(0, 5);
}

function formatVietnameseDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export default function EmployeePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Bổ sung State quản lý trạng thái chấm công
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const monday = getMonday(new Date());
    return addDays(monday, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) =>
      addDays(weekStart, index)
    );
  }, [weekStart]);

  const weekEnd = useMemo(() => {
    return addDays(weekStart, 6);
  }, [weekStart]);

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data: employeeData, error: employeeError } =
          await supabase
            .from("employees")
            .select("*")
            .eq("auth_user_id", user.id)
            .single();

        if (employeeError || !employeeData) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (employeeData.active === false) {
          await supabase.auth.signOut();
          setErrorMessage("Tài khoản của bạn đã bị khóa.");
          setLoading(false);
          return;
        }

        if (employeeData.role === "admin") {
          router.replace("/admin");
          return;
        }

        setEmployee(employeeData);

        // Lấy thông tin chấm công ngày hôm nay từ bảng attendance
        const today = formatDate(new Date());
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employeeData.id)
          .eq("date", today)
          .single();

        if (attendanceData) {
          if (attendanceData.check_in) setCheckInTime(attendanceData.check_in);
          if (attendanceData.check_out) setCheckOutTime(attendanceData.check_out);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("Không thể tải thông tin tài khoản.");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  useEffect(() => {
    async function loadSchedules() {
      if (!employee) return;

      try {
        const startDate = formatDate(weekStart);
        const endDate = formatDate(weekEnd);

        const { data, error } = await supabase
          .from("schedules")
          .select("*")
          .eq("employee_id", employee.id)
          .gte("work_date", startDate)
          .lte("work_date", endDate)
          .order("work_date", { ascending: true })
          .order("start_time", { ascending: true });

        if (error) {
          console.error("Lỗi tải lịch:", error);
          return;
        }

        setSchedules(data || []);
      } catch (error) {
        console.error(error);
      }
    }

    loadSchedules();
  }, [employee, weekStart, weekEnd]);

  // Hàm xử lý Check-in
  async function handleCheckIn() {
    if (!employee || checkInTime || isSubmitting) return;

    setIsSubmitting(true);
    const now = new Date();
    const today = formatDate(now);
    const currentTime = now.toTimeString().split(" ")[0]; // "HH:MM:SS"

    try {
      const { error } = await supabase.from("attendance").upsert({
        employee_id: employee.id,
        date: today,
        check_in: currentTime,
      });

      if (error) throw error;
      setCheckInTime(currentTime);
      alert("Check-in thành công!");
    } catch (error) {
      console.error(error);
      alert("Check-in thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Hàm xử lý Check-out
  async function handleCheckOut() {
    if (!employee || !checkInTime || checkOutTime || isSubmitting) return;

    setIsSubmitting(true);
    const now = new Date();
    const today = formatDate(now);
    const currentTime = now.toTimeString().split(" ")[0];

    try {
      const { error } = await supabase
        .from("attendance")
        .update({ check_out: currentTime })
        .eq("employee_id", employee.id)
        .eq("date", today);

      if (error) throw error;
      setCheckOutTime(currentTime);
      alert("Check-out thành công!");
    } catch (error) {
      console.error(error);
      alert("Check-out thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function getSchedulesForDate(date: Date) {
    const dateString = formatDate(date);
    return schedules.filter(
      (schedule) => schedule.work_date === dateString
    );
  }

  function getWeekTitle() {
    const start = formatVietnameseDate(weekStart);
    const end = formatVietnameseDate(weekEnd);

    return `${start} - ${end}`;
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f3ef",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "30px 40px",
            borderRadius: "18px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          Đang tải...
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f3ef",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "30px",
            borderRadius: "18px",
            textAlign: "center",
          }}
        >
          <h2>{errorMessage}</h2>

          <button
            onClick={() => router.replace("/login")}
            style={{
              border: "none",
              background: "#365d4b",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            Về trang đăng nhập
          </button>
        </div>
      </main>
    );
  }

  const todayString = formatDate(new Date());

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f3ef",
        fontFamily: "Arial, sans-serif",
        color: "#263238",
        paddingBottom: "40px",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: "#ffffff",
          maxWidth: "900px",
          margin: "0 auto",
          padding: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              color: "#365d4b",
              letterSpacing: "1px",
            }}
          >
            SOBA STAFF
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#666",
            }}
          >
            Giao diện nhân viên
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            border: "none",
            background: "#365d4b",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Đăng xuất
        </button>
      </header>

      <section
        style={{
          maxWidth: "900px",
          margin: "24px auto",
          padding: "0 20px",
          boxSizing: "border-box",
        }}
      >
        {/* THÔNG TIN NHÂN VIÊN */}
        <div
          style={{
            background: "#365d4b",
            color: "#ffffff",
            padding: "30px",
            borderRadius: "24px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              margin: 0,
              opacity: 0.8,
            }}
          >
            Xin chào
          </p>

          <h2
            style={{
              margin: "14px 0 8px",
              fontSize: "28px",
            }}
          >
            {employee?.full_name}
          </h2>

          <p
            style={{
              margin: 0,
              opacity: 0.9,
            }}
          >
            Nhân viên{" "}
            {employee?.employment_type === "part-time"
              ? "Part-time"
              : "Full-time"}
          </p>
        </div>

        {/* CHẤM CÔNG */}
        <div
          style={{
            background: "#ffffff",
            padding: "26px",
            borderRadius: "24px",
            marginBottom: "24px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.04)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Chấm công hôm nay
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                background: "#f5f5f5",
                padding: "20px",
                borderRadius: "16px",
              }}
            >
              <p style={{ margin: 0, color: "#666" }}>
                Check-in
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "14px",
                  fontSize: "20px",
                }}
              >
                {checkInTime ? formatTime(checkInTime) : "--:--"}
              </strong>
            </div>

            <div
              style={{
                background: "#f5f5f5",
                padding: "20px",
                borderRadius: "16px",
              }}
            >
              <p style={{ margin: 0, color: "#666" }}>
                Check-out
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "14px",
                  fontSize: "20px",
                }}
              >
                {checkOutTime ? formatTime(checkOutTime) : "--:--"}
              </strong>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
            }}
          >
            <button
              onClick={handleCheckIn}
              disabled={!!checkInTime || isSubmitting}
              style={{
                border: "none",
                background: checkInTime ? "#ccc" : "#365d4b",
                color: "#ffffff",
                padding: "15px",
                borderRadius: "10px",
                fontWeight: 600,
                cursor: checkInTime ? "not-allowed" : "pointer",
              }}
            >
              CHECK-IN
            </button>

            <button
              onClick={handleCheckOut}
              disabled={!checkInTime || !!checkOutTime || isSubmitting}
              style={{
                border: "none",
                background: !checkInTime || checkOutTime ? "#ccc" : "#365d4b",
                color: "#ffffff",
                padding: "15px",
                borderRadius: "10px",
                fontWeight: 600,
                cursor: !checkInTime || checkOutTime ? "not-allowed" : "pointer",
              }}
            >
              CHECK-OUT
            </button>
          </div>
        </div>

        {/* LỊCH LÀM THEO TUẦN */}
        <div
          style={{
            background: "#ffffff",
            padding: "26px",
            borderRadius: "24px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "20px",
            }}
          >
            Lịch làm việc
          </h2>

          {/* ĐIỀU HƯỚNG TUẦN */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() =>
                setWeekOffset((current) => current - 1)
              }
              style={{
                border: "none",
                background: "#edf1ee",
                color: "#365d4b",
                padding: "12px 16px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ← Tuần trước
            </button>

            <div
              style={{
                textAlign: "center",
              }}
            >
              <strong>{getWeekTitle()}</strong>

              {weekOffset === 0 && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#365d4b",
                    marginTop: "4px",
                  }}
                >
                  Tuần này
                </div>
              )}
            </div>

            <button
              onClick={() =>
                setWeekOffset((current) => current + 1)
              }
              style={{
                border: "none",
                background: "#edf1ee",
                color: "#365d4b",
                padding: "12px 16px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Tuần sau →
            </button>
          </div>

          {/* NÚT VỀ TUẦN NÀY */}
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{
                display: "block",
                margin: "0 auto 20px",
                border: "none",
                background: "#365d4b",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              Về tuần này
            </button>
          )}

          {/* 7 NGÀY TRONG TUẦN */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            {weekDays.map((day, index) => {
              const dateString = formatDate(day);
              const daySchedules =
                getSchedulesForDate(day);

              const dayNames = [
                "Thứ 2",
                "Thứ 3",
                "Thứ 4",
                "Thứ 5",
                "Thứ 6",
                "Thứ 7",
                "Chủ nhật",
              ];

              const isToday =
                dateString === todayString;

              return (
                <div
                  key={dateString}
                  style={{
                    border: isToday
                      ? "2px solid #365d4b"
                      : "1px solid #e5e5e5",
                    borderRadius: "16px",
                    padding: "16px",
                    minHeight: "135px",
                    background: isToday
                      ? "#f3f7f4"
                      : "#ffffff",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "12px",
                    }}
                  >
                    <strong
                      style={{
                        color: isToday
                          ? "#365d4b"
                          : "#263238",
                      }}
                    >
                      {dayNames[index]}
                    </strong>

                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "14px",
                        color: "#777",
                      }}
                    >
                      {formatVietnameseDate(day)}
                    </div>
                  </div>

                  {daySchedules.length === 0 ? (
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#999",
                        paddingTop: "10px",
                      }}
                    >
                      Nghỉ
                    </div>
                  ) : (
                    daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        style={{
                          background: "#edf1ee",
                          color: "#365d4b",
                          padding: "10px",
                          borderRadius: "10px",
                          marginBottom: "8px",
                          fontWeight: 600,
                          fontSize: "14px",
                        }}
                      >
                        {formatTime(schedule.start_time)} -{" "}
                        {formatTime(schedule.end_time)}

                        {schedule.note && (
                          <div
                            style={{
                              marginTop: "5px",
                              fontSize: "12px",
                              fontWeight: 400,
                              color: "#666",
                            }}
                          >
                            {schedule.note}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
