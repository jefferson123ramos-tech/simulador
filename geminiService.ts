
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
  // 1. Pega a chave na hora da execução para garantir que o ambiente esteja carregado
  const apiKey = process.env.API_KEY;

  // 2. Trava de segurança: Se não tiver chave, lança erro
  if (!apiKey) {
    throw new Error("ERRO CRÍTICO: Chave API não encontrada (process.env.API_KEY).");
  }

  // 3. Inicializa a IA somente agora, dentro do escopo da função
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um simulado acadêmico de ALTA QUALIDADE com EXATAMENTE 50 questões de múltipla escolha (4 opções cada) sobre o tema: "${text}".

      ESTRUTURA OBRIGATÓRIA:
      - Nível de Dificuldade: ${difficulty.toUpperCase()}.
      - Campo mentorTip: Uma dica técnica ou explicação curta (máximo 12 palavras) para quem errar.
      - Retorne estritamente um JSON puro, sem explicações fora do bloco.`,
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
    
    if (!parsed.questions || parsed.questions.length === 0) {
      throw new Error("A IA não retornou questões válidas.");
    }

    return parsed;
  } catch (e: any) {
    console.error("Erro na geração:", e);
    throw new Error("Falha ao gerar as 50 questões. Detalhes: " + (e.message || "Erro desconhecido"));
  }
};
