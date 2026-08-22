"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  employment_type: string;
};

type Attendance = {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  late_minutes: number | null;
  makeup_minutes: number | null;
  status: string | null;
};

export default function EmployeePage() {
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatTime(value: string | null) {
    if (!value) return "--:--";

    return new Date(value).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate() {
    return new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  useEffect(() => {
    loadEmployee();
  }, []);

  async function loadEmployee() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      let employeeData: Employee | null = null;

      const resultByAuthId = await supabase
        .from("employees")
        .select("id, full_name, role, employment_type")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      employeeData = resultByAuthId.data;

      // Nếu chưa liên kết auth_user_id thì tìm bằng email
      if (!employeeData && user.email) {
        const resultByEmail = await supabase
          .from("employees")
          .select("id, full_name, role, employment_type")
          .eq("email", user.email)
          .maybeSingle();

        employeeData = resultByEmail.data;
      }

      if (!employeeData) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setEmployee(employeeData);

      const today = getToday();

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeData.id)
        .eq("work_date", today)
        .maybeSingle();

      setAttendance(attendanceData);
    } catch (error) {
      console.error(error);
      setMessage("Không thể tải thông tin nhân viên.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    if (!employee) return;

    try {
      setChecking(true);
      setMessage("");

      if (attendance?.check_in) {
        setMessage("Bạn đã check-in hôm nay rồi.");
        return;
      }

      const { data, error } = await supabase
        .from("attendance")
        .insert({
          employee_id: employee.id,
          work_date: getToday(),
          check_in: new Date().toISOString(),
          status: "working",
          late_minutes: 0,
          makeup_minutes: 0,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        setMessage(`Check-in thất bại: ${error.message}`);
        return;
      }

      setAttendance(data);
      setMessage("Check-in thành công.");
    } catch (error) {
      console.error(error);
      setMessage("Có lỗi xảy ra khi check-in.");
    } finally {
      setChecking(false);
    }
  }

  async function handleCheckOut() {
    if (!employee || !attendance) return;

    try {
      setChecking(true);
      setMessage("");

      if (!attendance.check_in) {
        setMessage("Bạn chưa check-in.");
        return;
      }

      if (attendance.check_out) {
        setMessage("Bạn đã check-out hôm nay rồi.");
        return;
      }

      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", attendance.id)
        .select()
        .single();

      if (error) {
        console.error(error);
        setMessage(`Check-out thất bại: ${error.message}`);
        return;
      }

      setAttendance(data);
      setMessage("Check-out thành công.");
    } catch (error) {
      console.error(error);
      setMessage("Có lỗi xảy ra khi check-out.");
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    localStorage.removeItem("employee_id");
    localStorage.removeItem("employee_name");
    localStorage.removeItem("employee_role");
    localStorage.removeItem("employment_type");

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
          background: "#f5f6f4",
        }}
      >
        Đang tải...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f6f4",
        fontFamily: "Arial, sans-serif",
        color: "#222",
      }}
    >
      <header
        style={{
          background: "#ffffff",
          padding: "18px 24px",
          borderBottom: "1px solid #e5e5e5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "20px",
              color: "#315f47",
            }}
          >
            SOBA STAFF
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#777",
              marginTop: "4px",
            }}
          >
            Giao diện nhân viên
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            border: "1px solid #ddd",
            background: "#fff",
            padding: "10px 16px",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Đăng xuất
        </button>
      </header>

      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "30px 20px",
        }}
      >
        {/* THÔNG TIN NHÂN VIÊN */}
        <section
          style={{
            background: "#315f47",
            color: "#fff",
            borderRadius: "20px",
            padding: "28px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              opacity: 0.8,
            }}
          >
            Xin chào
          </div>

          <h1
            style={{
              margin: "8px 0",
              fontSize: "28px",
            }}
          >
            {employee?.full_name}
          </h1>

          <div
            style={{
              fontSize: "14px",
              opacity: 0.85,
            }}
          >
            {employee?.employment_type === "full_time"
              ? "Nhân viên Full-time"
              : "Nhân viên Part-time"}
          </div>
        </section>

        {/* NGÀY HÔM NAY */}
        <section
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              color: "#777",
              fontSize: "14px",
            }}
          >
            Hôm nay
          </div>

          <h2
            style={{
              margin: "8px 0 0",
              fontSize: "20px",
              textTransform: "capitalize",
            }}
          >
            {formatDate()}
          </h2>
        </section>

        {/* CHẤM CÔNG */}
        <section
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "20px",
            }}
          >
            Chấm công hôm nay
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                background: "#f5f7f5",
                padding: "18px",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#777",
                  marginBottom: "8px",
                }}
              >
                Check-in
              </div>

              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 700,
                }}
              >
                {formatTime(attendance?.check_in ?? null)}
              </div>
            </div>

            <div
              style={{
                background: "#f5f7f5",
                padding: "18px",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#777",
                  marginBottom: "8px",
                }}
              >
                Check-out
              </div>

              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 700,
                }}
              >
                {formatTime(attendance?.check_out ?? null)}
              </div>
            </div>
          </div>

          {message && (
            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                borderRadius: "12px",
                background: "#eef5ef",
                color: "#315f47",
                fontSize: "14px",
              }}
            >
              {message}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
              marginTop: "20px",
            }}
          >
            <button
              onClick={handleCheckIn}
              disabled={checking || Boolean(attendance?.check_in)}
              style={{
                border: "none",
                background: attendance?.check_in ? "#aab7ae" : "#315f47",
                color: "#fff",
                padding: "16px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: attendance?.check_in ? "default" : "pointer",
              }}
            >
              {checking ? "Đang xử lý..." : "CHECK-IN"}
            </button>

            <button
              onClick={handleCheckOut}
              disabled={
                checking ||
                !attendance?.check_in ||
                Boolean(attendance?.check_out)
              }
              style={{
                border: "none",
                background:
                  !attendance?.check_in || attendance?.check_out
                    ? "#aab7ae"
                    : "#d47b52",
                color: "#fff",
                padding: "16px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 600,
                cursor:
                  !attendance?.check_in || attendance?.check_out
                    ? "default"
                    : "pointer",
              }}
            >
              {checking ? "Đang xử lý..." : "CHECK-OUT"}
            </button>
          </div>
        </section>

        {/* THÔNG TIN CA */}
        <section
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "20px",
            }}
          >
            Thông tin làm việc
          </h2>

          <div
            style={{
              lineHeight: 1.8,
              color: "#666",
              fontSize: "14px",
            }}
          >
            <p>
              Loại nhân viên:{" "}
              <strong>
                {employee?.employment_type === "full_time"
                  ? "Full-time"
                  : "Part-time"}
              </strong>
            </p>

            {employee?.employment_type === "part_time" && (
              <p>
                Tổng giờ làm sẽ được tính theo block 15 phút.
              </p>
            )}

            {employee?.employment_type === "full_time" && (
              <p>
                Ca làm việc linh hoạt, tổng thời lượng theo lịch được phân công.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
