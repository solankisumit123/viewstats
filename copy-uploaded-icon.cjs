const fs = require('fs');
const path = require('path');

const src = 'C:/Users/solan/.gemini/antigravity-ide/brain/767cc62d-2325-40b0-89da-724ca9e463d4/media__1782844510415.jpg';
const destDir = path.join(__dirname, 'build');
const dest = path.join(destDir, 'icon.png');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log('✅ Uploaded logo copied to build/icon.png successfully!');
} catch (err) {
  console.error('Failed to copy uploaded logo:', err.message);
}
