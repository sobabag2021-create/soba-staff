
"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/admin/requests")}
    >
      Đơn từ
    </button>
  );
}
type Employee = {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
  employment_type: "full_time" | "part_time" | string | null;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
};

type PageType =
  | "dashboard"
  | "employees"
  | "schedule"
  | "requests"
  | "attendance"
  | "reports";

const START_OPTIONS = [
  "05:00",
  "05:30",
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
];

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

function addTenHours(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  let newHour = hour + 10;

  if (newHour >= 24) {
    newHour -= 24;
  }

  return `${String(newHour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}`;
}

function formatDayHeader(date: Date) {
  const days = [
    "Chủ nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  return {
    dayName: days[date.getDay()],
    date: `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`,
  };
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<Employee | null>(null);

  const [activePage, setActivePage] =
    useState<PageType>("dashboard");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [weekStart, setWeekStart] = useState(() =>
    getMonday(new Date())
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) =>
      addDays(weekStart, index)
    );
  }, [weekStart]);

  useEffect(() => {
    loadAdmin();
  }, []);

  useEffect(() => {
    if (!loading && activePage === "schedule") {
      loadEmployees();
      loadSchedules();
    }
  }, [activePage, weekStart, loading]);

  async function loadAdmin() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (error || !data) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (data.active === false) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (data.role !== "admin") {
        router.replace("/employee");
        return;
      }

      setAdmin(data);
    } catch (error) {
      console.error(error);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true)
      .order("full_name", { ascending: true });

    if (!error && data) {
      setEmployees(
        data.filter((item) => item.role !== "admin")
      );
    }
  }

  async function loadSchedules() {
    const startDate = formatDate(weekDays[0]);
    const endDate = formatDate(weekDays[6]);

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", { ascending: true });

    if (!error && data) {
      setSchedules(data);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function getSchedule(
    employeeId: string,
    date: Date
  ) {
    const workDate = formatDate(date);

    return schedules.find(
      (schedule) =>
        schedule.employee_id === employeeId &&
        schedule.work_date === workDate
    );
  }

  async function saveFullTimeSchedule(
    employeeId: string,
    date: Date,
    startTime: string
  ) {
    if (!startTime) {
      return;
    }

    setSaving(true);
    setMessage("");

    const workDate = formatDate(date);
    const endTime = addTenHours(startTime);

    const existing = getSchedule(employeeId, date);

    let error;

    if (existing) {
      const result = await supabase
        .from("schedules")
        .update({
          start_time: startTime,
          end_time: endTime,
        })
        .eq("id", existing.id);

      error = result.error;
    } else {
      const result = await supabase
        .from("schedules")
        .insert({
          employee_id: employeeId,
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
        });

      error = result.error;
    }

    if (error) {
      alert(error.message);
    } else {
      await loadSchedules();
    }

    setSaving(false);
  }

  async function savePartTimeSchedule(
    employeeId: string,
    date: Date,
    startTime: string,
    endTime: string
  ) {
    if (!startTime || !endTime) {
      alert("Vui lòng chọn giờ bắt đầu và giờ kết thúc.");
      return;
    }

    setSaving(true);

    const workDate = formatDate(date);
    const existing = getSchedule(employeeId, date);

    let error;

    if (existing) {
      const result = await supabase
        .from("schedules")
        .update({
          start_time: startTime,
          end_time: endTime,
        })
        .eq("id", existing.id);

      error = result.error;
    } else {
      const result = await supabase
        .from("schedules")
        .insert({
          employee_id: employeeId,
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
        });

      error = result.error;
    }

    if (error) {
      alert(error.message);
    } else {
      await loadSchedules();
    }

    setSaving(false);
  }

  async function deleteSchedule(
    scheduleId: string
  ) {
    const confirmed = confirm(
      "Bạn có chắc muốn xóa ca làm này?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", scheduleId);

    if (error) {
      alert(error.message);
    } else {
      await loadSchedules();
    }
  }

  function goPreviousWeek() {
    setWeekStart((previous) =>
      addDays(previous, -7)
    );
  }

  function goNextWeek() {
    setWeekStart((previous) =>
      addDays(previous, 7)
    );
  }

  function goCurrentWeek() {
    setWeekStart(getMonday(new Date()));
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
        Đang tải...
      </main>
    );
  }

  const menuStyle = (page: PageType) => ({
    width: "100%",
    textAlign: "left" as const,
    border: "none",
    padding: "14px 16px",
    marginBottom: "6px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "15px",
    background:
      activePage === page
        ? "#45695a"
        : "transparent",
    color: "#ffffff",
  });

  const buttonStyle = {
    border: "none",
    background: "#365d4b",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        background: "#f5f5f3",
        color: "#263238",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "220px",
          minHeight: "100vh",
          background: "#10261f",
          color: "#ffffff",
          padding: "28px 18px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: "30px",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "45px",
          }}
        >
          SOBA
          <br />
          STAFF
        </div>

        <button
          onClick={() =>
            setActivePage("dashboard")
          }
          style={menuStyle("dashboard")}
        >
          Dashboard
        </button>

        <button
          onClick={() =>
            setActivePage("employees")
          }
          style={menuStyle("employees")}
        >
          Nhân viên
        </button>

        <button
          onClick={() =>
            setActivePage("schedule")
          }
          style={menuStyle("schedule")}
        >
          Lịch làm
        </button>

        <button
          onClick={() =>
            setActivePage("requests")
          }
          style={menuStyle("requests")}
        >
          Đơn từ
        </button>

        <button
          onClick={() =>
            setActivePage("attendance")
          }
          style={menuStyle("attendance")}
        >
          Chấm công
        </button>

        <button
          onClick={() =>
            setActivePage("reports")
          }
          style={menuStyle("reports")}
        >
          Báo cáo
        </button>

        <button
          onClick={handleLogout}
          style={{
            ...menuStyle("dashboard"),
            marginTop: "25px",
          }}
        >
          Đăng xuất
        </button>
      </aside>

      {/* CONTENT */}
      <section
        style={{
          flex: 1,
          padding: "40px",
          overflowX: "auto",
        }}
      >
        {/* DASHBOARD */}
        {activePage === "dashboard" && (
          <>
            <h1>Dashboard</h1>

            <div
              style={{
                background: "#365d4b",
                color: "#ffffff",
                padding: "30px",
                borderRadius: "20px",
                maxWidth: "900px",
              }}
            >
              <p>Xin chào Admin</p>

              <h2>
                {admin?.full_name ||
                  "Quản trị viên"}
              </h2>

              <p>
                Quản lý nhân viên và hoạt động
                của cửa hàng
              </p>
            </div>
          </>
        )}

        {/* EMPLOYEES */}
        {activePage === "employees" && (
          <>
            <h1>Nhân viên</h1>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "20px",
              }}
            >
              {employees.length === 0 ? (
                <p>Chưa có nhân viên.</p>
              ) : (
                employees.map((employee) => (
                  <div
                    key={employee.id}
                    style={{
                      padding: "15px 0",
                      borderBottom:
                        "1px solid #eeeeee",
                    }}
                  >
                    <strong>
                      {employee.full_name}
                    </strong>

                    <div
                      style={{
                        marginTop: "5px",
                        color: "#666",
                      }}
                    >
                      {employee.employment_type ===
                      "part_time"
                        ? "Part-time"
                        : "Full-time"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* SCHEDULE */}
        {activePage === "schedule" && (
          <>
            <h1
              style={{
                marginTop: 0,
              }}
            >
              Xếp lịch làm
            </h1>

            {/* WEEK CONTROL */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                marginBottom: "25px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={goPreviousWeek}
                style={buttonStyle}
              >
                ← Tuần trước
              </button>

              <button
                onClick={goCurrentWeek}
                style={buttonStyle}
              >
                Tuần hiện tại
              </button>

              <button
                onClick={goNextWeek}
                style={buttonStyle}
              >
                Tuần sau →
              </button>

              <strong
                style={{
                  marginLeft: "10px",
                }}
              >
                {formatDate(weekDays[0])} đến{" "}
                {formatDate(weekDays[6])}
              </strong>
            </div>

            {message && (
              <p>{message}</p>
            )}

            {/* WEEK TABLE */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                overflow: "auto",
                boxShadow:
                  "0 4px 15px rgba(0,0,0,0.05)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: "1300px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        minWidth: "180px",
                        padding: "18px",
                        borderBottom:
                          "1px solid #dddddd",
                        textAlign: "left",
                        background: "#fff7e7",
                      }}
                    >
                      Nhân viên
                    </th>

                    {weekDays.map((date) => {
                      const info =
                        formatDayHeader(date);

                      return (
                        <th
                          key={formatDate(date)}
                          style={{
                            minWidth: "150px",
                            padding: "15px",
                            borderLeft:
                              "1px solid #eeeeee",
                            borderBottom:
                              "1px solid #dddddd",
                            background: "#fff7e7",
                            textAlign: "center",
                          }}
                        >
                          <div>
                            {info.dayName}
                          </div>

                          <div
                            style={{
                              marginTop: "6px",
                              fontWeight: 400,
                            }}
                          >
                            {info.date}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                    >
                      {/* EMPLOYEE NAME */}
                      <td
                        style={{
                          padding: "15px",
                          borderBottom:
                            "1px solid #eeeeee",
                          fontWeight: 600,
                        }}
                      >
                        <div>
                          {employee.full_name}
                        </div>

                        <div
                          style={{
                            fontSize: "12px",
                            marginTop: "5px",
                            color: "#777",
                          }}
                        >
                          {employee.employment_type ===
                          "part_time"
                            ? "Part-time"
                            : "Full-time"}
                        </div>
                      </td>

                      {/* EACH DAY */}
                      {weekDays.map((date) => {
                        const schedule =
                          getSchedule(
                            employee.id,
                            date
                          );

                        const isPartTime =
                          employee.employment_type ===
                          "part_time";

                        return (
                          <td
                            key={`${employee.id}-${formatDate(
                              date
                            )}`}
                            style={{
                              padding: "10px",
                              borderLeft:
                                "1px solid #eeeeee",
                              borderBottom:
                                "1px solid #eeeeee",
                              verticalAlign: "top",
                            }}
                          >
                            {/* PART TIME */}
                            {isPartTime ? (
                              <PartTimeCell
                                existingSchedule={
                                  schedule
                                }
                                onSave={(
                                  startTime,
                                  endTime
                                ) =>
                                  savePartTimeSchedule(
                                    employee.id,
                                    date,
                                    startTime,
                                    endTime
                                  )
                                }
                                onDelete={() => {
                                  if (schedule) {
                                    deleteSchedule(
                                      schedule.id
                                    );
                                  }
                                }}
                                saving={saving}
                              />
                            ) : (
                              /* FULL TIME */
                              <FullTimeCell
                                existingSchedule={
                                  schedule
                                }
                                onSave={(
                                  startTime
                                ) =>
                                  saveFullTimeSchedule(
                                    employee.id,
                                    date,
                                    startTime
                                  )
                                }
                                onDelete={() => {
                                  if (schedule) {
                                    deleteSchedule(
                                      schedule.id
                                    );
                                  }
                                }}
                                saving={saving}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* REQUESTS */}
        {activePage === "requests" && (
          <>
            <h1>Đơn từ</h1>

            <div
              style={{
                background: "#ffffff",
                padding: "30px",
                borderRadius: "16px",
              }}
            >
              Chức năng quản lý và duyệt đơn
              nhân viên.
            </div>
          </>
        )}

        {/* ATTENDANCE */}
        {activePage === "attendance" && (
          <>
            <h1>Chấm công</h1>

            <div
              style={{
                background: "#ffffff",
                padding: "30px",
                borderRadius: "16px",
              }}
            >
              Theo dõi check-in và check-out
              của nhân viên.
            </div>
          </>
        )}

        {/* REPORT */}
        {activePage === "reports" && (
          <>
            <h1>Báo cáo</h1>

            <div
              style={{
                background: "#ffffff",
                padding: "30px",
                borderRadius: "16px",
              }}
            >
              Báo cáo hoạt động nhân viên.
            </div>
          </>
        )}
      </section>
    </main>
  );
}

/* =========================
   FULL TIME CELL
========================= */

function FullTimeCell({
  existingSchedule,
  onSave,
  onDelete,
  saving,
}: {
  existingSchedule?: Schedule;
  onSave: (startTime: string) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [startTime, setStartTime] =
    useState(
      existingSchedule?.start_time?.slice(
        0,
        5
      ) || ""
    );

  useEffect(() => {
    setStartTime(
      existingSchedule?.start_time?.slice(
        0,
        5
      ) || ""
    );
  }, [existingSchedule]);

  return (
    <div>
      <select
        value={startTime}
        onChange={(event) => {
          const value = event.target.value;
          setStartTime(value);

          if (value) {
            onSave(value);
          }
        }}
        disabled={saving}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "6px",
          border: "1px solid #cccccc",
          background: "#ffffff",
        }}
      >
        <option value="">
          Chọn ca
        </option>

        {START_OPTIONS.map((time) => (
          <option
            key={time}
            value={time}
          >
            {time} - {addTenHours(time)}
          </option>
        ))}
      </select>

      {existingSchedule && (
        <button
          onClick={onDelete}
          style={{
            marginTop: "8px",
            border: "none",
            background: "transparent",
            color: "#b00020",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Xóa ca
        </button>
      )}
    </div>
  );
}

/* =========================
   PART TIME CELL
========================= */

function PartTimeCell({
  existingSchedule,
  onSave,
  onDelete,
  saving,
}: {
  existingSchedule?: Schedule;
  onSave: (
    startTime: string,
    endTime: string
  ) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [startTime, setStartTime] =
    useState(
      existingSchedule?.start_time?.slice(
        0,
        5
      ) || ""
    );

  const [endTime, setEndTime] =
    useState(
      existingSchedule?.end_time?.slice(
        0,
        5
      ) || ""
    );

  useEffect(() => {
    setStartTime(
      existingSchedule?.start_time?.slice(
        0,
        5
      ) || ""
    );

    setEndTime(
      existingSchedule?.end_time?.slice(
        0,
        5
      ) || ""
    );
  }, [existingSchedule]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <input
        type="time"
        value={startTime}
        onChange={(event) =>
          setStartTime(event.target.value)
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "7px",
          borderRadius: "6px",
          border: "1px solid #cccccc",
        }}
      />

      <input
        type="time"
        value={endTime}
        onChange={(event) =>
          setEndTime(event.target.value)
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "7px",
          borderRadius: "6px",
          border: "1px solid #cccccc",
        }}
      />

      <button
        onClick={() =>
          onSave(startTime, endTime)
        }
        disabled={
          saving ||
          !startTime ||
          !endTime
        }
        style={{
          border: "none",
          background: "#365d4b",
          color: "#ffffff",
          padding: "7px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        Lưu
      </button>

      {existingSchedule && (
        <button
          onClick={onDelete}
          style={{
            border: "none",
            background: "transparent",
            color: "#b00020",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Xóa
        </button>
      )}
    </div>
  );
}
<button
  onClick={() => router.push("/admin/requests")}
>
  Đơn từ
</button>
