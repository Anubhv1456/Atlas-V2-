const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const publicDir = path.join(__dirname, 'artifacts/study-tracker/public');
const sourceImage = path.join(__dirname, 'attached_assets/file_00000000828071f594803fb77e46a7c0_1784096743553.png');

console.log("Generating icons...");
try {
  execSync(`npx sharp -i ${sourceImage} -o ${publicDir}/pwa-192x192.png resize 192 192`, {stdio: 'inherit'});
  execSync(`npx sharp -i ${sourceImage} -o ${publicDir}/pwa-512x512.png resize 512 512`, {stdio: 'inherit'});
  
  // Maskable: For maskable, we just use the original since the logo already has plenty of padding based on the image attached. Let's just resize it to 512x512.
  execSync(`npx sharp -i ${sourceImage} -o ${publicDir}/pwa-512x512-maskable.png resize 512 512`, {stdio: 'inherit'});
  
  execSync(`npx sharp -i ${sourceImage} -o ${publicDir}/apple-touch-icon.png resize 180 180`, {stdio: 'inherit'});
  execSync(`npx sharp -i ${sourceImage} -o ${publicDir}/favicon.png resize 64 64`, {stdio: 'inherit'});
  
} catch (e) {
  console.error("Error generating images:", e);
}
console.log("Done");
