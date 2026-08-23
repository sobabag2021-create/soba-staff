"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Employee = {
  id: string;
  auth_user_id: string;
  full_name: string;
  role: string;
  active: boolean;
  employment_type: string | null;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  note?: string | null;
  notes?: string | null;
};

type Attendance = {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  late_minutes?: number | null;
  makeup_minutes?: number | null;
  penalty_amount?: number | null;
  status: string | null;
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
  | "leave"
  | "late"
  | "early_leave"
  | "overtime";

const GREEN = "#365d4b";
const TEXT = "#263238";
const BG = "#f3f2ee";

function getVietnamDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function getMonday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateVN(dateString: string) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("vi-VN");
}

function formatTime(dateString: string | null) {
  if (!dateString) return "--:--";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatTimeRange(
  startTime: string | null,
  endTime: string | null
) {
  if (!startTime && !endTime) return "Chưa có giờ";

  const start = startTime ? startTime.slice(0, 5) : "--:--";
  const end = endTime ? endTime.slice(0, 5) : "--:--";

  return `${start} - ${end}`;
}

function getDayName(index: number) {
  const names = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];

  return names[index];
}

function requestTypeLabel(type: string) {
  if (type === "leave") return "Xin nghỉ";
  if (type === "late") return "Xin đi muộn";
  if (type === "early_leave") return "Xin về sớm";
  if (type === "overtime") return "Xin tăng ca";

  return type;
}

function statusLabel(status: string) {
  if (status === "pending") return "Chờ duyệt";
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Từ chối";

  return status;
}

function statusColor(status: string) {
  if (status === "approved") return "#2f7d4c";

  if (status === "rejected") return "#c0392b";

  return "#b7791f";
}

function statusBackground(status: string) {
  if (status === "approved") return "#e8f5ec";

  if (status === "rejected") return "#fdecea";

  return "#fff6df";
}

