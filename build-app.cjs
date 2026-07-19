const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Preparing clean build environment...');

try {
  execSync('taskkill /f /im electron.exe 2>nul', { stdio: 'ignore' });
  execSync('taskkill /f /im ViewStats.exe 2>nul', { stdio: 'ignore' });
} catch {}

// Generate pure transparent PNG app icon (no fake grey/white checkerboard pixels!)
try {
  execSync('node generate-pure-icon.cjs', { stdio: 'inherit' });
} catch (e) {
  /* proceed */
}

// Delay slightly for OS file handles to release
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runBuild() {
  await sleep(1000);

  try {
    if (fs.existsSync('dist_app')) {
      fs.rmSync('dist_app', { recursive: true, force: true });
    }
  } catch (e) {
    console.log('Notice: Could not fully clear dist_app, proceeding...');
  }

  const env = { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' };

  console.log('⚡ Building Vite frontend assets...');
  execSync('npx vite build', { stdio: 'inherit', env });

  console.log('📦 Packaging Windows Desktop Executable...');
  execSync('npx electron-builder --win nsis', { stdio: 'inherit', env });

  console.log('✅ Build completed successfully!');
}

runBuild();
