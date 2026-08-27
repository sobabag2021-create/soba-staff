"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      alert("Vui lòng nhập email và mật khẩu.");
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data.user) {
      alert(error?.message || "Không thể đăng nhập.");
      setLoading(false);
      return;
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (!employee) {
      alert("Tài khoản chưa có thông tin nhân viên.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (employee.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/employee");
    }

    setLoading(false);
  }

  return (
    <main className="login-page">
      <div className="login-card">

        <h1>SOBA STAFF</h1>

        <p className="subtitle">
          Đăng nhập để chấm công và xem lịch làm việc
        </p>

        <label>Email</label>

        <input
          type="email"
          placeholder="Nhập email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Mật khẩu</label>

        <input
          type="password"
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

      </div>
    </main>
  );
}
