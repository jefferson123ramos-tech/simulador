import { GoogleGenerativeAI } from "@google/generative-ai";

// Tenta pegar a chave com ou sem o prefixo VITE_
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;

export const generateQuestions = async (topic: string) => {
  if (!API_KEY) {
    throw new Error("API Key não encontrada. Verifique as configurações da Netlify.");
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    // Aqui está o modelo correto que não dá erro de cota
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Crie um simulado de concurso público nível difícil sobre: "${topic}".
      Gere EXATAMENTE 10 questões.
      
      Retorne APENAS um JSON válido. Não use Markdown. Não use explicações antes ou depois.
      O formato deve ser estritamente este array de objetos:
      [
        {
          "id": 1,
          "question": "O enunciado da questão aqui",
          "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D", "Alternativa E"],
          "correctAnswerIndex": 0,
          "explanation": "Explicação detalhada."
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Limpeza de segurança para garantir que é JSON puro
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(text);

  } catch (error) {
    console.error("Erro ao gerar questões:", error);
    throw new Error("Falha ao gerar o simulado. Tente novamente.");
  }
};
