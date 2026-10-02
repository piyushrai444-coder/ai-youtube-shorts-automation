#!/usr/bin/env bash
set -e

echo "========================================================"
echo "AI YouTube Shorts Automation - GitHub Push Helper"
echo "========================================================"

if [ -z "$1" ]; then
  echo "Usage: ./scripts/push-to-github.sh <YOUR_GITHUB_REPO_URL>"
  echo "Example: ./scripts/push-to-github.sh https://github.com/YOUR_USERNAME/ai-yt-shorts.git"
  exit 1
fi

REPO_URL=$1

echo "Configuring remote origin to $REPO_URL..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo "Renaming current branch to main..."
git branch -M main

echo "Pushing code to GitHub..."
git push -u origin main

echo ""
echo "✅ Code successfully pushed to GitHub: $REPO_URL"
echo "Now you can link this repository in Render (https://dashboard.render.com/)!"
