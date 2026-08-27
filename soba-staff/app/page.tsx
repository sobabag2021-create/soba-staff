"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  employment_type: string;
  role: string;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  shift_name: string | null;
  start_time: string | null;
  end_time: string | null;
};

type RequestItem = {
  id: string;
  request_type: string;
  request_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatVNDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(time: string | null) {
  if (!time) return "--:--";

  return time.slice(0, 5);
}

function requestTypeLabel(type: string) {
  switch (type) {
    case "leave":
      return "Xin nghỉ";

    case "late":
      return "Đi muộn";

    case "early_leave":
      return "Về sớm";

    case "overtime":
      return "Tăng ca";

    case "checkin_missing":
      return "Bổ sung công";

    default:
      return type;
  }
}

function requestStatusLabel(status: string) {
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

function statusClass(status: string) {
  switch (status) {
    case "approved":
      return "status-approved";

    case "rejected":
      return "status-rejected";

    default:
      return "status-pending";
  }
}

export default function EmployeePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);

  const [loading, setLoading] = useState(true);

  const [todaySchedule, setTodaySchedule] =
    useState<Schedule | null>(null);

  const [weekStart, setWeekStart] = useState(
    getMonday(new Date())
  );

  const [weekSchedules, setWeekSchedules] = useState<
    Schedule[]
  >([]);

  const [requests, setRequests] = useState<
    RequestItem[]
  >([]);

  const [checkInTime, setCheckInTime] = useState<
    string | null
  >(null);

  const [checkOutTime, setCheckOutTime] = useState<
    string | null
  >(null);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [requestType, setRequestType] =
    useState("leave");

  const [requestDate, setRequestDate] =
    useState(getToday());

  const [startTime, setStartTime] = useState("");

  const [endTime, setEndTime] = useState("");

  const [reason, setReason] = useState("");

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error">("success");

  const [submittingRequest, setSubmittingRequest] =
    useState(false);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);

      day.setDate(weekStart.getDate() + index);

      return day;
    });
  }, [weekStart]);

  async function loadEmployee() {
    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      setMessageType("error");
      setMessage(
        "Không tìm thấy thông tin nhân viên."
      );

      setLoading(false);
      return;
    }

    setEmployee(data);

    setLoading(false);
  }

  async function loadTodayAttendance(
    employeeId: string
  ) {
    const today = getToday();

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("work_date", today)
      .maybeSingle();

    if (data) {
      setCheckInTime(data.check_in || null);
      setCheckOutTime(data.check_out || null);
    } else {
      setCheckInTime(null);
      setCheckOutTime(null);
    }
  }

  async function loadTodaySchedule(
    employeeId: string
  ) {
    const today = getToday();

    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("work_date", today)
      .maybeSingle();

    setTodaySchedule(data || null);
  }

  async function loadWeekSchedules(
    employeeId: string,
    monday: Date
  ) {
    const start = formatDate(monday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const end = formatDate(sunday);

    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date");

    setWeekSchedules(data || []);
  }

  async function loadRequests(employeeId: string) {
    const { data } = await supabase
      .from("requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", {
        ascending: false,
      });

    setRequests(data || []);
  }

  useEffect(() => {
    loadEmployee();
  }, []);

  useEffect(() => {
    if (!employee) return;

    loadTodayAttendance(employee.id);
    loadTodaySchedule(employee.id);
    loadRequests(employee.id);
  }, [employee]);

  useEffect(() => {
    if (!employee) return;

    loadWeekSchedules(
      employee.id,
      weekStart
    );
  }, [employee, weekStart]);

  async function handleCheckIn() {
    if (!employee) return;

    if (checkInTime) {
      alert("Bạn đã check-in hôm nay.");
      return;
    }

    setAttendanceLoading(true);

    const now = new Date();

    const currentTime =
      now.toTimeString().slice(0, 5);

    const today = getToday();

    const { error } = await supabase
      .from("attendance")
      .upsert(
        {
          employee_id: employee.id,
          work_date: today,
          check_in: currentTime,
        },
        {
          onConflict:
            "employee_id,work_date",
        }
      );

    setAttendanceLoading(false);

    if (error) {
      alert(
        "Không thể check-in: " +
          error.message
      );
      return;
    }

    setCheckInTime(currentTime);

    alert(
      "Check-in thành công lúc " +
        currentTime
    );
  }

  async function handleCheckOut() {
    if (!employee) return;

    if (!checkInTime) {
      alert(
        "Bạn cần check-in trước khi check-out."
      );
      return;
    }

    if (checkOutTime) {
      alert("Bạn đã check-out hôm nay.");
      return;
    }

    setAttendanceLoading(true);

    const now = new Date();

    const currentTime =
      now.toTimeString().slice(0, 5);

    const today = getToday();

    const { error } = await supabase
      .from("attendance")
      .update({
        check_out: currentTime,
      })
      .eq("employee_id", employee.id)
      .eq("work_date", today);

    setAttendanceLoading(false);

    if (error) {
      alert(
        "Không thể check-out: " +
          error.message
      );
      return;
    }

    setCheckOutTime(currentTime);

    alert(
      "Check-out thành công lúc " +
        currentTime
    );
  }

  function handleRequestTypeChange(type: string) {
    setRequestType(type);

    setStartTime("");
    setEndTime("");
    setReason("");
    setMessage("");
  }

  async function handleSubmitRequest() {
    if (!employee) return;

    setMessage("");

    if (!requestDate) {
      setMessageType("error");
      setMessage("Vui lòng chọn ngày.");
      return;
    }

    if (
      (requestType === "overtime" ||
        requestType === "checkin_missing") &&
      (!startTime || !endTime)
    ) {
      setMessageType("error");
      setMessage(
        "Vui lòng nhập đầy đủ giờ bắt đầu và kết thúc."
      );
      return;
    }

    if (
      requestType === "late" &&
      !startTime
    ) {
      setMessageType("error");
      setMessage(
        "Vui lòng nhập giờ đến."
      );
      return;
    }

    if (
      requestType === "early_leave" &&
      !endTime
    ) {
      setMessageType("error");
      setMessage(
        "Vui lòng nhập giờ về."
      );
      return;
    }

    setSubmittingRequest(true);

    const { error } = await supabase
      .from("requests")
      .insert({
        employee_id: employee.id,

        request_type: requestType,

        request_date: requestDate,

        start_time:
          requestType === "late" ||
          requestType === "overtime" ||
          requestType === "checkin_missing"
            ? startTime
            : null,

        end_time:
          requestType === "early_leave" ||
          requestType === "overtime" ||
          requestType === "checkin_missing"
            ? endTime
            : null,

        reason:
          reason.trim() || null,

        status: "pending",
      });

    setSubmittingRequest(false);

    if (error) {
      setMessageType("error");

      setMessage(
        "Không thể gửi yêu cầu: " +
          error.message
      );

      return;
    }

    setMessageType("success");

    setMessage(
      "Gửi yêu cầu thành công. Vui lòng chờ quản lý duyệt."
    );

    setRequestDate(getToday());
    setStartTime("");
    setEndTime("");
    setReason("");

    await loadRequests(employee.id);
  }

  async function handleLogout() {
    const confirmed = window.confirm(
      "Bạn có chắc muốn đăng xuất không?"
    );

    if (!confirmed) return;

    await supabase.auth.signOut();

    window.location.href = "/login";
  }

  function getScheduleForDate(date: string) {
    return (
      weekSchedules.find(
        (item) =>
          item.work_date === date
      ) || null
    );
  }

  if (loading) {
    return (
      <div className="employee-loading">
        Đang tải...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="employee-loading">
        Không tìm thấy thông tin nhân viên.
      </div>
    );
  }

  const weekEnd = new Date(weekStart);

  weekEnd.setDate(
    weekStart.getDate() + 6
  );

  return (
    <main className="employee-page">
      <header className="employee-header">
        <div>
          <h1>SOBA STAFF</h1>

          <p>Giao diện nhân viên</p>
        </div>

        <button
          onClick={handleLogout}
          className="logout-button"
        >
          Đăng xuất
        </button>
      </header>

      <section className="employee-welcome">
        <p>Xin chào</p>

        <h2>{employee.full_name}</h2>

        <span>
          {employee.employment_type ===
          "full_time"
            ? "Nhân viên Full-time"
            : "Nhân viên Part-time"}
        </span>
      </section>

      <section className="employee-card">
        <h2>Chấm công hôm nay</h2>

        <div className="attendance-grid">
          <div className="attendance-box">
            <span>Check-in</span>

            <strong>
              {formatTime(checkInTime)}
            </strong>
          </div>

          <div className="attendance-box">
            <span>Check-out</span>

            <strong>
              {formatTime(checkOutTime)}
            </strong>
          </div>
        </div>

        <div className="attendance-actions">
          <button
            onClick={handleCheckIn}
            disabled={
              attendanceLoading ||
              !!checkInTime
            }
          >
            {attendanceLoading
              ? "Đang xử lý..."
              : checkInTime
              ? "ĐÃ CHECK-IN"
              : "CHECK-IN"}
          </button>

          <button
            onClick={handleCheckOut}
            disabled={
              attendanceLoading ||
              !checkInTime ||
              !!checkOutTime
            }
          >
            {attendanceLoading
              ? "Đang xử lý..."
              : checkOutTime
              ? "ĐÃ CHECK-OUT"
              : "CHECK-OUT"}
          </button>
        </div>
      </section>

      <section className="employee-card">
        <div className="section-heading">
          <h2>Lịch làm việc</h2>
        </div>

        <div className="week-navigation">
          <button
            onClick={() => {
              const newDate =
                new Date(weekStart);

              newDate.setDate(
                newDate.getDate() - 7
              );

              setWeekStart(newDate);
            }}
          >
            ← Tuần trước
          </button>

          <strong>
            {formatVNDate(weekStart)} -{" "}
            {formatVNDate(weekEnd)}
          </strong>

          <button
            onClick={() => {
              const newDate =
                new Date(weekStart);

              newDate.setDate(
                newDate.getDate() + 7
              );

              setWeekStart(newDate);
            }}
          >
            Tuần sau →
          </button>
        </div>

        <div className="week-schedule">
          {weekDays.map((day) => {
            const date = formatDate(day);

            const schedule =
              getScheduleForDate(date);

            return (
              <div
                className="week-day-card"
                key={date}
              >
                <strong>
                  {[
                    "Chủ nhật",
                    "Thứ 2",
                    "Thứ 3",
                    "Thứ 4",
                    "Thứ 5",
                    "Thứ 6",
                    "Thứ 7",
                  ][day.getDay()]}
                </strong>

                <span>
                  {formatVNDate(day)}
                </span>

                {schedule ? (
                  <>
                    <b>
                      {schedule.shift_name ||
                        "Chưa xếp ca"}
                    </b>

                    {schedule.start_time &&
                    schedule.end_time ? (
                      <small>
                        {formatTime(
                          schedule.start_time
                        )}{" "}
                        -{" "}
                        {formatTime(
                          schedule.end_time
                        )}
                      </small>
                    ) : (
                      <small>
                        {schedule.shift_name ===
                        "Nghỉ"
                          ? "Nghỉ"
                          : ""}
                      </small>
                    )}
                  </>
                ) : (
                  <>
                    <b>Chưa có lịch</b>
                    <small>--</small>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="employee-card">
        <h2>Gửi yêu cầu</h2>

        <div className="request-type-grid">
          <button
            type="button"
            className={
              requestType === "leave"
                ? "request-type active"
                : "request-type"
            }
            onClick={() =>
              handleRequestTypeChange("leave")
            }
          >
            Xin nghỉ
          </button>

          <button
            type="button"
            className={
              requestType === "late"
                ? "request-type active"
                : "request-type"
            }
            onClick={() =>
              handleRequestTypeChange("late")
            }
          >
            Đi muộn
          </button>

          <button
            type="button"
            className={
              requestType === "early_leave"
                ? "request-type active"
                : "request-type"
            }
            onClick={() =>
              handleRequestTypeChange(
                "early_leave"
              )
            }
          >
            Về sớm
          </button>

          <button
            type="button"
            className={
              requestType === "overtime"
                ? "request-type active"
                : "request-type"
            }
            onClick={() =>
              handleRequestTypeChange(
                "overtime"
              )
            }
          >
            Tăng ca
          </button>

          <button
            type="button"
            className={
              requestType ===
              "checkin_missing"
                ? "request-type active"
                : "request-type"
            }
            onClick={() =>
              handleRequestTypeChange(
                "checkin_missing"
              )
            }
          >
            Bổ sung công
          </button>
        </div>

        <div className="request-form">
          <label>
            Ngày

            <input
              type="date"
              value={requestDate}
              onChange={(e) =>
                setRequestDate(e.target.value)
              }
            />
          </label>

          {(requestType === "late" ||
            requestType === "overtime" ||
            requestType ===
              "checkin_missing") && (
            <label>
              {requestType === "late"
                ? "Giờ đến"
                : "Giờ bắt đầu"}

              <input
                type="time"
                value={startTime}
                onChange={(e) =>
                  setStartTime(e.target.value)
                }
              />
            </label>
          )}

          {(requestType ===
            "early_leave" ||
            requestType === "overtime" ||
            requestType ===
              "checkin_missing") && (
            <label>
              {requestType ===
              "early_leave"
                ? "Giờ về"
                : "Giờ kết thúc"}

              <input
                type="time"
                value={endTime}
                onChange={(e) =>
                  setEndTime(e.target.value)
                }
              />
            </label>
          )}

          <label>
            Lý do

            <textarea
              placeholder="Nhập lý do..."
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
            />
          </label>

          <button
            className="submit-request-button"
            onClick={handleSubmitRequest}
            disabled={submittingRequest}
          >
            {submittingRequest
              ? "Đang gửi..."
              : "Gửi yêu cầu"}
          </button>

          {message && (
            <div
              className={
                messageType === "success"
                  ? "form-message success"
                  : "form-message error"
              }
            >
              {message}
            </div>
          )}
        </div>
      </section>

      <section className="employee-card">
        <h2>Yêu cầu của tôi</h2>

        {requests.length === 0 ? (
          <p>Chưa có yêu cầu nào.</p>
        ) : (
          <div className="request-list">
            {requests.map((request) => (
              <div
                className="request-item"
                key={request.id}
              >
                <div className="request-item-top">
                  <strong>
                    {requestTypeLabel(
                      request.request_type
                    )}
                  </strong>

                  <span
                    className={statusClass(
                      request.status
                    )}
                  >
                    {requestStatusLabel(
                      request.status
                    )}
                  </span>
                </div>

                <p>
                  Ngày:{" "}
                  {new Date(
                    request.request_date +
                      "T00:00:00"
                  ).toLocaleDateString(
                    "vi-VN"
                  )}
                </p>

                {(request.start_time ||
                  request.end_time) && (
                  <p>
                    Thời gian:{" "}
                    {request.start_time
                      ? formatTime(
                          request.start_time
                        )
                      : "--:--"}{" "}
                    -{" "}
                    {request.end_time
                      ? formatTime(
                          request.end_time
                        )
                      : "--:--"}
                  </p>
                )}

                {request.reason && (
                  <p>
                    Lý do: {request.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
