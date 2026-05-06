export default async function handler(req, res) {

  //Tasks from frontend
  const { tasks } = req.body;

  //Prompt for AI
  const prompt = `
You are a productivity assistant.

Analyze the tasks and respond in STRICT format:

🔥 Focus Today:
- 2-3 most important tasks

⚠️ Risks:
- deadlines or issues

📊 Insight:
- 1 short productivity observation

Rules:
- Keep it SHORT
- Use bullet points
- Max 6 lines total
- No long explanations

  Tasks:
  ${JSON.stringify(tasks)}
  `;

  try {
    console.log("TAsks received:",tasks);
    //Call OpenAI API

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    console.log("OpenAI response:",data);

    //Send response back to frontend
    res.status(200).json({
      insights: data.choices[0].message.content
    });

  } catch (error) {
    console.log("ERROR:",err);
    res.status(500).json({ error: "AI request failed" });
  }
}