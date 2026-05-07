export default async function handler(req, res) {

  //Tasks from frontend
  const { tasks } = req.body;

  //Prompt for AI
  const prompt = `
You are a productivity assistant.

Analyze the tasks and respond in STRICT format:

Analyze the tasks and return ONLY valid JSON.

Format:
{
  "focusToday": ["task1", "task2"],
  "risk": "short risk message",
  "insight": "short productivity insight"
}


Rules:
- focusToday must contain max 3 task titles
- Keep it SHORT
- Use bullet points
- Max 6 lines total
- No long explanations
- Return ONLY JSON


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