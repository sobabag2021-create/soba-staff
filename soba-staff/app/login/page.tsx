"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      // Đăng nhập bằng Supabase Authentication
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError) {
        setMessage(authError.message);
        return;
      }

      if (!authData.user) {
        setMessage("Không tìm thấy tài khoản đăng nhập.");
        return;
      }

      // Lấy thông tin nhân viên bằng auth_user_id
      const { data: employee, error: employeeError } =
        await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authData.user.id)
          .eq("active", true)
          .maybeSingle();

      if (employeeError) {
        setMessage(employeeError.message);
        return;
      }

      if (!employee) {
        setMessage(
          "Tài khoản đã đăng nhập nhưng chưa được liên kết với nhân viên."
        );
        return;
      }

      // Lưu thông tin đăng nhập
      localStorage.setItem("employee_id", employee.id);
      localStorage.setItem(
        "auth_user_id",
        authData.user.id
      );
      localStorage.setItem(
        "employee_name",
        employee.full_name || ""
      );
      localStorage.setItem(
        "employee_role",
        employee.role || "employee"
      );
      localStorage.setItem(
        "employment_type",
        employee.employment_type || ""
      );

      // Chuyển trang
      if (employee.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/employee");
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi đăng nhập."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>SOBA STAFF</h1>

        <p className="login-subtitle">
          Hệ thống quản lý nhân viên
        </p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Đang đăng nhập..."
              : "Đăng nhập"}
          </button>
        </form>

        {message && (
          <div className="login-message">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
