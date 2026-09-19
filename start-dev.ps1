$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$projectRoot'; & '$projectRoot\venv\Scripts\python.exe' -m uvicorn backend.main:app --reload --port 8000"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$projectRoot\frontend'; npm run dev -- --host 127.0.0.1"

Write-Host 'LeakGuard backend:  http://127.0.0.1:8000'
Write-Host 'LeakGuard frontend: http://127.0.0.1:5173'