"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [name, setName] = useState("Admin");

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (employee?.full_name) {
        setName(employee.full_name);
      }
    }

    loadUser();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h1>SOBA<br />STAFF</h1>

        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/employees">Nhân viên</Link>
        <Link href="/admin/schedule">Lịch làm</Link>
        <Link href="/admin/requests">Đơn từ</Link>
        <Link href="/admin/attendance">Chấm công</Link>
        <Link href="/admin/report">Báo cáo</Link>

        <button onClick={logout}>
          Đăng xuất
        </button>
      </aside>

      <main className="admin-main">
        <div className="page-header">
          <div>
            <h1>Trang quản trị</h1>
            <p>Quản lý nhân viên và hoạt động cửa hàng</p>
          </div>

          <button onClick={logout}>
            Đăng xuất
          </button>
        </div>

        <section className="welcome-card">
          <p>Xin chào Admin</p>
          <h2>{name}</h2>
          <p>
            Quản lý nhân viên, lịch làm,
            chấm công và đơn từ
          </p>
        </section>

        <div className="dashboard-grid">
          <Link
            href="/admin/employees"
            className="dashboard-card"
          >
            <h2>Nhân viên</h2>
            <p>
              Quản lý thông tin và tài khoản nhân viên
            </p>
          </Link>

          <Link
            href="/admin/schedule"
            className="dashboard-card"
          >
            <h2>Lịch làm</h2>
            <p>
              Xếp lịch làm việc theo tuần cho nhân viên
            </p>
          </Link>

          <Link
            href="/admin/requests"
            className="dashboard-card"
          >
            <h2>Đơn từ</h2>
            <p>
              Duyệt đơn xin nghỉ, đi muộn,
              về sớm và tăng ca
            </p>
          </Link>

          <Link
            href="/admin/attendance"
            className="dashboard-card"
          >
            <h2>Chấm công</h2>
            <p>
              Theo dõi thời gian check-in và check-out
            </p>
          </Link>

          <Link
            href="/admin/report"
            className="dashboard-card"
          >
            <h2>Báo cáo</h2>
            <p>
              Xem tổng hợp chấm công và hoạt động
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
