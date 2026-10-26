@echo off
cd /d "%~dp0"
title FREEston Tale - ACESSO PELA INTERNET
py "%~dp0internet.py"
if errorlevel 1 pause
