"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  employment_type: string;
};

type Schedule = {
  work_date: string;
  shift_name: string;
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
};

type Attendance = {
  check_in: string | null;
  check_out: string | null;
};

function getMonday(date: Date) {
  const result = new Date(date);

  const day = result.getDay();

  const diff =
    day === 0 ? -6 : 1 - day;

  result.setDate(
    result.getDate() + diff
  );

  result.setHours(0, 0, 0, 0);

  return result;
}

function formatDate(date: Date) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatVN(date: Date) {
  return date.toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function getRequestName(type: string) {
  const names: Record<
    string,
    string
  > = {
    leave: "Xin nghỉ",
    late: "Xin đi muộn",
    early_leave: "Xin về sớm",
    overtime: "Xin tăng ca",
    checkin_missing: "Bổ sung công",
  };

  return names[type] || type;
}

function getStatusName(status: string) {
  if (status === "approved")
    return "Đã duyệt";

  if (status === "rejected")
    return "Từ chối";

  return "Chờ duyệt";
}

export default function EmployeePage() {
  const router = useRouter();

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [weekStart, setWeekStart] =
    useState(getMonday(new Date()));

  const [schedules, setSchedules] =
    useState<Schedule[]>([]);

  const [requests, setRequests] =
    useState<RequestItem[]>([]);

  const [attendance, setAttendance] =
    useState<Attendance | null>(null);

  const [requestType, setRequestType] =
    useState("leave");

  const [requestDate, setRequestDate] =
    useState(
      formatDate(new Date())
    );

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const savedUser =
      localStorage.getItem("soba_staff_user");

    if (!savedUser) {
      router.replace("/login");
      return;
    }

    const user =
      JSON.parse(savedUser);

    if (user.role === "admin") {
      router.replace("/admin");
      return;
    }

    setEmployee(user);
  }, [router]);

  useEffect(() => {
    if (!employee) return;

    loadSchedules();
    loadRequests();
    loadAttendance();
  }, [employee, weekStart]);

  async function loadSchedules() {
    if (!employee) return;

    const start =
      formatDate(weekStart);

    const endDate =
      new Date(weekStart);

    endDate.setDate(
      endDate.getDate() + 6
    );

    const end =
      formatDate(endDate);

    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("employee_id", employee.id)
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date");

    setSchedules(data || []);
  }

  async function loadRequests() {
    if (!employee) return;

    const { data } = await supabase
      .from("requests")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", {
        ascending: false,
      });

    setRequests(data || []);
  }

  async function loadAttendance() {
    if (!employee) return;

    const today =
      formatDate(new Date());

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("work_date", today)
      .maybeSingle();

    setAttendance(data || null);
  }

  async function handleCheckIn() {
    if (!employee) return;

    const now = new Date();

    const today =
      formatDate(now);

    const time =
      now.toTimeString().slice(0, 5);

    const { error } = await supabase
      .from("attendance")
      .upsert(
        {
          employee_id: employee.id,
          work_date: today,
          check_in: time,
        },
        {
          onConflict:
            "employee_id,work_date",
        }
      );

    if (error) {
      alert(error.message);
      return;
    }

    loadAttendance();
  }

  async function handleCheckOut() {
    if (!employee) return;

    const now = new Date();

    const today =
      formatDate(now);

    const time =
      now.toTimeString().slice(0, 5);

    const { error } = await supabase
      .from("attendance")
      .upsert(
        {
          employee_id: employee.id,
          work_date: today,
          check_out: time,
        },
        {
          onConflict:
            "employee_id,work_date",
        }
      );

    if (error) {
      alert(error.message);
      return;
    }

    loadAttendance();
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
      (requestType === "overtime" ||
        requestType ===
          "checkin_missing") &&
      (!startTime || !endTime)
    ) {
      setMessage(
        "Vui lòng nhập đầy đủ giờ bắt đầu và kết thúc."
      );
      return;
    }

    if (
      requestType === "late" &&
      !startTime
    ) {
      setMessage(
        "Vui lòng nhập giờ đi làm."
      );
      return;
    }

    if (
      requestType === "early_leave" &&
      !endTime
    ) {
      setMessage(
        "Vui lòng nhập giờ về."
      );
      return;
    }

    const { error } = await supabase
      .from("requests")
      .insert({
        employee_id: employee.id,
        request_type: requestType,
        request_date: requestDate,

        start_time:
          requestType === "late" ||
          requestType === "overtime" ||
          requestType ===
            "checkin_missing"
            ? startTime
            : null,

        end_time:
          requestType ===
            "early_leave" ||
          requestType === "overtime" ||
          requestType ===
            "checkin_missing"
            ? endTime
            : null,

        reason:
          reason.trim() || null,

        status: "pending",
      });

    if (error) {
      setMessage(
        `Không thể gửi yêu cầu: ${error.message}`
      );
      return;
    }

    setMessage(
      "Đã gửi yêu cầu thành công."
    );

    setStartTime("");
    setEndTime("");
    setReason("");

    loadRequests();
  }

  function getWeekDays() {
    return Array.from(
      { length: 7 },
      (_, index) => {
        const day =
          new Date(weekStart);

        day.setDate(
          weekStart.getDate() + index
        );

        return day;
      }
    );
  }

  function getSchedule(
    date: string
  ) {
    return schedules.find(
      (item) =>
        item.work_date === date
    );
  }

  function handleLogout() {
    localStorage.removeItem(
      "soba_staff_user"
    );

    router.push("/login");
  }

  const days =
    getWeekDays();

  const weekEnd =
    new Date(weekStart);

  weekEnd.setDate(
    weekEnd.getDate() + 6
  );

  return (
    <main className="employee-page">
      <div className="employee-container">
        <header className="employee-header">
          <div>
            <h1>SOBA STAFF</h1>

            <p>
              Giao diện nhân viên
            </p>
          </div>

          <button
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </header>

        <section className="employee-welcome">
          <p>Xin chào</p>

          <h2>
            {employee?.full_name}
          </h2>

          <span>
            {employee?.employment_type ===
            "full_time"
              ? "Full-time"
              : "Part-time"}
          </span>
        </section>

        <section className="employee-section">
          <h2>
            Chấm công hôm nay
          </h2>

          <div className="attendance-grid">
            <div className="attendance-box">
              <span>Check-in</span>

              <strong>
                {attendance?.check_in ||
                  "--:--"}
              </strong>
            </div>

            <div className="attendance-box">
              <span>Check-out</span>

              <strong>
                {attendance?.check_out ||
                  "--:--"}
              </strong>
            </div>
          </div>

          <div className="attendance-buttons">
            <button
              onClick={handleCheckIn}
              disabled={
                !!attendance?.check_in
              }
            >
              CHECK-IN
            </button>

            <button
              onClick={handleCheckOut}
              disabled={
                !attendance?.check_in ||
                !!attendance?.check_out
              }
            >
              CHECK-OUT
            </button>
          </div>
        </section>

        <section className="employee-section">
          <h2>
            Lịch làm việc
          </h2>

          <div className="employee-week-controls">
            <button
              onClick={() => {
                const date =
                  new Date(weekStart);

                date.setDate(
                  date.getDate() - 7
                );

                setWeekStart(date);
              }}
            >
              ← Tuần trước
            </button>

            <strong>
              {formatVN(weekStart)} -{" "}
              {formatVN(weekEnd)}
            </strong>

            <button
              onClick={() => {
                const date =
                  new Date(weekStart);

                date.setDate(
                  date.getDate() + 7
                );

                setWeekStart(date);
              }}
            >
              Tuần sau →
            </button>
          </div>

          <div className="employee-schedule-grid">
            {days.map((day) => {
              const date =
                formatDate(day);

              const schedule =
                getSchedule(date);

              return (
                <div
                  className="employee-day-card"
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
                    {formatVN(day)}
                  </span>

                  <div className="shift-display">
                    {schedule
                      ? schedule.start_time &&
                        schedule.end_time
                        ? `${schedule.start_time.slice(
                            0,
                            5
                          )} - ${schedule.end_time.slice(
                            0,
                            5
                          )}`
                        : "Nghỉ"
                      : "Nghỉ"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="employee-section">
          <h2>
            Gửi yêu cầu
          </h2>

          <div className="request-type-buttons">
            <button
              className={
                requestType === "leave"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setRequestType("leave")
              }
            >
              Xin nghỉ
            </button>

            <button
              className={
                requestType === "late"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setRequestType("late")
              }
            >
              Đi muộn
            </button>

            <button
              className={
                requestType ===
                "early_leave"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setRequestType(
                  "early_leave"
                )
              }
            >
              Về sớm
            </button>

            <button
              className={
                requestType ===
                "overtime"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setRequestType(
                  "overtime"
                )
              }
            >
              Tăng ca
            </button>

            <button
              className={
                requestType ===
                "checkin_missing"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setRequestType(
                  "checkin_missing"
                )
              }
            >
              Bổ sung công
            </button>
          </div>

          <input
            type="date"
            value={requestDate}
            onChange={(e) =>
              setRequestDate(
                e.target.value
              )
            }
          />

          {(requestType === "late" ||
            requestType ===
              "overtime" ||
            requestType ===
              "checkin_missing") && (
            <div className="time-input-group">
              <label>
                Giờ bắt đầu
              </label>

              <input
                type="time"
                value={startTime}
                onChange={(e) =>
                  setStartTime(
                    e.target.value
                  )
                }
              />
            </div>
          )}

          {(requestType ===
            "early_leave" ||
            requestType ===
              "overtime" ||
            requestType ===
              "checkin_missing") && (
            <div className="time-input-group">
              <label>
                Giờ kết thúc
              </label>

              <input
                type="time"
                value={endTime}
                onChange={(e) =>
                  setEndTime(
                    e.target.value
                  )
                }
              />
            </div>
          )}

          <textarea
            placeholder="Nhập lý do..."
            value={reason}
            onChange={(e) =>
              setReason(e.target.value)
            }
          />

          <button
            className="submit-request-button"
            onClick={
              handleSubmitRequest
            }
          >
            Gửi yêu cầu
          </button>

          {message && (
            <div className="request-message">
              {message}
            </div>
          )}
        </section>

        <section className="employee-section">
          <h2>
            Yêu cầu của tôi
          </h2>

          <div className="request-list">
            {requests.map(
              (item) => (
                <div
                  className="request-card"
                  key={item.id}
                >
                  <div>
                    <strong>
                      {getRequestName(
                        item.request_type
                      )}
                    </strong>

                    <p>
                      Ngày:{" "}
                      {formatVN(
                        new Date(
                          item.request_date
                        )
                      )}
                    </p>

                    {(item.start_time ||
                      item.end_time) && (
                      <p>
                        Thời gian:{" "}
                        {item.start_time
                          ?.slice(0, 5) ||
                          "--:--"}{" "}
                        -{" "}
                        {item.end_time
                          ?.slice(0, 5) ||
                          "--:--"}
                      </p>
                    )}

                    {item.reason && (
                      <p>
                        Lý do:
                        <br />
                        {item.reason}
                      </p>
                    )}
                  </div>

                  <span
                    className={`status ${item.status}`}
                  >
                    {getStatusName(
                      item.status
                    )}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
