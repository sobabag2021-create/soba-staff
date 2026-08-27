"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function handleLogin() {
    setMessage("");

    if (!username.trim() || !password.trim()) {
      setMessage(
        "Vui lòng nhập tài khoản và mật khẩu."
      );
      return;
    }

    const { data, error } = await supabase
      "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Vui lòng nhập email và mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const { data: employee, error } = await supabase
        .from("employees")
        .select("*")
        .eq("email", email.trim())
        .eq("password", password.trim())
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!employee) {
        setMessage("Email hoặc mật khẩu không đúng.");
        setLoading(false);
        return;
      }

      localStorage.setItem(
        "soba_staff_user",
        JSON.stringify(employee)
      );

      if (employee.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/employee");
      }
    } catch (error) {
      console.error(error);
      setMessage("Có lỗi xảy ra khi đăng nhập.");
    }

    setLoading(false);
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>SOBA STAFF</h1>

        <p>Hệ thống quản lý nhân viên</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
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

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data) {
      setMessage(
        "Tài khoản hoặc mật khẩu không đúng."
      );
      return;
    }

    localStorage.setItem(
      "soba_staff_user",
      JSON.stringify(data)
    );

    if (data.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/employee");
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>SOBA STAFF</h1>

        <p>
          Hệ thống quản lý nhân viên
        </p>

        <input
          type="text"
          placeholder="Tài khoản"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button onClick={handleLogin}>
          Đăng nhập
        </button>

        {message && (
          <div className="error-message">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
