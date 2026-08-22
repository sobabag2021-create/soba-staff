"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  employment_type: "full_time" | "part_time";
  role: string;
};

type Schedule = {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  employees?: {
    full_name: string;
    employment_type: string;
  } | null;
};

function getVietnamDate() {
  const now = new Date();
  const vn = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return vn;
}

function formatDateVN(dateString: string) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatShortDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatTime(time: string) {
  if (!time) return "";
  return time.slice(0, 5);
}

function addHours(time: string, hours: number) {
  if (!time) return "";

  const [hour, minute] = time.split(":").map(Number);

  const totalMinutes = hour * 60 + minute + hours * 60;

  const newHour = Math.floor((totalMinutes % 1440) / 60)
    .toString()
    .padStart(2, "0");

  const newMinute = (totalMinutes % 60)
    .toString()
    .padStart(2, "0");

  return `${newHour}:${newMinute}`;
}

function getMonthOptions() {
  const result = [];
  const today = new Date();

  for (let i = -1; i <= 11; i++) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() + i,
      1
    );

    result.push({
      value: `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`,
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
    });
  }

  return result;
}

export default function HomePage() {
  const today = getVietnamDate();

  const currentMonth = today.slice(0, 7);

  const [activeTab, setActiveTab] = useState<
    "today" | "schedule" | "approval"
  >("schedule");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  const [workDate, setWorkDate] = useState(today);

  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState("");

  const [startTime, setStartTime] = useState("08:00");

  const [endTime, setEndTime] = useState("18:00");

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const monthOptions = useMemo(() => {
    return getMonthOptions();
  }, []);

  const selectedEmployee = employees.find(
    (employee) => employee.id === selectedEmployeeId
  );

  const isFullTime =
    selectedEmployee?.employment_type === "full_time";

  const calculatedEndTime = isFullTime
    ? addHours(startTime, 10)
    : endTime;

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [selectedMonth]);

  async function loadEmployees() {
    setPageLoading(true);

    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, employment_type, role")
      .eq("active", true)
      .order("full_name");

    if (error) {
      alert("Không tải được danh sách nhân viên: " + error.message);
      setPageLoading(false);
      return;
    }

    setEmployees(data || []);
    setPageLoading(false);
  }

  async function loadSchedules() {
    const startOfMonth = `${selectedMonth}-01`;

    const [year, month] = selectedMonth.split("-").map(Number);

    const nextMonthDate = new Date(year, month, 1);

    const nextMonth = `${nextMonthDate.getFullYear()}-${String(
      nextMonthDate.getMonth() + 1
    ).padStart(2, "0")}-01`;

    const { data, error } = await supabase
      .from("work_schedules")
      .select(`
        id,
        employee_id,
        work_date,
        start_time,
        end_time,
        employees (
          full_name,
          employment_type
        )
      `)
      .gte("work_date", startOfMonth)
      .lt("work_date", nextMonth)
      .order("work_date")
      .order("start_time");

    if (error) {
      console.error(error);
      alert("Không tải được lịch làm: " + error.message);
      return;
    }

    setSchedules((data as Schedule[]) || []);
  }

  function handleEmployeeChange(employeeId: string) {
    setSelectedEmployeeId(employeeId);

    const employee = employees.find(
      (item) => item.id === employeeId
    );

    if (employee?.employment_type === "full_time") {
      setEndTime(addHours(startTime, 10));
    }
  }

  function handleStartTimeChange(value: string) {
    setStartTime(value);

    if (isFullTime) {
      setEndTime(addHours(value, 10));
    }
  }

  async function saveSchedule() {
    if (!selectedEmployeeId) {
      alert("Vui lòng chọn nhân viên");
      return;
    }

    if (!workDate) {
      alert("Vui lòng chọn ngày làm");
      return;
    }

    if (!startTime) {
      alert("Vui lòng chọn giờ bắt đầu");
      return;
    }

    if (!calculatedEndTime) {
      alert("Vui lòng chọn giờ kết thúc");
      return;
    }

    if (
      isFullTime &&
      (startTime < "07:00" || startTime > "11:00")
    ) {
      alert(
        "Nhân viên Full-time chỉ được xếp giờ bắt đầu từ 07:00 đến 11:00"
      );
      return;
    }

    if (
      !isFullTime &&
      calculatedEndTime <= startTime
    ) {
      alert("Giờ kết thúc phải lớn hơn giờ bắt đầu");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("work_schedules")
      .upsert(
        {
          employee_id: selectedEmployeeId,
          work_date: workDate,
          start_time: startTime,
          end_time: calculatedEndTime,
        },
        {
          onConflict: "employee_id,work_date",
        }
      );

    setLoading(false);

    if (error) {
      alert("Không lưu được lịch: " + error.message);
      return;
    }

    alert("Đã lưu lịch làm thành công");

    await loadSchedules();

    setSelectedEmployeeId("");
  }

  async function deleteSchedule(scheduleId: string) {
    const confirmDelete = window.confirm(
      "Bạn có chắc muốn xóa ca làm này?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", scheduleId);

    if (error) {
      alert("Không xóa được ca làm: " + error.message);
      return;
    }

    await loadSchedules();
  }

  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {};

    schedules.forEach((schedule) => {
      if (!grouped[schedule.work_date]) {
        grouped[schedule.work_date] = [];
      }

      grouped[schedule.work_date].push(schedule);
    });

    return grouped;
  }, [schedules]);

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <p className="text-lg font-medium">
          Đang tải dữ liệu...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#1f2933]">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-28">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wide">
            SOBA STAFF
          </h1>

          <p className="text-gray-500 mt-2">
            Quản lý nhân viên và lịch làm việc
          </p>
        </header>

        <div className="flex gap-2 overflow-x-auto mb-6">
          <button
            onClick={() => setActiveTab("today")}
            className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap ${
              activeTab === "today"
                ? "bg-[#276846] text-white"
                : "bg-white border border-gray-200"
            }`}
          >
            Hôm nay
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap ${
              activeTab === "schedule"
                ? "bg-[#276846] text-white"
                : "bg-white border border-gray-200"
            }`}
          >
            Xếp lịch làm
          </button>

          <button
            onClick={() => setActiveTab("approval")}
            className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap ${
              activeTab === "approval"
                ? "bg-[#276846] text-white"
                : "bg-white border border-gray-200"
            }`}
          >
            Chờ duyệt
          </button>
        </div>

        {activeTab === "schedule" && (
          <>
            <section className="bg-white rounded-3xl border border-gray-200 p-5 md:p-7 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    Xếp lịch làm việc
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Ca Full-time tự tính 10 tiếng. Part-time
                    tự chọn giờ kết thúc.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-semibold mb-2">
                    Ngày làm
                  </label>

                  <input
                    type="date"
                    value={workDate}
                    onChange={(event) =>
                      setWorkDate(event.target.value)
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  />

                  {workDate && (
                    <p className="mt-2 text-sm text-[#276846] font-medium">
                      {formatDateVN(workDate)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Nhân viên
                  </label>

                  <select
                    value={selectedEmployeeId}
                    onChange={(event) =>
                      handleEmployeeChange(event.target.value)
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                  >
                    <option value="">
                      -- Chọn nhân viên --
                    </option>

                    {employees
                      .filter(
                        (employee) =>
                          employee.role !== "admin"
                      )
                      .map((employee) => (
                        <option
                          key={employee.id}
                          value={employee.id}
                        >
                          {employee.full_name} —{" "}
                          {employee.employment_type ===
                          "full_time"
                            ? "Full-time"
                            : "Part-time"}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedEmployee && (
                  <div className="md:col-span-2">
                    <div
                      className={`rounded-2xl px-5 py-4 ${
                        isFullTime
                          ? "bg-green-50 border border-green-200"
                          : "bg-blue-50 border border-blue-200"
                      }`}
                    >
                      <p className="font-bold">
                        {selectedEmployee.full_name}
                      </p>

                      <p className="text-sm mt-1">
                        {isFullTime
                          ? "Full-time: ca chuẩn 10 tiếng, giờ bắt đầu từ 07:00 đến 11:00."
                          : "Part-time: giờ bắt đầu và kết thúc linh hoạt."}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-2">
                    Giờ bắt đầu
                  </label>

                  <input
                    type="time"
                    value={startTime}
                    min={isFullTime ? "07:00" : undefined}
                    max={isFullTime ? "11:00" : undefined}
                    step="900"
                    onChange={(event) =>
                      handleStartTimeChange(event.target.value)
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  />

                  {isFullTime && (
                    <p className="text-sm text-gray-500 mt-2">
                      Full-time: chọn từ 07:00 đến 11:00
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Giờ kết thúc
                  </label>

                  <input
                    type="time"
                    value={calculatedEndTime}
                    step="900"
                    disabled={isFullTime}
                    onChange={(event) =>
                      setEndTime(event.target.value)
                    }
                    className={`w-full border border-gray-300 rounded-xl px-4 py-3 ${
                      isFullTime
                        ? "bg-gray-100 text-gray-500"
                        : ""
                    }`}
                  />

                  {isFullTime && (
                    <p className="text-sm text-[#276846] font-medium mt-2">
                      Tự động = giờ bắt đầu + 10 tiếng
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={saveSchedule}
                disabled={loading}
                className="mt-7 w-full bg-[#276846] hover:bg-[#1f5638] disabled:opacity-60 text-white font-bold py-4 rounded-xl transition"
              >
                {loading
                  ? "ĐANG LƯU..."
                  : "LƯU LỊCH LÀM"}
              </button>
            </section>

            <section className="mt-7 bg-white rounded-3xl border border-gray-200 p-5 md:p-7 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    Lịch đã xếp
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Xem lịch làm việc theo tháng
                  </p>
                </div>

                <select
                  value={selectedMonth}
                  onChange={(event) =>
                    setSelectedMonth(event.target.value)
                  }
                  className="border border-gray-300 rounded-xl px-4 py-3 bg-white"
                >
                  {monthOptions.map((month) => (
                    <option
                      key={month.value}
                      value={month.value}
                    >
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              {Object.keys(schedulesByDate).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Chưa có lịch làm trong tháng này.
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(schedulesByDate).map(
                    ([date, daySchedules]) => (
                      <div key={date}>
                        <div className="mb-3">
                          <h3 className="font-bold text-lg">
                            {formatShortDate(date)}
                          </h3>
                        </div>

                        <div className="space-y-3">
                          {daySchedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className="border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                            >
                              <div>
                                <p className="font-bold text-lg">
                                  {
                                    schedule.employees
                                      ?.full_name
                                  }
                                </p>

                                <p className="text-sm text-gray-500 mt-1">
                                  {schedule.employees
                                    ?.employment_type ===
                                  "full_time"
                                    ? "Full-time"
                                    : "Part-time"}
                                </p>
                              </div>

                              <div className="font-bold text-lg">
                                {formatTime(
                                  schedule.start_time
                                )}{" "}
                                –{" "}
                                {formatTime(
                                  schedule.end_time
                                )}
                              </div>

                              <button
                                onClick={() =>
                                  deleteSchedule(schedule.id)
                                }
                                className="border border-red-200 text-red-600 px-4 py-2 rounded-xl font-semibold"
                              >
                                Xóa
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "today" && (
          <section className="bg-white rounded-3xl border border-gray-200 p-7">
            <h2 className="text-2xl font-bold">
              Hôm nay
            </h2>

            <p className="text-gray-500 mt-2">
              Phần dashboard chấm công hôm nay sẽ nối tiếp
              với bảng attendance.
            </p>
          </section>
        )}

        {activeTab === "approval" && (
          <section className="bg-white rounded-3xl border border-gray-200 p-7">
            <h2 className="text-2xl font-bold">
              Yêu cầu chờ duyệt
            </h2>

            <p className="text-gray-500 mt-2">
              Phần này sẽ kết nối bảng requests để duyệt:
              nghỉ, về sớm và tăng ca.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
