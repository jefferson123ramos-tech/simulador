
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

  // Verificação de configuração baseada no mapeamento do Vite
  const isConfigured = !!process.env.API_KEY && process.env.API_KEY !== "" && process.env.API_KEY !== "undefined";

  useEffect(() => {
    const saved = localStorage.getItem('simuladoai_v1_history');
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
        setError("Acesso negado: Este e-mail não possui permissão ativa.");
        return;
      }
      if (data.status === 'pendente') {
        setError("Conta Pendente: Aguarde a ativação pelo administrador.");
        return;
      }
      setUser(data);
      setState('generator');
    } catch (e: any) {
      setError("Erro ao validar acesso. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (text: string, difficulty: Difficulty) => {
    if (!text.trim()) { setError("O tema ou conteúdo base é obrigatório."); return; }
    
    setLoading(true);
    setError(null);
    setCurrentSubject(text.length > 35 ? text.substring(0, 32) + "..." : text);
    setCurrentDifficulty(difficulty);
    setLoadingMsg("Gerando 50 questões exclusivas...");
    
    try {
      const data = await generateQuiz(text, difficulty);
      setQuiz(data);
      setUserAnswers([]);
      setCurrentQuestionIndex(0);
      setState('quiz');
    } catch (e: any) { 
      if (e.message === "API_KEY_MISSING") {
        setError("Erro de Configuração: A variável VITE_GEMINI_API_KEY não foi encontrada na Vercel.");
      } else {
        setError("A IA falhou em gerar o simulado. Tente um tema mais curto."); 
      }
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
      localStorage.setItem('simuladoai_v1_history', JSON.stringify(newHistory));
      setState('result');
    }
  };

  const downloadReport = () => {
    if (!quiz) return;
    const score = userAnswers.reduce((acc, ans, idx) => acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0), 0);
    let content = `--- RELATÓRIO SIMULADO AI ---\n\n`;
    content += `Tema: ${currentSubject}\nDificuldade: ${currentDifficulty.toUpperCase()}\nAcertos: ${score}/${quiz.questions.length}\nTaxa: ${Math.round((score/quiz.questions.length)*100)}%\n\n`;
    content += `QUESTÕES INCORRETAS:\n`;
    quiz.questions.forEach((q, i) => {
      if (userAnswers[i] !== q.correctAnswerIndex) {
        content += `\n[${i+1}] ${q.question}\nSua Resposta: ${q.options[userAnswers[i]] || 'N/A'}\nCorreta: ${q.options[q.correctAnswerIndex]}\nExplicação: ${q.mentorTip}\n`;
      }
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultado-simulado-ai-${currentSubject.replace(/\s/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tela de erro de configuração específica para Vercel
  if (!isConfigured && state !== 'login') {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-rose-500/20 p-12 rounded-[3rem] shadow-2xl text-center">
          <Logo size="lg" className="justify-center mb-10" />
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-500/20">
            <svg className="w-10 h-10 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4 italic">Ação Necessária</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Erro de Configuração: A variável <code className="bg-slate-950 px-2 py-1 rounded text-indigo-400 font-mono">VITE_GEMINI_API_KEY</code> não foi encontrada na Vercel. Verifique as configurações de Environment Variables.
          </p>
          <div className="space-y-4">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-indigo-50 transition-all uppercase text-[10px] tracking-widest shadow-xl">1. Obter Chave no AI Studio</a>
            <button onClick={() => window.location.reload()} className="block w-full py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all uppercase text-[10px] tracking-widest">2. Já adicionei, recarregar app</button>
          </div>
        </div>
      </div>
    );
  }

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
