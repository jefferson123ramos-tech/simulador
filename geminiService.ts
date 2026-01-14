
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
  /**
   * DIRETRIZES OBRIGATÓRIAS DO SDK:
   * 1. A chave DEVE ser obtida exclusivamente de process.env.API_KEY.
   * 2. A inicialização DEVE usar o parâmetro nomeado { apiKey }.
   * 3. O modelo DEVE ser gemini-3-flash-preview para tarefas de texto.
   */
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
      throw new Error("A IA retornou um conjunto incompleto de questões.");
    }

    return parsed;
  } catch (e: any) {
    console.error("Erro na geração Gemini:", e);
    // Erro amigável para o usuário final
    const errorMessage = e.message?.includes('process') 
      ? "Erro de configuração de ambiente. A chave API não foi detectada." 
      : "Falha ao gerar o simulado. Verifique sua conexão ou tente um tema diferente.";
    throw new Error(errorMessage);
  }
};
