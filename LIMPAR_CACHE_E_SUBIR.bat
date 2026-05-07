@echo off
echo Limpando cache local...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo Garantindo gitignore...
findstr /x "/.next/" .gitignore >nul 2>&1
if errorlevel 1 echo /.next/>>.gitignore

findstr /x "/node_modules/" .gitignore >nul 2>&1
if errorlevel 1 echo /node_modules/>>.gitignore

echo.
echo Verificando se app/404 existe...
if exist app\404 (
  echo Removendo app/404...
  rmdir /s /q app\404
)

echo.
echo Pronto. Agora rode:
echo git add -A
echo git commit -m "corrige root layout app router"
echo git push origin main
pause
