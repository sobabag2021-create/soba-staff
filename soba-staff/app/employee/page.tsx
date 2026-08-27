"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  email: string | null;
  employment_type: string;
  role: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [employmentType, setEmploymentType] =
    useState("full_time");

  const [message, setMessage] = useState("");

  async function loadEmployees() {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setEmployees(data || []);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function addEmployee(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!fullName.trim()) {
      setMessage("Vui lòng nhập tên nhân viên.");
      return;
    }

    const { error } = await supabase
      .from("employees")
      .insert({
        full_name: fullName.trim(),
        email: email.trim() || null,
        employment_type: employmentType,
        role: "employee",
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setFullName("");
    setEmail("");
    setMessage("Đã thêm nhân viên.");

    loadEmployees();
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
      </aside>

      <main className="admin-main">
        <h1>Nhân viên</h1>

        <section className="form-card">
          <h2>Thêm nhân viên</h2>

          <form onSubmit={addEmployee}>
            <input
              placeholder="Họ và tên"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <select
              value={employmentType}
              onChange={(e) =>
                setEmploymentType(e.target.value)
              }
            >
              <option value="full_time">
                Full-time
              </option>

              <option value="part_time">
                Part-time
              </option>
            </select>

            <button type="submit">
              Thêm nhân viên
            </button>
          </form>

          {message && (
            <div className="message">
              {message}
            </div>
          )}
        </section>

        <section className="list-card">
          <h2>Danh sách nhân viên</h2>

          {employees.map((employee) => (
            <div
              key={employee.id}
              className="employee-row"
            >
              <div>
                <strong>
                  {employee.full_name}
                </strong>

                <p>
                  {employee.email || "Chưa có email"}
                </p>
              </div>

              <div>
                {employee.employment_type ===
                "full_time"
                  ? "Full-time"
                  : "Part-time"}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
