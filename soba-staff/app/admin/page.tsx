"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  employment_type: string;
};

export default function AdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("employees")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      alert("Tài khoản này không có quyền quản trị.");
      window.location.href = "/employee";
      return;
    }

    await loadEmployees();
  }

  async function loadEmployees() {
    setLoading(true);

    const { data } = await supabase
      .from("employees")
      .select("id, full_name, role, employment_type")
      .order("full_name");

    setEmployees(data || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial, sans-serif",
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
        background: "#f5f3ef",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#355f4b",
            color: "white",
            padding: "30px",
            borderRadius: "20px",
            marginBottom: "25px",
          }}
        >
          <h1 style={{ margin: 0 }}>SOBA STAFF</h1>
          <p style={{ marginBottom: 0, opacity: 0.9 }}>
            Trang quản trị nhân viên
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "15px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <button
            style={{
              padding: "14px 20px",
              border: "none",
              borderRadius: "10px",
              background: "#355f4b",
              color: "white",
              cursor: "pointer",
            }}
          >
            Quản lý nhân viên
          </button>

          <button
            style={{
              padding: "14px 20px",
              border: "none",
              borderRadius: "10px",
              background: "white",
              cursor: "pointer",
            }}
          >
            Lịch làm việc
          </button>

          <button
            style={{
              padding: "14px 20px",
              border: "none",
              borderRadius: "10px",
              background: "white",
              cursor: "pointer",
            }}
          >
            Chấm công
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: "14px 20px",
              border: "none",
              borderRadius: "10px",
              background: "#b94a48",
              color: "white",
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            Đăng xuất
          </button>
        </div>

        <section
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "25px",
          }}
        >
          <h2>Danh sách nhân viên</h2>

          {employees.length === 0 ? (
            <p>Chưa có nhân viên.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f2f2f2" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "14px",
                      }}
                    >
                      Họ tên
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "14px",
                      }}
                    >
                      Loại nhân viên
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "14px",
                      }}
                    >
                      Quyền
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      style={{
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <td style={{ padding: "14px" }}>
                        {employee.full_name}
                      </td>

                      <td style={{ padding: "14px" }}>
                        {employee.employment_type === "full_time"
                          ? "Full-time"
                          : "Part-time"}
                      </td>

                      <td style={{ padding: "14px" }}>
                        {employee.role === "admin"
                          ? "Quản trị"
                          : "Nhân viên"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
