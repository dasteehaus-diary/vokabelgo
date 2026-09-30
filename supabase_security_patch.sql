-- ==============================================================================
-- VokabelGo - BẢN VÁ BẢO MẬT QUYỀN TRUY CẬP SUPABASE (SEC-01 MIGRATION PATCH)
-- Ngày chuẩn bị: 30/09/2026
-- Mục đích: Đề xuất phương án khắc phục nguy cơ từ chính sách SELECT công khai cũ.
-- Phạm vi: Phân tách dữ liệu cá nhân (email, app_data) và dữ liệu Bảng Xếp Hạng công khai.
--
-- HƯỚNG DẪN ÁP DỤNG TRÊN SUPABASE CONSOLE:
-- 1. Truy cập vào dashboard dự án: https://supabase.com/dashboard/project/<your-project-id>
-- 2. Chọn mục "SQL Editor" ở thanh menu bên trái.
-- 3. Nhấn "New query", dán nội dung file này vào để xem xét và nhấn "Run" khi đã duyệt.
-- ==============================================================================

-- BƯỚC 1: XÁC MINH CẤU HÌNH HIỆN TẠI (Kiểm tra các policy đang có)
-- Chạy đoạn này để xem danh sách policy hiện tại trước khi vá:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies WHERE tablename = 'vokabelgo_users';

-- BƯỚC 2: HỦY CHÍNH SÁCH ĐỌC RỘNG CŨ (Từng cho phép đọc mọi hàng và mọi cột)
DROP POLICY IF EXISTS "Cho phep doc bang xep hang" ON public.vokabelgo_users;
DROP POLICY IF EXISTS "Nguoi dung chi xem du lieu cua minh" ON public.vokabelgo_users;

-- BƯỚC 3: THIẾT LẬP CHÍNH SÁCH ĐỌC RIÊNG TƯ THEO VAI TRÒ CHỦ SỞ HỮU
-- Mỗi tài khoản chỉ có thể truy vấn dòng dữ liệu khớp với auth.uid() của chính mình
CREATE POLICY "Nguoi dung chi xem du lieu cua minh"
  ON public.vokabelgo_users FOR SELECT
  USING (auth.uid() = id);

-- BƯỚC 4: TẠO VIEW CÔNG KHAI DÀNH RIÊNG CHO BẢNG XẾP HẠNG (LEADERBOARD)
-- View này chỉ chọn các cột công khai cần thiết cho việc xếp hạng thi đua.
-- Không chứa cột email, không chứa cột app_data.
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
--    (Kết quả mong muốn: Trả về danh sách điểm mà không có cột email hay app_data)
--
-- 2. Kiểm tra policy bảng vokabelgo_users:
--    SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'vokabelgo_users';
--    (Kết quả mong muốn: SELECT policy có điều kiện là "(auth.uid() = id)")

-- ==============================================================================
-- PHƯƠNG ÁN HOÀN TÁC (ROLLBACK PLAN) AN TOÀN NẾU GẶP SỰ CỐ:
-- LƯU Ý BẢO MẬT: Không khôi phục lại chính sách đọc rộng toàn bảng vì sẽ mở lại nguy cơ lộ email và app_data.
--
-- Tình huống 1: Nếu ứng dụng gặp vấn đề quyền truy cập khi đọc qua VIEW public.vokabelgo_leaderboard:
--   Thực hiện cấp lại quyền đọc cho vai trò client:
--   GRANT SELECT ON public.vokabelgo_leaderboard TO anon, authenticated;
--
-- Tình huống 2: Nếu cần tạm ngưng sử dụng VIEW để điều chỉnh thiết kế:
--   DROP VIEW IF EXISTS public.vokabelgo_leaderboard;
--   -- VẪN GIỮ policy "Nguoi dung chi xem du lieu cua minh" trên vokabelgo_users để bảo vệ dữ liệu cá nhân.
--   -- Trong thời gian này, giao diện Bảng Xếp Hạng của client sẽ hiển thị dữ liệu cục bộ / tài khoản demo có sẵn.
-- ==============================================================================
