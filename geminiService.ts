
import { GoogleGenAI, Type } from "@google/genai";
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
  // Lógica Obrigatória: Acesso via import.meta.env para Vite/Vercel
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("ERRO FATAL: VITE_GEMINI_API_KEY está vazia nas configurações de ambiente.");
    throw new Error("Erro de Configuração: A variável VITE_GEMINI_API_KEY não foi encontrada na Vercel. Verifique as configurações de Environment Variables.");
  }

  try {
    // Inicialização segura dentro da função
    const ai = new GoogleGenAI({ apiKey });

    // Uso do modelo estável gemini-flash-latest
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [{
        parts: [{
          text: `Você é um professor acadêmico sênior. Crie um simulado técnico sobre: "${text}".
          Nível: ${difficulty.toUpperCase()}.
          
          REQUISITOS OBRIGATÓRIOS:
          1. Gere EXATAMENTE 50 questões de múltipla escolha.
          2. Cada questão deve ter 4 opções.
          3. O campo 'mentorTip' deve ser uma explicação curta (máx 15 palavras).
          4. Idioma: Português do Brasil.
          
          IMPORTANTE: Responda APENAS com o JSON cru. Não use markdown, não use crases, não coloque introdução.`
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

    // Propriedade .text direta conforme diretrizes do SDK
    const rawText = response.text || "";
    const cleanedJson = sanitizeAiResponse(rawText);
    
    try {
      const parsedData = JSON.parse(cleanedJson) as QuizData;
      if (!parsedData.questions || parsedData.questions.length === 0) {
        throw new Error("A IA retornou um conjunto de dados vazio ou incompleto.");
      }
      return parsedData;
    } catch (parseError: any) {
      console.error("Falha ao processar JSON. Raw:", rawText);
      throw new Error(`Falha na formatação do simulado (JSON Parse Error): ${parseError.message}`);
    }

  } catch (e: any) {
    console.error("Erro na comunicação com Gemini API:", e);
    throw e; // Propaga para o tratamento de erro no componente App
  }
};
