import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running");
});
app.post("/api/ai-insights", async (req, res) => {
  const { tasks } = req.body || {};
  if(!tasks) {
    return res.status(400).json({ error: "Tasks not provided" });
  }
  console.log("Tasks received:",tasks);

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
      const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    console.log("Gemini RAW RESPONSE",JSON.stringify(data,null,2));

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

    res.json(parsed);

  }catch (err){
    console.error("FULL ERROR:",err);
    res.status(500).json({ error:err.message,details:err});
  }
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});