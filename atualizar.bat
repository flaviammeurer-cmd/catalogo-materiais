@echo off
cd /d "%~dp0"
echo ========================================
echo  Atualizando o catalogo de materiais
echo ========================================
echo.

echo [1/4] Instalando dependencias...
call npm install
if errorlevel 1 goto erro

echo.
echo [2/4] Enviando para o GitHub...
git add -A
git commit -m "atualizacao"
git push
if errorlevel 1 echo (aviso: nada novo para enviar, ou o push falhou - confira acima)

echo.
echo [3/4] Atualizando o banco de dados...
call npm run seed
if errorlevel 1 goto erro

echo.
echo [4/4] Pronto!
echo A Netlify vai publicar sozinha em 1-3 minutos.
echo Depois abra o site e aperte Ctrl+F5.
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
