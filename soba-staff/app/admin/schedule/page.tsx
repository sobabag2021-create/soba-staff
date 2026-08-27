"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  employment_type: string;
};

type ScheduleMap = {
  [key: string]: {
    shift_name: string;
    start_time: string;
    end_time: string;
  };
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
  const diff =
    day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

function formatDate(date: Date) {
  return date
    .toISOString()
    .split("T")[0];
}

function formatVN(date: Date) {
  return date.toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
    }
  );
}

export default function SchedulePage() {
  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [weekStart, setWeekStart] =
    useState(getMonday(new Date()));

  const [scheduleMap, setScheduleMap] =
    useState<ScheduleMap>({});

  async function loadEmployees() {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("role", "employee")
      .order("full_name");

    setEmployees(data || []);
  }

  async function loadSchedules() {
    const start = formatDate(weekStart);

    const endDate = new Date(weekStart);
    endDate.setDate(
      endDate.getDate() + 6
    );

    const end = formatDate(endDate);

    const { data } = await supabase
      .from("schedules")
      .select("*")
      .gte("work_date", start)
      .lte("work_date", end);

    const map: ScheduleMap = {};

    (data || []).forEach((item) => {
      map[
        `${item.employee_id}_${item.work_date}`
      ] = {
        shift_name: item.shift_name,
        start_time:
          item.start_time?.slice(0, 5) || "",
        end_time:
          item.end_time?.slice(0, 5) || "",
      };
    });

    setScheduleMap(map);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [weekStart]);

  function getWeekDays() {
    return Array.from(
      { length: 7 },
      (_, index) => {
        const day = new Date(weekStart);

        day.setDate(
          weekStart.getDate() + index
        );

        return day;
      }
    );
  }

  function updateShift(
    employeeId: string,
    date: string,
    value: string
  ) {
    const shift = shiftOptions.find(
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

  async function saveSchedule(
    employeeId: string,
    date: string
  ) {
    const item =
      scheduleMap[
        `${employeeId}_${date}`
      ];

    if (!item) return;

    const { error } = await supabase
      .from("schedules")
      .upsert(
        {
          employee_id: employeeId,
          work_date: date,
          shift_name: item.shift_name,
          start_time:
            item.start_time || null,
          end_time:
            item.end_time || null,
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

    alert("Đã lưu lịch.");
  }

  const days = getWeekDays();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(
    weekEnd.getDate() + 6
  );

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h1>SOBA<br />STAFF</h1>

        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/employees">Nhân viên</Link>
        <Link href="/admin/schedule">Lịch làm</Link>
        <Link href="/admin/requests">Đơn từ</Link>
        <Link href="/admin/attendance">Chấm công</Link>
        <Link href="/admin/report">Báo cáo</Link>
      </aside>

      <main className="admin-main schedule-page">
        <h1>Xếp lịch làm</h1>

        <div className="week-controls">
          <button
            onClick={() => {
              const date = new Date(weekStart);

              date.setDate(
                date.getDate() - 7
              );

              setWeekStart(date);
            }}
          >
            ← Tuần trước
          </button>

          <button
            onClick={() =>
              setWeekStart(
                getMonday(new Date())
              )
            }
          >
            Tuần hiện tại
          </button>

          <button
            onClick={() => {
              const date = new Date(weekStart);

              date.setDate(
                date.getDate() + 7
              );

              setWeekStart(date);
            }}
          >
            Tuần sau →
          </button>

          <strong>
            {formatDate(weekStart)} đến{" "}
            {formatDate(weekEnd)}
          </strong>
        </div>

        <div className="schedule-table">
          <div className="schedule-header">
            <div>Nhân viên</div>

            {days.map((day) => (
              <div key={formatDate(day)}>
                <strong>
                  {[
                    "Chủ nhật",
                    "Thứ Hai",
                    "Thứ Ba",
                    "Thứ Tư",
                    "Thứ Năm",
                    "Thứ Sáu",
                    "Thứ Bảy",
                  ][day.getDay()]}
                </strong>

                <br />

                {formatVN(day)}
              </div>
            ))}
          </div>

          {employees.map((employee) => (
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
                      value={
                        item?.shift_name ||
                        ""
                      }
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

                      {shiftOptions.map(
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
      </main>
    </div>
  );
}
