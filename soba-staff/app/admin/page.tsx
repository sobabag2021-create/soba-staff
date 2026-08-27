"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminProfile = {
  full_name: string | null;
};

export default function AdminPage() {
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdmin() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("employees")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle<AdminProfile>();

        if (!error && data?.full_name) {
          setAdminName(data.full_name);
        }
      } catch (error) {
        console.error("Lỗi tải thông tin admin:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAdmin();
  }, []);

  async function handleLogout() {
    const confirmed = window.confirm(
      "Bạn có chắc muốn đăng xuất không?"
    );

    if (!confirmed) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Không thể đăng xuất: " + error.message);
      return;
    }

    window.location.href = "/login";
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>
            SOBA
            <br />
            STAFF
          </h1>
        </div>

        <nav className="sidebar-nav">
          <Link href="/admin" className="active">
            Dashboard
          </Link>

          <Link href="/admin/employees">
            Nhân viên
          </Link>

          <Link href="/admin/schedule">
            Lịch làm
          </Link>

          <Link href="/admin/requests">
            Đơn từ
          </Link>

          <Link href="/admin/attendance">
            Chấm công
          </Link>

          <Link href="/admin/report">
            Báo cáo
          </Link>
        </nav>

        <button
          className="sidebar-logout"
          onClick={handleLogout}
        >
          Đăng xuất
        </button>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1>Trang quản trị</h1>

            <p>
              Quản lý nhân viên và hoạt động cửa hàng
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>

        <section className="admin-welcome-card">
          <p>Xin chào Admin</p>

          <h2>
            {loading ? "Đang tải..." : adminName}
          </h2>

          <span>
            Quản lý nhân viên, lịch làm, chấm công và đơn từ
          </span>
        </section>

        <section className="admin-dashboard-grid">
          <Link
            href="/admin/employees"
            className="admin-dashboard-card"
          >
            <h2>Nhân viên</h2>

            <p>
              Quản lý thông tin và tài khoản nhân viên
            </p>
          </Link>

          <Link
            href="/admin/schedule"
            className="admin-dashboard-card"
          >
            <h2>Lịch làm</h2>

            <p>
              Xếp lịch làm việc theo tuần cho nhân viên
            </p>
          </Link>

          <Link
            href="/admin/requests"
            className="admin-dashboard-card"
          >
            <h2>Đơn từ</h2>

            <p>
              Duyệt đơn xin nghỉ, đi muộn, về sớm và tăng ca
            </p>
          </Link>

          <Link
            href="/admin/attendance"
            className="admin-dashboard-card"
          >
            <h2>Chấm công</h2>

            <p>
              Theo dõi thời gian check-in và check-out
            </p>
          </Link>

          <Link
            href="/admin/report"
            className="admin-dashboard-card"
          >
            <h2>Báo cáo</h2>

            <p>
              Xem tổng hợp chấm công và hoạt động nhân viên
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
