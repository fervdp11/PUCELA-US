@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js 22 o superior desde https://nodejs.org
  echo Despues cierra esta ventana y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
echo Sanagus As - Mantener esta ventana abierta mientras jugais.
echo Abre http://localhost:3000 en el navegador.
start "" "http://localhost:3000"
node server/node.js
pause
