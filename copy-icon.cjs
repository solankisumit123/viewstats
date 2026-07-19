const fs = require('fs');
const path = require('path');

const src = "C:\\Users\\solan\\.gemini\\antigravity-ide\\brain\\356bf336-d48f-464c-b319-52dae0fd63d1\\viewstats_clean_app_icon_1783009553816.png";
const dest = path.join(__dirname, 'build', 'icon.png');

try {
  fs.copyFileSync(src, dest);
  console.log('✅ App icon successfully copied to build/icon.png');
} catch (err) {
  console.error('Failed to copy icon:', err);
}
