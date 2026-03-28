#!/usr/bin/env node
/**
 * Compress public assets at build time using sharp.
 * Runs during Amplify preBuild to reduce image sizes before deployment.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');

const targets = [
  {
    input: 'assets/login_banner_image.png',
    output: 'assets/login_banner_image.jpg',
    options: { quality: 78, progressive: true },
    format: 'jpeg',
    resize: { width: 800, withoutEnlargement: true },
  },
  {
    input: 'assets/subscription_banner.jpg',
    output: 'assets/subscription_banner.jpg',
    options: { quality: 80, progressive: true },
    format: 'jpeg',
    resize: { width: 1200, withoutEnlargement: true },
  },
  {
    input: 'assets/image1.png',
    output: 'assets/image1.png',
    options: { compressionLevel: 9, effort: 10 },
    format: 'png',
    resize: { width: 600, withoutEnlargement: true },
  },
  {
    input: 'assets/Google_Translate_Icon.png',
    output: 'assets/Google_Translate_Icon.png',
    options: { compressionLevel: 9 },
    format: 'png',
    resize: { width: 64, withoutEnlargement: true },
  },
  {
    input: 'logo.png',
    output: 'logo.png',
    options: { compressionLevel: 9 },
    format: 'png',
    resize: { width: 200, withoutEnlargement: true },
  },
  {
    input: 'favicon.jpg',
    output: 'favicon.jpg',
    options: { quality: 85 },
    format: 'jpeg',
    resize: { width: 64, withoutEnlargement: true },
  },
];

async function compress() {
  let totalSaved = 0;

  for (const target of targets) {
    const inputPath = path.join(PUBLIC_DIR, target.input);
    const outputPath = path.join(PUBLIC_DIR, target.output);

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${target.input} (not found)`);
      continue;
    }

    const originalSize = fs.statSync(inputPath).size;

    try {
      let pipeline = sharp(inputPath);

      if (target.resize) {
        pipeline = pipeline.resize(target.resize);
      }

      if (target.format === 'jpeg') {
        pipeline = pipeline.jpeg(target.options);
      } else if (target.format === 'png') {
        pipeline = pipeline.png(target.options);
      } else if (target.format === 'webp') {
        pipeline = pipeline.webp(target.options);
      }

      // Write to temp then replace to avoid corrupting on failure
      const tmpPath = outputPath + '.tmp';
      await pipeline.toFile(tmpPath);

      const newSize = fs.statSync(tmpPath).size;

      // Only replace if actually smaller
      if (newSize < originalSize) {
        fs.renameSync(tmpPath, outputPath);
        const saved = originalSize - newSize;
        totalSaved += saved;
        console.log(
          `✅ ${target.input}: ${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (saved ${(saved / 1024).toFixed(0)}KB)`
        );
      } else {
        fs.unlinkSync(tmpPath);
        console.log(`ℹ️  ${target.input}: already optimal (${(originalSize / 1024).toFixed(0)}KB)`);
      }
    } catch (err) {
      console.error(`❌ Failed to compress ${target.input}:`, err.message);
      // Clean up temp file if it exists
      const tmpPath = outputPath + '.tmp';
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  console.log(`\n🎉 Total saved: ${(totalSaved / 1024).toFixed(0)}KB`);
}

compress().catch(err => {
  console.error('Compression script failed:', err);
  // Don't exit with error — don't break the build if compression fails
  process.exit(0);
});
