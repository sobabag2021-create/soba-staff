import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "DÁN_SUPABASE_URL_VÀO_ĐÂY";
const SUPABASE_SERVICE_ROLE_KEY = "DÁN_SERVICE_ROLE_KEY_VÀO_ĐÂY";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const employees = [
  {
    full_name: "Bàn Ngọc Linh",
    email: "banthuylinh011998@gmail.com",
  },
  {
    full_name: "Lê Đức Hiển",
    email: "hienld005@gmail.com",
  },
  {
    full_name: "Lê Đức Hiếu",
    email: "Hieuduc1803@gmail.com",
  },
  {
    full_name: "Phạm Xuân Dũng",
    email: "Phamdung2520@gmail.com",
  },
  {
    full_name: "Đỗ Thị Nhật Linh",
    email: "nhatlinhdo1707@gmail.com",
  },
  {
    full_name: "Phạm Đức Long Nhật",
    email: "longnhat2355n@gmail.com",
  },
  {
    full_name: "Test",
    email: "thanhhax100@gmail.com",
  },
];

async function createEmployees() {
  for (const employee of employees) {
    const password = `${employee.email}123`;

    console.log(`Đang tạo: ${employee.full_name}`);

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: employee.email,
        password: password,
        email_confirm: true,
      });

    if (authError) {
      console.error(
        `Lỗi tạo ${employee.full_name}:`,
        authError.message
      );
      continue;
    }

    const authUserId = authData.user.id;

    const { error: employeeError } = await supabase
      .from("employees")
      .insert({
        full_name: employee.full_name,
        auth_user_id: authUserId,
        role: "employee",
        active: true,
      });

    if (employeeError) {
      console.error(
        `Đã tạo Auth nhưng lỗi employees cho ${employee.full_name}:`,
        employeeError.message
      );
      continue;
    }

    console.log(
      `✓ Đã tạo thành công: ${employee.full_name}`
    );
  }

  console.log("HOÀN THÀNH!");
}

createEmployees();
