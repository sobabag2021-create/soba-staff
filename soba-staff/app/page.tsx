"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [n, setN] = useState("...");
  const [m, setM] = useState("");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("Chưa check-in");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await supabase
        .from("employees")
        .select("full_name")
        .eq("auth_user_id", user.id)
        .single();

      setN(data?.full_name || "Nhân viên");
    })();
  }, []);

  async function checkStoreIP() {
    const res = await fetch("/api/check-ip", { cache: "no-store" });

    if (!res.ok) throw new Error("Không thể kiểm tra IP");

    return res.json();
  }

  async function handleCheckIn() {
    setChecking(true);
    setM("Đang kiểm tra mạng cửa hàng...");

    try {
      const result = await checkStoreIP();

      if (!result.allowed) {
        setM(`Không thể check-in. Bạn không đang sử dụng mạng cửa hàng. IP hiện tại: ${result.ip || "không xác định"}`);
        return;
      }

      setStatus("Đã check-in");
      setM(`Check-in thành công! IP: ${result.ip}`);
    } catch {
      setM("Có lỗi khi kiểm tra mạng. Vui lòng thử lại.");
    } finally {
      setChecking(false);
    }
  }

  async function handleCheckOut() {
    setChecking(true);
    setM("Đang kiểm tra mạng cửa hàng...");

    try {
      const result = await checkStoreIP();

      if (!result.allowed) {
        setM(`Không thể check-out. Bạn không đang sử dụng mạng cửa hàng. IP hiện tại: ${result.ip || "không xác định"}`);
        return;
      }

      setStatus("Đã check-out");
      setM(`Check-out thành công! IP: ${result.ip}`);
    } catch {
      setM("Có lỗi khi kiểm tra mạng. Vui lòng thử lại.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main>
      <h1>SOBA STAFF</h1>

      <div className="card">
        <h2>Xin chào, {n} 👋</h2>

        <div className="row">
          <span>Ca hôm nay</span>
          <b>Chưa tải lịch</b>
        </div>

        <div className="row">
          <span>Trạng thái</span>
          <b>{status}</b>
        </div>
      </div>

      <button onClick={handleCheckIn} disabled={checking}>
        {checking ? "ĐANG KIỂM TRA..." : "CHECK IN"}
      </button>

      <div className="card">
        <button onClick={handleCheckOut} disabled={checking}>
          {checking ? "ĐANG KIỂM TRA..." : "CHECK OUT"}
        </button>

        <p>{m}</p>
      </div>
    </main>
  );
}
