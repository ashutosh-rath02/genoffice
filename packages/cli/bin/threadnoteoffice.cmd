@echo off
rem threadnoteoffice launcher for the packaged Windows app: <install>\resources\cli\threadnoteoffice.cmd
setlocal
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\..\ThreadnoteOffice.exe" "%~dp0threadnoteoffice.cjs" %*
endlocal
