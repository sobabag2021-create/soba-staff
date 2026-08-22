"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

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
  work_date?: string;
};

type Menu =
  | "dashboard"
  | "employees"
  | "schedule"
  | "requests"
  | "attendance"
  | "reports"
  | "notifications";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeMenu, setActiveMenu] = useState<Menu>("dashboard");

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [message, setMessage] = useState("");

  // Xếp lịch
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Lấy user đang đăng nhập
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      // Lấy thông tin tài khoản
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

      // Kiểm tra tài khoản bị khóa
      if (employeeData.active === false) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      // Nếu không phải admin
      if (employeeData.role !== "admin") {
        router.replace("/employee");
        return;
      }

      setEmployee(employeeData);

      // Lấy danh sách nhân viên
      const { data: employeesData } = await supabase
        .from("employees")
        .select("*")
        .eq("active", true)
        .order("full_name");

      setEmployees(employeesData || []);

      // Lấy lịch làm
      const { data: schedulesData } = await supabase
        .from("schedules")
        .select("*")
        .order("work_date", { ascending: false });

      setSchedules(schedulesData || []);

      // Lấy đơn từ
      const { data: requestsData } = await supabase
        .from("requests")
        .select("*")
        .order("created_at", { ascending: false });

      setRequests(requestsData || []);

      // Lấy chấm công
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .order("check_in", { ascending: false });

      setAttendance(attendanceData || []);

    } catch (error) {
      console.error(error);
      setMessage("Có lỗi xảy ra khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // Xếp lịch
  async function createSchedule() {
    if (
      !selectedEmployee ||
      !workDate ||
      !startTime ||
      !endTime
    ) {
      alert("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    try {
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

      loadData();

    } catch (error) {
      console.error(error);
      alert("Không thể xếp lịch.");
    }
  }

  // Duyệt đơn
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
        ? "Đã duyệt yêu cầu."
        : "Đã từ chối yêu cầu."
    );

    loadData();
  }

  function getEmployeeName(employeeId: string) {
    const found = employees.find(
      (item) => item.id === employeeId
    );

    return found?.full_name || "Không rõ";
  }

  if (loading) {
    return (
      <main style={styles.loading}>
        Đang tải dữ liệu...
      </main>
    );
  }

  return (
    <main style={styles.app}>
      {/* SIDEBAR */}

      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div>SOBA</div>
          <div>STAFF</div>
        </div>

        <nav style={styles.menu}>
          <button
            style={
              activeMenu === "dashboard"
                ? styles.menuActive
                : styles.menuItem
            }
            onClick={() => setActiveMenu("dashboard")}
          >
            Dashboard
          </button>

          <button
            style={
              activeMenu === "employees"
                ? styles.menuActive
                : styles.menuItem
            }
            onClick={() => setActiveMenu("employees")}
          >
            Nhân viên
          </button>

          <button
            style={
              activeMenu === "schedule"
                ? styles.menuActive
                : styles.menuItem
            }
            onClick={() => setActiveMenu("schedule")}
          >
            Lịch làm
          </button>

          <button
            style={
              activeMenu === "requests"
                ? styles.menuActive
                : styles.menuItem
            }
            onClick={() => setActiveMenu("requests")}
          >
            Đơn từ
          </button>

          <button
            style={
              activeMenu === "attendance"
                ? styles.menuActive
                : styles.menuItem
            }
            onClick={() => setActiveMenu("attendance")}
          >
            Chấm công
          </button>

          <button
            style={
              activeMenu === "reports"
                ? styles.menuActive
                : styles.menuItem
            }
            onClick={() => setActiveMenu("reports")}
          >
            Báo cáo
          </button>

          <button
            style={
              activeMenu === "notifications"
                ? styles.menuActive
                : styles.menuItem
            }
            onClick={() => setActiveMenu("notifications")}
          >
            Thông báo
          </button>

          <button
            style={styles.menuItem}
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </nav>
      </aside>

      {/* MAIN */}

      <section style={styles.content}>
        {/* DASHBOARD */}

        {activeMenu === "dashboard" && (
          <>
            <div style={styles.welcome}>
              <p>Xin chào Admin</p>

              <h1>
                {employee?.full_name || "Quản trị viên"}
              </h1>

              <span>
                Quản lý nhân viên và hoạt động của cửa hàng
              </span>
            </div>

            <div style={styles.cards}>
              <div
                style={styles.card}
                onClick={() => setActiveMenu("employees")}
              >
                <h3>Nhân viên</h3>

                <strong>{employees.length}</strong>

                <p>Nhân viên đang hoạt động</p>
              </div>

              <div
                style={styles.card}
                onClick={() => setActiveMenu("schedule")}
              >
                <h3>Lịch làm</h3>

                <strong>{schedules.length}</strong>

                <p>Ca làm đã được tạo</p>
              </div>

              <div
                style={styles.card}
                onClick={() => setActiveMenu("requests")}
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

                <strong>{attendance.length}</strong>

                <p>Lượt chấm công</p>
              </div>
            </div>
          </>
        )}

        {/* NHÂN VIÊN */}

        {activeMenu === "employees" && (
          <>
            <h1>Nhân viên</h1>

            <div style={styles.tableBox}>
              {employees.map((item) => (
                <div
                  key={item.id}
                  style={styles.employeeRow}
                >
                  <div>
                    <strong>{item.full_name}</strong>

                    <p>
                      {item.employment_type ||
                        "Chưa xác định"}
                    </p>
                  </div>

                  <span
                    style={{
                      color:
                        item.role === "admin"
                          ? "#365d4b"
                          : "#555",
                      fontWeight: 600,
                    }}
                  >
                    {item.role}
                  </span>

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

        {/* LỊCH LÀM */}

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
                      item.role === "employee"
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
                onClick={createSchedule}
                style={styles.primaryButton}
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

        {/* ĐƠN TỪ */}

        {activeMenu === "requests" && (
          <>
            <h1>Đơn từ</h1>

            <div style={styles.tableBox}>
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
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() =>
                          updateRequestStatus(
                            item.id,
                            "approved"
                          )
                        }
                        style={styles.approveButton}
                      >
                        Duyệt
                      </button>

                      <button
                        onClick={() =>
                          updateRequestStatus(
                            item.id,
                            "rejected"
                          )
                        }
                        style={styles.rejectButton}
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

        {/* CHẤM CÔNG */}

        {activeMenu === "attendance" && (
          <>
            <h1>Chấm công</h1>

            <div style={styles.tableBox}>
              {attendance.map((item) => (
                <div
                  key={item.id}
                  style={styles.employeeRow}
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
                <p>Chưa có dữ liệu chấm công.</p>
              )}
            </div>
          </>
        )}

        {/* BÁO CÁO */}

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

                <strong>{attendance.length}</strong>
              </div>
            </div>
          </>
        )}

        {/* THÔNG BÁO */}

        {activeMenu === "notifications" && (
          <>
            <h1>Thông báo</h1>

            <div style={styles.tableBox}>
              <p>
                Chức năng thông báo sẽ được kết nối
                tiếp theo.
              </p>
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

  menuItem: {
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
    maxWidth: "1400px",
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
    fontSize: "15px",
  },

  tableBox: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
  },

  employeeRow: {
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
