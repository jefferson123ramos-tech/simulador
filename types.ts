
export interface User {
  id: string;
  email: string;
  status: 'pendente' | 'aprovado';
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  mentorTip: string;
}

export interface QuizData {
  questions: Question[];
}

export type AppState = 'login' | 'generator' | 'quiz' | 'result';
