@echo off
title Stockly
echo Starte Stockly...

:: Pruefen ob Backend bereits laeuft (Port 8000)
netstat -an | find "0.0.0.0:8000" >nul 2>&1
if %errorlevel% == 0 (
    echo Backend laeuft bereits.
) else (
    echo Starte Backend...
    start "Stockly Backend" /min /d "D:\Stockly\backend" "C:\Users\M.S\AppData\Local\Programs\Python\Python312\python.exe" "main.py"
    timeout /t 3 /nobreak >nul
)

:: Stockly App starten
start "" "D:\Stockly\dist-electron\win-unpacked\Stockly.exe"
exit
