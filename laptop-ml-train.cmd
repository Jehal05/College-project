@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0laptop-ml-train.ps1" %*
