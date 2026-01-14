
import React, { useState, useEffect } from 'react';
import { AppState, User, QuizData, Question, Difficulty, HistoryItem } from './types';
import { supabase } from './supabaseClient';
import { generateQuiz } from './geminiService';

// --- Custom Components ---

const Logo: React.FC<{ size?: 'sm' | 'lg', className?: string, onClick?: () => void }> = ({ size = 'sm', className = '', onClick }) => {
  const isLarge = size === 'lg';
  return (
    <div className={`flex items-center gap-3 ${className} select-none`} onClick={onClick}>
      <div className={`relative flex-shrink-0 ${isLarge ? 'w-16 h-16' : 'w-9 h-9'} group`}>
        <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full group-hover:bg-indigo-400/50 transition-all duration-500"></div>
        <div className={`relative h-full w-full bg-gradient-to-br from-indigo-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg border border-white/20 overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
          <svg viewBox="0 0 24 24" className={`${isLarge ? 'w-10 h-10' : 'w-6 h-6'} text-white fill-current drop-shadow-md`}>
            <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" />
            <circle cx="12" cy="11" r="2" className="animate-pulse text-cyan-300" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col">
        <h1 className={`${isLarge ? 'text-4xl' : 'text-xl'} font-black tracking-tighter uppercase leading-none italic`}>
          <span className="text-white">Simula</span>
          <span className="text-indigo-500">facil</span>
        </h1>
      </div>
    </div>
  );
};

const getGradeStatus = (score: number, total: number) => {
  const percent = (score / total) * 100;
  if (percent >= 70) return { label: 'APROVADO', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: '🏆', msg: 'Desempenho de excelência! Domínio profissional do conteúdo.' };
  if (percent >= 50) return { label: 'RECUPERAÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: '⚡', msg: 'Bom progresso, mas revise as questões incorretas.' };
  return { label: 'REPROVADO', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: '📚', msg: 'Atenção necessária: O conteúdo exige mais dedicação.' };
};

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
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setError("Por favor, informe seu e-mail.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Usando ilike para garantir busca insensível a maiúsculas/minúsculas
      const { data, error: sbError } = await supabase
        .from('users_control')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (sbError) throw sbError;

      if (!data) {
        setError("Usuário não encontrado. Verifique se o e-mail está correto.");
        return;
      }

      if (data.status === 'pendente') {
        setError("Sua conta está aguardando aprovação administrativa.");
        return;
      }

      setUser(data);
      setState('generator');
    } catch (e: any) {
      console.error("Login Error:", e);
      setError("Erro ao conectar ao banco de dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (text: string, difficulty: Difficulty) => {
    if (!text.trim()) { setError("Por favor, informe o tema."); return; }
    setLoading(true);
    setError(null);
    setCurrentSubject(text.length > 35 ? text.substring(0, 32) + "..." : text);
    setCurrentDifficulty(difficulty);
    setLoadingMsg("A IA está gerando 50 questões acadêmicas...");
    
    try {
      const data = await generateQuiz(text, difficulty);
      setQuiz(data);
      setUserAnswers([]);
      setCurrentQuestionIndex(0);
      setState('quiz');
    } catch (e: any) { 
      setError(e.message || "Erro ao gerar simulado."); 
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
    let content = `--- RELATÓRIO SIMULAFACIL ---\n\n`;
    content += `Tema: ${currentSubject}\n`;
    content += `Nível: ${currentDifficulty.toUpperCase()}\n`;
    content += `Resultado: ${score}/${quiz.questions.length} (${Math.round((score/quiz.questions.length)*100)}%)\n`;
    content += `Data: ${new Date().toLocaleString()}\n\n`;
    content += `RESUMO DE ERROS:\n`;
    
    quiz.questions.forEach((q, i) => {
      if (userAnswers[i] !== q.correctAnswerIndex) {
        content += `\nQuestão ${i+1}: ${q.question}\n`;
        content += `Sua Resposta: ${q.options[userAnswers[i]] || 'Em branco'}\n`;
        content += `Gabarito: ${q.options[q.correctAnswerIndex]}\n`;
        content += `Explicação: ${q.mentorTip}\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulafacil-report-${Date.now()}.txt`;
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

const LoginCard: React.FC<{ onLogin: (e: string) => void; loading: boolean; error: string | null }> = ({ onLogin, loading, error }) => {
  const [email, setEmail] = useState('');
  return (
    <div className="max-w-md mx-auto bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-12 rounded-[3rem] shadow-2xl animate-in fade-in zoom-in duration-300">
      <Logo size="lg" className="justify-center mb-10" />
      <form onSubmit={e => { e.preventDefault(); onLogin(email); }} className="space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 ml-4 mb-2 block tracking-widest italic">Acesso Restrito</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            className="w-full bg-slate-950/50 border border-slate-700 p-5 rounded-2xl outline-none focus:border-indigo-500 transition text-white placeholder:text-slate-600 shadow-inner" 
            placeholder="Seu e-mail cadastrado" 
          />
        </div>
        {error && <div className="text-rose-400 text-[11px] font-bold bg-rose-400/10 p-4 rounded-xl border border-rose-400/20 animate-pulse">{error}</div>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
          {loading ? 'Validando...' : 'Iniciar Sessão'}
        </button>
      </form>
    </div>
  );
};

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-20 space-y-8 animate-in fade-in">
    <div className="relative w-24 h-24 mx-auto">
      <div className="absolute inset-0 border-4 border-indigo-600/20 rounded-full" />
      <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
    <div className="space-y-2">
      <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">{message}</h3>
      <p className="text-slate-500 text-sm font-medium">Processando estrutura avançada de 50 questões acadêmicas...</p>
    </div>
  </div>
);

const GeneratorCard: React.FC<{ onGenerate: (t: string, d: Difficulty) => void; error: string | null; onViewHistory: () => void; hasHistory: boolean }> = ({ onGenerate, error, onViewHistory, hasHistory }) => {
  const [text, setText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('médio');
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Gerar Simulado</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Defina o tema para receber 50 questões exclusivas.</p>
        </div>
        {hasHistory && <button onClick={onViewHistory} className="text-[10px] font-black text-indigo-400 hover:text-white uppercase tracking-widest bg-indigo-500/10 px-6 py-4 rounded-xl border border-indigo-500/20 transition-all hover:shadow-lg">Meus Resultados</button>}
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(['fácil', 'médio', 'difícil'] as Difficulty[]).map(d => (
          <button key={d} onClick={() => setDifficulty(d)} className={`py-4 rounded-2xl border font-black capitalize transition-all text-xs tracking-widest ${difficulty === d ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/30 scale-105' : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-600'}`}>{d}</button>
        ))}
      </div>

      <div className="relative mb-8">
        <textarea 
          value={text} 
          onChange={e => setText(e.target.value)} 
          placeholder="Cole aqui um texto base ou digite o tema específico do simulado..." 
          className="w-full h-56 bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem] outline-none focus:border-indigo-500 transition text-slate-300 resize-none shadow-inner text-lg placeholder:text-slate-700" 
        />
        <div className="absolute bottom-6 right-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">
          Modo Acadêmico Ativo
        </div>
      </div>

      {error && <div className="mb-8 text-rose-400 text-xs font-bold bg-rose-400/10 p-5 rounded-2xl border border-rose-400/20 animate-pulse">{error}</div>}
      
      <button onClick={() => onGenerate(text, difficulty)} className="w-full py-7 bg-white text-slate-950 font-black rounded-[2.5rem] hover:bg-indigo-50 transition-all uppercase tracking-[0.2em] shadow-2xl active:scale-95 group overflow-hidden relative">
        <span className="relative z-10">Gerar 50 Questões</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
      </button>
    </div>
  );
};

const QuizView: React.FC<{ question: Question; total: number; current: number; onSelect: (idx: number) => void }> = ({ question, total, current, onSelect }) => (
  <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-10">
    <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
      <div>
        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Questão {current}</h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">de {total} itens</p>
      </div>
      <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
        <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-500" style={{ width: `${(current/total)*100}%` }} />
      </div>
    </div>
    
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl">
      <p className="text-2xl font-bold text-white mb-12 leading-relaxed tracking-tight">{question.question}</p>
      <div className="grid grid-cols-1 gap-5">
        {question.options.map((opt, i) => (
          <button key={i} onClick={() => onSelect(i)} className="group flex items-center gap-6 p-6 bg-slate-950/40 border border-slate-800 rounded-2xl text-left hover:border-indigo-500 hover:bg-indigo-500/5 transition-all active:scale-[0.98]">
            <span className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-black text-sm text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md">{String.fromCharCode(65 + i)}</span>
            <span className="text-slate-300 group-hover:text-white transition-colors text-lg font-medium">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const ResultView: React.FC<{ quiz: QuizData; userAnswers: number[]; onRestart: () => void; onDownload: () => void }> = ({ quiz, userAnswers, onRestart, onDownload }) => {
  const score = userAnswers.reduce((acc, ans, idx) => acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0), 0);
  const status = getGradeStatus(score, quiz.questions.length);
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => { 
    const t = setTimeout(() => setAnimatedScore(score), 500); 
    return () => clearTimeout(t); 
  }, [score]);

  const radius = 80;
  const circ = 2 * Math.PI * radius;
  const off = circ - (animatedScore / quiz.questions.length) * circ;

  return (
    <div className="space-y-12 py-10 animate-in fade-in duration-1000">
      <div className={`p-12 rounded-[4rem] border ${status.border} ${status.bg} backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-16 relative overflow-hidden`}>
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="space-y-8 text-center md:text-left z-10">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 block">Avaliação Final</span>
            <h2 className="text-7xl font-black text-white italic tracking-tighter uppercase">{status.icon} {status.label}</h2>
          </div>
          <p className="text-slate-300 font-medium text-xl max-w-md leading-relaxed">{status.msg}</p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <button onClick={onDownload} className="px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 text-[11px] font-black uppercase text-white transition-all shadow-xl backdrop-blur-lg active:scale-95">Download PDF/Relatório</button>
            <button onClick={onRestart} className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-indigo-50 transition-all active:scale-95">Reiniciar</button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 z-10">
          <div className="w-64 h-64 rounded-full flex items-center justify-center relative bg-slate-950/60 border border-slate-800 shadow-2xl overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="128" cy="128" r={radius} fill="transparent" stroke="rgba(30, 41, 59, 0.5)" strokeWidth="18" />
              <circle cx="128" cy="128" r={radius} fill="transparent" stroke="currentColor" strokeWidth="18" 
                className={`${status.color} transition-all duration-[2500ms] ease-out drop-shadow-[0_0_15px_currentColor]`} 
                strokeDasharray={circ} strokeDashoffset={isNaN(off) ? circ : off} strokeLinecap="round" />
            </svg>
            <div className="text-center z-10 animate-in zoom-in duration-700 delay-500">
              <p className="text-8xl font-black text-white tracking-tighter">{score}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Acertos</p>
            </div>
          </div>
          <div className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 bg-slate-900/80 px-6 py-2 rounded-full border border-slate-800">
            Rating: {Math.round((score/quiz.questions.length)*100)}%
          </div>
        </div>
      </div>
      
      <div className="space-y-8">
        <h4 className="text-3xl font-black text-white italic ml-6 border-l-8 border-indigo-600 pl-6 uppercase tracking-tighter">Detalhamento Técnico</h4>
        <div className="grid grid-cols-1 gap-6">
          {quiz.questions.map((q, i) => userAnswers[i] !== q.correctAnswerIndex && (
            <div key={i} className="bg-slate-900/40 border border-slate-800 p-10 rounded-[3rem] animate-in fade-in slide-in-from-bottom-8 transition-all hover:border-slate-700">
              <div className="flex items-start gap-4 mb-8">
                <span className="w-10 h-10 shrink-0 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center font-black text-xs">#{i+1}</span>
                <p className="text-xl font-bold text-white leading-tight mt-1">{q.question}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 relative overflow-hidden">
                  <span className="text-[9px] font-black uppercase text-rose-500/50 mb-3 block tracking-widest italic">Input Incorreto</span>
                  <p className="text-rose-400 font-medium">{q.options[userAnswers[i]] || 'Sem resposta'}</p>
                </div>
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 relative overflow-hidden">
                   <span className="text-[9px] font-black uppercase text-emerald-500/50 mb-3 block tracking-widest italic">Gabarito Oficial</span>
                  <p className="text-emerald-400 font-bold">{q.options[q.correctAnswerIndex]}</p>
                </div>
              </div>
              <div className="p-8 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/20 flex gap-5 items-center italic">
                <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75c-1.03 0-1.9-.4-2.593-1.003l-.548-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-indigo-200/90 text-sm leading-relaxed font-medium">"{q.mentorTip}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HistoryView: React.FC<{ history: HistoryItem[]; onBack: () => void }> = ({ history, onBack }) => (
  <div className="max-w-5xl mx-auto space-y-12 animate-in slide-in-from-bottom-10">
    <div className="flex justify-between items-end px-6">
      <div>
        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">Histórico Acadêmico</h2>
        <p className="text-slate-500 text-sm font-medium mt-2">Relatórios consolidados de simulados gerados por IA.</p>
      </div>
      <button onClick={onBack} className="text-[10px] font-black uppercase text-slate-400 bg-white/5 border border-white/10 px-10 py-5 rounded-2xl hover:bg-white/10 transition-all tracking-widest">Voltar ao Início</button>
    </div>
    
    <div className="bg-slate-900/40 border border-slate-800 rounded-[3.5rem] overflow-hidden shadow-2xl backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-950/80 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
            <tr>
              <th className="px-12 py-10 tracking-[0.2em]">Conteúdo/Tema</th>
              <th className="px-12 py-10 tracking-[0.2em]">Nível</th>
              <th className="px-12 py-10 text-right tracking-[0.2em]">Score Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {history.map(item => (
              <tr key={item.id} className="hover:bg-indigo-600/5 transition-all group cursor-default">
                <td className="px-12 py-10">
                  <p className="font-bold text-slate-100 text-xl group-hover:text-white transition-colors tracking-tight">{item.subject}</p>
                  <p className="text-[10px] text-slate-600 font-black uppercase mt-2 tracking-widest">{item.date}</p>
                </td>
                <td className="px-12 py-10">
                  <span className="px-5 py-2 bg-slate-800/50 rounded-xl text-[10px] font-black uppercase text-slate-400 border border-slate-700 group-hover:border-slate-500 transition-colors">{item.difficulty}</span>
                </td>
                <td className="px-12 py-10 text-right">
                   <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-indigo-400 group-hover:text-indigo-300 transition-colors leading-none">{item.correct}</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest mt-1">de {item.total}</span>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {history.length === 0 && (
        <div className="p-32 text-center text-slate-700 font-black uppercase tracking-[0.3em] italic opacity-50">
          Nenhum dado registrado no sistema.
        </div>
      )}
    </div>
  </div>
);
