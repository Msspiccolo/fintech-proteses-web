import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const images = [
  { name: 'knee.jpg', path: 'C:\\Users\\maria.sspiccolo\\.gemini\\antigravity-ide\\brain\\086a317a-b32d-434a-9a67-78836923bd8d\\knee_prosthesis_1790640216464.jpg' },
  { name: 'hip.jpg', path: 'C:\\Users\\maria.sspiccolo\\.gemini\\antigravity-ide\\brain\\086a317a-b32d-434a-9a67-78836923bd8d\\hip_prosthesis_1790640332499.jpg' },
  { name: 'leg.jpg', path: 'C:\\Users\\maria.sspiccolo\\.gemini\\antigravity-ide\\brain\\086a317a-b32d-434a-9a67-78836923bd8d\\leg_prosthesis_1790640515671.jpg' },
  { name: 'arm.jpg', path: 'C:\\Users\\maria.sspiccolo\\.gemini\\antigravity-ide\\brain\\086a317a-b32d-434a-9a67-78836923bd8d\\arm_prosthesis_1790640536037.jpg' }
];

async function uploadImages() {
  const bucketName = 'products';

  // Create bucket if it doesn't exist
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  const bucketExists = buckets.some(b => b.name === bucketName);
  if (!bucketExists) {
    console.log(`Creating bucket '${bucketName}'...`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png'],
    });
    if (createError) {
      console.error('Error creating bucket:', createError);
      return;
    }
  } else {
    console.log(`Bucket '${bucketName}' already exists.`);
    // Make sure it's public
    await supabase.storage.updateBucket(bucketName, { public: true });
  }

  for (const img of images) {
    console.log(`Uploading ${img.name}...`);
    try {
      const fileBuffer = fs.readFileSync(img.path);
      const { data, error } = await supabase.storage.from(bucketName).upload(img.name, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });
      if (error) {
        console.error(`Error uploading ${img.name}:`, error.message);
      } else {
        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(img.name);
        console.log(`Successfully uploaded ${img.name} -> ${publicUrlData.publicUrl}`);
      }
    } catch (err) {
      console.error(`Error reading ${img.name}:`, err.message);
    }
  }
}

uploadImages();
