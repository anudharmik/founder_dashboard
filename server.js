import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


app.post("/api/ai-insights", async (req, res) => {
  const { tasks } = req.body || {};
  if(!tasks) {
    return res.status(400).json({ error: "Tasks not provided" });
  }
  console.log("Tasks received:",tasks);

  const prompt = `
  Analyze these tasks and give productivity insights.
  IMPORTANT: You must format your response EXACTLY using the following sections:
  "Focus Today:" - What should be prioritized right now.
  "Risks:" - Potential delays, overdue tasks, or bottlenecks.
  "Insight:" - A general productivity tip or observation based on the tasks.
  
  Do not use markdown formatting like ** or # for the section headers. Ensure the section names are written exactly as requested.
  
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

    const insight=
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.error?.message ||
    "No insights generated";

    res.json({
      insights: insight
    });

  }catch (err){
    console.error("FULL ERROR:",err);
    res.status(500).json({ error:err.message,details:err});
  }
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});