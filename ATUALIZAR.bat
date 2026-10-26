@echo off
cd /d "%~dp0"
title FREEston Tale - ATUALIZACAO
py "%~dp0update_client.py" %*
pause
