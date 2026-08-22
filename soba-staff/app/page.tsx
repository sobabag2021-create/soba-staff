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
  salary?: number | null;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  note?: string | null;
};

type Attendance = {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status?: string | null;
};

type LeaveRequest = {
  id: string;
  employee_id: string;
  request_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  reason?: string | null;
  status?: string | null;
  admin_note?: string | null;
  created_at?: string;
};

type TaskReport = {
  id: string;
  employee_id: string;
  report_date?: string | null;
  content: string;
  status?: string | null;
  created_at?: string;
};

type Notification = {
  id: string;
  title: string;
  content?: string | null;
  created_at?: string;
};

type Tab =
  | "dashboard"
  | "employees"
  | "schedules"
  | "attendance"
  | "requests"
  | "reports"
  | "notifications";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [dataLoading, setDataLoading] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [scheduleNote, setScheduleNote] = useState("");

  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null
  );

  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationContent, setNotificationContent] = useState("");

  const [adminNote, setAdminNote] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split("T")[0];

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

        loadAllData();
      } catch (error) {
        console.error(error);
        setErrorMessage("Có lỗi xảy ra. Vui lòng đăng nhập lại.");
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  async function loadAllData() {
    setDataLoading(true);

    try {
      const [
        employeesResult,
        schedulesResult,
        attendanceResult,
        requestsResult,
        reportsResult,
        notificationsResult,
      ] = await Promise.all([
        supabase.from("employees").select("*").order("full_name"),

        supabase
          .from("schedules")
          .select("*")
          .order("work_date", { ascending: false }),

        supabase
          .from("attendance")
          .select("*")
          .order("work_date", { ascending: false }),

        supabase
          .from("leave_requests")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("task_reports")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (employeesResult.error) {
        console.error("employees:", employeesResult.error);
      } else {
        setEmployees(employeesResult.data || []);
      }

      if (schedulesResult.error) {
        console.error("schedules:", schedulesResult.error);
      } else {
        setSchedules(schedulesResult.data || []);
      }

      if (attendanceResult.error) {
        console.error("attendance:", attendanceResult.error);
      } else {
        setAttendance(attendanceResult.data || []);
      }

      if (requestsResult.error) {
        console.error("requests:", requestsResult.error);
      } else {
        setRequests(requestsResult.data || []);
      }

      if (reportsResult.error) {
        console.error("reports:", reportsResult.error);
      } else {
        setReports(reportsResult.data || []);
      }

      if (notificationsResult.error) {
        console.error("notifications:", notificationsResult.error);
      } else {
        setNotifications(notificationsResult.data || []);
      }
    } catch (error) {
      console.error(error);
    }

    setDataLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function getEmployeeName(employeeId: string) {
    return (
      employees.find((item) => item.id === employeeId)?.full_name ||
      "Không xác định"
    );
  }

  async function saveSchedule() {
    if (!selectedEmployeeId || !workDate || !startTime || !endTime) {
      alert("Vui lòng chọn nhân viên, ngày làm và giờ bắt đầu/kết thúc.");
      return;
    }

    if (startTime === endTime) {
      alert("Giờ bắt đầu và giờ kết thúc không được giống nhau.");
      return;
    }

    const payload = {
      employee_id: selectedEmployeeId,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      note: scheduleNote || null,
    };

    let error;

    if (editingScheduleId) {
      const result = await supabase
        .from("schedules")
        .update(payload)
        .eq("id", editingScheduleId);

      error = result.error;
    } else {
      const result = await supabase.from("schedules").insert(payload);

      error = result.error;
    }

    if (error) {
      console.error(error);
      alert("Không thể lưu lịch: " + error.message);
      return;
    }

    alert(editingScheduleId ? "Đã cập nhật lịch." : "Đã xếp lịch.");

    resetScheduleForm();
    loadAllData();
  }

  function editSchedule(schedule: Schedule) {
    setEditingScheduleId(schedule.id);
    setSelectedEmployeeId(schedule.employee_id);
    setWorkDate(schedule.work_date);
    setStartTime(schedule.start_time || "");
    setEndTime(schedule.end_time || "");
    setScheduleNote(schedule.note || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetScheduleForm() {
    setEditingScheduleId(null);
    setSelectedEmployeeId("");
    setWorkDate("");
    setStartTime("");
    setEndTime("");
    setScheduleNote("");
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Bạn có chắc muốn xóa lịch này?")) return;

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Không thể xóa lịch: " + error.message);
      return;
    }

    loadAllData();
  }

  async function updateRequestStatus(
    requestId: string,
    status: "approved" | "rejected"
  ) {
    const note = adminNote[requestId] || null;

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status,
        admin_note: note,
      })
      .eq("id", requestId);

    if (error) {
      alert("Không thể cập nhật đơn: " + error.message);
      return;
    }

    alert(status === "approved" ? "Đã duyệt đơn." : "Đã từ chối đơn.");

    loadAllData();
  }

  async function sendNotification() {
    if (!notificationTitle.trim()) {
      alert("Vui lòng nhập tiêu đề thông báo.");
      return;
    }

    const { error } = await supabase.from("notifications").insert({
      title: notificationTitle.trim(),
      content: notificationContent.trim() || null,
    });

    if (error) {
      alert("Không thể gửi thông báo: " + error.message);
      return;
    }

    setNotificationTitle("");
    setNotificationContent("");

    alert("Đã gửi thông báo.");

    loadAllData();
  }

  const stats = useMemo(() => {
    const activeEmployees = employees.filter(
      (item) => item.active !== false && item.role === "employee"
    );

    const todayAttendance = attendance.filter(
      (item) => item.work_date === today && item.check_in
    );

    const pendingRequests = requests.filter(
      (item) => item.status === "pending"
    );

    const todaySchedules = schedules.filter(
      (item) => item.work_date === today
    );

    return {
      activeEmployees: activeEmployees.length,
      todayAttendance: todayAttendance.length,
      pendingRequests: pendingRequests.length,
      todaySchedules: todaySchedules.length,
    };
  }, [employees, attendance, requests, schedules, today]);

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
        <div
          style={{
            background: "#ffffff",
            padding: "30px 40px",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            color: "#365d4b",
            fontWeight: 600,
          }}
        >
          Đang tải...
        </div>
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
            background: "#ffffff",
            padding: "30px",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h2>{errorMessage}</h2>

          <button
            onClick={() => router.replace("/login")}
            style={{
              marginTop: "16px",
              border: "none",
              background: "#365d4b",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Về trang đăng nhập
          </button>
        </div>
      </main>
    );
  }

  const menuButtonStyle = (tab: Tab) => ({
    border:
      activeTab === tab
        ? "2px solid #365d4b"
        : "1px solid #eeeeee",
    background: "#ffffff",
    padding: "20px",
    borderRadius: "16px",
    textAlign: "left" as const,
    cursor: "pointer",
    boxShadow:
      activeTab === tab
        ? "0 8px 20px rgba(54,93,75,0.15)"
        : "0 4px 15px rgba(0,0,0,0.05)",
    color: "#263238",
  });

  const primaryButton = {
    border: "none",
    background: "#365d4b",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  };

  const secondaryButton = {
    border: "1px solid #d9d9d9",
    background: "#ffffff",
    color: "#263238",
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  };

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
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e5e5",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
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
            Trang quản trị
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            border: "none",
            background: "#365d4b",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Đăng xuất
        </button>
      </header>

      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            background: "#365d4b",
            color: "#ffffff",
            padding: "30px",
            borderRadius: "20px",
            marginBottom: "30px",
          }}
        >
          <p style={{ margin: 0, opacity: 0.8 }}>
            Xin chào Admin
          </p>

          <h2
            style={{
              margin: "10px 0",
              fontSize: "32px",
            }}
          >
            {employee?.full_name || "Quản trị viên"}
          </h2>

          <p style={{ margin: 0, opacity: 0.85 }}>
            Quản lý nhân viên, lịch làm, chấm công và yêu cầu
          </p>
        </div>

        {/* MENU */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "30px",
          }}
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            style={menuButtonStyle("dashboard")}
          >
            <strong>Dashboard</strong>
            <p style={{ marginBottom: 0, color: "#777" }}>
              Tổng quan cửa hàng
            </p>
          </button>

          <button
            onClick={() => setActiveTab("employees")}
            style={menuButtonStyle("employees")}
          >
            <strong>Nhân viên</strong>
            <p style={{ marginBottom: 0, color: "#777" }}>
              Danh sách nhân viên
            </p>
          </button>

          <button
            onClick={() => setActiveTab("schedules")}
            style={menuButtonStyle("schedules")}
          >
            <strong>Lịch làm việc</strong>
            <p style={{ marginBottom: 0, color: "#777" }}>
              Xếp và sửa lịch linh hoạt
            </p>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            style={menuButtonStyle("attendance")}
          >
            <strong>Chấm công</strong>
            <p style={{ marginBottom: 0, color: "#777" }}>
              Check-in và check-out
            </p>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            style={menuButtonStyle("requests")}
          >
            <strong>Đơn từ</strong>
            <p style={{ marginBottom: 0, color: "#777" }}>
              Duyệt yêu cầu nhân viên
            </p>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            style={menuButtonStyle("reports")}
          >
            <strong>Báo cáo</strong>
            <p style={{ marginBottom: 0, color: "#777" }}>
              Báo cáo công việc
            </p>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            style={menuButtonStyle("notifications")}
          >
            <strong>Thông báo</strong>
            <p style={{ marginBottom: 0, color: "#777" }}>
              Gửi thông báo cho nhân viên
            </p>
          </button>
        </div>

        {dataLoading && (
          <div
            style={{
              background: "#ffffff",
              padding: "14px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            Đang đồng bộ dữ liệu...
          </div>
        )}

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <h2>Tổng quan</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "20px",
              }}
            >
              {[
                {
                  label: "Nhân viên đang hoạt động",
                  value: stats.activeEmployees,
                },
                {
                  label: "Đã check-in hôm nay",
                  value: stats.todayAttendance,
                },
                {
                  label: "Ca làm hôm nay",
                  value: stats.todaySchedules,
                },
                {
                  label: "Đơn chờ duyệt",
                  value: stats.pendingRequests,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "#ffffff",
                    padding: "25px",
                    borderRadius: "16px",
                    boxShadow:
                      "0 4px 15px rgba(0,0,0,0.05)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#777",
                    }}
                  >
                    {item.label}
                  </p>

                  <h3
                    style={{
                      margin: "12px 0 0",
                      fontSize: "36px",
                      color: "#365d4b",
                    }}
                  >
                    {item.value}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPLOYEES */}
        {activeTab === "employees" && (
          <div>
            <h2>Danh sách nhân viên</h2>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                overflowX: "auto",
                boxShadow:
                  "0 4px 15px rgba(0,0,0,0.05)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "750px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f7f7f5",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "16px" }}>Họ tên</th>
                    <th style={{ padding: "16px" }}>Email</th>
                    <th style={{ padding: "16px" }}>Role</th>
                    <th style={{ padding: "16px" }}>Loại nhân viên</th>
                    <th style={{ padding: "16px" }}>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderTop: "1px solid #eeeeee",
                      }}
                    >
                      <td style={{ padding: "16px" }}>
                        {item.full_name}
                      </td>

                      <td style={{ padding: "16px" }}>
                        {item.email || "-"}
                      </td>

                      <td style={{ padding: "16px" }}>
                        {item.role}
                      </td>

                      <td style={{ padding: "16px" }}>
                        {item.employment_type || "-"}
                      </td>

                      <td style={{ padding: "16px" }}>
                        {item.active === false
                          ? "Đã khóa"
                          : "Đang hoạt động"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCHEDULES */}
        {activeTab === "schedules" && (
          <div>
            <h2>
              {editingScheduleId
                ? "Chỉnh sửa lịch làm"
                : "Xếp lịch làm việc"}
            </h2>

            <div
              style={{
                background: "#ffffff",
                padding: "25px",
                borderRadius: "16px",
                boxShadow:
                  "0 4px 15px rgba(0,0,0,0.05)",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "15px",
                }}
              >
                <select
                  value={selectedEmployeeId}
                  onChange={(e) =>
                    setSelectedEmployeeId(e.target.value)
                  }
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="">Chọn nhân viên</option>

                  {employees
                    .filter(
                      (item) =>
                        item.role === "employee" &&
                        item.active !== false
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
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
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />

                <input
                  type="time"
                  value={startTime}
                  onChange={(e) =>
                    setStartTime(e.target.value)
                  }
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) =>
                    setEndTime(e.target.value)
                  }
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />
              </div>

              <textarea
                value={scheduleNote}
                onChange={(e) =>
                  setScheduleNote(e.target.value)
                }
                placeholder="Ghi chú ca làm (không bắt buộc)"
                style={{
                  width: "100%",
                  minHeight: "100px",
                  marginTop: "15px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  resize: "vertical",
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "15px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={saveSchedule}
                  style={primaryButton}
                >
                  {editingScheduleId
                    ? "Lưu thay đổi"
                    : "Xếp lịch"}
                </button>

                {editingScheduleId && (
                  <button
                    onClick={resetScheduleForm}
                    style={secondaryButton}
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>

              <p
                style={{
                  marginTop: "15px",
                  color: "#777",
                  fontSize: "14px",
                }}
              >
                Thời gian hoàn toàn linh hoạt. Bạn tự chọn giờ bắt đầu
                và kết thúc cho từng nhân viên, không bị cố định theo
                ca.
              </p>
            </div>

            <h3>Lịch đã xếp</h3>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {schedules.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#ffffff",
                    padding: "20px",
                    borderRadius: "14px",
                    boxShadow:
                      "0 4px 15px rgba(0,0,0,0.04)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>
                      {getEmployeeName(item.employee_id)}
                    </strong>

                    <p
                      style={{
                        marginBottom: 0,
                        color: "#666",
                      }}
                    >
                      {item.work_date} •{" "}
                      {item.start_time || "--:--"} -{" "}
                      {item.end_time || "--:--"}
                    </p>

                    {item.note && (
                      <p
                        style={{
                          marginBottom: 0,
                          color: "#777",
                        }}
                      >
                        Ghi chú: {item.note}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() => editSchedule(item)}
                      style={secondaryButton}
                    >
                      Sửa
                    </button>

                    <button
                      onClick={() => deleteSchedule(item.id)}
                      style={{
                        ...secondaryButton,
                        color: "#b3261e",
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}

              {schedules.length === 0 && (
                <p>Chưa có lịch làm nào.</p>
              )}
            </div>
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === "attendance" && (
          <div>
            <h2>Chấm công</h2>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                overflowX: "auto",
                boxShadow:
                  "0 4px 15px rgba(0,0,0,0.05)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: "850px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f7f7f5",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "16px" }}>Nhân viên</th>
                    <th style={{ padding: "16px" }}>Ngày</th>
                    <th style={{ padding: "16px" }}>Check-in</th>
                    <th style={{ padding: "16px" }}>Check-out</th>
                    <th style={{ padding: "16px" }}>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {attendance.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderTop: "1px solid #eeeeee",
                      }}
                    >
                      <td style={{ padding: "16px" }}>
                        {getEmployeeName(item.employee_id)}
                      </td>

                      <td style={{ padding: "16px" }}>
                        {item.work_date}
                      </td>

                      <td style={{ padding: "16px" }}>
                        {item.check_in
                          ? new Date(
                              item.check_in
                            ).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>

                      <td style={{ padding: "16px" }}>
                        {item.check_out
                          ? new Date(
                              item.check_out
                            ).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>

                      <td style={{ padding: "16px" }}>
                        {item.status || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REQUESTS */}
        {activeTab === "requests" && (
          <div>
            <h2>Đơn từ nhân viên</h2>

            <div
              style={{
                display: "grid",
                gap: "16px",
              }}
            >
              {requests.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#ffffff",
                    padding: "22px",
                    borderRadius: "16px",
                    boxShadow:
                      "0 4px 15px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3 style={{ marginTop: 0 }}>
                        {getEmployeeName(item.employee_id)}
                      </h3>

                      <p>
                        Loại đơn:{" "}
                        <strong>
                          {item.request_type || "leave"}
                        </strong>
                      </p>

                      <p>
                        Thời gian:{" "}
                        {item.start_date || "-"} đến{" "}
                        {item.end_date || "-"}
                      </p>

                      <p>
                        Lý do: {item.reason || "-"}
                      </p>

                      <p>
                        Trạng thái:{" "}
                        <strong>
                          {item.status || "pending"}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {item.status === "pending" && (
                    <>
                      <textarea
                        value={adminNote[item.id] || ""}
                        onChange={(e) =>
                          setAdminNote((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Ghi chú của admin (không bắt buộc)"
                        style={{
                          width: "100%",
                          minHeight: "80px",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                          resize: "vertical",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "12px",
                        }}
                      >
                        <button
                          onClick={() =>
                            updateRequestStatus(
                              item.id,
                              "approved"
                            )
                          }
                          style={primaryButton}
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
                          style={{
                            ...secondaryButton,
                            color: "#b3261e",
                          }}
                        >
                          Từ chối
                        </button>
                      </div>
                    </>
                  )}

                  {item.admin_note && (
                    <p
                      style={{
                        marginBottom: 0,
                        color: "#777",
                      }}
                    >
                      Ghi chú admin: {item.admin_note}
                    </p>
                  )}
                </div>
              ))}

              {requests.length === 0 && (
                <p>Chưa có đơn từ nào.</p>
              )}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {activeTab === "reports" && (
          <div>
            <h2>Báo cáo công việc</h2>

            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >
              {reports.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#ffffff",
                    padding: "22px",
                    borderRadius: "16px",
                    boxShadow:
                      "0 4px 15px rgba(0,0,0,0.05)",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    {getEmployeeName(item.employee_id)}
                  </h3>

                  <p
                    style={{
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {item.content}
                  </p>

                  <small style={{ color: "#777" }}>
                    {item.created_at
                      ? new Date(
                          item.created_at
                        ).toLocaleString("vi-VN")
                      : ""}
                  </small>
                </div>
              ))}

              {reports.length === 0 && (
                <p>Chưa có báo cáo nào.</p>
              )}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div>
            <h2>Thông báo</h2>

            <div
              style={{
                background: "#ffffff",
                padding: "25px",
                borderRadius: "16px",
                boxShadow:
                  "0 4px 15px rgba(0,0,0,0.05)",
                maxWidth: "700px",
                marginBottom: "25px",
              }}
            >
              <input
                value={notificationTitle}
                onChange={(e) =>
                  setNotificationTitle(e.target.value)
                }
                placeholder="Tiêu đề thông báo"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  marginBottom: "12px",
                }}
              />

              <textarea
                value={notificationContent}
                onChange={(e) =>
                  setNotificationContent(e.target.value)
                }
                placeholder="Nội dung thông báo"
                style={{
                  width: "100%",
                  minHeight: "120px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  resize: "vertical",
                }}
              />

              <button
                onClick={sendNotification}
                style={{
                  ...primaryButton,
                  marginTop: "12px",
                }}
              >
                Gửi thông báo
              </button>
            </div>

            <h3>Thông báo đã gửi</h3>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {notifications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#ffffff",
                    padding: "18px",
                    borderRadius: "14px",
                  }}
                >
                  <strong>{item.title}</strong>

                  {item.content && (
                    <p>{item.content}</p>
                  )}

                  <small style={{ color: "#777" }}>
                    {item.created_at
                      ? new Date(
                          item.created_at
                        ).toLocaleString("vi-VN")
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
