import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = fs.readFileSync('./public/logo.svg');

async function generateIcons() {
  try {
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile('./public/apple-touch-icon.png');
    console.log('apple-touch-icon.png generated');

    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile('./public/pwa-192x192.png');
    console.log('pwa-192x192.png generated');

    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile('./public/pwa-512x512.png');
    console.log('pwa-512x512.png generated');
  } catch (err) {
    console.error(err);
  }
}

generateIcons();
