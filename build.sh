#!/bin/bash
# Build script for MiDoctorYa Lite PWA
# Usage: bash build.sh

echo "Building MiDoctorYa Lite for production..."

# Clean dist
rm -rf dist
mkdir -p dist/js dist/css dist/icons dist/img

# Copy HTML files
cp index.html admin.html doctor.html dist/
cp manifest.json dist/
cp sw.js dist/

# Copy assets
cp -r icons/* dist/icons/ 2>/dev/null
cp -r img/* dist/img/ 2>/dev/null

# Copy JS and CSS (in production, you'd minify these)
cp js/*.js dist/js/
cp css/*.css dist/css/

# Copy server files
cp server_prod.py dist/
cp requirements.txt dist/
cp Dockerfile dist/
cp render.yaml dist/
cp gunicorn.conf.py dist/
cp Procfile dist/
cp .env.example dist/

echo "Build complete! Files in dist/"
echo "Deploy with: cd dist && git init && git add . && git commit -m 'deploy' && render deploy"
