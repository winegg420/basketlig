@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

if not exist "%cd%\charazay2.0.html" (
  echo [HATA] charazay2.0.html bu klasorde yok: %cd%
  pause
  exit /b 1
)

set "PY="
if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "PY=%LocalAppData%\Programs\Python\Python313\python.exe"
if not defined PY if exist "%LocalAppData%\Programs\Python\Python312\python.exe" set "PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if not defined PY if exist "%LocalAppData%\Programs\Python\Python311\python.exe" set "PY=%LocalAppData%\Programs\Python\Python311\python.exe"
if not defined PY where py >nul 2>&1 && set "PY=py"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY where python3 >nul 2>&1 && set "PY=python3"

if not defined PY (
  echo.
  echo Python bu pencerede bulunamadi.
  echo python.org adresinden kurun; kurulumda "Add python.exe to PATH" isaretleyin.
  echo.
  pause
  exit /b 1
)

set "PORT=8765"
set "URL=http://127.0.0.1:%PORT%/charazay2.0.html"

echo.
echo Sunucu ayarlaniyor... Bu pencereyi acik birakin.
echo Adres: %URL%
echo.

rem /k = pencere acik kalsin; sunucu durunca veya hata olunca gorebilirsiniz
start "Charazay sunucu (KAPATMA)" cmd /k "%PY% -m http.server %PORT% --bind 127.0.0.1"

timeout /t 3 /nobreak >nul

set "CHROME="
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "%CHROME%" "%URL%"
) else (
  echo Chrome.exe bulunamadi; varsayilan tarayici aciliyor.
  start "" "%URL%"
)

echo.
echo Bir pencerede "Serving HTTP on 127.0.0.1 port %PORT%" yazisini gormelisiniz.
echo Chrome acilmadiysa adres cubuguna su adresi yapistirin:
echo   %URL%
echo.
pause
