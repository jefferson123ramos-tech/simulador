
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
  // 1. Acesso correto via Vite Environment Variables
  // @ts-ignore
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // 2. Trava de segurança para produção
  if (!apiKey) {
    throw new Error("ERRO CRÍTICO: Chave API não encontrada. Verifique se VITE_GEMINI_API_KEY está configurada no seu arquivo .env ou na plataforma de deploy.");
  }

  // 3. Inicialização segura no momento da chamada
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um simulado acadêmico PROFISSIONAL e DETALHADO com EXATAMENTE 50 questões de múltipla escolha (4 opções cada) sobre: "${text}".

      ESTRUTURA OBRIGATÓRIA:
      - Dificuldade: ${difficulty.toUpperCase()}.
      - Campo mentorTip: Explicação técnica da resposta correta (máximo 12 palavras).
      - Idioma: Português do Brasil.
      - Retorne APENAS o JSON puro.`,
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
    const parsed = JSON.parse(jsonStr) as QuizData;
    
    if (!parsed.questions || parsed.questions.length < 1) {
      throw new Error("A IA retornou um conjunto vazio de questões.");
    }

    return parsed;
  } catch (e: any) {
    console.error("Erro na geração Gemini:", e);
    throw new Error("Falha ao processar simulado de 50 questões. Verifique sua cota da API ou conexão.");
  }
};
