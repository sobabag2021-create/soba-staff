-- KHÔNG tạo bảng mới. Chỉ bổ sung cột còn thiếu vào đúng các bảng hiện có.

alter table public.work_schedules add column if not exists check_in_at timestamptz;
alter table public.work_schedules add column if not exists check_out_at timestamptz;
alter table public.work_schedules add column if not exists late_minutes integer not null default 0;
alter table public.work_schedules add column if not exists late_excused boolean not null default false;
alter table public.work_schedules add column if not exists penalty_amount numeric(12,0) not null default 0;

alter table public.employee_requests add column if not exists request_type text;
alter table public.employee_requests add column if not exists request_date date;
alter table public.employee_requests add column if not exists start_time time;
alter table public.employee_requests add column if not exists end_time time;
alter table public.employee_requests add column if not exists reason text;
alter table public.employee_requests add column if not exists status text not null default 'pending';
alter table public.employee_requests add column if not exists approved_at timestamptz;

alter table public.leave_requests add column if not exists request_date date;
alter table public.leave_requests add column if not exists leave_type text;
alter table public.leave_requests add column if not exists reason text;
alter table public.leave_requests add column if not exists status text not null default 'pending';
alter table public.leave_requests add column if not exists approved_at timestamptz;

alter table public.employees add column if not exists role text not null default 'employee';
alter table public.employees add column if not exists employment_type text not null default 'full_time';
alter table public.employees add column if not exists auth_user_id uuid;
alter table public.employees add column if not exists full_name text;

-- Cấu hình tiền phạt: giữ trong bảng store_settings hiện có.
insert into public.store_settings (setting_key, setting_value)
select 'late_penalty_amount','50000'
where not exists (select 1 from public.store_settings where setting_key='late_penalty_amount');
