"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  employment_type: string | null;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  employees: {
    full_name: string;
    employment_type: string | null;
  } | null;
};

type Attendance = {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  late_minutes: number | null;
  penalty_amount: number | null;
  status: string | null;
  employees: {
    full_name: string;
  } | null;
};

type RequestItem = {
  id: string;
  employee_id: string;
  request_type: string;
  request_date: string | null;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: string;
  admin_note: string | null;
  employees: {
    full_name: string;
  } | null;
};

function getVietnamDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function formatTime(value: string | null) {
  if (!value) return "--:--";

  return value.slice(0, 5);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function getDayName(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
  }).format(new Date(`${date}T00:00:00`));
}

function formatMoney(value: number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDateTime(value: string | null) {
  if (!value) return "--:--";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function Home() {
  const [currentEmployee, setCurrentEmployee] =
    useState<Employee | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "today" | "schedule" | "requests"
  >("today");

  const today = getVietnamDate();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");

  async function loadData() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data: currentEmployeeData, error: currentEmployeeError } =
        await supabase
          .from("employees")
          .select(
            `
            id,
            full_name,
            role,
            employment_type
          `
          )
          .eq("auth_user_id", user.id)
          .single();

      if (currentEmployeeError || !currentEmployeeData) {
        alert("Không tìm thấy tài khoản nhân viên.");
        return;
      }

      const current = currentEmployeeData as Employee;

      setCurrentEmployee(current);

      if (current.role !== "admin") {
        alert("Tài khoản này không có quyền quản trị.");
        return;
      }

      const { data: employeeData, error: employeeError } =
        await supabase
          .from("employees")
          .select(
            `
            id,
            full_name,
            role,
            employment_type
          `
          )
          .eq("active", true)
          .order("full_name");

      if (employeeError) {
        console.error(employeeError);
      }

      setEmployees((employeeData || []) as Employee[]);

      const { data: scheduleData, error: scheduleError } =
        await supabase
          .from("work_schedules")
          .select(
            `
            id,
            employee_id,
            work_date,
            start_time,
            end_time,
            employees (
              full_name,
              employment_type
            )
          `
          )
          .gte("work_date", today)
          .order("work_date")
          .order("start_time");

      if (scheduleError) {
        console.error(scheduleError);
      }

      const normalizedSchedules: Schedule[] = (scheduleData || []).map(
        (item: any) => ({
          id: item.id,
          employee_id: item.employee_id,
          work_date: item.work_date,
          start_time: item.start_time,
          end_time: item.end_time,
          employees: Array.isArray(item.employees)
            ? item.employees[0] || null
            : item.employees || null,
        })
      );

      setSchedules(normalizedSchedules);

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select(
            `
            id,
            employee_id,
            work_date,
            check_in,
            check_out,
            late_minutes,
            penalty_amount,
            status,
            employees (
              full_name
            )
          `
          )
          .eq("work_date", today)
          .order("check_in", {
            ascending: false,
            nullsFirst: false,
          });

      if (attendanceError) {
        console.error(attendanceError);
      }

      const normalizedAttendance: Attendance[] = (
        attendanceData || []
      ).map((item: any) => ({
        id: item.id,
        employee_id: item.employee_id,
        work_date: item.work_date,
        check_in: item.check_in,
        check_out: item.check_out,
        late_minutes: item.late_minutes,
        penalty_amount: item.penalty_amount,
        status: item.status,
        employees: Array.isArray(item.employees)
          ? item.employees[0] || null
          : item.employees || null,
      }));

      setAttendanceList(normalizedAttendance);

      const { data: requestData, error: requestError } =
        await supabase
          .from("requests")
          .select(
            `
            id,
            employee_id,
            request_type,
            request_date,
            start_time,
            end_time,
            reason,
            status,
            admin_note,
            employees (
              full_name
            )
          `
          )
          .order("created_at", {
            ascending: false,
          });

      if (requestError) {
        console.error(requestError);
      }

      const normalizedRequests: RequestItem[] = (
        requestData || []
      ).map((item: any) => ({
        id: item.id,
        employee_id: item.employee_id,
        request_type: item.request_type,
        request_date: item.request_date,
        start_time: item.start_time,
        end_time: item.end_time,
        reason: item.reason,
        status: item.status,
        admin_note: item.admin_note,
        employees: Array.isArray(item.employees)
          ? item.employees[0] || null
          : item.employees || null,
      }));

      setRequests(normalizedRequests);
    } catch (error) {
      console.error(error);
      alert("Có lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const todaySchedules = useMemo(() => {
    return schedules.filter(
      (schedule) => schedule.work_date === today
    );
  }, [schedules, today]);

  const checkedInCount = attendanceList.filter(
    (item) => item.check_in
  ).length;

  const checkedOutCount = attendanceList.filter(
    (item) => item.check_out
  ).length;

  const lateCount = attendanceList.filter(
    (item) => Number(item.late_minutes || 0) > 0
  ).length;

  const scheduledEmployeeIds = new Set(
    todaySchedules.map((item) => item.employee_id)
  );

  const notArrivedCount = Array.from(
    scheduledEmployeeIds
  ).filter((employeeId) => {
    return !attendanceList.some(
      (attendance) =>
        attendance.employee_id === employeeId &&
        attendance.check_in
    );
  }).length;

  async function handleCreateSchedule() {
    if (!selectedEmployeeId) {
      alert("Vui lòng chọn nhân viên.");
      return;
    }

    if (!selectedDate) {
      alert("Vui lòng chọn ngày.");
      return;
    }

    if (!startTime || !endTime) {
      alert("Vui lòng nhập giờ bắt đầu và kết thúc.");
      return;
    }

    if (startTime >= endTime) {
      alert("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("work_schedules")
        .insert({
          employee_id: selectedEmployeeId,
          work_date: selectedDate,
          start_time: startTime,
          end_time: endTime,
        });

      if (error) {
        console.error(error);
        alert(`Không thể xếp lịch: ${error.message}`);
        return;
      }

      alert("Đã xếp lịch làm việc.");

      setSelectedEmployeeId("");

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Có lỗi khi xếp lịch.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSchedule(id: string) {
    const confirmDelete = window.confirm(
      "Bạn có chắc muốn xóa ca làm này?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      alert(`Không thể xóa: ${error.message}`);
      return;
    }

    await loadData();
  }

  async function handleRequestStatus(
    id: string,
    status: "approved" | "rejected"
  ) {
    const { error } = await supabase
      .from("requests")
      .update({
        status,
      })
      .eq("id", id);

    if (error) {
      alert(`Không thể cập nhật: ${error.message}`);
      return;
    }

    await loadData();
  }

  function requestStatusText(status: string) {
    if (status === "approved") return "Đã duyệt";
    if (status === "rejected") return "Không duyệt";

    return "Chờ duyệt";
  }

  function requestStatusColor(status: string) {
    if (status === "approved") return "#dcfce7";
    if (status === "rejected") return "#fee2e2";

    return "#fef3c7";
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <h1>SOBA STAFF</h1>
        <p>Đang tải dữ liệu...</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0 }}>SOBA STAFF</h1>
          <p style={{ marginTop: 8, color: "#666" }}>
            Xin chào, {currentEmployee?.full_name}
          </p>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          style={logoutButtonStyle}
        >
          Đăng xuất
        </button>
      </div>

      <div style={menuStyle}>
        <button
          onClick={() => setActiveTab("today")}
          style={
            activeTab === "today"
              ? activeMenuStyle
              : menuButtonStyle
          }
        >
          Hôm nay
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          style={
            activeTab === "schedule"
              ? activeMenuStyle
              : menuButtonStyle
          }
        >
          Xếp lịch làm
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          style={
            activeTab === "requests"
              ? activeMenuStyle
              : menuButtonStyle
          }
        >
          Chờ duyệt
        </button>
      </div>

      {activeTab === "today" && (
        <>
          <h2 style={{ marginTop: 30 }}>
            Hôm nay - {formatDate(today)}
          </h2>

          <div style={dashboardGrid}>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>{checkedInCount}</div>
              <div>🟢 Đã check-in</div>
            </div>

            <div style={statCardStyle}>
              <div style={statNumberStyle}>{lateCount}</div>
              <div>🔴 Đi muộn</div>
            </div>

            <div style={statCardStyle}>
              <div style={statNumberStyle}>{notArrivedCount}</div>
              <div>⚪ Chưa đến</div>
            </div>

            <div style={statCardStyle}>
              <div style={statNumberStyle}>{checkedOutCount}</div>
              <div>🔵 Đã check-out</div>
            </div>
          </div>

          <section style={cardStyle}>
            <h2>Chấm công hôm nay</h2>

            {attendanceList.length === 0 ? (
              <p>Chưa có nhân viên check-in hôm nay.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Nhân viên</th>
                      <th style={thStyle}>Check in</th>
                      <th style={thStyle}>Đi muộn</th>
                      <th style={thStyle}>Phạt</th>
                      <th style={thStyle}>Check out</th>
                    </tr>
                  </thead>

                  <tbody>
                    {attendanceList.map((item) => (
                      <tr key={item.id}>
                        <td style={tdStyle}>
                          {item.employees?.full_name ||
                            "Chưa có tên"}
                        </td>

                        <td style={tdStyle}>
                          {formatDateTime(item.check_in)}
                        </td>

                        <td style={tdStyle}>
                          {Number(item.late_minutes || 0) > 0
                            ? `${item.late_minutes} phút`
                            : "Đúng giờ"}
                        </td>

                        <td style={tdStyle}>
                          {formatMoney(item.penalty_amount)}
                        </td>

                        <td style={tdStyle}>
                          {formatDateTime(item.check_out)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <h2>Ca làm hôm nay</h2>

            {todaySchedules.length === 0 ? (
              <p>Chưa xếp ca hôm nay.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Nhân viên</th>
                      <th style={thStyle}>Loại</th>
                      <th style={thStyle}>Ca làm</th>
                    </tr>
                  </thead>

                  <tbody>
                    {todaySchedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td style={tdStyle}>
                          {schedule.employees?.full_name ||
                            "Chưa có tên"}
                        </td>

                        <td style={tdStyle}>
                          {schedule.employees?.employment_type ||
                            "--"}
                        </td>

                        <td style={tdStyle}>
                          {formatTime(schedule.start_time)} -{" "}
                          {formatTime(schedule.end_time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "schedule" && (
        <>
          <h2 style={{ marginTop: 30 }}>
            Xếp lịch làm việc
          </h2>

          <section style={cardStyle}>
            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>Ngày</label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(event.target.value)
                  }
                  style={inputStyle}
                />

                {selectedDate && (
                  <p style={{ color: "#666", marginBottom: 0 }}>
                    {getDayName(selectedDate)}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Nhân viên</label>

                <select
                  value={selectedEmployeeId}
                  onChange={(event) =>
                    setSelectedEmployeeId(event.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">
                    -- Chọn nhân viên --
                  </option>

                  {employees
                    .filter(
                      (employee) =>
                        employee.role !== "admin"
                    )
                    .map((employee) => (
                      <option
                        key={employee.id}
                        value={employee.id}
                      >
                        {employee.full_name} -{" "}
                        {employee.employment_type ===
                        "part_time"
                          ? "Part time"
                          : "Full time"}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Giờ bắt đầu
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(event) =>
                    setStartTime(event.target.value)
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Giờ kết thúc
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(event) =>
                    setEndTime(event.target.value)
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <button
              onClick={handleCreateSchedule}
              disabled={saving}
              style={primaryButtonStyle}
            >
              {saving ? "Đang lưu..." : "Xếp lịch"}
            </button>
          </section>

          <section style={cardStyle}>
            <h2>Danh sách ca đã xếp</h2>

            {schedules.length === 0 ? (
              <p>Chưa có ca làm nào.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Ngày</th>
                      <th style={thStyle}>Thứ</th>
                      <th style={thStyle}>Nhân viên</th>
                      <th style={thStyle}>Loại</th>
                      <th style={thStyle}>Ca làm</th>
                      <th style={thStyle}>Xóa</th>
                    </tr>
                  </thead>

                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td style={tdStyle}>
                          {formatDate(schedule.work_date)}
                        </td>

                        <td style={tdStyle}>
                          {getDayName(schedule.work_date)}
                        </td>

                        <td style={tdStyle}>
                          {schedule.employees?.full_name ||
                            "Chưa có tên"}
                        </td>

                        <td style={tdStyle}>
                          {schedule.employees?.employment_type ||
                            "--"}
                        </td>

                        <td style={tdStyle}>
                          {formatTime(schedule.start_time)} -{" "}
                          {formatTime(schedule.end_time)}
                        </td>

                        <td style={tdStyle}>
                          <button
                            onClick={() =>
                              handleDeleteSchedule(
                                schedule.id
                              )
                            }
                            style={deleteButtonStyle}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "requests" && (
        <>
          <h2 style={{ marginTop: 30 }}>
            Yêu cầu nhân viên
          </h2>

          <section style={cardStyle}>
            {requests.length === 0 ? (
              <p>Chưa có yêu cầu nào.</p>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "18px 0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3 style={{ marginTop: 0 }}>
                        {request.employees?.full_name ||
                          "Nhân viên"}
                      </h3>

                      <p>
                        <b>Loại yêu cầu:</b>{" "}
                        {request.request_type}
                      </p>

                      {request.request_date && (
                        <p>
                          <b>Ngày:</b>{" "}
                          {formatDate(request.request_date)}
                        </p>
                      )}

                      {(request.start_time ||
                        request.end_time) && (
                        <p>
                          <b>Thời gian:</b>{" "}
                          {formatTime(request.start_time)} -{" "}
                          {formatTime(request.end_time)}
                        </p>
                      )}

                      {request.reason && (
                        <p>
                          <b>Lý do:</b> {request.reason}
                        </p>
                      )}
                    </div>

                    <div>
                      <span
                        style={{
                          background:
                            requestStatusColor(
                              request.status
                            ),
                          padding: "8px 12px",
                          borderRadius: 999,
                          fontWeight: 700,
                        }}
                      >
                        {requestStatusText(
                          request.status
                        )}
                      </span>
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        marginTop: 12,
                      }}
                    >
                      <button
                        onClick={() =>
                          handleRequestStatus(
                            request.id,
                            "approved"
                          )
                        }
                        style={approveButtonStyle}
                      >
                        Duyệt
                      </button>

                      <button
                        onClick={() =>
                          handleRequestStatus(
                            request.id,
                            "rejected"
                          )
                        }
                        style={rejectButtonStyle}
                      >
                        Không duyệt
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}

const pageStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "30px 20px 60px",
  fontFamily: "Arial, sans-serif",
  color: "#1f2937",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  flexWrap: "wrap" as const,
};

const menuStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "25px",
  flexWrap: "wrap" as const,
};

const menuButtonStyle = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 600,
};

const activeMenuStyle = {
  ...menuButtonStyle,
  background: "#256b4a",
  color: "#fff",
  border: "1px solid #256b4a",
};

const logoutButtonStyle = {
  border: "1px solid #ddd",
  background: "#fff",
  padding: "10px 15px",
  borderRadius: "10px",
  cursor: "pointer",
};

const dashboardGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "15px",
  marginTop: "20px",
};

const statCardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "20px",
};

const statNumberStyle = {
  fontSize: "32px",
  fontWeight: 700,
  marginBottom: "8px",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "24px",
  marginTop: "24px",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "18px",
  marginBottom: "20px",
};

const labelStyle = {
  display: "block",
  fontWeight: 700,
  marginBottom: "8px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  fontSize: "15px",
};

const primaryButtonStyle = {
  width: "100%",
  background: "#256b4a",
  color: "#fff",
  border: "none",
  padding: "14px",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: 700,
  cursor: "pointer",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "700px",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
  borderBottom: "2px solid #e5e7eb",
  background: "#f9fafb",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
};

const deleteButtonStyle = {
  background: "#fee2e2",
  color: "#b91c1c",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
};

const approveButtonStyle = {
  background: "#256b4a",
  color: "#fff",
  border: "none",
  padding: "10px 15px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const rejectButtonStyle = {
  background: "#fee2e2",
  color: "#b91c1c",
  border: "none",
  padding: "10px 15px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};
