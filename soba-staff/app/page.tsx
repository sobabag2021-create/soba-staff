"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  full_name: string;
  role: string;
};

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  useEffect(() => {
    const savedUser =
      localStorage.getItem("soba_staff_user");

    if (!savedUser) {
      router.replace("/login");
      return;
    }

    const parsedUser =
      JSON.parse(savedUser);

    if (parsedUser.role !== "admin") {
      router.replace("/employee");
      return;
    }

    setUser(parsedUser);
  }, [router]);

  function handleLogout() {
    localStorage.removeItem(
      "soba_staff_user"
    );

    router.push("/login");
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="logo">
          SOBA
          <br />
          STAFF
        </div>

        <nav>
          <Link
            href="/admin"
            className="active-menu"
          >
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
              Quản lý nhân viên và hoạt động
              cửa hàng
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>

        <section className="admin-welcome">
          <p>Xin chào Admin</p>

          <h2>
            {user?.full_name || "chị Hà"}
          </h2>

          <span>
            Quản lý nhân viên, lịch làm,
            chấm công và đơn từ
          </span>
        </section>

        <section className="dashboard-grid">
          <Link
            href="/admin/employees"
            className="dashboard-card"
          >
            <h3>Nhân viên</h3>

            <p>
              Quản lý thông tin và tài khoản
              nhân viên
            </p>
          </Link>

          <Link
            href="/admin/schedule"
            className="dashboard-card"
          >
            <h3>Lịch làm</h3>

            <p>
              Xếp lịch làm việc theo tuần cho
              nhân viên
            </p>
          </Link>

          <Link
            href="/admin/requests"
            className="dashboard-card"
          >
            <h3>Đơn từ</h3>

            <p>
              Duyệt đơn xin nghỉ, đi muộn,
              về sớm và tăng ca
            </p>
          </Link>

          <Link
            href="/admin/attendance"
            className="dashboard-card"
          >
            <h3>Chấm công</h3>

            <p>
              Theo dõi thời gian check-in và
              check-out
            </p>
          </Link>

          <Link
            href="/admin/report"
            className="dashboard-card"
          >
            <h3>Báo cáo</h3>

            <p>
              Xem tổng hợp chấm công và hoạt
              động nhân viên
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
