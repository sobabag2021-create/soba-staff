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

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

type RequestItem = {
  id: string;
  employee_id: string;
  request_type: string;
  request_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type RequestType =
  | "late"
  | "early_leave"
  | "overtime"
  | "leave";

function getVietnamDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function getVietnamDate(date = new Date()) {
  const vietnamString = date.toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return new Date(vietnamString);
}

function formatTime(value: string | null) {
  if (!value) return "--:--";

  if (/^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDate(value: string) {
  if (!value) return "";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function getMonday(date = new Date()) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  const day = result.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);

  return result;
}

function getWeekDates(monday: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);

    date.setDate(monday.getDate() + index);

    return date;
  });
}

function getRequestTypeLabel(type: string) {
  switch (type) {
    case "late":
      return "Xin đi muộn";

    case "early_leave":
      return "Xin về sớm";

    case "overtime":
      return "Xin tăng ca";

    case "leave":
      return "Xin nghỉ";

    default:
      return type;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Chờ duyệt";

    case "approved":
      return "Đã duyệt";

    case "rejected":
      return "Từ chối";

    default:
      return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "approved":
      return "#1f7a45";

    case "rejected":
      return "#b42318";

    default:
      return "#9a6700";
  }
}

export default function EmployeePage() {
  const router = useRouter();

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [attendance, setAttendance] =
    useState<Attendance | null>(null);

  const [todaySchedule, setTodaySchedule] =
    useState<Schedule[]>([]);

  const [weekSchedules, setWeekSchedules] =
    useState<Schedule[]>([]);

  const [requests, setRequests] =
    useState<RequestItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [checkingIn, setCheckingIn] =
    useState(false);

  const [checkingOut, setCheckingOut] =
    useState(false);

  const [sendingRequest, setSendingRequest] =
    useState(false);

  const [weekStart, setWeekStart] =
    useState<Date>(() => getMonday());

  const [requestType, setRequestType] =
    useState<RequestType>("late");

  const [requestDate, setRequestDate] =
    useState(getVietnamDateString());

  const [requestStartTime, setRequestStartTime] =
    useState("");

  const [requestEndTime, setRequestEndTime] =
    useState("");

  const [requestReason, setRequestReason] =
    useState("");

  const weekDates = useMemo(() => {
    return getWeekDates(weekStart);
  }, [weekStart]);

  const today = getVietnamDateString();

  async function loadEmployeeData() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: employeeData,
        error: employeeError,
      } = await supabase
        .from("employees")
        .select(`
          id,
          full_name,
          role,
          active,
          employment_type
        `)
        .eq("auth_user_id", user.id)
        .single();

      if (employeeError || !employeeData) {
        console.error(employeeError);

        alert(
          "Không tìm thấy thông tin nhân viên."
        );

        await supabase.auth.signOut();

        router.replace("/login");

        return;
      }

      if (employeeData.active === false) {
        alert("Tài khoản của bạn đã bị khóa.");

        await supabase.auth.signOut();

        router.replace("/login");

        return;
      }

      if (employeeData.role === "admin") {
        router.replace("/admin");
        return;
      }

      setEmployee(employeeData);

      await Promise.all([
        loadTodayAttendance(employeeData.id),
        loadTodaySchedule(employeeData.id),
        loadWeekSchedules(employeeData.id),
        loadRequests(employeeData.id),
      ]);
    } catch (error) {
      console.error(error);

      alert("Có lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTodayAttendance(employeeId: string) {
    const {
      data,
      error,
    } = await supabase
      .from("attendance")
      .select(`
        id,
        employee_id,
        work_date,
        check_in,
        check_out,
        late_minutes,
        makeup_minutes,
        penalty_amount,
        status
      `)
      .eq("employee_id", employeeId)
      .eq("work_date", today)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    setAttendance(data || null);
  }

  async function loadTodaySchedule(employeeId: string) {
    const {
      data,
      error,
    } = await supabase
      .from("schedules")
      .select(`
        id,
        employee_id,
        work_date,
        start_time,
        end_time,
        note
      `)
      .eq("employee_id", employeeId)
      .eq("work_date", today)
      .order("start_time", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      return;
    }

    setTodaySchedule(data || []);
  }

  async function loadWeekSchedules(employeeId: string) {
    const startDate = getVietnamDateString(
      weekDates[0]
    );

    const endDate = getVietnamDateString(
      weekDates[6]
    );

    const {
      data,
      error,
    } = await supabase
      .from("schedules")
      .select(`
        id,
        employee_id,
        work_date,
        start_time,
        end_time,
        note
      `)
      .eq("employee_id", employeeId)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      return;
    }

    setWeekSchedules(data || []);
  }

  async function loadRequests(employeeId: string) {
    const {
      data,
      error,
    } = await supabase
      .from("requests")
      .select(`
        id,
        employee_id,
        request_type,
        request_date,
        start_time,
        end_time,
        reason,
        status,
        admin_note,
        created_at
      `)
      .eq("employee_id", employeeId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      alert(
        "Không thể tải yêu cầu. Kiểm tra bảng requests và RLS policy."
      );

      return;
    }

    setRequests(data || []);
  }

  useEffect(() => {
    loadEmployeeData();
  }, []);

  useEffect(() => {
    if (!employee) return;

    loadWeekSchedules(employee.id);
  }, [weekStart]);

  async function handleCheckIn() {
    if (!employee) return;

    if (attendance?.check_in) {
      alert("Bạn đã check-in hôm nay rồi.");
      return;
    }

    setCheckingIn(true);

    try {
      const now = new Date();

      const vietnamNow = getVietnamDate(now);

      let lateMinutes = 0;

      if (
        todaySchedule.length > 0 &&
        todaySchedule[0].start_time
      ) {
        const scheduledStart =
          todaySchedule[0].start_time;

        const [hours, minutes] =
          scheduledStart
            .slice(0, 5)
            .split(":")
            .map(Number);

        const scheduledDate =
          new Date(vietnamNow);

        scheduledDate.setHours(
          hours,
          minutes,
          0,
          0
        );

        lateMinutes = Math.max(
          0,
          Math.floor(
            (vietnamNow.getTime() -
              scheduledDate.getTime()) /
              60000
          )
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("attendance")
        .insert({
          employee_id: employee.id,
          work_date: today,
          check_in: now.toISOString(),
          check_out: null,
          late_minutes: lateMinutes,
          makeup_minutes: 0,
          penalty_amount: 0,
          status: "checked_in",
        })
        .select()
        .single();

      if (error) {
        console.error(error);

        alert(
          `Không thể check-in: ${error.message}`
        );

        return;
      }

      setAttendance(data);

      alert("Check-in thành công.");
    } catch (error) {
      console.error(error);

      alert("Có lỗi khi check-in.");
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    if (!attendance) {
      alert("Bạn chưa check-in.");
      return;
    }

    if (!attendance.check_in) {
      alert("Bạn chưa check-in.");
      return;
    }

    if (attendance.check_out) {
      alert("Bạn đã check-out hôm nay rồi.");
      return;
    }

    setCheckingOut(true);

    try {
      const now = new Date();

      const {
        data,
        error,
      } = await supabase
        .from("attendance")
        .update({
          check_out: now.toISOString(),
          status: "checked_out",
        })
        .eq("id", attendance.id)
        .select()
        .single();

      if (error) {
        console.error(error);

        alert(
          `Không thể check-out: ${error.message}`
        );

        return;
      }

      setAttendance(data);

      alert("Check-out thành công.");
    } catch (error) {
      console.error(error);

      alert("Có lỗi khi check-out.");
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleSubmitRequest() {
    if (!employee) return;

    if (!requestDate) {
      alert("Vui lòng chọn ngày.");
      return;
    }

    if (!requestReason.trim()) {
      alert("Vui lòng nhập lý do.");
      return;
    }

    if (
      requestType !== "leave" &&
      !requestStartTime
    ) {
      alert("Vui lòng chọn thời gian.");
      return;
    }

    if (
      requestType === "overtime" &&
      !requestEndTime
    ) {
      alert("Vui lòng chọn giờ kết thúc tăng ca.");
      return;
    }

    setSendingRequest(true);

    try {
      const {
        error,
      } = await supabase
        .from("requests")
        .insert({
          employee_id: employee.id,
          request_type: requestType,
          request_date: requestDate,
          start_time:
            requestStartTime || null,
          end_time:
            requestEndTime || null,
          reason:
            requestReason.trim(),
          status: "pending",
        });

      if (error) {
        console.error(error);

        alert(
          `Không thể gửi yêu cầu: ${error.message}`
        );

        return;
      }

      alert("Đã gửi yêu cầu.");

      setRequestType("late");

      setRequestDate(
        getVietnamDateString()
      );

      setRequestStartTime("");

      setRequestEndTime("");

      setRequestReason("");

      await loadRequests(employee.id);
    } catch (error) {
      console.error(error);

      alert("Có lỗi khi gửi yêu cầu.");
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/login");
  }

  function previousWeek() {
    setWeekStart((prev) => {
      const date = new Date(prev);

      date.setDate(date.getDate() - 7);

      return date;
    });
  }

  function nextWeek() {
    setWeekStart((prev) => {
      const date = new Date(prev);

      date.setDate(date.getDate() + 7);

      return date;
    });
  }

  function currentWeek() {
    setWeekStart(getMonday());
  }

  function getScheduleForDate(date: Date) {
    const dateString =
      getVietnamDateString(date);

    return weekSchedules.filter(
      (item) =>
        item.work_date === dateString
    );
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          background: "#f4f1ec",
        }}
      >
        Đang tải...
      </main>
    );
  }

  const checkedIn =
    Boolean(attendance?.check_in);

  const checkedOut =
    Boolean(attendance?.check_out);

  const weekLabel =
    `${formatDate(
      getVietnamDateString(weekDates[0])
    )} - ${formatDate(
      getVietnamDateString(weekDates[6])
    )}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f1ec",
        fontFamily: "Arial, sans-serif",
        color: "#2f3e46",
        paddingBottom: "60px",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          background: "#ffffff",
          padding: "24px 5%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow:
            "0 1px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "34px",
              letterSpacing: "2px",
            }}
          >
            SOBA STAFF
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#6b7280",
            }}
          >
            Giao diện nhân viên
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: "#365d4b",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "14px 22px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Đăng xuất
        </button>
      </header>

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        {/* THÔNG TIN NHÂN VIÊN */}

        <section
          style={{
            background: "#365d4b",
            color: "#fff",
            borderRadius: "26px",
            padding: "30px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              opacity: 0.8,
              marginBottom: "10px",
            }}
          >
            Xin chào
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "30px",
            }}
          >
            {employee?.full_name}
          </h2>

          <p
            style={{
              marginBottom: 0,
              opacity: 0.85,
            }}
          >
            {employee?.employment_type ||
              "Nhân viên"}
          </p>
        </section>

        {/* CHẤM CÔNG */}

        <section
          style={{
            background: "#fff",
            borderRadius: "26px",
            padding: "26px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Chấm công hôm nay
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                background: "#f3f4f6",
                borderRadius: "18px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  color: "#6b7280",
                  marginBottom: "12px",
                }}
              >
                Check-in
              </div>

              <strong
                style={{
                  fontSize: "26px",
                }}
              >
                {formatTime(
                  attendance?.check_in || null
                )}
              </strong>
            </div>

            <div
              style={{
                background: "#f3f4f6",
                borderRadius: "18px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  color: "#6b7280",
                  marginBottom: "12px",
                }}
              >
                Check-out
              </div>

              <strong
                style={{
                  fontSize: "26px",
                }}
              >
                {formatTime(
                  attendance?.check_out || null
                )}
              </strong>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <button
              onClick={handleCheckIn}
              disabled={
                checkedIn || checkingIn
              }
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "none",
                background:
                  checkedIn
                    ? "#9ca3af"
                    : "#365d4b",
                color: "#fff",
                cursor:
                  checkedIn
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 700,
              }}
            >
              {checkingIn
                ? "Đang check-in..."
                : checkedIn
                ? "ĐÃ CHECK-IN"
                : "CHECK-IN"}
            </button>

            <button
              onClick={handleCheckOut}
              disabled={
                !checkedIn ||
                checkedOut ||
                checkingOut
              }
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "none",
                background:
                  !checkedIn || checkedOut
                    ? "#9ca3af"
                    : "#365d4b",
                color: "#fff",
                cursor:
                  !checkedIn || checkedOut
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 700,
              }}
            >
              {checkingOut
                ? "Đang check-out..."
                : checkedOut
                ? "ĐÃ CHECK-OUT"
                : "CHECK-OUT"}
            </button>
          </div>
        </section>

        {/* LỊCH LÀM */}

        <section
          style={{
            background: "#fff",
            borderRadius: "26px",
            padding: "26px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Lịch làm việc
          </h2>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            <button
              onClick={previousWeek}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "12px 18px",
                cursor: "pointer",
              }}
            >
              ← Tuần trước
            </button>

            <div
              style={{
                textAlign: "center",
              }}
            >
              <strong>
                {weekLabel}
              </strong>

              <div
                style={{
                  marginTop: "8px",
                }}
              >
                <button
                  onClick={currentWeek}
                  style={{
                    background: "#365d4b",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    padding:
                      "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  Về tuần này
                </button>
              </div>
            </div>

            <button
              onClick={nextWeek}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "12px 18px",
                cursor: "pointer",
              }}
            >
              Tuần sau →
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
            }}
          >
            {weekDates.map(
              (date, index) => {
                const daySchedules =
                  getScheduleForDate(date);

                const isToday =
                  getVietnamDateString(date) ===
                  today;

                const dayName =
                  [
                    "Thứ 2",
                    "Thứ 3",
                    "Thứ 4",
                    "Thứ 5",
                    "Thứ 6",
                    "Thứ 7",
                    "Chủ nhật",
                  ][index];

                return (
                  <div
                    key={
                      date.toISOString()
                    }
                    style={{
                      border: isToday
                        ? "2px solid #365d4b"
                        : "1px solid #e5e7eb",
                      borderRadius: "16px",
                      padding: "16px",
                      minHeight: "130px",
                      background: isToday
                        ? "#f0f6f2"
                        : "#fff",
                    }}
                  >
                    <strong>
                      {dayName}
                    </strong>

                    <div
                      style={{
                        color: "#6b7280",
                        margin:
                          "6px 0 14px",
                      }}
                    >
                      {formatDate(
                        getVietnamDateString(
                          date
                        )
                      )}
                    </div>

                    {daySchedules.length ===
                    0 ? (
                      <div
                        style={{
                          color:
                            "#9ca3af",
                        }}
                      >
                        Nghỉ
                      </div>
                    ) : (
                      daySchedules.map(
                        (schedule) => (
                          <div
                            key={
                              schedule.id
                            }
                            style={{
                              background:
                                "#e8efea",
                              padding:
                                "8px 10px",
                              borderRadius:
                                "8px",
                              marginBottom:
                                "8px",
                              fontWeight:
                                600,
                            }}
                          >
                            {formatTime(
                              schedule.start_time
                            )}{" "}
                            -{" "}
                            {formatTime(
                              schedule.end_time
                            )}
                          </div>
                        )
                      )
                    )}
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* GỬI YÊU CẦU */}

        <section
          style={{
            background: "#fff",
            borderRadius: "26px",
            padding: "26px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Gửi yêu cầu
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={() =>
                setRequestType("late")
              }
              style={{
                padding: "14px",
                borderRadius: "10px",
                border:
                  requestType === "late"
                    ? "2px solid #365d4b"
                    : "1px solid #ddd",
                background:
                  requestType === "late"
                    ? "#e8efea"
                    : "#fff",
                cursor: "pointer",
              }}
            >
              Đi muộn
            </button>

            <button
              onClick={() =>
                setRequestType(
                  "early_leave"
                )
              }
              style={{
                padding: "14px",
                borderRadius: "10px",
                border:
                  requestType ===
                  "early_leave"
                    ? "2px solid #365d4b"
                    : "1px solid #ddd",
                background:
                  requestType ===
                  "early_leave"
                    ? "#e8efea"
                    : "#fff",
                cursor: "pointer",
              }}
            >
              Về sớm
            </button>

            <button
              onClick={() =>
                setRequestType(
                  "overtime"
                )
              }
              style={{
                padding: "14px",
                borderRadius: "10px",
                border:
                  requestType ===
                  "overtime"
                    ? "2px solid #365d4b"
                    : "1px solid #ddd",
                background:
                  requestType ===
                  "overtime"
                    ? "#e8efea"
                    : "#fff",
                cursor: "pointer",
              }}
            >
              Tăng ca
            </button>

            <button
              onClick={() =>
                setRequestType("leave")
              }
              style={{
                padding: "14px",
                borderRadius: "10px",
                border:
                  requestType ===
                  "leave"
                    ? "2px solid #365d4b"
                    : "1px solid #ddd",
                background:
                  requestType ===
                  "leave"
                    ? "#e8efea"
                    : "#fff",
                cursor: "pointer",
              }}
            >
              Xin nghỉ
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginBottom: "14px",
            }}
          >
            <div>
              <label>
                Ngày yêu cầu
              </label>

              <input
                type="date"
                value={requestDate}
                onChange={(event) =>
                  setRequestDate(
                    event.target.value
                  )
                }
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "14px",
                  borderRadius: "10px",
                  border:
                    "1px solid #ddd",
                  boxSizing:
                    "border-box",
                }}
              />
            </div>

            {requestType !==
              "leave" && (
              <div>
                <label>
                  {requestType ===
                  "early_leave"
                    ? "Giờ muốn về"
                    : requestType ===
                      "overtime"
                    ? "Bắt đầu tăng ca"
                    : "Giờ dự kiến đến"}
                </label>

                <input
                  type="time"
                  value={
                    requestStartTime
                  }
                  onChange={(event) =>
                    setRequestStartTime(
                      event.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "14px",
                    borderRadius:
                      "10px",
                    border:
                      "1px solid #ddd",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>
            )}

            {requestType ===
              "overtime" && (
              <div>
                <label>
                  Kết thúc tăng ca
                </label>

                <input
                  type="time"
                  value={
                    requestEndTime
                  }
                  onChange={(event) =>
                    setRequestEndTime(
                      event.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "14px",
                    borderRadius:
                      "10px",
                    border:
                      "1px solid #ddd",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>
            )}
          </div>

          <textarea
            value={requestReason}
            onChange={(event) =>
              setRequestReason(
                event.target.value
              )
            }
            placeholder="Lý do..."
            rows={5}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #ddd",
              boxSizing: "border-box",
              resize: "vertical",
              marginBottom: "14px",
            }}
          />

          <button
            onClick={
              handleSubmitRequest
            }
            disabled={sendingRequest}
            style={{
              width: "100%",
              padding: "16px",
              border: "none",
              borderRadius: "12px",
              background: "#365d4b",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {sendingRequest
              ? "Đang gửi..."
              : "Gửi yêu cầu"}
          </button>
        </section>

        {/* YÊU CẦU CỦA TÔI */}

        <section
          style={{
            background: "#fff",
            borderRadius: "26px",
            padding: "26px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Yêu cầu của tôi
          </h2>

          {requests.length === 0 ? (
            <div
              style={{
                color: "#6b7280",
                padding: "20px 0",
              }}
            >
              Chưa có yêu cầu nào.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              {requests.map(
                (request) => (
                  <div
                    key={request.id}
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      borderRadius:
                        "14px",
                      padding: "18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginBottom:
                          "10px",
                      }}
                    >
                      <strong>
                        {getRequestTypeLabel(
                          request.request_type
                        )}
                      </strong>

                      <span
                        style={{
                          color:
                            getStatusColor(
                              request.status
                            ),
                          fontWeight:
                            700,
                        }}
                      >
                        {getStatusLabel(
                          request.status
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        color: "#6b7280",
                        marginBottom:
                          "8px",
                      }}
                    >
                      Ngày:{" "}
                      {formatDate(
                        request.request_date
                      )}
                    </div>

                    {(request.start_time ||
                      request.end_time) && (
                      <div
                        style={{
                          marginBottom:
                            "8px",
                        }}
                      >
                        Thời gian:{" "}
                        {formatTime(
                          request.start_time
                        )}

                        {request.end_time &&
                          ` - ${formatTime(
                            request.end_time
                          )}`}
                      </div>
                    )}

                    {request.reason && (
                      <div>
                        Lý do:{" "}
                        {request.reason}
                      </div>
                    )}

                    {request.admin_note && (
                      <div
                        style={{
                          marginTop:
                            "10px",
                          background:
                            "#f3f4f6",
                          padding:
                            "10px",
                          borderRadius:
                            "8px",
                        }}
                      >
                        Ghi chú quản lý:{" "}
                        {request.admin_note}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
