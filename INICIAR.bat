@echo off
cd /d "%~dp0"
title FREEston Tale
echo FREEston Tale - pacote do cliente original
py "%~dp0iniciar.py" --host 0.0.0.0 --port 19065
if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar. Confira a mensagem acima.
  echo Se outro jogo estiver aberto, feche a janela anterior e tente novamente.
  pause
)
