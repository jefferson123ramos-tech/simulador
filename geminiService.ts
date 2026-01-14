
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty } from "./types";

/**
 * Sanitização de JSON para evitar quebras por formatação de markdown da IA.
 */
const cleanJsonResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/```(?:json)?/g, "").replace(/```/g, "");
  return cleaned.trim();
};

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  // 1. Captura da chave no momento da chamada (Segurança Máxima)
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined") {
    console.error("ERRO CRÍTICO: Chave API ausente em process.env.API_KEY");
    throw new Error("Configuração da API ausente. Por favor, verifique as variáveis de ambiente do projeto.");
  }

  try {
    // 2. Inicialização local da instância do SDK
    const ai = new GoogleGenAI({ apiKey });

    // 3. Chamada ao modelo utilizando a estrutura correta do SDK
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
        throw new Error("O servidor de IA não retornou questões válidas.");
      }
      
      return parsedData;
    } catch (parseError) {
      console.error("JSON Bruto recebido:", rawOutput);
      throw new Error("Erro de processamento nos dados da IA. Tente um tema mais específico.");
    }

  } catch (e: any) {
    console.error("Erro no SDK Gemini:", e);
    throw new Error(`Falha na IA: ${e.message || "Conexão interrompida"}`);
  }
};
