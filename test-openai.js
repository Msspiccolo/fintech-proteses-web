import fs from 'fs';

async function test() {
  const env = fs.readFileSync('.env', 'utf8');
  const keyMatch = env.match(/OPENAI_API_KEY="?([^"\r\n]+)"?/);
  if (!keyMatch) { 
    console.error('No key found'); 
    process.exit(1); 
  }
  const key = keyMatch[1];
  
  const prompt = 'Photorealistic 3D CAD render of a mechanical prosthetic knee joint component. Material: carbon fiber composite. Color finish: matte black. Pure white studio background. Professional product photography. Soft even lighting. No shadows. No human body. No person. Only the device object.';

  console.log("Testing with key ending in: ...", key.slice(-5));

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "dall-e-2",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      }),
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 1000));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
