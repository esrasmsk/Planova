@echo off
rem planova Android APK uretir. Cift tiklayin ya da komut satirindan calistirin.
rem Cikti: android\app\build\outputs\apk\debug\app-debug.apk
rem Araclar bosluksuz bir klasorde durmali (Android SDK bosluklu yollarda calismiyor).

setlocal
set "ARACLAR=D:\mobil-araclar"
for /d %%J in ("%ARACLAR%\jdk-21*") do set "JAVA_HOME=%%J"
set "ANDROID_HOME=%ARACLAR%\android-sdk"
set "GRADLE_USER_HOME=%ARACLAR%\gradle"
set "PATH=%LOCALAPPDATA%\node-portable\node-v24.21.0-win-x64;%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"
rem VS Code icinden calistirilinca Electron'un "node gibi calis" ayari derlemeyi etkilemesin
set "ELECTRON_RUN_AS_NODE="

cd /d "%~dp0"
call npm run mobil:apk
if errorlevel 1 (
  echo.
  echo APK uretilemedi. Yukaridaki hata mesajina bakin.
) else (
  echo.
  echo APK hazir: %~dp0android\app\build\outputs\apk\debug\app-debug.apk
)
endlocal
pause
