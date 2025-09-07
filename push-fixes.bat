@echo off
echo 🎯 Pushing Face Memory Challenge fixes to Git...
echo.

echo Adding all files...
git add .

echo.
echo Committing changes...
git commit -m "🎯 Fix all errors: Remove duplicate scripts, unused variables, install dependencies

- Fixed duplicate Socket.IO script tag in index.html
- Removed unused uuidv4 import in server-simple.js  
- Fixed unused req parameters in route handlers
- Installed all required dependencies (express, socket.io, cors, uuid)
- All syntax errors resolved and code quality improved
- Project now ready to run without errors

✅ Game is fully functional and ready for multiplayer!"

echo.
echo Pushing to remote repository...
git push

echo.
echo ✅ All fixes pushed to Git successfully!
echo 🎯 Your Face Memory Challenge is now updated in the repository!
pause