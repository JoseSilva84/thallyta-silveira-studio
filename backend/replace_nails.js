import cloudinary from './src/config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function replaceNails() {
  try {
    console.log('Fetching existing images from Cloudinary...');
    const { resources } = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'thallyta-studio/',
      max_results: 100,
      context: true,
      tags: true
    });

    const unhasImages = resources.filter(img => img.context?.custom?.category === 'Unhas');
    console.log(`Found ${unhasImages.length} images with category 'Unhas'. Deleting them...`);

    for (const img of unhasImages) {
      await cloudinary.uploader.destroy(img.public_id);
      console.log(`Deleted ${img.public_id}`);
    }

    console.log('Uploading new unhas images...');
    const imgDir = path.resolve(__dirname, '../public/img');
    const newImages = ['unha1.jpeg', 'unha2.jpeg', 'unha3.jpeg', 'unha4.jpeg', 'unha5.jpeg', 'unha6.jpeg', 'unha7.jpeg'];

    for (const filename of newImages) {
      const filePath = path.join(imgDir, filename);
      if (fs.existsSync(filePath)) {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: 'thallyta-studio',
          context: `category=Unhas|alt=Nail design ${filename}`
        });
        console.log(`Uploaded ${filename} -> ${result.public_id}`);
      } else {
        console.log(`File not found: ${filePath}`);
      }
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

replaceNails();
