"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

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
        // Lấy tài khoản đang đăng nhập
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        // Chưa đăng nhập
        if (userError || !user) {
          router.replace("/login");
          return;
        }

        // Lấy thông tin nhân viên từ bảng employees
        const { data: employeeData, error: employeeError } =
          await supabase
            .from("employees")
            .select("*")
            .eq("auth_user_id", user.id)
            .single();

        // Không tìm thấy tài khoản trong bảng employees
        if (employeeError || !employeeData) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // Tài khoản không hoạt động
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

        // Nếu không phải admin
        if (employeeData.role !== "admin") {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // Admin hợp lệ
        setEmployee(employeeData);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setErrorMessage("Có lỗi xảy ra. Vui lòng đăng nhập lại.");
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

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
          maxWidth: "1100px",
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
          <p
            style={{
              margin: 0,
              opacity: 0.8,
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
            Quản lý nhân viên và hoạt động của cửa hàng
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <button
            onClick={() => alert("Chức năng quản lý nhân viên sẽ được thêm tiếp.")}
            style={{
              background: "#ffffff",
              border: "none",
              padding: "30px",
              borderRadius: "16px",
              textAlign: "left",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            }}
          >
            <h3>Nhân viên</h3>
            <p>Quản lý thông tin nhân viên</p>
          </button>

          <button
            onClick={() => alert("Chức năng lịch làm việc sẽ được thêm tiếp.")}
            style={{
              background: "#ffffff",
              border: "none",
              padding: "30px",
              borderRadius: "16px",
              textAlign: "left",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            }}
          >
            <h3>Lịch làm việc</h3>
            <p>Quản lý và phân công lịch</p>
          </button>

          <button
            onClick={() => alert("Chức năng chấm công sẽ được thêm tiếp.")}
            style={{
              background: "#ffffff",
              border: "none",
              padding: "30px",
              borderRadius: "16px",
              textAlign: "left",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            }}
          >
            <h3>Chấm công</h3>
            <p>Theo dõi check-in và check-out</p>
          </button>

          <button
            onClick={() => alert("Chức năng đơn nghỉ phép sẽ được thêm tiếp.")}
            style={{
              background: "#ffffff",
              border: "none",
              padding: "30px",
              borderRadius: "16px",
              textAlign: "left",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            }}
          >
            <h3>Đơn từ</h3>
            <p>Xem và xử lý yêu cầu nhân viên</p>
          </button>
        </div>
      </section>
    </main>
  );
}
