
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty } from "./types";

/**
 * Sanitização robusta para garantir que o retorno seja um JSON válido,
 * removendo marcadores de Markdown e espaços residuais.
 */
const cleanJsonResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.trim();
  // Remove blocos de código markdown como ```json ... ``` ou ``` ... ```
  cleaned = cleaned.replace(/```(?:json)?/g, "").replace(/```/g, "");
  return cleaned.trim();
};

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  // DIAGNÓSTICO: Verifica a presença da chave no momento da execução
  console.log("SimuladoAI: Iniciando processo de geração...");
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    console.error("ERRO DE CONFIGURAÇÃO: A variável process.env.API_KEY não foi encontrada.");
    throw new Error("Chave API não configurada no ambiente. Verifique as configurações do projeto.");
  }

  console.log("SimuladoAI: Chave detectada (Prefixo: " + apiKey.substring(0, 4) + "...)");

  try {
    // Inicialização da IA dentro da função para garantir acesso ao contexto atualizado
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um simulado acadêmico PROFISSIONAL com EXATAMENTE 50 questões de múltipla escolha (4 opções cada) sobre o tema: "${text}".

      REQUISITOS TÉCNICOS:
      - Nível de Dificuldade: ${difficulty.toUpperCase()}.
      - Campo mentorTip: Breve explicação pedagógica da resposta correta (máx 15 palavras).
      - Idioma: Português do Brasil (PT-BR).
      - Formato: Retorne APENAS o JSON puro seguindo o esquema fornecido.`,
      config: {
        responseMimeType: "application/json",
        // Proteção contra bloqueios em temas técnicos (Saúde, Direito, Biologia)
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

    const rawOutput = response.text || "";
    const sanitizedJson = cleanJsonResponse(rawOutput);
    
    try {
      const parsedData = JSON.parse(sanitizedJson) as QuizData;
      
      if (!parsedData.questions || parsedData.questions.length === 0) {
        throw new Error("A IA retornou um objeto vazio ou sem questões.");
      }
      
      return parsedData;
    } catch (parseError) {
      console.error("Falha no Parse do JSON. Conteúdo bruto:", rawOutput);
      throw new Error("A IA gerou um formato de resposta corrompido. Tente novamente ou mude o tema.");
    }

  } catch (e: any) {
    console.error("Erro Crítico Gemini SDK:", e);
    // Retorna o erro técnico real para diagnóstico imediato no front-end
    throw new Error(`Erro técnico: ${e.message || "Falha na conexão com o servidor de IA"}`);
  }
};
