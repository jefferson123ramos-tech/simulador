
export type Difficulty = 'fácil' | 'médio' | 'difícil';

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

export interface HistoryItem {
  id: string;
  subject: string;
  date: string;
  correct: number;
  total: number;
  difficulty: Difficulty;
}

export type AppState = 'login' | 'generator' | 'quiz' | 'result' | 'history';
