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

  const { goalTitle, goalDescription, existingTaskTitles, orgMembers } = req.body || {};
  if (!goalTitle) {
    return res.status(400).json({ error: "Goal title is required" });
  }

  const prompt = `
  You are an expert project manager. Based on the following goal title, description, existing task titles, and organization member list, suggest 2 to 4 actionable, concrete proposed tasks to achieve the goal. Do NOT propose tasks that duplicate existing task titles.

  Goal Title: "${goalTitle}"
  Goal Description: "${goalDescription || "None"}"
  Existing Task Titles: ${JSON.stringify(existingTaskTitles || [])}
  Organization Members Context: ${JSON.stringify(orgMembers || [])}

  IMPORTANT:
  - Return your response EXACTLY as a valid JSON array of objects. Do not include markdown formatting, backticks, or text before or after the JSON.
  - Each task object must have:
    - "title": string (concise, actionable title)
    - "description": string (short description)
    - "suggestedDeadline": string (ISO date format YYYY-MM-DD within 7 to 30 days from today, or empty string "")
    - "suggestedAssigneeId": string (user_id of a member from Organization Members Context ONLY if clearly relevant, otherwise empty string "")

  Example JSON output format:
  [
    {
      "title": "Design API Specification",
      "description": "Draft openapi spec for tasks endpoint",
      "suggestedDeadline": "2026-08-15",
      "suggestedAssigneeId": ""
    }
  ]
  `;

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on Vercel", proposals: [] });
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
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

    let proposals = [];
    try {
      proposals = JSON.parse(raw);
      if (!Array.isArray(proposals)) proposals = [];
    } catch (err) {
      console.error("AI proposal parsing error:", err);
      proposals = [];
    }

    return res.status(200).json({ proposals });
  } catch (err) {
    console.error("Vercel AI Task Proposals Error:", err);
    return res.status(500).json({ error: err.message, proposals: [] });
  }
}
