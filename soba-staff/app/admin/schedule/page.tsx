"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

function addHours(time: string, hours: number) {
  const [hour, minute] = time.split(":").map(Number);

  let newHour = hour + hours;

  if (newHour >= 24) {
    newHour -= 24;
  }

  return `${String(newHour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}`;
}

function createFullTimeShifts() {
  const shifts = [];

  let hour = 4;
  let minute = 30;

  while (hour < 11 || (hour === 11 && minute === 0)) {
    const start = `${String(hour).padStart(2, "0")}:${String(
      minute
    ).padStart(2, "0")}`;

    const end = addHours(start, 10);

    shifts.push({
      name: `${start} - ${end}`,
      start,
      end,
    });

    minute += 30;

    if (minute >= 60) {
      minute = 0;
      hour += 1;
    }
  }

  return shifts;
}

const fullTimeShifts = [
  {
    name: "Nghỉ",
    start: "",
    end: "",
  },
  ...createFullTimeShifts(),
];

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [weekStart, setWeekStart] = useState(
    getMonday(new Date())
  );

  const [scheduleMap, setScheduleMap] =
    useState<ScheduleMap>({});

  const [loading, setLoading] = useState(true);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("role", "employee")
      .order("full_name");

    if (error) {
      console.error(error);
      return;
    }

    setEmployees(data || []);
  }

  async function loadSchedules() {
    setLoading(true);

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
      console.error(error);
      setLoading(false);
      return;
    }

    const map: ScheduleMap = {};

    (data || []).forEach((item) => {
      const startTime = item.start_time
        ? item.start_time.slice(0, 5)
        : "";

      const endTime = item.end_time
        ? item.end_time.slice(0, 5)
        : "";

      map[`${item.employee_id}_${item.work_date}`] = {
        shift_name:
          item.shift_name ||
          (startTime && endTime
            ? `${startTime} - ${endTime}`
            : ""),
        start_time: startTime,
        end_time: endTime,
      };
    });

    setScheduleMap(map);
    setLoading(false);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [weekStart]);

  function getWeekDays() {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);

      day.setDate(weekStart.getDate() + index);

      return day;
    });
  }

  function updateFullTimeShift(
    employeeId: string,
    date: string,
    value: string
  ) {
    const shift = fullTimeShifts.find(
      (item) => item.name === value
    );

    if (!shift) return;

    setScheduleMap((prev) => ({
      ...prev,
      [`${employeeId}_${date}`]: {
        shift_name: shift.name,
        start_time: shift.start,
        end_time: shift.end,
      },
    }));
  }

  function updatePartTimeStart(
    employeeId: string,
    date: string,
    value: string
  ) {
    const key = `${employeeId}_${date}`;

    setScheduleMap((prev) => ({
      ...prev,
      [key]: {
        shift_name:
          prev[key]?.end_time && value
            ? `${value} - ${prev[key].end_time}`
            : "",
        start_time: value,
        end_time: prev[key]?.end_time || "",
      },
    }));
  }

  function updatePartTimeEnd(
    employeeId: string,
    date: string,
    value: string
  ) {
    const key = `${employeeId}_${date}`;

    setScheduleMap((prev) => ({
      ...prev,
      [key]: {
        shift_name:
          prev[key]?.start_time && value
            ? `${prev[key].start_time} - ${value}`
            : "",
        start_time: prev[key]?.start_time || "",
        end_time: value,
      },
    }));
  }

  async function saveSchedule(
    employeeId: string,
    date: string
  ) {
    const key = `${employeeId}_${date}`;

    const item = scheduleMap[key];

    if (!item) {
      alert("Vui lòng chọn ca hoặc nhập giờ làm.");
      return;
    }

    if (
      item.shift_name === "Nghỉ" &&
      !item.start_time &&
      !item.end_time
    ) {
      const { error } = await supabase
        .from("schedules")
        .upsert(
          {
            employee_id: employeeId,
            work_date: date,
            shift_name: "Nghỉ",
            start_time: null,
            end_time: null,
          },
          {
            onConflict: "employee_id,work_date",
          }
        );

      if (error) {
        alert(`Không thể lưu: ${error.message}`);
        return;
      }

      alert("Đã lưu lịch nghỉ.");
      await loadSchedules();
      return;
    }

    if (!item.start_time || !item.end_time) {
      alert("Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc.");
      return;
    }

    if (item.end_time <= item.start_time) {
      alert("Giờ kết thúc phải lớn hơn giờ bắt đầu.");
      return;
    }

    const shiftName =
      item.shift_name ||
      `${item.start_time} - ${item.end_time}`;

    const { error } = await supabase
      .from("schedules")
      .upsert(
        {
          employee_id: employeeId,
          work_date: date,
          shift_name: shiftName,
          start_time: item.start_time,
          end_time: item.end_time,
        },
        {
          onConflict: "employee_id,work_date",
        }
      );

    if (error) {
      alert(`Không thể lưu: ${error.message}`);
      return;
    }

    alert("Đã lưu lịch làm.");
    await loadSchedules();
  }

  async function deleteSchedule(
    employeeId: string,
    date: string
  ) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa ca làm này không?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("employee_id", employeeId)
      .eq("work_date", date);

    if (error) {
      alert(`Không thể xóa: ${error.message}`);
      return;
    }

    setScheduleMap((prev) => {
      const newMap = { ...prev };

      delete newMap[`${employeeId}_${date}`];

      return newMap;
    });

    alert("Đã xóa ca.");
  }

  const days = getWeekDays();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const dayNames = [
    "Chủ nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

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
        <div className="page-top">
          <div>
            <h1>Xếp lịch làm</h1>
          </div>

          <div className="week-controls">
            <button
              onClick={() => {
                const date = new Date(weekStart);

                date.setDate(date.getDate() - 7);

                setWeekStart(date);
              }}
            >
              ← Tuần trước
            </button>

            <button
              onClick={() => {
                setWeekStart(getMonday(new Date()));
              }}
            >
              Tuần hiện tại
            </button>

            <button
              onClick={() => {
                const date = new Date(weekStart);

                date.setDate(date.getDate() + 7);

                setWeekStart(date);
              }}
            >
              Tuần sau →
            </button>
          </div>
        </div>

        <div className="week-range">
          {formatDate(weekStart)} - {formatDate(weekEnd)}
        </div>

        <div className="schedule-table">
          <div className="schedule-header">
            <div className="employee-header">
              Nhân viên
            </div>

            {days.map((day) => (
              <div
                className="day-header"
                key={formatDate(day)}
              >
                <strong>
                  {dayNames[day.getDay()]}
                </strong>

                <br />

                <span>{formatVN(day)}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="schedule-loading">
              Đang tải lịch làm...
            </div>
          ) : (
            employees.map((employee) => (
              <div
                className="schedule-row"
                key={employee.id}
              >
                <div className="employee-name">
                  <strong>
                    {employee.full_name}
                  </strong>

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

                  const key =
                    `${employee.id}_${date}`;

                  const item = scheduleMap[key];

                  const isFullTime =
                    employee.employment_type ===
                    "full_time";

                  return (
                    <div
                      className="schedule-cell"
                      key={date}
                    >
                      {isFullTime ? (
                        <>
                          <select
                            value={
                              item?.shift_name || ""
                            }
                            onChange={(e) =>
                              updateFullTimeShift(
                                employee.id,
                                date,
                                e.target.value
                              )
                            }
                          >
                            <option value="">
                              Chọn ca
                            </option>

                            {fullTimeShifts.map(
                              (shift) => (
                                <option
                                  key={shift.name}
                                  value={shift.name}
                                >
                                  {shift.name}
                                </option>
                              )
                            )}
                          </select>

                          {item && (
                            <button
                              type="button"
                              className="delete-shift-btn"
                              onClick={() =>
                                deleteSchedule(
                                  employee.id,
                                  date
                                )
                              }
                            >
                              Xóa ca
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <input
                            type="time"
                            min="00:00"
                            max="23:59"
                            value={
                              item?.start_time || ""
                            }
                            onChange={(e) =>
                              updatePartTimeStart(
                                employee.id,
                                date,
                                e.target.value
                              )
                            }
                          />

                          <input
                            type="time"
                            min="00:00"
                            max="23:59"
                            value={
                              item?.end_time || ""
                            }
                            onChange={(e) =>
                              updatePartTimeEnd(
                                employee.id,
                                date,
                                e.target.value
                              )
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              saveSchedule(
                                employee.id,
                                date
                              )
                            }
                          >
                            Lưu
                          </button>

                          {item && (
                            <button
                              type="button"
                              className="delete-shift-btn"
                              onClick={() =>
                                deleteSchedule(
                                  employee.id,
                                  date
                                )
                              }
                            >
                              Xóa
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
