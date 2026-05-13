@echo off
rem Charazay 2.0 — charazay2.0.html dosyasini Chrome (veya Edge / varsayilan) ile acar.
rem HTML ile acmak icin: Charazay-2.0-BASLAT.html
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

set "HTML=%cd%\charazay2.0.html"
if not exist "%HTML%" (
  echo [HATA] charazay2.0.html bu klasorde yok.
  echo Klasor: %cd%
  pause
  exit /b 1
)

set "CHROME="
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
)
if not defined CHROME if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
)
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

if defined CHROME (
  start "" "%CHROME%" "%HTML%"
  exit /b 0
)

where chrome >nul 2>&1
if %errorlevel% equ 0 (
  start "" chrome "%HTML%"
  exit /b 0
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%HTML%"
  exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" "%HTML%"
  exit /b 0
)
where msedge >nul 2>&1
if %errorlevel% equ 0 (
  start "" msedge "%HTML%"
  exit /b 0
)

echo Chrome bu bilgisayarda bulunamadi. Varsayilan tarayici ile aciliyor...
start "" "%HTML%"
if errorlevel 1 (
  echo.
  echo Acilamadi. Su yolu elle dene: sag tik ^> Birlikte ac ^> Google Chrome
  echo %HTML%
  pause
)
exit /b 0
