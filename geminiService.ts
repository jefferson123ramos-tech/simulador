
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData } from "./types";

export const generateQuiz = async (text: string): Promise<QuizData> => {
  // A chave deve ser obtida preferencialmente de process.env.API_KEY
  const apiKey = (process?.env?.API_KEY as string) || (process?.env?.VITE_GEMINI_API_KEY as string) || '';
  
  if (!apiKey) {
    throw new Error("Chave da API do Gemini não encontrada. Verifique as variáveis de ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Gere 5 questões de múltipla escolha (4 alternativas cada) baseadas EXATAMENTE no seguinte texto: "${text}". Cada questão deve ter um índice da resposta correta e uma "Dica do Mentor" que explique por que a alternativa correta está certa e forneça contexto educativo.`,
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

  const jsonStr = response.text || "";
  return JSON.parse(jsonStr) as QuizData;
};
