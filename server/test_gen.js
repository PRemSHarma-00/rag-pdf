require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testGeneration() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = [
    'models/gemini-flash-latest',
    'models/gemini-2.5-flash',
    'models/gemini-2.5-flash-lite',
    'models/gemini-3.6-flash'
  ];

  for (const m of models) {
    try {
      console.log(`Testing '${m}'...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Say hello in 3 words'
      });
      console.log(`✅ Success with '${m}':`, res.text.trim());
      return m;
    } catch (err) {
      console.log(`❌ '${m}' failed:`, err.message?.substring(0, 150));
    }
  }
}

testGeneration();
