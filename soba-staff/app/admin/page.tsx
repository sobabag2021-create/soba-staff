"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
  employment_type?: string | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        // Chưa đăng nhập
        if (userError || !user) {
          router.replace("/login");
          return;
        }

        // Lấy thông tin tài khoản trong bảng employees
        const { data: employeeData, error: employeeError } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();

        // Không tìm thấy nhân viên
        if (employeeError || !employeeData) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // Tài khoản bị khóa
        if (employeeData.active === false) {
          await supabase.auth.signOut();

          setErrorMessage("Tài khoản của bạn đã bị khóa.");
          setLoading(false);

          return;
        }

        // Nếu là nhân viên thì chuyển sang giao diện nhân viên
        if (employeeData.role === "employee") {
          router.replace("/employee");
          return;
        }

        // Không phải admin
        if (employeeData.role !== "admin") {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // Admin hợp lệ
        setEmployee(employeeData);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi tải tài khoản:", error);

        setErrorMessage("Có lỗi xảy ra. Vui lòng đăng nhập lại.");
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f3",
          fontFamily: "Arial, sans-serif",
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
          background: "#f5f5f3",
          fontFamily: "Arial, sans-serif",
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

  const menuItems = [
    {
      label: "Dashboard",
      path: "/admin",
    },
    {
      label: "Nhân viên",
      path: "/admin/employees",
    },
    {
      label: "Lịch làm",
      path: "/admin/schedule",
    },
    {
      label: "Đơn từ",
      path: "/admin/requests",
    },
    {
      label: "Chấm công",
      path: "/admin/attendance",
    },
    {
      label: "Báo cáo",
      path: "/admin/reports",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f5f5f3",
        fontFamily: "Arial, sans-serif",
        color: "#263238",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "220px",
          minHeight: "100vh",
          background: "#0f2920",
          color: "#ffffff",
          padding: "30px 18px",
          boxSizing: "border-box",
          position: "fixed",
          left: 0,
          top: 0,
        }}
      >
        <div
          style={{
            fontSize: "30px",
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: "50px",
            letterSpacing: "1px",
          }}
        >
          SOBA
          <br />
          STAFF
        </div>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                border: "none",
                background:
                  item.path === "/admin" ? "#3e6255" : "transparent",
                color: "#ffffff",
                padding: "14px 16px",
                borderRadius: "9px",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={handleLogout}
            style={{
              border: "none",
              background: "transparent",
              color: "#ffffff",
              padding: "14px 16px",
              borderRadius: "9px",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "15px",
              fontWeight: 600,
              marginTop: "10px",
            }}
          >
            Đăng xuất
          </button>
        </nav>
      </aside>

      {/* NỘI DUNG */}
      <section
        style={{
          marginLeft: "220px",
          width: "calc(100% - 220px)",
          minHeight: "100vh",
          padding: "40px",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "34px",
                color: "#263238",
              }}
            >
              Trang quản trị
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#777",
              }}
            >
              Quản lý nhân viên và hoạt động cửa hàng
            </p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              border: "none",
              background: "#365d4b",
              color: "#ffffff",
              padding: "13px 24px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Đăng xuất
          </button>
        </header>

        {/* CHÀO ADMIN */}
        <div
          style={{
            background: "#365d4b",
            color: "#ffffff",
            padding: "32px",
            borderRadius: "22px",
            marginBottom: "30px",
          }}
        >
          <p
            style={{
              margin: 0,
              opacity: 0.8,
              fontSize: "16px",
            }}
          >
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

          <p
            style={{
              margin: 0,
              opacity: 0.85,
            }}
          >
            Quản lý nhân viên, lịch làm, chấm công và đơn từ
          </p>
        </div>

        {/* MENU CHỨC NĂNG */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
          }}
        >
          <button
            onClick={() => router.push("/admin/employees")}
            style={cardStyle}
          >
            <div style={cardTitleStyle}>Nhân viên</div>

            <div style={cardTextStyle}>
              Quản lý thông tin và tài khoản nhân viên
            </div>
          </button>

          <button
            onClick={() => router.push("/admin/schedule")}
            style={cardStyle}
          >
            <div style={cardTitleStyle}>Lịch làm</div>

            <div style={cardTextStyle}>
              Xếp lịch làm việc theo tuần cho nhân viên
            </div>
          </button>

          <button
            onClick={() => router.push("/admin/requests")}
            style={cardStyle}
          >
            <div style={cardTitleStyle}>Đơn từ</div>

            <div style={cardTextStyle}>
              Duyệt đơn xin nghỉ, đi muộn, về sớm và tăng ca
            </div>
          </button>

          <button
            onClick={() => router.push("/admin/attendance")}
            style={cardStyle}
          >
            <div style={cardTitleStyle}>Chấm công</div>

            <div style={cardTextStyle}>
              Theo dõi thời gian check-in và check-out
            </div>
          </button>

          <button
            onClick={() => router.push("/admin/reports")}
            style={cardStyle}
          >
            <div style={cardTitleStyle}>Báo cáo</div>

            <div style={cardTextStyle}>
              Xem tổng hợp chấm công và hoạt động nhân viên
            </div>
          </button>
        </div>
      </section>
    </main>
  );
}

const cardStyle = {
  background: "#ffffff",
  border: "none",
  padding: "30px",
  borderRadius: "18px",
  textAlign: "left" as const,
  cursor: "pointer",
  boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
  minHeight: "150px",
};

const cardTitleStyle = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#263238",
  marginBottom: "12px",
};

const cardTextStyle = {
  fontSize: "15px",
  color: "#777",
  lineHeight: 1.6,
};
