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


feature/complaint
module.exports = {
  generateComplaintResolution,

const generateRecommendations = async (userBehavior) => {
  const {
    topGames,
    totalGames,
    totalPlaytimeHours,
    topAchievementGames,
    favoriteGames,
  } = userBehavior;

  const systemPrompt = `You are a gaming recommendation engine for GameNode.
                        Analyze the user's gaming behavior and recommend 5 Steam games they would enjoy.
                        You must respond with ONLY a valid JSON array and nothing else. No markdown, no explanation.
                        Format exactly like this:
                        [
                          {
                            "name": "Game Name",
                            "reason": "One sentence addressing the user directly using second person (you/your)",
                            "matchPercent": 85,
                            "genre": "Action RPG"
                          }
                        ]
                        matchPercent should be between 60 and 98.
                        IMPORTANT: The reason field MUST use second person language.
                        Write as if talking directly to the user.
                        Example of correct reason: "Given your experience with Team Fortress Classic, you will enjoy this sequel."
                        Example of wrong reason: "Given their experience with Team Fortress Classic, they will enjoy this sequel."
                        Never use "their", "they", or "the user" in the reason field. Always use "you" and "your".`;
                        
  const userMessage = `User Gaming Profile:
                      - Total games owned: ${totalGames}
                      - Total playtime: ${totalPlaytimeHours} hours
                      - Top 5 games by playtime: ${topGames.map((g) => `${g.name} (${g.hours}h)`).join(", ")}
                      - Games with most achievements unlocked: ${topAchievementGames.map((g) => g.name).join(", ")}
                      - Favorite games: ${favoriteGames.map((g) => g.name).join(", ") || "None marked"}

                      Recommend 5 Steam games this user would enjoy based on their profile.`;

  const raw = await callGenAI(systemPrompt, userMessage, 800);

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error("Response is not an array");
    return parsed.slice(0, 5);
  } catch {
    throw new Error("GenAI returned invalid recommendation format");
  }
};


const generateAssistantResponse = async (message, userContext, sessionHistory = []) => {
  const { topGames, totalGames, totalPlaytimeHours, recentAchievements } = userContext;

  const systemPrompt = `You are GameNode's AI gaming assistant. You help gamers with tips, strategies, and gaming insights.
                        You have access to the user's Steam library data to give personalized answers.
                        Keep responses under 200 words. Be friendly, specific, and helpful.
                        If the question is completely unrelated to gaming, politely redirect: "I'm specialized in gaming topics — let me help you with something gaming-related instead!"
                        Do not make up game features or mechanics you are not sure about.

                        User's Gaming Profile:
                        - Total games: ${totalGames}
                        - Total playtime: ${totalPlaytimeHours} hours  
                        - Top games: ${topGames.map((g) => `${g.name} (${g.hours}h)`).join(", ")}
                        - Recent achievements: ${recentAchievements.slice(0, 3).map((a) => a.name).join(", ") || "None"}`;


  const historyText = sessionHistory.slice(-6).map((m) =>
    `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
  ).join("\n");

  const userMessage = historyText
    ? `Previous conversation:\n${historyText}\n\nCurrent question: ${message}`
    : message;


  return callGenAI(systemPrompt, userMessage, 500);
};

module.exports = {
  generateComplaintResolution,
  generateRecommendations,
  generateAssistantResponse,
main
};