@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ========================================
echo  Atualizando o catalogo de materiais
echo ========================================
echo.

echo [1/4] Procurando o git...
set "GIT="
where git >nul 2>&1
if not errorlevel 1 (
  set "GIT=git"
  goto achou
)
for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do (
  if exist "%%D\resources\app\git\cmd\git.exe" set "GIT=%%D\resources\app\git\cmd\git.exe"
)
if not defined GIT (
  if exist "%ProgramFiles%\Git\cmd\git.exe" set "GIT=%ProgramFiles%\Git\cmd\git.exe"
)
if not defined GIT (
  if exist "%ProgramFiles(x86)%\Git\cmd\git.exe" set "GIT=%ProgramFiles(x86)%\Git\cmd\git.exe"
)
if not defined GIT (
  echo.
  echo NAO ACHEI O GIT NESTE COMPUTADOR.
  echo Use o GitHub Desktop para enviar ^(Commit + Push^) desta vez.
  echo.
  goto seed
)
:achou
echo    ok

echo.
echo [2/4] Instalando dependencias...
call npm install
if errorlevel 1 goto erro

echo.
echo [3/4] Enviando para o GitHub...
"%GIT%" add -A
"%GIT%" commit -m "atualizacao"
"%GIT%" push
if errorlevel 1 echo    ^(aviso: nada novo para enviar, ou o push falhou - veja acima^)

:seed
echo.
echo [4/4] Atualizando o banco de dados...
call npm run seed
if errorlevel 1 goto erro

echo.
echo ========================================
echo  PRONTO
echo  A Netlify publica sozinha em 1-3 min.
echo  Depois abra o site e aperte Ctrl+F5.
echo ========================================
echo.
pause
exit /b 0

:erro
echo.
echo ======================================
echo  DEU ERRO - veja a mensagem acima
echo ======================================
pause
exit /b 1
