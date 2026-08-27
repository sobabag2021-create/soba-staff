"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Đăng nhập qua Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Email hoặc mật khẩu không chính xác!");
        setLoading(false);
        return;
      }

      if (data.session) {
        // 2. Chuyển hướng sang trang chính sau khi đăng nhập thành công
        router.push("/");
      }
    } catch (err: any) {
      setError("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>SOBA STAFF</h1>
        <p style={subtitleStyle}>Hệ thống quản lý nhân viên</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        {error && <p style={errorStyle}>{error}</p>}
      </div>
    </div>
  );
}

// Inline Style giao diện SOBA
const containerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  background: "#f4f4f0",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const cardStyle = {
  background: "#ffffff",
  padding: "32px",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  width: "100%",
  maxWidth: "360px",
  textAlign: "center" as const,
};

const titleStyle = {
  margin: "0 0 4px 0",
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1e293b",
};

const subtitleStyle = {
  margin: "0 0 24px 0",
  fontSize: "13px",
  color: "#64748b",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box" as const,
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  background: "#2d5240",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "bold" as const,
  cursor: "pointer",
  marginTop: "8px",
};

const errorStyle = {
  color: "#dc2626",
  fontSize: "13px",
  marginTop: "12px",
  marginBottom: 0,
};
