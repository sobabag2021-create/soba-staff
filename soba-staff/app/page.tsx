"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Vui lòng nhập email và mật khẩu.");
      return;
    }

    try {
      setLoading(true);

      // Đăng nhập Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError) {
        setMessage("Email hoặc mật khẩu không đúng.");
        return;
      }

      if (!authData.user) {
        setMessage("Không tìm thấy thông tin tài khoản.");
        return;
      }

      // Tìm thông tin nhân viên trong bảng employees
      let { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      // Nếu chưa tìm thấy bằng auth_user_id thì thử tìm bằng email
      if (!employee) {
        const result = await supabase
          .from("employees")
          .select("*")
          .eq("email", authData.user.email ?? "")
          .maybeSingle();

        employee = result.data;
        employeeError = result.error;
      }

      if (employeeError) {
        console.error(employeeError);
        setMessage("Không thể lấy thông tin nhân viên.");
        return;
      }

      // Nếu chưa có trong bảng employees
      if (!employee) {
        setMessage(
          "Tài khoản đã đăng nhập nhưng chưa được liên kết với nhân viên."
        );
        return;
      }

      // Kiểm tra nhân viên còn hoạt động
      if (employee.active === false) {
        await supabase.auth.signOut();
        setMessage("Tài khoản này hiện đã bị khóa.");
        return;
      }

      // Lưu thông tin nhân viên để các trang khác sử dụng
      localStorage.setItem("employee_id", employee.id);
      localStorage.setItem("employee_name", employee.full_name ?? "");
      localStorage.setItem("employee_role", employee.role ?? "employee");
      localStorage.setItem(
        "employment_type",
        employee.employment_type ?? "part_time"
      );

      // Admin vào trang admin
      if (employee.role === "admin") {
        router.replace("/");
      } else {
        // Employee vào giao diện nhân viên
        router.replace("/employee");
      }
    } catch (error) {
      console.error(error);
      setMessage("Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "36px 30px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              color: "#1f2d25",
              fontWeight: 700,
            }}
          >
            SOBA STAFF
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#777",
              fontSize: "14px",
            }}
          >
            Đăng nhập để chấm công và xem lịch làm việc
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#333",
              }}
            >
              Email
            </label>

            <input
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#333",
              }}
            >
              Mật khẩu
            </label>

            <input
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {message && (
            <div
              style={{
                background: "#fff1f1",
                color: "#c62828",
                padding: "12px",
                borderRadius: "10px",
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              background: loading ? "#9aaa9d" : "#315f47",
              color: "#fff",
              padding: "15px",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}
