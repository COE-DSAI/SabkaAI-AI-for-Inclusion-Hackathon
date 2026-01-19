// Netlify Serverless Function for Google Translate using Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text, from = 'auto', to = 'hi' } = JSON.parse(event.body || '{}');

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API Key not configured' })
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Translate the following text to the target language. 
    Target Language: ${to} (ISO 639-1 code)
    Source Language Hint: ${from}
    
    Output ONLY the translated text. Do not include any explanations.
    
    Text: ${text}`;

    const result = await model.generateContent(prompt);
    const translatedText = result.response.text().trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        translatedText,
        detectedLanguage: from === 'auto' ? 'unknown' : from
      })
    };
  } catch (error) {
    console.error('Translation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Translation failed',
      })
    };
  }
};
