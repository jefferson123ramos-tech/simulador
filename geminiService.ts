
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty } from "./types";

/**
 * Limpa a resposta da IA removendo blocos de código Markdown
 * e espaços em branco desnecessários para garantir um JSON válido.
 */
const cleanJsonResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.trim();
  // Remove blocos de código markdown (```json ... ``` ou ``` ... ```)
  cleaned = cleaned.replace(/```(?:json)?/g, "").replace(/```/g, "");
  return cleaned.trim();
};

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  try {
    // Inicialização obrigatória via process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um simulado acadêmico PROFISSIONAL com EXATAMENTE 50 questões de múltipla escolha sobre: "${text}".
      
      REQUISITOS:
      - Dificuldade: ${difficulty.toUpperCase()}.
      - Campo mentorTip: Explicação técnica (máx 12 palavras).
      - Idioma: Português do Brasil.
      - Retorne APENAS o JSON puro.`,
      config: {
        responseMimeType: "application/json",
        // Ajuste de segurança para permitir temas acadêmicos sensíveis (Direito, Saúde, etc.)
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ],
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
      const parsed = JSON.parse(jsonStr) as QuizData;
      if (!parsed.questions || parsed.questions.length === 0) {
        throw new Error("A IA retornou zero questões.");
      }
      return parsed;
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", jsonStr);
      throw new Error("A IA gerou um formato de resposta inválido. Tente simplificar o tema.");
    }

  } catch (e: any) {
    console.error("Erro Crítico na geração Gemini:", e);
    // Retorna o erro técnico real para facilitar o diagnóstico
    throw new Error(`Erro técnico: ${e.message || "Falha na conexão com a IA"}`);
  }
};