export default function EmployeePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [processingAttendance, setProcessingAttendance] =
    useState(false);

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [attendance, setAttendance] =
    useState<Attendance | null>(null);

  const [schedules, setSchedules] =
    useState<Schedule[]>([]);

  const [requests, setRequests] =
    useState<RequestItem[]>([]);

  const [weekOffset, setWeekOffset] = useState(0);

  const [requestType, setRequestType] =
    useState<RequestType>("leave");

  const [requestDate, setRequestDate] =
    useState(getVietnamDateString());

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const [submittingRequest, setSubmittingRequest] =
    useState(false);

  const [message, setMessage] = useState("");

  const weekRange = useMemo(() => {
    const today = new Date();

    const monday = getMonday(today);

    monday.setDate(
      monday.getDate() + weekOffset * 7
    );

    const sunday = new Date(monday);

    sunday.setDate(monday.getDate() + 6);

    return {
      monday,
      sunday,
    };
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(weekRange.monday);

        date.setDate(
          weekRange.monday.getDate() + index
        );

        return date;
      }
    );
  }, [weekRange]);

  async function loadEmployee() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return null;
    }

    const {
      data: employeeData,
      error: employeeError,
    } = await supabase
      .from("employees")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (employeeError || !employeeData) {
      console.error(employeeError);

      await supabase.auth.signOut();

      router.replace("/login");

      return null;
    }

    if (employeeData.active === false) {
      alert("Tài khoản của bạn đã bị khóa.");

      await supabase.auth.signOut();

      router.replace("/login");

      return null;
    }

    if (employeeData.role === "admin") {
      router.replace("/admin");

      return null;
    }

    setEmployee(employeeData);

    return employeeData;
  }

  async function loadTodayAttendance(
    employeeId: string
  ) {
    const today = getVietnamDateString();

    const {
      data,
      error,
    } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("work_date", today)
      .maybeSingle();

    if (error) {
      console.error(
        "Lỗi tải chấm công:",
        error.message
      );
    }

    setAttendance(data || null);
  }

  async function loadSchedules(
    employeeId: string
  ) {
    const startDate = formatDateInput(
      weekRange.monday
    );

    const endDate = formatDateInput(
      weekRange.sunday
    );

    const {
      data,
      error,
    } = await supabase
      .from("schedules")
      .select("*")
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
      console.error(
        "Lỗi tải lịch:",
        error.message
      );

      return;
    }

    setSchedules(data || []);
  }

  async function loadRequests(
    employeeId: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (error) {
      console.error(
        "Lỗi tải yêu cầu:",
        error.message
      );

      return;
    }

    setRequests(data || []);
  }

  async function loadAll() {
    setLoading(true);

    try {
      const employeeData =
        await loadEmployee();

      if (!employeeData) {
        return;
      }

      await Promise.all([
        loadTodayAttendance(
          employeeData.id
        ),
        loadSchedules(employeeData.id),
        loadRequests(employeeData.id),
      ]);
    } catch (error) {
      console.error(error);

      alert(
        "Có lỗi khi tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!employee) return;

    loadSchedules(employee.id);
  }, [weekOffset, employee]);

  async function handleCheckIn() {
    if (!employee) return;

    if (attendance?.check_in) {
      alert(
        "Bạn đã check-in hôm nay rồi."
      );

      return;
    }

    setProcessingAttendance(true);

    try {
      const now = new Date();

      const today = getVietnamDateString();

      const todaySchedules =
        schedules.filter(
          (schedule) =>
            schedule.work_date === today
        );

      let lateMinutes = 0;

      if (
        todaySchedules.length > 0 &&
        todaySchedules[0].start_time
      ) {
        const scheduledStart =
          todaySchedules[0].start_time.slice(
            0,
            5
          );

        const vietnamTime =
          new Intl.DateTimeFormat(
            "en-GB",
            {
              timeZone:
                "Asia/Ho_Chi_Minh",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }
          )
            .format(now)
            .split(":");

        const currentMinutes =
          Number(vietnamTime[0]) * 60 +
          Number(vietnamTime[1]);

        const scheduledParts =
          scheduledStart.split(":");

        const scheduledMinutes =
          Number(scheduledParts[0]) *
            60 +
          Number(scheduledParts[1]);

        lateMinutes = Math.max(
          0,
          currentMinutes -
            scheduledMinutes
        );
      }

      const {
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
        });

      if (error) {
        console.error(error);

        alert(
          `Không thể check-in: ${error.message}`
        );

        return;
      }

      alert("Check-in thành công.");

      await loadTodayAttendance(
        employee.id
      );
    } catch (error) {
      console.error(error);

      alert(
        "Có lỗi khi check-in."
      );
    } finally {
      setProcessingAttendance(false);
    }
  }

  async function handleCheckOut() {
    if (!employee) return;

    if (!attendance?.check_in) {
      alert(
        "Bạn chưa check-in hôm nay."
      );

      return;
    }

    if (attendance.check_out) {
      alert(
        "Bạn đã check-out hôm nay rồi."
      );

      return;
    }

    setProcessingAttendance(true);

    try {
      const now = new Date();

      const {
        error,
      } = await supabase
        .from("attendance")
        .update({
          check_out: now.toISOString(),
          status: "checked_out",
        })
        .eq("id", attendance.id);

      if (error) {
        console.error(error);

        alert(
          `Không thể check-out: ${error.message}`
        );

        return;
      }

      alert("Check-out thành công.");

      await loadTodayAttendance(
        employee.id
      );
    } catch (error) {
      console.error(error);

      alert(
        "Có lỗi khi check-out."
      );
    } finally {
      setProcessingAttendance(false);
    }
  }

  async function handleSubmitRequest() {
    if (!employee) return;

    setMessage("");

    if (!requestDate) {
      setMessage(
        "Vui lòng chọn ngày."
      );

      return;
    }

    if (
      requestType === "late" &&
      !startTime
    ) {
      setMessage(
        "Vui lòng nhập giờ dự kiến đến."
      );

      return;
    }

    if (
      requestType === "early_leave" &&
      !endTime
    ) {
      setMessage(
        "Vui lòng nhập giờ muốn về."
      );

      return;
    }

    if (
      requestType === "overtime" &&
      (!startTime || !endTime)
    ) {
      setMessage(
        "Vui lòng nhập giờ bắt đầu và kết thúc tăng ca."
      );

      return;
    }

    if (
      requestType === "leave" &&
      !reason.trim()
    ) {
      setMessage(
        "Vui lòng nhập lý do xin nghỉ."
      );

      return;
    }

    setSubmittingRequest(true);

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
            requestType === "late" ||
            requestType === "overtime"
              ? startTime
              : null,
          end_time:
            requestType ===
              "early_leave" ||
            requestType === "overtime"
              ? endTime
              : null,
          reason:
            reason.trim() || null,
          status: "pending",
        });

      if (error) {
        console.error(error);

        setMessage(
          `Không thể gửi yêu cầu: ${error.message}`
        );

        return;
      }

      setMessage(
        "Đã gửi yêu cầu thành công. Vui lòng chờ Admin duyệt."
      );

      setReason("");
      setStartTime("");
      setEndTime("");

      await loadRequests(
        employee.id
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Có lỗi khi gửi yêu cầu."
      );
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/login");
  }

  function getSchedulesByDate(
    dateString: string
  ) {
    return schedules.filter(
      (schedule) =>
        schedule.work_date ===
        dateString
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
          background: BG,
          color: TEXT,
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        Đang tải...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: BG,
        color: TEXT,
        fontFamily:
          "Arial, sans-serif",
        paddingBottom: "60px",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "24px",
          background: "#ffffff",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "34px",
              letterSpacing: "1px",
            }}
          >
            SOBA STAFF
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color: "#56616a",
            }}
          >
            Giao diện nhân viên
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            border: "none",
            background: GREEN,
            color: "#ffffff",
            padding:
              "14px 24px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Đăng xuất
        </button>
      </header>

      <div
        style={{
          maxWidth: "860px",
          margin: "24px auto",
          padding: "0 20px",
        }}
      >
        {/* THÔNG TIN NHÂN VIÊN */}

        <section
          style={{
            background: GREEN,
            color: "#ffffff",
            borderRadius: "26px",
            padding: "30px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "17px",
              opacity: 0.85,
            }}
          >
            Xin chào
          </div>

          <h2
            style={{
              margin:
                "12px 0 8px",
              fontSize: "30px",
            }}
          >
            {employee?.full_name}
          </h2>

          <div
            style={{
              opacity: 0.9,
            }}
          >
            {employee?.employment_type ||
              "Nhân viên"}
          </div>
        </section>

        {/* CHẤM CÔNG */}

        <section
          style={{
            background: "#ffffff",
            borderRadius: "26px",
            padding: "26px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "26px",
            }}
          >
            Chấm công hôm nay
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <div
              style={{
                background:
                  "#f1f2f3",
                borderRadius:
                  "18px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  color: "#56616a",
                  marginBottom:
                    "10px",
                }}
              >
                Check-in
              </div>

              <strong
                style={{
                  fontSize:
                    "26px",
                }}
              >
                {formatTime(
                  attendance?.check_in ||
                    null
                )}
              </strong>
            </div>

            <div
              style={{
                background:
                  "#f1f2f3",
                borderRadius:
                  "18px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  color: "#56616a",
                  marginBottom:
                    "10px",
                }}
              >
                Check-out
              </div>

              <strong
                style={{
                  fontSize:
                    "26px",
                }}
              >
                {formatTime(
                  attendance?.check_out ||
                    null
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
              marginTop: "16px",
            }}
          >
            <button
              onClick={handleCheckIn}
              disabled={
                processingAttendance ||
                Boolean(
                  attendance?.check_in
                )
              }
              style={{
                border: "none",
                background:
                  attendance?.check_in
                    ? "#9aa8a2"
                    : GREEN,
                color: "#ffffff",
                padding: "16px",
                borderRadius:
                  "12px",
                cursor:
                  processingAttendance ||
                  attendance?.check_in
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 700,
                opacity:
                  processingAttendance ||
                  attendance?.check_in
                    ? 0.7
                    : 1,
              }}
            >
              {attendance?.check_in
                ? "ĐÃ CHECK-IN"
                : processingAttendance
                ? "ĐANG XỬ LÝ..."
                : "CHECK-IN"}
            </button>

            <button
              onClick={handleCheckOut}
              disabled={
                processingAttendance ||
                !attendance?.check_in ||
                Boolean(
                  attendance?.check_out
                )
              }
              style={{
                border: "none",
                background:
                  !attendance?.check_in ||
                  attendance?.check_out
                    ? "#9aa8a2"
                    : GREEN,
                color: "#ffffff",
                padding: "16px",
                borderRadius:
                  "12px",
                cursor:
                  processingAttendance ||
                  !attendance?.check_in ||
                  attendance?.check_out
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 700,
                opacity:
                  processingAttendance ||
                  !attendance?.check_in ||
                  attendance?.check_out
                    ? 0.7
                    : 1,
              }}
            >
              {attendance?.check_out
                ? "ĐÃ CHECK-OUT"
                : processingAttendance
                ? "ĐANG XỬ LÝ..."
                : "CHECK-OUT"}
            </button>
          </div>
        </section>

        {/* LỊCH LÀM VIỆC */}

        <section
          style={{
            background: "#ffffff",
            borderRadius: "26px",
            padding: "26px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "26px",
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
              marginBottom:
                "24px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() =>
                setWeekOffset(
                  (value) =>
                    value - 1
                )
              }
              style={{
                border: "none",
                background:
                  "#eef1ef",
                color: TEXT,
                padding:
                  "12px 18px",
                borderRadius:
                  "12px",
                cursor: "pointer",
                fontWeight: 700,
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
                {formatDateVN(
                  formatDateInput(
                    weekRange.monday
                  )
                )}
                {" - "}
                {formatDateVN(
                  formatDateInput(
                    weekRange.sunday
                  )
                )}
              </strong>

              <div
                style={{
                  marginTop:
                    "6px",
                  color: "#647077",
                  fontSize:
                    "14px",
                }}
              >
                {weekOffset === 0
                  ? "Tuần này"
                  : weekOffset < 0
                  ? "Tuần trước"
                  : "Tuần sau"}
              </div>
            </div>

            <button
              onClick={() =>
                setWeekOffset(
                  (value) =>
                    value + 1
                )
              }
              style={{
                border: "none",
                background:
                  "#eef1ef",
                color: TEXT,
                padding:
                  "12px 18px",
                borderRadius:
                  "12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Tuần sau →
            </button>
          </div>

          {weekOffset !== 0 && (
            <div
              style={{
                textAlign:
                  "center",
                marginBottom:
                  "20px",
              }}
            >
              <button
                onClick={() =>
                  setWeekOffset(0)
                }
                style={{
                  border: "none",
                  background: GREEN,
                  color: "#ffffff",
                  padding:
                    "10px 18px",
                  borderRadius:
                    "10px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Về tuần này
              </button>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "14px",
            }}
          >
            {weekDays.map(
              (date, index) => {
                const dateString =
                  formatDateInput(
                    date
                  );

                const daySchedules =
                  getSchedulesByDate(
                    dateString
                  );

                const isToday =
                  dateString ===
                  getVietnamDateString();

                return (
                  <div
                    key={dateString}
                    style={{
                      border: isToday
                        ? `2px solid ${GREEN}`
                        : "1px solid #dde2df",
                      borderRadius:
                        "18px",
                      padding: "16px",
                      minHeight:
                        "140px",
                      background:
                        isToday
                          ? "#f4faf6"
                          : "#ffffff",
                    }}
                  >
                    <strong>
                      {getDayName(
                        index
                      )}
                    </strong>

                    <div
                      style={{
                        marginTop:
                          "6px",
                        color:
                          "#667279",
                        fontSize:
                          "14px",
                      }}
                    >
                      {formatDateVN(
                        dateString
                      )}
                    </div>

                    {daySchedules.length ===
                    0 ? (
                      <div
                        style={{
                          marginTop:
                            "18px",
                          color:
                            "#8b9499",
                        }}
                      >
                        Nghỉ
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          display:
                            "grid",
                          gap: "8px",
                        }}
                      >
                        {daySchedules.map(
                          (
                            schedule
                          ) => (
                            <div
                              key={
                                schedule.id
                              }
                              style={{
                                background:
                                  "#e9efeb",
                                padding:
                                  "10px",
                                borderRadius:
                                  "10px",
                                fontWeight:
                                  700,
                              }}
                            >
                              {formatTimeRange(
                                schedule.start_time,
                                schedule.end_time
                              )}
                            </div>
                          )
                        )}
                      </div>
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
            background: "#ffffff",
            borderRadius: "26px",
            padding: "26px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "26px",
            }}
          >
            Gửi yêu cầu
          </h2>

          {/* LOẠI YÊU CẦU */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              marginBottom:
                "18px",
            }}
          >
            {[
              {
                value: "leave",
                label: "Xin nghỉ",
              },
              {
                value: "late",
                label: "Đi muộn",
              },
              {
                value:
                  "early_leave",
                label: "Về sớm",
              },
              {
                value:
                  "overtime",
                label: "Tăng ca",
              },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setRequestType(
                    item.value as RequestType
                  );

                  setStartTime("");
                  setEndTime("");
                  setMessage("");
                }}
                style={{
                  border:
                    requestType ===
                    item.value
                      ? `2px solid ${GREEN}`
                      : "1px solid #d8ddda",
                  background:
                    requestType ===
                    item.value
                      ? "#eef6f0"
                      : "#ffffff",
                  color: TEXT,
                  padding:
                    "14px 10px",
                  borderRadius:
                    "12px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            <input
              type="date"
              value={requestDate}
              onChange={(e) =>
                setRequestDate(
                  e.target.value
                )
              }
              style={{
                padding: "15px",
                borderRadius:
                  "12px",
                border:
                  "1px solid #d8ddda",
                color: TEXT,
                fontSize: "16px",
              }}
            />

            {(requestType ===
              "late" ||
              requestType ===
                "overtime") && (
              <div>
                <label
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "8px",
                    fontWeight: 700,
                  }}
                >
                  {requestType ===
                  "late"
                    ? "Giờ dự kiến đến"
                    : "Giờ bắt đầu tăng ca"}
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(e) =>
                    setStartTime(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "15px",
                    borderRadius:
                      "12px",
                    border:
                      "1px solid #d8ddda",
                    color: TEXT,
                    fontSize:
                      "16px",
                  }}
                />
              </div>
            )}

            {(requestType ===
              "early_leave" ||
              requestType ===
                "overtime") && (
              <div>
                <label
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "8px",
                    fontWeight: 700,
                  }}
                >
                  {requestType ===
                  "early_leave"
                    ? "Giờ muốn về"
                    : "Giờ kết thúc tăng ca"}
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) =>
                    setEndTime(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "15px",
                    borderRadius:
                      "12px",
                    border:
                      "1px solid #d8ddda",
                    color: TEXT,
                    fontSize:
                      "16px",
                  }}
                />
              </div>
            )}

            <textarea
              value={reason}
              onChange={(e) =>
                setReason(
                  e.target.value
                )
              }
              placeholder="Nhập lý do..."
              rows={5}
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding: "15px",
                borderRadius:
                  "12px",
                border:
                  "1px solid #d8ddda",
                color: TEXT,
                fontSize: "16px",
                resize: "vertical",
              }}
            />

            <button
              onClick={
                handleSubmitRequest
              }
              disabled={
                submittingRequest
              }
              style={{
                border: "none",
                background: GREEN,
                color: "#ffffff",
                padding: "16px",
                borderRadius:
                  "12px",
                cursor:
                  submittingRequest
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 700,
                fontSize: "16px",
                opacity:
                  submittingRequest
                    ? 0.7
                    : 1,
              }}
            >
              {submittingRequest
                ? "Đang gửi..."
                : "Gửi yêu cầu"}
            </button>

            {message && (
              <div
                style={{
                  padding: "14px",
                  borderRadius:
                    "10px",
                  background:
                    message.includes(
                      "thành công"
                    ) ||
                    message.includes(
                      "Đã gửi"
                    )
                      ? "#e8f5ec"
                      : "#fdecea",
                  color: TEXT,
                }}
              >
                {message}
              </div>
            )}
          </div>
        </section>

        {/* YÊU CẦU CỦA TÔI */}

        <section
          style={{
            background: "#ffffff",
            borderRadius: "26px",
            padding: "26px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "26px",
            }}
          >
            Yêu cầu của tôi
          </h2>

          {requests.length === 0 ? (
            <div
              style={{
                padding: "24px",
                background:
                  "#f5f6f6",
                borderRadius:
                  "14px",
                color:
                  "#647077",
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
                        "1px solid #e1e5e2",
                      borderRadius:
                        "16px",
                      padding: "18px",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: "12px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            fontSize:
                              "18px",
                          }}
                        >
                          {requestTypeLabel(
                            request.request_type
                          )}
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "7px",
                            color:
                              "#667279",
                          }}
                        >
                          Ngày:{" "}
                          {formatDateVN(
                            request.request_date
                          )}
                        </div>
                      </div>

                      <span
                        style={{
                          background:
                            statusBackground(
                              request.status
                            ),
                          color:
                            statusColor(
                              request.status
                            ),
                          padding:
                            "8px 12px",
                          borderRadius:
                            "999px",
                          fontWeight: 700,
                          fontSize:
                            "14px",
                        }}
                      >
                        {statusLabel(
                          request.status
                        )}
                      </span>
                    </div>

                    {(request.start_time ||
                      request.end_time) && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                        }}
                      >
                        <strong>
                          Thời gian:
                        </strong>{" "}
                        {formatTimeRange(
                          request.start_time,
                          request.end_time
                        )}
                      </div>
                    )}

                    {request.reason && (
                      <div
                        style={{
                          marginTop:
                            "12px",
                        }}
                      >
                        <strong>
                          Lý do:
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "5px",
                            lineHeight:
                              1.5,
                          }}
                        >
                          {request.reason}
                        </div>
                      </div>
                    )}

                    {request.admin_note && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "14px",
                          borderRadius:
                            "10px",
                          background:
                            "#f0f5f1",
                        }}
                      >
                        <strong>
                          Phản hồi Admin:
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "5px",
                          }}
                        >
                          {
                            request.admin_note
                          }
                        </div>
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
