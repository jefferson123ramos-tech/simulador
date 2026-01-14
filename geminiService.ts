
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty } from "./types";

const cleanJsonResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/```(?:json)?/g, "").replace(/```/g, "");
  return cleaned.trim();
};

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  // Acesso seguro à chave definida pelo Vite ou pelo ambiente
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "" || apiKey === "undefined") {
    throw new Error("API_KEY_MISSING");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: `Você é um professor acadêmico sênior. Sua tarefa é criar um simulado rigoroso e profissional.
          
          CONTEÚDO/TEMA: "${text}"
          DIFICULDADE: ${difficulty.toUpperCase()}
          REGRAS:
          - Gere EXATAMENTE 50 questões de múltipla escolha.
          - Cada questão deve ter 4 opções.
          - O campo 'mentorTip' deve explicar POR QUE a resposta está correta (máx 15 palavras).
          - Idioma: Português do Brasil.
          - Retorne APENAS o JSON.`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswerIndex: { type: Type.INTEGER },
                  mentorTip: { type: Type.STRING }
                },
                required: ["id", "question", "options", "correctAnswerIndex", "mentorTip"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const rawOutput = response.text || "";
    const sanitizedJson = cleanJsonResponse(rawOutput);
    
    try {
      const parsedData = JSON.parse(sanitizedJson) as QuizData;
      if (!parsedData.questions || parsedData.questions.length === 0) {
        throw new Error("EMPTY_RESPONSE");
      }
      return parsedData;
    } catch (parseError) {
      throw new Error("INVALID_JSON");
    }

  } catch (e: any) {
    if (e.message === "API_KEY_MISSING") throw e;
    console.error("Erro no SDK Gemini:", e);
    throw new Error(`FALHA_IA: ${e.message || "Erro de conexão"}`);
  }
};
