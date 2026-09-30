-- ==============================================================================
-- VokabelGo - BẢN VÁ BẢO MẬT QUYỀN TRUY CẬP SUPABASE (SEC-01 MIGRATION PATCH)
-- Ngày chuẩn bị: 30/09/2026
-- Mục đích: Khắc phục lỗ hổng SEC-01 (Policy "using (true)" làm lộ email & app_data).
-- Tính chất: AN TOÀN, KHÔNG XÓA DỮ LIỆU CŨ, KHÔNG GÂY GIÁN ĐOẠN DỊCH VỤ.
--
-- HƯỚNG DẪN ÁP DỤNG TRÊN SUPABASE CONSOLE:
-- 1. Truy cập vào dashboard dự án: https://supabase.com/dashboard/project/<your-project-id>
-- 2. Chọn mục "SQL Editor" ở thanh menu bên trái.
-- 3. Nhấn "New query", dán toàn bộ nội dung file này vào và nhấn "Run" (hoặc Ctrl+Enter).
-- ==============================================================================

-- BƯỚC 1: XÁC MINH CẤU HÌNH HIỆN TẠI (Kiểm tra các policy đang có)
-- Chạy đoạn này để xem danh sách policy hiện tại trước khi vá:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies WHERE tablename = 'vokabelgo_users';

-- BƯỚC 2: HỦY CHÍNH SÁCH ĐỌC RỘNG CŨ (Vốn cho phép đọc mọi hàng và mọi cột)
DROP POLICY IF EXISTS "Cho phep doc bang xep hang" ON public.vokabelgo_users;
DROP POLICY IF EXISTS "Nguoi dung chi xem du lieu cua minh" ON public.vokabelgo_users;

-- BƯỚC 3: THIẾT LẬP CHÍNH SÁCH ĐỌC RIÊNG TƯ (CHỈ CHỦ SỞ HỮU MỚI ĐƯỢC ĐỌC HÀNG CỦA MÌNH)
-- Bất kỳ ai không phải chủ sở hữu sẽ nhận về 0 hàng (bảo vệ tuyệt đối email và app_data)
CREATE POLICY "Nguoi dung chi xem du lieu cua minh"
  ON public.vokabelgo_users FOR SELECT
  USING (auth.uid() = id);

-- BƯỚC 4: TẠO VIEW CÔNG KHAI DÀNH RIÊNG CHO BẢNG XẾP HẠNG (LEADERBOARD)
-- View này chỉ chọn các cột công khai cần thiết cho thi đua học tập.
-- KHÔNG bao gồm email, KHÔNG bao gồm app_data.
CREATE OR REPLACE VIEW public.vokabelgo_leaderboard
WITH (security_invoker = false)
AS
SELECT
  id,
  display_name,
  avatar,
  streak,
  words_learned,
  blitz_score,
  last_active
FROM public.vokabelgo_users;

-- BƯỚC 5: CẤP QUYỀN ĐỌC VIEW CHO KHÁCH (ANON) VÀ HỌC VIÊN ĐÃ ĐĂNG NHẬP (AUTHENTICATED)
GRANT SELECT ON public.vokabelgo_leaderboard TO anon, authenticated;

-- BƯỚC 6: XÁC MINH SAU KHI VÁ (CHẠY TRONG SQL EDITOR ĐỂ KIỂM TRA):
-- 1. Kiểm tra view:
--    SELECT * FROM public.vokabelgo_leaderboard LIMIT 5;
--    (Kết quả: Trả về danh sách điểm mà không có cột email hay app_data)
--
-- 2. Kiểm tra policy bảng vokabelgo_users:
--    SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'vokabelgo_users';
--    (Kết quả: SELECT policy có qual là "(auth.uid() = id)")

-- ==============================================================================
-- PHƯƠNG ÁN HOÀN TÁC (ROLLBACK PLAN) NẾU CẦN:
-- Nếu muốn quay lại cấu hình cũ, chỉ cần chạy 2 lệnh sau:
-- DROP VIEW IF EXISTS public.vokabelgo_leaderboard;
-- DROP POLICY IF EXISTS "Nguoi dung chi xem du lieu cua minh" ON public.vokabelgo_users;
-- CREATE POLICY "Cho phep doc bang xep hang" ON public.vokabelgo_users FOR SELECT USING (true);
-- ==============================================================================
