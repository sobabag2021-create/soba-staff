"use client";

import { useEffect, useState } from "react";
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
};

type Request = {
  id: string;
  employee_id: string;
  request_type: string | null;
  reason: string | null;
  status: string | null;
  created_at: string;
};

type Attendance = {
  id: string;
  employee_id: string;
  check_in: string | null;
  check_out: string | null;
};

type Menu =
  | "dashboard"
  | "employees"
  | "schedule"
  | "requests"
  | "attendance"
  | "reports";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [activeMenu, setActiveMenu] =
    useState<Menu>("dashboard");

  const [selectedEmployee, setSelectedEmployee] =
    useState("");

  const [workDate, setWorkDate] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

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

      if (employeeData.role !== "admin") {
        router.replace("/employee");
        return;
      }

      setCurrentUser(employeeData);

      const {
        data: employeesData,
        error: employeesError,
      } = await supabase
        .from("employees")
        .select("*")
        .order("full_name");

      if (!employeesError && employeesData) {
        setEmployees(employeesData);
      }

      const {
        data: schedulesData,
        error: schedulesError,
      } = await supabase
        .from("schedules")
        .select("*")
        .order("work_date", {
          ascending: false,
        });

      if (!schedulesError && schedulesData) {
        setSchedules(schedulesData);
      }

      const {
        data: requestsData,
        error: requestsError,
      } = await supabase
        .from("requests")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (!requestsError && requestsData) {
        setRequests(requestsData);
      }

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select("*")
        .order("check_in", {
          ascending: false,
        });

      if (!attendanceError && attendanceData) {
        setAttendance(attendanceData);
      }
    } catch (error) {
      console.error(error);
      setMessage("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function createSchedule() {
    if (
      !selectedEmployee ||
      !workDate ||
      !startTime ||
      !endTime
    ) {
      alert("Vui lòng chọn đầy đủ thông tin.");
      return;
    }

    const { error } = await supabase
      .from("schedules")
      .insert([
        {
          employee_id: selectedEmployee,
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
        },
      ]);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Đã xếp lịch thành công.");

    setSelectedEmployee("");
    setWorkDate("");
    setStartTime("");
    setEndTime("");

    await loadData();
  }

  async function updateRequestStatus(
    requestId: string,
    status: "approved" | "rejected"
  ) {
    const { error } = await supabase
      .from("requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      status === "approved"
        ? "Đã duyệt đơn."
        : "Đã từ chối đơn."
    );

    await loadData();
  }

  function getEmployeeName(employeeId: string) {
    const employee = employees.find(
      (item) => item.id === employeeId
    );

    return employee?.full_name || "Không rõ";
  }

  if (loading) {
    return (
      <main style={styles.loading}>
        Đang tải...
      </main>
    );
  }

  return (
    <main style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div>SOBA</div>
          <div>STAFF</div>
        </div>

        <div style={styles.menu}>
          <button
            style={
              activeMenu === "dashboard"
                ? styles.menuActive
                : styles.menuButton
            }
            onClick={() =>
              setActiveMenu("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            style={
              activeMenu === "employees"
                ? styles.menuActive
                : styles.menuButton
            }
            onClick={() =>
              setActiveMenu("employees")
            }
          >
            Nhân viên
          </button>

          <button
            style={
              activeMenu === "schedule"
                ? styles.menuActive
                : styles.menuButton
            }
            onClick={() =>
              setActiveMenu("schedule")
            }
          >
            Lịch làm
          </button>

          <button
            style={
              activeMenu === "requests"
                ? styles.menuActive
                : styles.menuButton
            }
            onClick={() =>
              setActiveMenu("requests")
            }
          >
            Đơn từ
          </button>

          <button
            style={
              activeMenu === "attendance"
                ? styles.menuActive
                : styles.menuButton
            }
            onClick={() =>
              setActiveMenu("attendance")
            }
          >
            Chấm công
          </button>

          <button
            style={
              activeMenu === "reports"
                ? styles.menuActive
                : styles.menuButton
            }
            onClick={() =>
              setActiveMenu("reports")
            }
          >
            Báo cáo
          </button>

          <button
            style={styles.menuButton}
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <section style={styles.content}>
        {activeMenu === "dashboard" && (
          <>
            <div style={styles.welcome}>
              <p>Xin chào Admin</p>

              <h1>
                {currentUser?.full_name || "Admin"}
              </h1>

              <span>
                Quản lý nhân viên và hoạt động
                của cửa hàng
              </span>
            </div>

            <div style={styles.cards}>
              <div
                style={styles.card}
                onClick={() =>
                  setActiveMenu("employees")
                }
              >
                <h3>Nhân viên</h3>
                <strong>{employees.length}</strong>
                <p>Nhân viên trong hệ thống</p>
              </div>

              <div
                style={styles.card}
                onClick={() =>
                  setActiveMenu("schedule")
                }
              >
                <h3>Lịch làm</h3>
                <strong>{schedules.length}</strong>
                <p>Ca làm đã tạo</p>
              </div>

              <div
                style={styles.card}
                onClick={() =>
                  setActiveMenu("requests")
                }
              >
                <h3>Đơn từ</h3>

                <strong>
                  {
                    requests.filter(
                      (item) =>
                        item.status === "pending"
                    ).length
                  }
                </strong>

                <p>Đơn đang chờ duyệt</p>
              </div>

              <div
                style={styles.card}
                onClick={() =>
                  setActiveMenu("attendance")
                }
              >
                <h3>Chấm công</h3>
                <strong>
                  {attendance.length}
                </strong>
                <p>Lượt chấm công</p>
              </div>
            </div>
          </>
        )}

        {activeMenu === "employees" && (
          <>
            <h1>Nhân viên</h1>

            <div style={styles.whiteBox}>
              {employees.map((item) => (
                <div
                  key={item.id}
                  style={styles.row}
                >
                  <div>
                    <strong>
                      {item.full_name}
                    </strong>

                    <p>
                      {item.employment_type ||
                        "Chưa xác định"}
                    </p>
                  </div>

                  <span>{item.role}</span>

                  <span>
                    {item.active
                      ? "Đang hoạt động"
                      : "Đã khóa"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeMenu === "schedule" && (
          <>
            <h1>Xếp lịch làm</h1>

            <div style={styles.formBox}>
              <select
                value={selectedEmployee}
                onChange={(e) =>
                  setSelectedEmployee(e.target.value)
                }
                style={styles.input}
              >
                <option value="">
                  Chọn nhân viên
                </option>

                {employees
                  .filter(
                    (item) =>
                      item.role === "employee" &&
                      item.active
                  )
                  .map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.full_name}
                    </option>
                  ))}
              </select>

              <input
                type="date"
                value={workDate}
                onChange={(e) =>
                  setWorkDate(e.target.value)
                }
                style={styles.input}
              />

              <input
                type="time"
                value={startTime}
                onChange={(e) =>
                  setStartTime(e.target.value)
                }
                style={styles.input}
              />

              <input
                type="time"
                value={endTime}
                onChange={(e) =>
                  setEndTime(e.target.value)
                }
                style={styles.input}
              />

              <button
                style={styles.primaryButton}
                onClick={createSchedule}
              >
                Xếp lịch
              </button>
            </div>

            <h2>Lịch đã tạo</h2>

            <div style={styles.scheduleList}>
              {schedules.map((item) => (
                <div
                  key={item.id}
                  style={styles.scheduleItem}
                >
                  <strong>
                    {getEmployeeName(
                      item.employee_id
                    )}
                  </strong>

                  <p>
                    {item.work_date} |{" "}
                    {item.start_time || "--:--"} -{" "}
                    {item.end_time || "--:--"}
                  </p>
                </div>
              ))}

              {schedules.length === 0 && (
                <p>Chưa có lịch làm.</p>
              )}
            </div>
          </>
        )}

        {activeMenu === "requests" && (
          <>
            <h1>Đơn từ</h1>

            <div style={styles.whiteBox}>
              {requests.map((item) => (
                <div
                  key={item.id}
                  style={styles.requestRow}
                >
                  <div>
                    <strong>
                      {getEmployeeName(
                        item.employee_id
                      )}
                    </strong>

                    <p>
                      {item.request_type ||
                        "Yêu cầu"}
                    </p>

                    <p>
                      {item.reason || ""}
                    </p>
                  </div>

                  <div>
                    <strong>
                      {item.status || "pending"}
                    </strong>
                  </div>

                  {item.status === "pending" && (
                    <div
                      style={styles.actionButtons}
                    >
                      <button
                        style={styles.approveButton}
                        onClick={() =>
                          updateRequestStatus(
                            item.id,
                            "approved"
                          )
                        }
                      >
                        Duyệt
                      </button>

                      <button
                        style={styles.rejectButton}
                        onClick={() =>
                          updateRequestStatus(
                            item.id,
                            "rejected"
                          )
                        }
                      >
                        Từ chối
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {requests.length === 0 && (
                <p>Chưa có đơn từ.</p>
              )}
            </div>
          </>
        )}

        {activeMenu === "attendance" && (
          <>
            <h1>Chấm công</h1>

            <div style={styles.whiteBox}>
              {attendance.map((item) => (
                <div
                  key={item.id}
                  style={styles.row}
                >
                  <strong>
                    {getEmployeeName(
                      item.employee_id
                    )}
                  </strong>

                  <span>
                    Check-in:{" "}
                    {item.check_in
                      ? new Date(
                          item.check_in
                        ).toLocaleString("vi-VN")
                      : "--"}
                  </span>

                  <span>
                    Check-out:{" "}
                    {item.check_out
                      ? new Date(
                          item.check_out
                        ).toLocaleString("vi-VN")
                      : "--"}
                  </span>
                </div>
              ))}

              {attendance.length === 0 && (
                <p>
                  Chưa có dữ liệu chấm công.
                </p>
              )}
            </div>
          </>
        )}

        {activeMenu === "reports" && (
          <>
            <h1>Báo cáo</h1>

            <div style={styles.cards}>
              <div style={styles.card}>
                <h3>Tổng nhân viên</h3>
                <strong>{employees.length}</strong>
              </div>

              <div style={styles.card}>
                <h3>Tổng lịch làm</h3>
                <strong>{schedules.length}</strong>
              </div>

              <div style={styles.card}>
                <h3>Tổng đơn từ</h3>
                <strong>{requests.length}</strong>
              </div>

              <div style={styles.card}>
                <h3>Tổng chấm công</h3>
                <strong>
                  {attendance.length}
                </strong>
              </div>
            </div>
          </>
        )}

        {message && (
          <p style={{ color: "red" }}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    display: "flex",
    background: "#f5f5f3",
    fontFamily: "Arial, sans-serif",
    color: "#263238",
  },

  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f3",
    fontFamily: "Arial, sans-serif",
    fontSize: "20px",
  },

  sidebar: {
    width: "220px",
    minHeight: "100vh",
    background: "#10231d",
    color: "#ffffff",
    padding: "30px 20px",
    boxSizing: "border-box",
  },

  logo: {
    fontSize: "28px",
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: "50px",
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  menuButton: {
    background: "transparent",
    color: "#d5ddd9",
    border: "none",
    padding: "14px 12px",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: "8px",
    fontSize: "15px",
  },

  menuActive: {
    background: "#365d4b",
    color: "#ffffff",
    border: "none",
    padding: "14px 12px",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
  },

  content: {
    flex: 1,
    padding: "40px",
    boxSizing: "border-box",
  },

  welcome: {
    background: "#365d4b",
    color: "#ffffff",
    padding: "35px",
    borderRadius: "24px",
    marginBottom: "30px",
  },

  cards: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  },

  card: {
    background: "#ffffff",
    padding: "28px",
    borderRadius: "18px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.06)",
    cursor: "pointer",
  },

  formBox: {
    background: "#ffffff",
    padding: "25px",
    borderRadius: "20px",
    maxWidth: "600px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "30px",
  },

  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  primaryButton: {
    background: "#365d4b",
    color: "#ffffff",
    border: "none",
    padding: "14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },

  whiteBox: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 0",
    borderBottom: "1px solid #eeeeee",
    gap: "20px",
  },

  requestRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 0",
    borderBottom: "1px solid #eeeeee",
    gap: "20px",
  },

  actionButtons: {
    display: "flex",
    gap: "10px",
  },

  approveButton: {
    background: "#365d4b",
    color: "#ffffff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  rejectButton: {
    background: "#c85a54",
    color: "#ffffff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  scheduleList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  scheduleItem: {
    background: "#ffffff",
    padding: "20px",
    borderRadius: "14px",
  },
};
