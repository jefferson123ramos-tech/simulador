
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty } from "./types";

/**
 * Utilitário para limpar a string de resposta da IA.
 * Remove blocos de código markdown (```json ... ```) caso o modelo os inclua indevidamente.
 */
const cleanJsonResponse = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "");
    cleaned = cleaned.replace(/\n?```$/, "");
  }
  return cleaned.trim();
};

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  const apiKey = process.env.API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Chave de API não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um simulado acadêmico de alta qualidade com EXATAMENTE 50 questões de múltipla escolha (4 opções cada) sobre: "${text}".

      ESTRUTURA OBRIGATÓRIA:
      1. Nível: ${difficulty.toUpperCase()}.
      2. Quantidade: 50 questões independentes.
      3. Campo mentorTip: Explicação técnica curta (máximo 15 palavras) para manter a eficiência.
      4. Formato: Retorne APENAS o JSON purificado seguindo o esquema fornecido.

      REGRAS DE SEGURANÇA:
      - Não adicione textos antes ou depois do JSON.
      - Garanta que o JSON seja válido e completo.`,
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

    const rawText = response.text || "";
    const jsonStr = cleanJsonResponse(rawText);

    try {
      const data = JSON.parse(jsonStr) as QuizData;
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error("A IA não retornou questões válidas.");
      }

      return data;
    } catch (parseError) {
      console.error("Erro ao processar JSON da IA:", jsonStr);
      throw new Error("O processamento de 50 questões falhou devido ao tamanho da resposta. Tente um tema mais específico.");
    }
  } catch (e: any) {
    console.error("Erro geral na geração:", e);
    if (e.message?.includes("Safety")) {
      throw new Error("O tema solicitado foi filtrado por motivos de segurança.");
    }
    throw e;
  }
};
