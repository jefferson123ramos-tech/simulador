
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { QuizData, Difficulty } from "./types";

/**
 * Limpa a resposta da IA de qualquer formatação Markdown ou texto extra.
 */
const sanitizeAiResponse = (text: string): string => {
  if (!text) return "";
  // Remove blocos de código markdown e espaços extras
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  // Garante que pegamos apenas o que está entre as chaves do objeto principal
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
};

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  // Fix: Use process.env.API_KEY exclusively as per SDK guidelines.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Chave de API não configurada.");
  }

  try {
    // Fix: Create new GoogleGenAI instance inside the function to ensure up-to-date config is used.
    const ai = new GoogleGenAI({ apiKey });

    // Fix: Use 'gemini-3-flash-preview' for optimal performance in text tasks.
    // Fix: Move safetySettings to the top level of the request parameters (not inside config).
    // Fix: Use HarmCategory and HarmBlockThreshold enums to resolve TypeScript type assignment errors.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: `Você é um professor acadêmico sênior. Crie um simulado técnico sobre: "${text}".
          Nível: ${difficulty.toUpperCase()}.
          
          REQUISITOS OBRIGATÓRIOS:
          1. Gere EXATAMENTE 50 questões de múltipla escolha.
          2. Cada questão deve ter 4 opções.
          3. O campo 'mentorTip' deve ser uma explicação curta (máx 15 palavras).
          4. Idioma: Português do Brasil.
          
          IMPORTANTE: Responda APENAS com o JSON cru. Não use markdown, não use crases, não coloque introdução nem conclusão.`
        }]
      }],
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
      ],
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

    // Fix: Access response.text property directly as per modern SDK guidelines.
    const rawText = response.text || "";
    const cleanedJson = sanitizeAiResponse(rawText);
    
    try {
      const parsedData = JSON.parse(cleanedJson) as QuizData;
      if (!parsedData.questions || parsedData.questions.length === 0) {
        throw new Error("A IA retornou um conjunto de dados vazio.");
      }
      return parsedData;
    } catch (parseError: any) {
      console.error("Falha ao processar JSON. Raw:", rawText);
      throw new Error(`Falha na estrutura do simulado (JSON Parse): ${parseError.message}`);
    }

  } catch (e: any) {
    console.error("Erro na comunicação com Gemini API:", e);
    throw new Error(e.message || "Erro desconhecido na comunicação com a IA.");
  }
};
