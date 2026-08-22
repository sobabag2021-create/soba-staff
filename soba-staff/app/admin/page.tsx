"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const [employees, setEmployees] =
    useState<any[]>([]);

  const [requests, setRequests] =
    useState<any[]>([]);

  const [attendance, setAttendance] =
    useState<any[]>([]);

  const [schedules, setSchedules] =
    useState<any[]>([]);

  const [reports, setReports] =
    useState<any[]>([]);

  const [activeTab, setActiveTab] =
    useState("dashboard");

  const [selectedEmployee, setSelectedEmployee] =
    useState("");

  const [workDate, setWorkDate] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [note, setNote] =
    useState("");

  const [notificationTitle, setNotificationTitle] =
    useState("");

  const [notificationContent, setNotificationContent] =
    useState("");

  useEffect(() => {
    checkAdmin();
    loadData();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: employee } =
      await supabase
        .from("employees")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!employee || employee.role !== "admin") {
      await supabase.auth.signOut();

      alert("Tài khoản này không có quyền quản trị.");

      router.push("/login");
    }
  }

  async function loadData() {
    const { data: employeeData } =
      await supabase
        .from("employees")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    setEmployees(employeeData || []);

    const { data: requestData } =
      await supabase
        .from("leave_requests")
        .select(`
          *,
          employees (
            full_name
          )
        `)
        .order("created_at", {
          ascending: false,
        });

    setRequests(requestData || []);

    const { data: attendanceData } =
      await supabase
        .from("attendance")
        .select(`
          *,
          employees (
            full_name
          )
        `)
        .order("created_at", {
          ascending: false,
        });

    setAttendance(attendanceData || []);

    const { data: scheduleData } =
      await supabase
        .from("schedules")
        .select(`
          *,
          employees (
            full_name
          )
        `)
        .order("work_date", {
          ascending: false,
        });

    setSchedules(scheduleData || []);

    const { data: reportData } =
      await supabase
        .from("task_reports")
        .select(`
          *,
          employees (
            full_name
          )
        `)
        .order("created_at", {
          ascending: false,
        });

    setReports(reportData || []);
  }

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

    const { error } =
      await supabase
        .from("schedules")
        .insert({
          employee_id: selectedEmployee,
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
          note,
        });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Đã xếp lịch làm.");

    setSelectedEmployee("");
    setWorkDate("");
    setStartTime("");
    setEndTime("");
    setNote("");

    loadData();
  }

  async function updateRequest(
    id: string,
    status: string
  ) {
    const { error } =
      await supabase
        .from("leave_requests")
        .update({
          status,
        })
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function createNotification() {
    if (
      !notificationTitle ||
      !notificationContent
    ) {
      alert("Vui lòng nhập thông báo.");
      return;
    }

    const { error } =
      await supabase
        .from("notifications")
        .insert({
          title: notificationTitle,
          content: notificationContent,
        });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Đã tạo thông báo.");

    setNotificationTitle("");
    setNotificationContent("");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const today =
    new Date().toISOString().split("T")[0];

  const todayAttendance =
    attendance.filter(
      (item) => item.work_date === today
    );

  const pendingRequests =
    requests.filter(
      (item) => item.status === "pending"
    );

  return (
    <main className="admin-page">

      <aside className="sidebar">

        <h1>SOBA STAFF</h1>

        <button
          onClick={() =>
            setActiveTab("dashboard")
          }
        >
          Dashboard
        </button>

        <button
          onClick={() =>
            setActiveTab("employees")
          }
        >
          Nhân viên
        </button>

        <button
          onClick={() =>
            setActiveTab("schedules")
          }
        >
          Lịch làm
        </button>

        <button
          onClick={() =>
            setActiveTab("requests")
          }
        >
          Đơn từ
        </button>

        <button
          onClick={() =>
            setActiveTab("attendance")
          }
        >
          Chấm công
        </button>

        <button
          onClick={() =>
            setActiveTab("reports")
          }
        >
          Báo cáo
        </button>

        <button
          onClick={() =>
            setActiveTab("notifications")
          }
        >
          Thông báo
        </button>

        <button onClick={logout}>
          Đăng xuất
        </button>

      </aside>

      <section className="admin-content">

        {activeTab === "dashboard" && (
          <>
            <h2>Dashboard</h2>

            <div className="stats">

              <div className="stat-card">
                <p>Tổng nhân viên</p>
                <h3>{employees.length}</h3>
              </div>

              <div className="stat-card">
                <p>Đi làm hôm nay</p>
                <h3>
                  {todayAttendance.length}
                </h3>
              </div>

              <div className="stat-card">
                <p>Đơn chờ duyệt</p>
                <h3>
                  {pendingRequests.length}
                </h3>
              </div>

              <div className="stat-card">
                <p>Tổng lịch làm</p>
                <h3>{schedules.length}</h3>
              </div>

            </div>
          </>
        )}

        {activeTab === "employees" && (
          <>
            <h2>Danh sách nhân viên</h2>

            <table>

              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Loại nhân viên</th>
                  <th>Lương</th>
                </tr>
              </thead>

              <tbody>

                {employees.map((employee) => (
                  <tr key={employee.id}>

                    <td>
                      {employee.full_name}
                    </td>

                    <td>
                      {employee.email}
                    </td>

                    <td>
                      {employee.role}
                    </td>

                    <td>
                      {employee.employment_type}
                    </td>

                    <td>
                      {Number(
                        employee.salary || 0
                      ).toLocaleString(
                        "vi-VN"
                      )}{" "}
                      VNĐ
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>
          </>
        )}

        {activeTab === "schedules" && (
          <>
            <h2>Xếp lịch làm</h2>

            <div className="form-card">

              <select
                value={selectedEmployee}
                onChange={(e) =>
                  setSelectedEmployee(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Chọn nhân viên
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
                      {employee.full_name}
                    </option>
                  ))}

              </select>

              <input
                type="date"
                value={workDate}
                onChange={(e) =>
                  setWorkDate(
                    e.target.value
                  )
                }
              />

              <input
                type="time"
                value={startTime}
                onChange={(e) =>
                  setStartTime(
                    e.target.value
                  )
                }
              />

              <input
                type="time"
                value={endTime}
                onChange={(e) =>
                  setEndTime(
                    e.target.value
                  )
                }
              />

              <textarea
                placeholder="Ghi chú"
                value={note}
                onChange={(e) =>
                  setNote(
                    e.target.value
                  )
                }
              />

              <button
                onClick={createSchedule}
              >
                Xếp lịch
              </button>

            </div>

            <h3>Lịch đã tạo</h3>

            {schedules.map((item) => (
              <div
                className="list-item"
                key={item.id}
              >
                <strong>
                  {item.employees?.full_name}
                </strong>

                <p>
                  {item.work_date} |{" "}
                  {item.start_time} -{" "}
                  {item.end_time}
                </p>

              </div>
            ))}
          </>
        )}

        {activeTab === "requests" && (
          <>
            <h2>Đơn từ nhân viên</h2>

            {requests.map((item) => (
              <div
                className="request-card"
                key={item.id}
              >
                <h3>
                  {item.employees?.full_name}
                </h3>

                <p>
                  {item.start_date} →{" "}
                  {item.end_date}
                </p>

                <p>
                  {item.reason}
                </p>

                <strong>
                  Trạng thái:{" "}
                  {item.status}
                </strong>

                {item.status ===
                  "pending" && (
                  <div>

                    <button
                      onClick={() =>
                        updateRequest(
                          item.id,
                          "approved"
                        )
                      }
                    >
                      Duyệt
                    </button>

                    <button
                      onClick={() =>
                        updateRequest(
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
          </>
        )}

        {activeTab === "attendance" && (
          <>
            <h2>Chấm công</h2>

            <table>

              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Ngày</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>

              <tbody>

                {attendance.map((item) => (
                  <tr key={item.id}>

                    <td>
                      {item.employees?.full_name}
                    </td>

                    <td>
                      {item.work_date}
                    </td>

                    <td>
                      {item.check_in
                        ? new Date(
                            item.check_in
                          ).toLocaleTimeString(
                            "vi-VN"
                          )
                        : "-"}
                    </td>

                    <td>
                      {item.check_out
                        ? new Date(
                            item.check_out
                          ).toLocaleTimeString(
                            "vi-VN"
                          )
                        : "-"}
                    </td>

                    <td>
                      {item.status}
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>
          </>
        )}

        {activeTab === "reports" && (
          <>
            <h2>Báo cáo công việc</h2>

            {reports.map((report) => (
              <div
                className="report-card"
                key={report.id}
              >
                <strong>
                  {report.employees?.full_name}
                </strong>

                <p>
                  {report.content}
                </p>

                <small>
                  {new Date(
                    report.created_at
                  ).toLocaleString(
                    "vi-VN"
                  )}
                </small>

              </div>
            ))}
          </>
        )}

        {activeTab === "notifications" && (
          <>
            <h2>Tạo thông báo</h2>

            <div className="form-card">

              <input
                placeholder="Tiêu đề"
                value={notificationTitle}
                onChange={(e) =>
                  setNotificationTitle(
                    e.target.value
                  )
                }
              />

              <textarea
                placeholder="Nội dung thông báo"
                value={notificationContent}
                onChange={(e) =>
                  setNotificationContent(
                    e.target.value
                  )
                }
              />

              <button
                onClick={
                  createNotification
                }
              >
                Gửi thông báo
              </button>

            </div>
          </>
        )}

      </section>

    </main>
  );
}
