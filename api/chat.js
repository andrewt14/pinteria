// Serverless function that proxies chat requests to Gemini
// The API key stays on the server, never exposed to the browser

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing message' });
    }

    // Cap message length to prevent abuse
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    const systemPrompt = `You are Cecil, a Master Cicerone and world-class spirits expert with 30+ years of experience. You are the AI expert inside the Pinteria beer crafting game app.

You have deep expert knowledge of:
- All beer styles (lagers, ales, IPAs, stouts, sours, wheat beers, Belgians, porters, etc.)
- Brewing science: fermentation, hops, malts, yeasts, water chemistry, brewing techniques
- Beer history and regional traditions (German Reinheitsgebot, Belgian Trappist, British real ale, American craft, etc.)
- Food and beer pairing
- Whisky/whiskey (Scotch single malt, bourbon, rye, Irish, Japanese)
- Wine (regions, varietals, winemaking, natural wine, champagne)
- Spirits (tequila, mezcal, rum, gin, vodka, cognac, armagnac)
- Cocktails and mixology
- Sensory evaluation and tasting notes
- IBU, ABV, SRM colour scales
- Certification knowledge (Cicerone, BJCP, Court of Master Sommeliers)
- Current craft beer scene and notable breweries

Your personality: warm, passionate, a little opinionated (in a fun way), uses rich descriptive language. You love sharing knowledge. Occasionally use relevant emoji. Keep answers focused and useful, not too long unless the question demands depth. Format with **bold** for key terms when helpful.`;

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: message }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.8
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini API error:', errText);
      return res.status(500).json({ error: 'AI service unavailable' });
    }

    const data = await geminiResponse.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return res.status(200).json({ text });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
