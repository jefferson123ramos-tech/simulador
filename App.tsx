
import React, { useState, useEffect } from 'react';
import { AppState, User, QuizData, Difficulty, HistoryItem } from './types';
import { supabase } from './supabaseClient';
import { generateQuiz } from './geminiService';
import { 
  Logo, 
  LoginCard, 
  LoadingView, 
  GeneratorCard, 
  QuizView, 
  ResultView, 
  HistoryView 
} from './QuizComponents';

export default function App() {
  const [state, setState] = useState<AppState>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Processando...');
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('médio');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('simulafacil_v1_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleLogin = async (emailInput: string) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Por favor, digite seu e-mail.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('users_control')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (sbError) throw sbError;
      if (!data) {
        setError("Acesso negado: E-mail não encontrado na base de dados.");
        return;
      }
      if (data.status === 'pendente') {
        setError("Cadastro em análise: Aguarde a liberação do administrador.");
        return;
      }
      setUser(data);
      setState('generator');
    } catch (e: any) {
      console.error("Login process error:", e);
      setError("Falha técnica ao tentar realizar o login.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (text: string, difficulty: Difficulty) => {
    if (!text.trim()) { setError("O tema ou texto base é obrigatório."); return; }
    setLoading(true);
    setError(null);
    setCurrentSubject(text.length > 35 ? text.substring(0, 32) + "..." : text);
    setCurrentDifficulty(difficulty);
    setLoadingMsg("Preparando 50 questões acadêmicas...");
    try {
      const data = await generateQuiz(text, difficulty);
      setQuiz(data);
      setUserAnswers([]);
      setCurrentQuestionIndex(0);
      setState('quiz');
    } catch (e: any) { 
      setError(e.message || "Erro ao gerar simulado com a IA."); 
    } finally { setLoading(false); }
  };

  const handleAnswerSelect = (index: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = index;
    setUserAnswers(newAnswers);
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      const score = newAnswers.reduce((acc, ans, idx) => acc + (ans === quiz!.questions[idx].correctAnswerIndex ? 1 : 0), 0);
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        subject: currentSubject,
        date: new Date().toLocaleString('pt-BR'),
        correct: score,
        total: quiz!.questions.length,
        difficulty: currentDifficulty
      };
      const newHistory = [newItem, ...history].slice(0, 100);
      setHistory(newHistory);
      localStorage.setItem('simulafacil_v1_history', JSON.stringify(newHistory));
      setState('result');
    }
  };

  const downloadReport = () => {
    if (!quiz) return;
    const score = userAnswers.reduce((acc, ans, idx) => acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0), 0);
    let content = `--- SIMULAFACIL ACADÊMICO ---\n\n`;
    content += `Tema: ${currentSubject}\nNível: ${currentDifficulty.toUpperCase()}\nScore: ${score}/${quiz.questions.length}\n\n`;
    quiz.questions.forEach((q, i) => {
      if (userAnswers[i] !== q.correctAnswerIndex) {
        content += `\nQuestão ${i+1}: ${q.question}\nGabarito: ${q.options[q.correctAnswerIndex]}\nMentor: ${q.mentorTip}\n`;
      }
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${currentSubject.replace(/\s/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0c10] text-slate-200">
      <nav className="p-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Logo onClick={() => user && setState('generator')} className="cursor-pointer" />
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase hidden md:block">{user.email}</span>
              <button onClick={() => { setUser(null); setState('login'); }} className="text-xs font-bold text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-widest">Sair</button>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="w-full max-w-5xl z-10">
          {state === 'login' && <LoginCard onLogin={handleLogin} loading={loading} error={error} />}
          {state === 'generator' && (loading ? <LoadingView message={loadingMsg} /> : <GeneratorCard onGenerate={handleGenerate} error={error} onViewHistory={() => setState('history')} hasHistory={history.length > 0} />)}
          {state === 'quiz' && quiz && <QuizView question={quiz.questions[currentQuestionIndex]} total={quiz.questions.length} current={currentQuestionIndex + 1} onSelect={handleAnswerSelect} />}
          {state === 'result' && quiz && <ResultView quiz={quiz} userAnswers={userAnswers} onRestart={() => setState('generator')} onDownload={downloadReport} />}
          {state === 'history' && <HistoryView history={history} onBack={() => setState('generator')} />}
        </div>
      </main>
    </div>
  );
}
