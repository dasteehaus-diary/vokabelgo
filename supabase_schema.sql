-- ==============================================================================
-- VokabelGo - Supabase Database Schema & Security Policies
-- Chạy đoạn mã này trong: Supabase Console -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Bảng lưu trữ hồ sơ và tiến độ học tập của người dùng
create table if not exists public.vokabelgo_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar text default 'img/avatars/v2/cat_12.png',
  streak int default 0,
  words_learned int default 0,
  blitz_score int default 0,
  feed_count int default 0,
  app_data jsonb default '{}'::jsonb,
  last_active timestamptz default now(),
  created_at timestamptz default now()
);

-- 2. Kích hoạt Row Level Security (Bảo mật cấp hàng)
alter table public.vokabelgo_users enable row level security;

-- 3. Cho phép tất cả mọi người đọc bảng (để hiển thị Bảng Xếp Hạng & Bục Vinh Danh)
drop policy if exists "Cho phep doc bang xep hang" on public.vokabelgo_users;
create policy "Cho phep doc bang xep hang"
  on public.vokabelgo_users for select
  using (true);

-- 4. Cho phép người dùng đã đăng nhập tự thêm dữ liệu của chính mình
drop policy if exists "Nguoi dung tu them du lieu" on public.vokabelgo_users;
create policy "Nguoi dung tu them du lieu"
  on public.vokabelgo_users for insert
  with check (auth.uid() = id);

-- 5. Cho phép người dùng đã đăng nhập tự cập nhật dữ liệu của chính mình
drop policy if exists "Nguoi dung tu cap nhat du lieu" on public.vokabelgo_users;
create policy "Nguoi dung tu cap nhat du lieu"
  on public.vokabelgo_users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Tự động cập nhật thời gian hoạt động
create or replace function public.handle_vokabelgo_user_update()
returns trigger as $$
begin
  new.last_active = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_vokabelgo_user_updated on public.vokabelgo_users;
create trigger on_vokabelgo_user_updated
  before update on public.vokabelgo_users
  for each row execute function public.handle_vokabelgo_user_update();
