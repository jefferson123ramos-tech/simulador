
import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, Difficulty } from "./types";

const DEFAULT_GEMINI_KEY = 'AIzaSyCXKvAy9FuH9SYCj3IJbCnZYPuxky3k6b8';

export const generateQuiz = async (text: string, difficulty: Difficulty): Promise<QuizData> => {
  const apiKey = (process?.env?.API_KEY as string) || (process?.env?.VITE_GEMINI_API_KEY as string) || DEFAULT_GEMINI_KEY;
  
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Atue como um Professor Especialista em elaboração de exames. Gere um simulado PROFISSIONAL com EXATAMENTE 50 questões de múltipla escolha (4 alternativas cada) sobre o seguinte tema ou texto: "${text}".

    Regras Críticas:
    1. Nível de Dificuldade: ${difficulty.toUpperCase()}.
    2. Estilo das Questões: Devem simular questões reais de concursos públicos e exames oficiais (como ENEM, OAB, Certificações Técnicas), sendo desafiadoras e bem estruturadas.
    3. Se o usuário forneceu um tema curto, use sua base de conhecimento para cobrir os tópicos mais cobrados em provas sobre esse assunto.
    4. Responda APENAS com o JSON no formato especificado.
    5. A 'mentorTip' deve explicar a lógica da resposta correta de forma educativa e curta.`,
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

  const jsonStr = response.text || "";
  try {
    return JSON.parse(jsonStr) as QuizData;
  } catch (e) {
    console.error("Erro no JSON:", jsonStr);
    throw new Error("Falha ao gerar as 50 questões. Tente ser um pouco mais específico no assunto ou reduzir a complexidade.");
  }
};
