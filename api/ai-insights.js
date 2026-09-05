export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tasks } = req.body || {};
  if (!tasks) {
    return res.status(400).json({ error: "Tasks not provided" });
  }

  const prompt = `
  Analyze these tasks and give productivity insights.
  IMPORTANT: You must format your response EXACTLY as a valid JSON object. Do not include any markdown, backticks, or extra text. Only return the JSON object.
  The JSON object must have the following structure:
  {
    "focusToday": ["Task 1", "Task 2"],
    "risk": "Potential delays, overdue tasks, or bottlenecks.",
    "insight": "A general productivity tip or observation based on the tasks."
  }
  
  Tasks:
  ${JSON.stringify(tasks)}
  `;

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on Vercel" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    const data = await response.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        focusToday: [],
        risk: "Could not analyze tasks",
        insight: "AI parsing failed"
      };
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Vercel AI Insights Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
