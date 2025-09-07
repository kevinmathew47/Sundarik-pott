#!/bin/bash

echo "🚀 Pushing Sundarik Pott to GitHub..."
echo

echo "Initializing git repository..."
git init

echo "Adding remote repository..."
git remote add origin https://github.com/kevinmathew47/Sundarik-pott.git

echo "Adding all files..."
git add .

echo "Committing files..."
git commit -m "Initial commit: Complete Face Memory Challenge game with admin panel"

echo "Setting main branch..."
git branch -M main

echo "Pushing to GitHub..."
git push -u origin main

echo
echo "✅ Successfully pushed to GitHub!"
echo "🌐 Repository: https://github.com/kevinmathew47/Sundarik-pott"
echo
echo "🚀 Next steps:"
echo "1. Go to Railway.app"
echo "2. Connect your GitHub repository"
echo "3. Deploy automatically!"
echo