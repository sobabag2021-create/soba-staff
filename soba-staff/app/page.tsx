"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Employee = {
  id: string;
  auth_user_id: string;
  full_name: string;
  role: string;
  active: boolean;
  employment_type?: string | null;
  email?: string | null;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  note?: string | null;
};

type Tab = "dashboard" | "employees" | "schedules";

type PartTimeShift = {
  start: string;
  end: string;
};

type DaySchedule = {
  fullTimeStart: string;
  partTimeShifts: PartTimeShift[];
};

type WeeklyScheduleState = Record<string, Record<string, DaySchedule>>;

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    return monday;
  });

  const [weeklySchedule, setWeeklySchedule] =
    useState<WeeklyScheduleState>({});

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

        if (employeeData.role === "employee") {
          router.replace("/employee");
          return;
        }

        if (employeeData.role !== "admin") {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setEmployee(employeeData);
        setLoading(false);

        loadEmployees();
      } catch (error) {
        console.error(error);
        setErrorMessage("Có lỗi xảy ra. Vui lòng đăng nhập lại.");
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  useEffect(() => {
    if (employees.length > 0) {
      loadWeekSchedules();
    }
  }, [weekStart, employees.length]);

  function getLocalDateString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getWeekDates(startDate: Date) {
    const dates: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }

    return dates;
  }

  const weekDates = useMemo(
    () => getWeekDates(weekStart),
    [weekStart]
  );

  const fullTimeOptions = useMemo(() => {
    const options: string[] = [];

    for (let hour = 5; hour <= 11; hour++) {
      options.push(`${String(hour).padStart(2, "0")}:00`);

      if (hour !== 11) {
        options.push(`${String(hour).padStart(2, "0")}:30`);
      }
    }

    return options;
  }, []);

  function calculateEndTime(startTime: string) {
    if (!startTime) return "";

    const [hour, minute] = startTime.split(":").map(Number);

    let endHour = hour + 10;
    let endMinute = minute;

    if (endHour >= 24) {
      endHour = endHour - 24;
    }

    return `${String(endHour).padStart(2, "0")}:${String(
      endMinute
    ).padStart(2, "0")}`;
  }

  function getEmployeeType(item: Employee) {
    return (item.employment_type || "")
      .trim()
      .toLowerCase();
  }

  function isPartTime(item: Employee) {
    const type = getEmployeeType(item);

    return (
      type.includes("part") ||
      type.includes("time") ||
      type.includes("bán thời gian")
    );
  }

  async function loadEmployees() {
    setDataLoading(true);

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("role", "employee")
      .eq("active", true)
      .order("full_name");

    if (error) {
      console.error(error);
      setDataLoading(false);
      return;
    }

    setEmployees(data || []);
    setDataLoading(false);
  }

  async function loadWeekSchedules() {
    setDataLoading(true);

    const startDate = getLocalDateString(weekDates[0]);
    const endDate = getLocalDateString(weekDates[6]);

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .gte("work_date", startDate)
      .lte("work_date", endDate);

    if (error) {
      console.error(error);
      setDataLoading(false);
      return;
    }

    setSchedules(data || []);

    const newWeeklySchedule: WeeklyScheduleState = {};

    employees.forEach((item) => {
      newWeeklySchedule[item.id] = {};

      weekDates.forEach((date) => {
        const dateString = getLocalDateString(date);

        newWeeklySchedule[item.id][dateString] = {
          fullTimeStart: "",
          partTimeShifts: [],
        };
      });
    });

    (data || []).forEach((schedule) => {
      if (
        !newWeeklySchedule[schedule.employee_id] ||
        !newWeeklySchedule[schedule.employee_id][schedule.work_date]
      ) {
        return;
      }

      const currentEmployee = employees.find(
        (item) => item.id === schedule.employee_id
      );

      if (!currentEmployee) return;

      if (isPartTime(currentEmployee)) {
        newWeeklySchedule[schedule.employee_id][
          schedule.work_date
        ].partTimeShifts.push({
          start: schedule.start_time || "",
          end: schedule.end_time || "",
        });
      } else {
        newWeeklySchedule[schedule.employee_id][
          schedule.work_date
        ].fullTimeStart = schedule.start_time || "";
      }
    });

    setWeeklySchedule(newWeeklySchedule);
    setDataLoading(false);
  }

  function changeFullTimeShift(
    employeeId: string,
    date: string,
    startTime: string
  ) {
    setWeeklySchedule((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: {
          ...prev[employeeId]?.[date],
          fullTimeStart: startTime,
          partTimeShifts:
            prev[employeeId]?.[date]?.partTimeShifts || [],
        },
      },
    }));
  }

  function addPartTimeShift(employeeId: string, date: string) {
    setWeeklySchedule((prev) => {
      const current =
        prev[employeeId]?.[date]?.partTimeShifts || [];

      if (current.length >= 2) {
        alert("Nhân viên part-time tối đa 2 ca trong một ngày.");
        return prev;
      }

      return {
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: {
            ...prev[employeeId]?.[date],
            fullTimeStart:
              prev[employeeId]?.[date]?.fullTimeStart || "",
            partTimeShifts: [
              ...current,
              {
                start: "",
                end: "",
              },
            ],
          },
        },
      };
    });
  }

  function updatePartTimeShift(
    employeeId: string,
    date: string,
    index: number,
    field: "start" | "end",
    value: string
  ) {
    setWeeklySchedule((prev) => {
      const shifts = [
        ...(prev[employeeId]?.[date]?.partTimeShifts || []),
      ];

      shifts[index] = {
        ...shifts[index],
        [field]: value,
      };

      return {
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: {
            ...prev[employeeId]?.[date],
            fullTimeStart:
              prev[employeeId]?.[date]?.fullTimeStart || "",
            partTimeShifts: shifts,
          },
        },
      };
    });
  }

  function removePartTimeShift(
    employeeId: string,
    date: string,
    index: number
  ) {
    setWeeklySchedule((prev) => {
      const shifts = [
        ...(prev[employeeId]?.[date]?.partTimeShifts || []),
      ];

      shifts.splice(index, 1);

      return {
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: {
            ...prev[employeeId]?.[date],
            fullTimeStart:
              prev[employeeId]?.[date]?.fullTimeStart || "",
            partTimeShifts: shifts,
          },
        },
      };
    });
  }

  async function saveWeeklySchedule() {
    setDataLoading(true);

    try {
      const startDate = getLocalDateString(weekDates[0]);
      const endDate = getLocalDateString(weekDates[6]);

      const { error: deleteError } = await supabase
        .from("schedules")
        .delete()
        .gte("work_date", startDate)
        .lte("work_date", endDate);

      if (deleteError) {
        throw deleteError;
      }

      const schedulesToInsert: {
        employee_id: string;
        work_date: string;
        start_time: string;
        end_time: string;
        note: string | null;
      }[] = [];

      employees.forEach((item) => {
        weekDates.forEach((date) => {
          const dateString = getLocalDateString(date);

          const dayData =
            weeklySchedule[item.id]?.[dateString];

          if (!dayData) return;

          if (isPartTime(item)) {
            dayData.partTimeShifts.forEach((shift) => {
              if (shift.start && shift.end) {
                schedulesToInsert.push({
                  employee_id: item.id,
                  work_date: dateString,
                  start_time: shift.start,
                  end_time: shift.end,
                  note: null,
                });
              }
            });
          } else {
            if (dayData.fullTimeStart) {
              schedulesToInsert.push({
                employee_id: item.id,
                work_date: dateString,
                start_time: dayData.fullTimeStart,
                end_time: calculateEndTime(
                  dayData.fullTimeStart
                ),
                note: null,
              });
            }
          }
        });
      });

      if (schedulesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("schedules")
          .insert(schedulesToInsert);

        if (insertError) {
          throw insertError;
        }
      }

      alert("Đã lưu lịch làm việc của tuần.");

      await loadWeekSchedules();
    } catch (error: any) {
      console.error(error);
      alert(
        "Không thể lưu lịch: " +
          (error?.message || "Có lỗi xảy ra")
      );
    }

    setDataLoading(false);
  }

  function goPreviousWeek() {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  }

  function goNextWeek() {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  }

  function goCurrentWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    setWeekStart(monday);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
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
          background: "#f5f5f3",
        }}
      >
        <div>Đang tải...</div>
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
          background: "#f5f5f3",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "30px",
            borderRadius: "16px",
            textAlign: "center",
          }}
        >
          <h2>{errorMessage}</h2>

          <button
            onClick={() => router.replace("/login")}
          >
            Về đăng nhập
          </button>
        </div>
      </main>
    );
  }

  const weekLabel = `${weekDates[0].toLocaleDateString(
    "vi-VN"
  )} - ${weekDates[6].toLocaleDateString("vi-VN")}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f3",
        fontFamily: "Arial, sans-serif",
        color: "#263238",
      }}
    >
      <header
        style={{
          background: "#ffffff",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e5e5e5",
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
              margin: "5px 0 0",
              color: "#777",
            }}
          >
            Xin chào {employee?.full_name}
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            border: "none",
            background: "#365d4b",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Đăng xuất
        </button>
      </header>

      <section
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          padding: "30px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background:
                activeTab === "dashboard"
                  ? "#365d4b"
                  : "#fff",
              color:
                activeTab === "dashboard"
                  ? "#fff"
                  : "#263238",
            }}
          >
            Tổng quan
          </button>

          <button
            onClick={() => setActiveTab("employees")}
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background:
                activeTab === "employees"
                  ? "#365d4b"
                  : "#fff",
              color:
                activeTab === "employees"
                  ? "#fff"
                  : "#263238",
            }}
          >
            Nhân viên
          </button>

          <button
            onClick={() => setActiveTab("schedules")}
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background:
                activeTab === "schedules"
                  ? "#365d4b"
                  : "#fff",
              color:
                activeTab === "schedules"
                  ? "#fff"
                  : "#263238",
            }}
          >
            Lịch làm việc
          </button>
        </div>

        {activeTab === "dashboard" && (
          <div
            style={{
              background: "#365d4b",
              color: "#fff",
              padding: "35px",
              borderRadius: "20px",
            }}
          >
            <h2>Trang quản trị SOBA STAFF</h2>
            <p>
              Quản lý nhân viên và xếp lịch làm việc theo
              tuần.
            </p>
          </div>
        )}

        {activeTab === "employees" && (
          <div>
            <h2>Nhân viên</h2>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {employees.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#fff",
                    padding: "18px",
                    borderRadius: "12px",
                  }}
                >
                  <strong>{item.full_name}</strong>

                  <p
                    style={{
                      marginBottom: 0,
                      color: "#777",
                    }}
                  >
                    {item.employment_type || "Chưa phân loại"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "schedules" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  Xếp lịch làm việc
                </h2>

                <p
                  style={{
                    color: "#777",
                  }}
                >
                  {weekLabel}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={goPreviousWeek}
                  style={{
                    padding: "10px 15px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  ← Tuần trước
                </button>

                <button
                  onClick={goCurrentWeek}
                  style={{
                    padding: "10px 15px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Tuần này
                </button>

                <button
                  onClick={goNextWeek}
                  style={{
                    padding: "10px 15px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Tuần sau →
                </button>

                <button
                  onClick={saveWeeklySchedule}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#365d4b",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Lưu lịch tuần
                </button>
              </div>
            </div>

            {dataLoading && (
              <p>Đang tải...</p>
            )}

            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                overflowX: "auto",
                boxShadow:
                  "0 4px 15px rgba(0,0,0,0.05)",
              }}
            >
              <table
                style={{
                  borderCollapse: "collapse",
                  minWidth: "1400px",
                  width: "100%",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f1f3ef",
                    }}
                  >
                    <th
                      style={{
                        padding: "18px",
                        textAlign: "left",
                        minWidth: "180px",
                        position: "sticky",
                        left: 0,
                        background: "#f1f3ef",
                        zIndex: 2,
                      }}
                    >
                      Nhân viên
                    </th>

                    {weekDates.map((date) => (
                      <th
                        key={getLocalDateString(date)}
                        style={{
                          padding: "15px",
                          minWidth: "170px",
                          borderLeft:
                            "1px solid #e5e5e5",
                        }}
                      >
                        <div>
                          Thứ{" "}
                          {date.getDay() === 0
                            ? "CN"
                            : date.getDay() + 1}
                        </div>

                        <small
                          style={{
                            color: "#777",
                            fontWeight: 400,
                          }}
                        >
                          {date.toLocaleDateString(
                            "vi-VN"
                          )}
                        </small>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {employees.map((item) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          padding: "18px",
                          verticalAlign: "top",
                          borderTop:
                            "1px solid #eeeeee",
                          position: "sticky",
                          left: 0,
                          background: "#fff",
                          zIndex: 1,
                        }}
                      >
                        <strong>{item.full_name}</strong>

                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: "13px",
                            color: "#777",
                          }}
                        >
                          {isPartTime(item)
                            ? "Part-time"
                            : "Full-time"}
                        </p>
                      </td>

                      {weekDates.map((date) => {
                        const dateString =
                          getLocalDateString(date);

                        const dayData =
                          weeklySchedule[item.id]?.[
                            dateString
                          ] || {
                            fullTimeStart: "",
                            partTimeShifts: [],
                          };

                        return (
                          <td
                            key={dateString}
                            style={{
                              padding: "10px",
                              verticalAlign: "top",
                              borderLeft:
                                "1px solid #eeeeee",
                              borderTop:
                                "1px solid #eeeeee",
                            }}
                          >
                            {!isPartTime(item) ? (
                              <div>
                                <select
                                  value={
                                    dayData.fullTimeStart
                                  }
                                  onChange={(e) =>
                                    changeFullTimeShift(
                                      item.id,
                                      dateString,
                                      e.target.value
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border:
                                      "1px solid #ddd",
                                  }}
                                >
                                  <option value="">
                                    Nghỉ
                                  </option>

                                  {fullTimeOptions.map(
                                    (startTime) => (
                                      <option
                                        key={startTime}
                                        value={startTime}
                                      >
                                        {startTime} -{" "}
                                        {calculateEndTime(
                                          startTime
                                        )}
                                      </option>
                                    )
                                  )}
                                </select>

                                {dayData.fullTimeStart && (
                                  <p
                                    style={{
                                      margin:
                                        "8px 0 0",
                                      fontSize: "12px",
                                      color: "#365d4b",
                                    }}
                                  >
                                    10 tiếng / ca
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                {dayData.partTimeShifts.map(
                                  (shift, index) => (
                                    <div
                                      key={index}
                                      style={{
                                        background:
                                          "#f6f7f5",
                                        padding: "8px",
                                        borderRadius:
                                          "8px",
                                        marginBottom:
                                          "8px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display:
                                            "flex",
                                          gap: "5px",
                                          alignItems:
                                            "center",
                                        }}
                                      >
                                        <input
                                          type="time"
                                          value={
                                            shift.start
                                          }
                                          onChange={(e) =>
                                            updatePartTimeShift(
                                              item.id,
                                              dateString,
                                              index,
                                              "start",
                                              e.target
                                                .value
                                            )
                                          }
                                          style={{
                                            width:
                                              "100%",
                                            padding:
                                              "6px",
                                            border:
                                              "1px solid #ddd",
                                            borderRadius:
                                              "6px",
                                          }}
                                        />

                                        <span>-</span>

                                        <input
                                          type="time"
                                          value={
                                            shift.end
                                          }
                                          onChange={(e) =>
                                            updatePartTimeShift(
                                              item.id,
                                              dateString,
                                              index,
                                              "end",
                                              e.target
                                                .value
                                            )
                                          }
                                          style={{
                                            width:
                                              "100%",
                                            padding:
                                              "6px",
                                            border:
                                              "1px solid #ddd",
                                            borderRadius:
                                              "6px",
                                          }}
                                        />
                                      </div>

                                      <button
                                        onClick={() =>
                                          removePartTimeShift(
                                            item.id,
                                            dateString,
                                            index
                                          )
                                        }
                                        style={{
                                          marginTop:
                                            "6px",
                                          border: "none",
                                          background:
                                            "transparent",
                                          color:
                                            "#b3261e",
                                          cursor:
                                            "pointer",
                                          fontSize:
                                            "12px",
                                        }}
                                      >
                                        Xóa ca
                                      </button>
                                    </div>
                                  )
                                )}

                                {dayData.partTimeShifts
                                  .length < 2 && (
                                  <button
                                    onClick={() =>
                                      addPartTimeShift(
                                        item.id,
                                        dateString
                                      )
                                    }
                                    style={{
                                      width: "100%",
                                      padding: "8px",
                                      border:
                                        "1px dashed #365d4b",
                                      background:
                                        "#fff",
                                      color:
                                        "#365d4b",
                                      borderRadius:
                                        "8px",
                                      cursor:
                                        "pointer",
                                    }}
                                  >
                                    + Thêm ca
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "#fff",
                borderRadius: "10px",
                color: "#666",
                fontSize: "14px",
              }}
            >
              <strong>Full-time:</strong> chọn giờ bắt đầu
              từ 05:00 đến 11:00, cách nhau 30 phút. Hệ
              thống tự cộng 10 tiếng.
              <br />
              <strong>Part-time:</strong> tối đa 2 ca/ngày,
              tự chọn giờ đến và giờ nghỉ.
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
