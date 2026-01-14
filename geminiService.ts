
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { QuizData, Difficulty } from "./types";

/**
 * Limpa a resposta da IA de qualquer formatação Markdown ou texto extra.
 */
const sanitizeAiResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
};

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  try {
    // Initializing the AI client using process.env.API_KEY directly as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Modelo gemini-3-pro-preview: Recomendado para tarefas complexas de texto como geração de simulados técnicos.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{
        parts: [{
          text: `Você é um professor acadêmico sênior. Crie um simulado técnico sobre: "${text}".
          Nível: ${difficulty.toUpperCase()}.
          
          REQUISITOS OBRIGATÓRIOS:
          1. Gere EXATAMENTE 50 questões de múltipla escolha.
          2. Cada questão deve ter 4 opções.
          3. O campo 'mentorTip' deve ser uma explicação curta (máx 15 palavras).
          4. Idioma: Português do Brasil.
          
          IMPORTANTE: Responda APENAS com o JSON cru.`
        }]
      }],
      config: {
        // Fix: safetySettings is a property of the config object, not GenerateContentParameters.
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ],
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

    // Access the generated text directly using the property.
    const rawText = response.text || "";
    const cleanedJson = sanitizeAiResponse(rawText);
    
    try {
      const parsedData = JSON.parse(cleanedJson) as QuizData;
      if (!parsedData.questions || parsedData.questions.length === 0) {
        throw new Error("A IA retornou um conjunto de dados vazio.");
      }
      return parsedData;
    } catch (parseError: any) {
      console.error("Erro no Parse JSON. Conteúdo bruto:", rawText);
      throw new Error(`Falha na formatação dos dados: ${parseError.message}`);
    }

  } catch (e: any) {
    console.error("Erro na Gemini API:", e);
    throw e;
  }
};
