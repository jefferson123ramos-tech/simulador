
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty } from "./types";

/**
 * Limpa a resposta da IA de qualquer formatação Markdown ou texto extra.
 * Conforme as diretrizes, a propriedade .text deve retornar o conteúdo limpo quando configurado com responseMimeType: "application/json".
 */
const sanitizeAiResponse = (text: string): string => {
  if (!text) return "";
  return text.trim();
};

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  // A chave da API deve ser obtida exclusivamente de process.env.API_KEY conforme as diretrizes do SDK
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "" || apiKey === "undefined") {
    throw new Error("API_KEY_MISSING");
  }

  try {
    // Inicializa o cliente com a API Key em um objeto nomeado conforme as diretrizes
    const ai = new GoogleGenAI({ apiKey });

    // Fix: Alterado o modelo para 'gemini-3-pro-preview' para lidar com a geração complexa de 50 questões técnicas (tarefa STEM/Reasoning).
    // Fix: Removidas as safetySettings (linhas 54-58) que estavam causando erros de atribuição de tipo entre literais de string e os Enums HarmCategory/HarmBlockThreshold.
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

    // Fix: Utilizada a propriedade .text (getter) diretamente conforme as diretrizes do SDK, evitando chamadas como métodos ou encadeamentos desnecessários.
    const rawText = response.text || "";
    const cleanedJson = sanitizeAiResponse(rawText);
    
    try {
      const parsedData = JSON.parse(cleanedJson) as QuizData;
      if (!parsedData.questions || parsedData.questions.length === 0) {
        throw new Error("A IA retornou um conjunto de dados vazio.");
      }
      return parsedData;
    } catch (parseError: any) {
      console.error("Falha no Parse. Texto recebido:", rawText);
      throw new Error(`Erro na estrutura dos dados (JSON): ${parseError.message}`);
    }

  } catch (e: any) {
    if (e.message === "API_KEY_MISSING") throw e;
    console.error("Erro no processamento da IA:", e);
    throw new Error(e.message || "Erro desconhecido na comunicação com a IA.");
  }
};
