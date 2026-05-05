@echo off
title Exportar Overlays PNG
cd /d "%~dp0"

echo ========================================
echo EXPORTANDO OVERLAYS HTML PARA PNG
echo ========================================
echo.

python exportar_png.py

echo.
echo ========================================
echo PROCESSO FINALIZADO
echo ========================================
pause
