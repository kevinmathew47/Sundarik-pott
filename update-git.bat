@echo off
echo 🚀 Pushing updates to GitHub...
echo.

echo Adding all changes...
git add .

echo Committing changes...
git commit -m "Fix server static file serving and game board display issues"

echo Pushing to GitHub...
git push origin main

echo.
echo ✅ Successfully pushed updates to GitHub!
echo 🌐 Repository: https://github.com/kevinmathew47/Sundarik-pott
echo.
echo 🚀 Your hosting platform will auto-deploy the changes!
echo.
pause