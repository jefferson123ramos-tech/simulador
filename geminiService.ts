
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
  // Inicialização obrigatória usando a variável de ambiente process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um simulado acadêmico PROFISSIONAL e EXTENSO com EXATAMENTE 50 questões de múltipla escolha (4 alternativas cada) sobre o tema: "${text}".

      REGRAS TÉCNICAS:
      1. Nível: ${difficulty.toUpperCase()}.
      2. Quantidade: 50 questões únicas.
      3. mentorTip: Explicação técnica curtíssima (máximo 10 palavras).
      4. JSON: Retorne APENAS o JSON, sem markdown ou textos explicativos.`,
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
    throw new Error("Falha ao gerar o simulado de 50 questões. Verifique sua conexão ou tente um tema mais específico.");
  }
};
