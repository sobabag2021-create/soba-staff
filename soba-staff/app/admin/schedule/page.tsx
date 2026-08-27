"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  employment_type: string;
};

type ScheduleItem = {
  shift_name: string;
  start_time: string;
  end_time: string;
};

type ScheduleMap = {
  [key: string]: ScheduleItem;
};

const shiftOptions = [
  {
    name: "Nghỉ",
    start: "",
    end: "",
  },
  {
    name: "08:00 - 18:00",
    start: "08:00",
    end: "18:00",
  },
  {
    name: "07:00 - 17:00",
    start: "07:00",
    end: "17:00",
  },
  {
    name: "07:30 - 17:30",
    start: "07:30",
    end: "17:30",
  },
  {
    name: "06:30 - 16:30",
    start: "06:30",
    end: "16:30",
  },
];

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatVN(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(
    getMonday(new Date())
  );
  const [scheduleMap, setScheduleMap] = useState<ScheduleMap>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, employment_type")
      .eq("role", "employee")
      .order("full_name");

    if (error) {
      console.error("Lỗi tải nhân viên:", error);
      setMessage(`Không thể tải nhân viên: ${error.message}`);
      setEmployees([]);
      return;
    }

    setEmployees(data || []);
  }

  async function loadSchedules() {
    const start = formatDate(weekStart);

    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6);

    const end = formatDate(endDate);

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .gte("work_date", start)
      .lte("work_date", end);

    if (error) {
      console.error("Lỗi tải lịch:", error);
      setMessage(`Không thể tải lịch: ${error.message}`);
      return;
    }

    const map: ScheduleMap = {};

    (data || []).forEach((item) => {
      map[`${item.employee_id}_${item.work_date}`] = {
        shift_name: item.shift_name || "",
        start_time: item.start_time
          ? item.start_time.slice(0, 5)
          : "",
        end_time: item.end_time
          ? item.end_time.slice(0, 5)
          : "",
      };
    });

    setScheduleMap(map);
  }

  async function loadData() {
    setLoading(true);
    setMessage("");

    await Promise.all([
      loadEmployees(),
      loadSchedules(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [weekStart]);

  function getWeekDays() {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      return day;
    });
  }

  function updateShift(
    employeeId: string,
    date: string,
    value: string
  ) {
    const key = `${employeeId}_${date}`;

    if (!value) {
      setScheduleMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      return;
    }

    const shift = shiftOptions.find(
      (item) => item.name === value
    );

    if (!shift) return;

    setScheduleMap((prev) => ({
      ...prev,
      [key]: {
        shift_name: shift.name,
        start_time: shift.start,
        end_time: shift.end,
      },
    }));
  }

  async function saveSchedule(
    employeeId: string,
    date: string
  ) {
    const item = scheduleMap[`${employeeId}_${date}`];

    if (!item) {
      setMessage("Vui lòng chọn ca trước khi lưu.");
      return;
    }

    setMessage("Đang lưu lịch...");

    const { error } = await supabase
      .from("schedules")
      .upsert(
        {
          employee_id: employeeId,
          work_date: date,
          shift_name: item.shift_name,
          start_time: item.start_time || null,
          end_time: item.end_time || null,
        },
        {
          onConflict: "employee_id,work_date",
        }
      );

    if (error) {
      console.error("Lỗi lưu lịch:", error);
      setMessage(`Không thể lưu lịch: ${error.message}`);
      return;
    }

    setMessage("Đã lưu lịch thành công.");
    await loadSchedules();
  }

  const days = getWeekDays();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h1>
          SOBA
          <br />
          STAFF
        </h1>

        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/employees">Nhân viên</Link>
        <Link href="/admin/schedule">Lịch làm</Link>
        <Link href="/admin/requests">Đơn từ</Link>
        <Link href="/admin/attendance">Chấm công</Link>
        <Link href="/admin/report">Báo cáo</Link>
      </aside>

      <main className="admin-main schedule-page">
        <h1>Quản Lý Lịch Làm Việc (Admin)</h1>

        <div className="week-controls">
          <button
            onClick={() => {
              const date = new Date(weekStart);
              date.setDate(date.getDate() - 7);
              setWeekStart(getMonday(date));
            }}
          >
            ← Tuần trước
          </button>

          <strong>
            {formatDate(weekStart)} -{" "}
            {formatDate(weekEnd)}
          </strong>

          <button
            onClick={() => {
              const date = new Date(weekStart);
              date.setDate(date.getDate() + 7);
              setWeekStart(getMonday(date));
            }}
          >
            Tuần sau →
          </button>

          <button
            onClick={() =>
              setWeekStart(getMonday(new Date()))
            }
          >
            Tuần hiện tại
          </button>
        </div>

        {message && (
          <div
            style={{
              margin: "16px 0",
              padding: "12px",
              borderRadius: "8px",
              background: "#f1f1f1",
              color: "#263238",
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : (
          <div className="schedule-table">
            <div className="schedule-header">
              <div>Nhân viên</div>

              {days.map((day) => (
                <div key={formatDate(day)}>
                  <strong>
                    {
                      [
                        "CN",
                        "T2",
                        "T3",
                        "T4",
                        "T5",
                        "T6",
                        "T7",
                      ][day.getDay()]
                    }
                  </strong>

                  <br />

                  {formatVN(day)}
                </div>
              ))}
            </div>

            {employees.length === 0 && (
              <div
                style={{
                  padding: "24px",
                  color: "#263238",
                }}
              >
                Không tìm thấy nhân viên nào.
              </div>
            )}

            {employees.map((employee) => (
              <div
                className="schedule-row"
                key={employee.id}
              >
                <div className="employee-name">
                  <strong>{employee.full_name}</strong>

                  <br />

                  <span>
                    {employee.employment_type ===
                    "full_time"
                      ? "Full-time"
                      : "Part-time"}
                  </span>
                </div>

                {days.map((day) => {
                  const date = formatDate(day);

                  const item =
                    scheduleMap[
                      `${employee.id}_${date}`
                    ];

                  return (
                    <div
                      className="schedule-cell"
                      key={date}
                    >
                      <select
                        value={item?.shift_name || ""}
                        onChange={(e) =>
                          updateShift(
                            employee.id,
                            date,
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          Chọn ca
                        </option>

                        {shiftOptions.map((shift) => (
                          <option
                            key={shift.name}
                            value={shift.name}
                          >
                            {shift.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() =>
                          saveSchedule(
                            employee.id,
                            date
                          )
                        }
                      >
                        Lưu
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
