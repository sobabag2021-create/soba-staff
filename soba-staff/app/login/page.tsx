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
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("email", email.trim())
        .eq("password", password.trim())
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data) {
        setMessage("Email hoặc mật khẩu không đúng.");
        return;
      }

      // Lưu thông tin đăng nhập
      localStorage.setItem("employee_id", data.id);
      localStorage.setItem("employee_name", data.full_name || "");
      localStorage.setItem("employee_role", data.role || "");
      localStorage.setItem(
        "employment_type",
        data.employment_type || ""
      );

      // Admin
      if (data.role === "admin") {
        router.push("/admin");
        return;
      }

      // Nhân viên
      router.push("/employee");
    } catch (error) {
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
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
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
