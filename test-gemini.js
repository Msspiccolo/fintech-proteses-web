import fs from 'fs';

async function test() {
  const env = fs.readFileSync('.env', 'utf8');
  const keyMatch = env.match(/GEMINI_API_KEY="?([^"\r\n]+)"?/);
  if (!keyMatch) { 
    console.error('No key found'); 
    process.exit(1); 
  }
  const key = keyMatch[1];
  
  const prompt = 'Photorealistic 3D CAD render of a mechanical prosthetic knee joint component. Material: carbon fiber composite. Color finish: matte black. Pure white studio background. Professional product photography. Soft even lighting. No shadows. No human body. No person. Only the device object.';

  console.log("Testing with key ending in: ...", key.slice(-5));

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });
    
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.substring(0, 1000));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
