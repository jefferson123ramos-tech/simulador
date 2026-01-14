
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty } from "./types";

const cleanJsonResponse = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "");
    cleaned = cleaned.replace(/\n?```$/, "");
  }
  return cleaned.trim();
};

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  // Obtém a chave de forma segura, priorizando o ambiente injetado
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || '';
  
  if (!apiKey) {
    throw new Error("A chave de API não foi detectada pelo sistema. Verifique as configurações de ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um simulado acadêmico de ALTA QUALIDADE com EXATAMENTE 50 questões de múltipla escolha (4 opções) sobre: "${text}".

      ESTRUTURA:
      - Nível: ${difficulty.toUpperCase()}.
      - Campo mentorTip: Explicação técnica curta (máximo 12 palavras).
      - Retorne APENAS o JSON purificado.`,
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

    const jsonStr = cleanJsonResponse(response.text || "");
    return JSON.parse(jsonStr) as QuizData;
  } catch (e: any) {
    console.error("Erro na geração:", e);
    throw new Error("Erro ao processar as 50 questões. Tente um tema mais específico.");
  }
};
