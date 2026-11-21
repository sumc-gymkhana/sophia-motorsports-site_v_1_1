@echo off
chcp 65001 > nul
rem Double-click to rebuild news/*.html, gallery/*.html and sitemap.xml
cd /d "%~dp0.."
where py > nul 2>&1
if %errorlevel%==0 (py -3 tools\build.py) else (python tools\build.py)
echo.
pause
