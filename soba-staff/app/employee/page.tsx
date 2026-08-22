"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
  employment_type: string | null;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
};

type RequestItem = {
  id: string;
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

function getMonday(date: Date) {
  const d = new Date(date);

  const day = d.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);

  d.setHours(0, 0, 0, 0);

  return d;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateVN(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("vi-VN");
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
  if (status === "approved") {
    return "#2f7d4c";
  }

  if (status === "rejected") {
    return "#c0392b";
  }

  return "#b7791f";
}

export default function EmployeePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [schedules, setSchedules] =
    useState<Schedule[]>([]);

  const [requests, setRequests] =
    useState<RequestItem[]>([]);

  const [weekOffset, setWeekOffset] =
    useState(0);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [requestType, setRequestType] =
    useState<RequestType>("leave");

  const [requestDate, setRequestDate] =
    useState(formatDateInput(new Date()));

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [submittingRequest, setSubmittingRequest] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (employee) {
      loadSchedules();
      loadRequests();
    }
  }, [employee, weekOffset]);

  async function loadUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
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
        await supabase.auth.signOut();

        router.replace("/login");

        return;
      }

      if (employeeData.active === false) {
        await supabase.auth.signOut();

        router.replace("/login");

        return;
      }

      if (employeeData.role === "admin") {
        router.replace("/admin");

        return;
      }

      setEmployee(employeeData);

      setLoading(false);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Có lỗi xảy ra. Vui lòng đăng nhập lại."
      );

      setLoading(false);
    }
  }

  function getCurrentWeekRange() {
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
  }

  async function loadSchedules() {
    if (!employee) return;

    const { monday, sunday } =
      getCurrentWeekRange();

    const startDate =
      formatDateInput(monday);

    const endDate =
      formatDateInput(sunday);

    const {
      data,
      error,
    } = await supabase
      .from("schedules")
      .select("*")
      .eq("employee_id", employee.id)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      return;
    }

    setSchedules(data || []);
  }

  async function loadRequests() {
    if (!employee) return;

    const {
      data,
      error,
    } = await supabase
      .from("requests")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(10);

    if (error) {
      console.error(error);

      return;
    }

    setRequests(data || []);
  }

  async function handleSubmitRequest() {
    if (!employee) return;

    setMessage("");

    if (!requestDate) {
      setMessage("Vui lòng chọn ngày.");

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
        "Vui lòng nhập thời gian tăng ca."
      );

      return;
    }

    setSubmittingRequest(true);

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
          requestType === "early_leave" ||
          requestType === "overtime"
            ? endTime
            : null,

        reason: reason || null,

        status: "pending",
      });

    setSubmittingRequest(false);

    if (error) {
      console.error(error);

      setMessage(
        `Không thể gửi yêu cầu: ${error.message}`
      );

      return;
    }

    setMessage(
      "Đã gửi yêu cầu. Vui lòng chờ Admin duyệt."
    );

    setReason("");

    setStartTime("");

    setEndTime("");

    await loadRequests();
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/login");
  }

  const {
    monday,
    sunday,
  } = getCurrentWeekRange();

  const weekDays = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(monday);

      date.setDate(
        monday.getDate() + index
      );

      return date;
    }
  );

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          background: "#f5f5f3",
        }}
      >
        Đang tải...
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
          fontFamily: "Arial, sans-serif",
        }}
      >
        {errorMessage}
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f3",
        fontFamily: "Arial, sans-serif",
        color: "#263238",
        paddingBottom: "50px",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "25px",
          background: "#ffffff",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: "#365d4b",
            }}
          >
            SOBA STAFF
          </h1>

          <p
            style={{
              margin: "8px 0 0",
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
            padding: "14px 24px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Đăng xuất
        </button>
      </header>

      <section
        style={{
          maxWidth: "860px",
          margin: "24px auto",
          padding: "0 20px",
        }}
      >
        {/* THÔNG TIN NHÂN VIÊN */}

        <div
          style={{
            background: "#365d4b",
            color: "#ffffff",
            padding: "30px",
            borderRadius: "24px",
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
              margin: "12px 0",
              fontSize: "30px",
            }}
          >
            {employee?.full_name}
          </h2>

          <p
            style={{
              margin: 0,
            }}
          >
            {employee?.employment_type ===
            "part_time"
              ? "Nhân viên Part-time"
              : "Nhân viên Full-time"}
          </p>
        </div>

        {/* LỊCH LÀM */}

        <section
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "26px",
            marginTop: "24px",
          }}
        >
          <h2>
            Lịch làm việc
          </h2>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
              marginBottom: "25px",
            }}
          >
            <button
              onClick={() =>
                setWeekOffset(
                  weekOffset - 1
                )
              }
              style={{
                border: "none",
                padding: "12px 16px",
                borderRadius: "12px",
                cursor: "pointer",
              }}
            >
              ← Tuần trước
            </button>

            <div
              style={{
                textAlign: "center",
                fontWeight: 700,
              }}
            >
              {formatDateVN(
                formatDateInput(monday)
              )}

              {" - "}

              {formatDateVN(
                formatDateInput(sunday)
              )}

              {weekOffset === 0 && (
                <div
                  style={{
                    fontSize: "13px",
                    marginTop: "5px",
                    color: "#365d4b",
                  }}
                >
                  Tuần này
                </div>
              )}
            </div>

            <button
              onClick={() =>
                setWeekOffset(
                  weekOffset + 1
                )
              }
              style={{
                border: "none",
                padding: "12px 16px",
                borderRadius: "12px",
                cursor: "pointer",
              }}
            >
              Tuần sau →
            </button>
          </div>

          {weekOffset !== 0 && (
            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              <button
                onClick={() =>
                  setWeekOffset(0)
                }
                style={{
                  background: "#365d4b",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  cursor: "pointer",
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
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "14px",
            }}
          >
            {weekDays.map(
              (date, index) => {
                const dateString =
                  formatDateInput(date);

                const daySchedules =
                  schedules.filter(
                    (schedule) =>
                      schedule.work_date ===
                      dateString
                  );

                return (
                  <div
                    key={dateString}
                    style={{
                      border:
                        "1px solid #dcdcdc",
                      borderRadius: "16px",
                      padding: "16px",
                      minHeight: "120px",
                    }}
                  >
                    <strong>
                      {getDayName(index)}
                    </strong>

                    <div
                      style={{
                        marginTop: "6px",
                        color: "#777",
                        fontSize: "14px",
                      }}
                    >
                      {formatDateVN(
                        dateString
                      )}
                    </div>

                    {daySchedules.length ===
                    0 ? (
                      <p
                        style={{
                          marginTop: "22px",
                          color: "#888",
                        }}
                      >
                        Nghỉ
                      </p>
                    ) : (
                      daySchedules.map(
                        (schedule) => (
                          <div
                            key={schedule.id}
                            style={{
                              marginTop:
                                "15px",
                              background:
                                "#eef3ef",
                              padding: "10px",
                              borderRadius:
                                "10px",
                              fontWeight: 700,
                            }}
                          >
                            {schedule.start_time?.slice(
                              0,
                              5
                            )}

                            {" - "}

                            {schedule.end_time?.slice(
                              0,
                              5
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
            background: "#ffffff",
            borderRadius: "24px",
            padding: "26px",
            marginTop: "24px",
          }}
        >
          <h2>
            Gửi yêu cầu
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <button
              onClick={() =>
                setRequestType("leave")
              }
              style={{
                padding: "16px",
                borderRadius: "12px",
                border:
                  requestType === "leave"
                    ? "2px solid #365d4b"
                    : "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Xin nghỉ
            </button>

            <button
              onClick={() =>
                setRequestType("late")
              }
              style={{
                padding: "16px",
                borderRadius: "12px",
                border:
                  requestType === "late"
                    ? "2px solid #365d4b"
                    : "1px solid #ddd",
                background: "#fff",
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
                padding: "16px",
                borderRadius: "12px",
                border:
                  requestType ===
                  "early_leave"
                    ? "2px solid #365d4b"
                    : "1px solid #ddd",
                background: "#fff",
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
                padding: "16px",
                borderRadius: "12px",
                border:
                  requestType ===
                  "overtime"
                    ? "2px solid #365d4b"
                    : "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Tăng ca
            </button>
          </div>

          <div
            style={{
              marginTop: "20px",
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
                padding: "14px",
                borderRadius: "10px",
                border:
                  "1px solid #ddd",
              }}
            />

            {(requestType ===
              "late" ||
              requestType ===
                "overtime") && (
              <input
                type="time"
                value={startTime}
                onChange={(e) =>
                  setStartTime(
                    e.target.value
                  )
                }
              />
            )}

            {(requestType ===
              "early_leave" ||
              requestType ===
                "overtime") && (
              <input
                type="time"
                value={endTime}
                onChange={(e) =>
                  setEndTime(
                    e.target.value
                  )
                }
              />
            )}

            <textarea
              value={reason}
              onChange={(e) =>
                setReason(
                  e.target.value
                )
              }
              placeholder="Lý do..."
              rows={4}
              style={{
                padding: "14px",
                borderRadius: "10px",
                border:
                  "1px solid #ddd",
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
                background: "#365d4b",
                color: "#ffffff",
                padding: "15px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {submittingRequest
                ? "Đang gửi..."
                : "Gửi yêu cầu"}
            </button>

            {message && (
              <p>
                {message}
              </p>
            )}
          </div>
        </section>

        {/* ĐƠN CỦA TÔI */}

        <section
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "26px",
            marginTop: "24px",
          }}
        >
          <h2>
            Yêu cầu của tôi
          </h2>

          {requests.length === 0 ? (
            <p>
              Chưa có yêu cầu nào.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {requests.map(
                (request) => (
                  <div
                    key={request.id}
                    style={{
                      border:
                        "1px solid #e5e5e5",
                      padding: "18px",
                      borderRadius: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "10px",
                      }}
                    >
                      <strong>
                        {requestTypeLabel(
                          request.request_type
                        )}
                      </strong>

                      <span
                        style={{
                          color:
                            statusColor(
                              request.status
                            ),
                          fontWeight: 700,
                        }}
                      >
                        {statusLabel(
                          request.status
                        )}
                      </span>
                    </div>

                    <p>
                      Ngày:{" "}
                      {formatDateVN(
                        request.request_date
                      )}
                    </p>

                    {request.start_time && (
                      <p>
                        Bắt đầu:{" "}
                        {request.start_time.slice(
                          0,
                          5
                        )}
                      </p>
                    )}

                    {request.end_time && (
                      <p>
                        Kết thúc:{" "}
                        {request.end_time.slice(
                          0,
                          5
                        )}
                      </p>
                    )}

                    {request.reason && (
                      <p>
                        Lý do:{" "}
                        {request.reason}
                      </p>
                    )}

                    {request.admin_note && (
                      <p>
                        Phản hồi Admin:{" "}
                        {
                          request.admin_note
                        }
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
