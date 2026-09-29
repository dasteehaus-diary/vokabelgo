@echo off
title VokabelGo - Cap Nhat Du An Len GitHub
echo =======================================================
echo     VOKABELGO - DONG BO VA CAP NHAT LEN GITHUB
echo =======================================================
echo.
echo [*] Dang kiem tra cac thay doi...
git status -s
echo.
echo [*] Dang dong goi du lieu...
git add .

set /p msg="[?] Nhap noi dung ghi chu cap nhat (Nhan Enter de lay mac dinh): "
if "%msg%"=="" (
    set msg="Auto-update VokabelGo from computer"
)

echo.
echo [*] Dang commit phien ban moi...
git commit -m "%msg%"

echo.
echo [*] Dang day ma nguon len GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [x] LOI: Khong the tai len GitHub.
    echo     Vui long kiem tra ket noi mang hoac tai khoan GitHub.
) else (
    echo.
    echo [v] THANH CONG! Du an VokabelGo da duoc cap nhat len GitHub.
)
echo.
echo =======================================================
pause
