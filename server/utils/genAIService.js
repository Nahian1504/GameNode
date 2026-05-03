const axios = require("axios");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const callGenAI = async (systemPrompt, userMessage, maxTokens = 1000) => {
  if (!process.env.GROQ_API_KEY) { 
    throw new Error("GROQ_API_KEY is not configured");
  }

  try {
    const response = await axios.post(
      GROQ_API_URL, 
      {
        model: GROQ_MODEL, 
        max_tokens: maxTokens,  
        temperature: 0.7,
        messages: [              
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, 
          "Content-Type":  "application/json",
        },
        timeout: 15000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from GenAI API");
    return content.trim();

  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error("AI rate limit reached. Please wait a moment and try again.");
    }
    throw error;
  }
};


const generateComplaintResolution = async (category, description) => {
  const systemPrompt = `You are a helpful support assistant for GameNode, a gaming dashboard application.
                        Your job is to provide clear, friendly, and actionable resolution suggestions for user complaints.
                        Keep your response under 150 words. Be concise and specific to the complaint category.
                        If the issue is a technical problem, suggest specific steps to try.
                        If it is about inappropriate content, explain the reporting process.
                        If it is about the AI, explain how to get better results.
                        Always end with reassurance that the team cares about their experience.`;

  const userMessage = `Complaint Category: ${category}
                      User Description: ${description}
                      Please provide a helpful resolution suggestion for this complaint.`;

  return callGenAI(systemPrompt, userMessage, 300);
};


module.exports = {
  generateComplaintResolution,
};