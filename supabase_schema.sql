-- ==============================================================================
-- VokabelGo - Supabase Database Schema & Security Policies (Updated SEC-01 Fix)
-- Chạy đoạn mã này trong: Supabase Console -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Bảng lưu trữ hồ sơ và tiến độ học tập riêng tư của người dùng
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

-- 3. CHÍNH SÁCH BẢO MẬT DỮ LIỆU RIÊNG TƯ (SEC-01 Fix):
-- Loại bỏ hoàn toàn chính sách SELECT công khai cũ từng làm lộ email và app_data.
-- Người dùng CHỈ ĐƯỢC PHÉP ĐỌC dữ liệu của chính mình.
drop policy if exists "Cho phep doc bang xep hang" on public.vokabelgo_users;
drop policy if exists "Nguoi dung chi xem du lieu cua minh" on public.vokabelgo_users;
create policy "Nguoi dung chi xem du lieu cua minh"
  on public.vokabelgo_users for select
  using (auth.uid() = id);

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

-- ==============================================================================
-- 7. BẢNG XẾP HẠNG CÔNG KHAI (SEC-01 Fix: VIEW CÁCH LY CỘT CÔNG KHAI)
-- View này CHỈ chứa các cột công khai (id, display_name, avatar, streak, words_learned, blitz_score, last_active).
-- Tuyệt đối KHÔNG chứa email và app_data, bảo vệ 100% quyền riêng tư của học viên.
-- ==============================================================================
create or replace view public.vokabelgo_leaderboard
with (security_invoker = false)
as
select
  id,
  display_name,
  avatar,
  streak,
  words_learned,
  blitz_score,
  last_active
from public.vokabelgo_users;

-- Cấp quyền đọc view cho tất cả khách và người dùng đăng nhập
grant select on public.vokabelgo_leaderboard to anon, authenticated;
