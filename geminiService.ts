
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty } from "./types";

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  // A chave deve vir exclusivamente de process.env.API_KEY
  const apiKey = process.env.API_KEY || "";
  
  if (!apiKey) {
    throw new Error("Configuração da API ausente. Verifique sua chave.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um simulado PROFISSIONAL com EXATAMENTE 15 questões de múltipla escolha (4 alternativas cada) sobre: "${text}".

      Regras:
      1. Nível: ${difficulty.toUpperCase()}.
      2. Estilo: Questões desafiadoras tipo concursos ou exames oficiais.
      3. Se o tema for curto, use seu conhecimento para expandir os tópicos mais importantes.
      4. A 'mentorTip' deve ser uma explicação curta e educativa.
      5. Responda ESTRITAMENTE com o JSON, sem textos adicionais antes ou depois.`,
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

    const jsonStr = response.text?.trim() || "";
    return JSON.parse(jsonStr) as QuizData;
  } catch (e: any) {
    console.error("Erro na geração:", e);
    if (e.message?.includes("Safety")) {
      throw new Error("O tema solicitado foi bloqueado pelos filtros de segurança. Tente um assunto acadêmico diferente.");
    }
    throw new Error("Erro ao processar simulado. Tente ser mais específico no tema ou tente novamente em instantes.");
  }
};
