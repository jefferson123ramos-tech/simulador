
import React, { useState, useEffect } from 'react';
import { AppState, User, QuizData, Question, Difficulty, HistoryItem } from './types';
import { supabase } from './supabaseClient';
import { generateQuiz } from './geminiService';

// --- Custom Components ---

const Logo: React.FC<{ size?: 'sm' | 'lg', className?: string, onClick?: () => void }> = ({ size = 'sm', className = '', onClick }) => {
  const isLarge = size === 'lg';
  return (
    <div className={`flex items-center gap-3 ${className}`} onClick={onClick}>
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
    if (!cleanEmail) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase.from('users_control').select('*').ilike('email', cleanEmail).maybeSingle();
      if (sbError) throw sbError;
      if (!data) { setError("Usuário não cadastrado."); return; }
      if (data.status === 'pendente') { setError("Sua conta ainda não foi aprovada."); return; }
      setUser(data);
      setState('generator');
    } catch (e: any) { setError(e.message || "Erro de servidor."); } finally { setLoading(false); }
  };

  const handleGenerate = async (text: string, difficulty: Difficulty) => {
    if (!text.trim()) { setError("Por favor, informe o tema."); return; }
    setLoading(true);
    setError(null);
    setCurrentSubject(text.length > 35 ? text.substring(0, 32) + "..." : text);
    setCurrentDifficulty(difficulty);
    setLoadingMsg("Gerando simulado de 50 questões...");
    
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
    content += `DETALHAMENTO DE ERROS:\n`;
    
    quiz.questions.forEach((q, i) => {
      if (userAnswers[i] !== q.correctAnswerIndex) {
        content += `\n[Questão ${i+1}] ${q.question}\n`;
        content += `- Sua Resposta: ${q.options[userAnswers[i]] || 'Pulada'}\n`;
        content += `- Gabarito Correto: ${q.options[q.correctAnswerIndex]}\n`;
        content += `- Mentor: ${q.mentorTip}\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-simulafacil-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0c10] text-slate-200">
      <nav className="p-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Logo onClick={() => user && setState('generator')} className="cursor-pointer" />
          {user && (
            <button onClick={() => { setUser(null); setState('login'); }} className="text-xs font-bold text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-widest">Sair</button>
          )}
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center p-6 relative">
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
    <div className="max-w-md mx-auto bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-12 rounded-[3rem] shadow-2xl">
      <Logo size="lg" className="justify-center mb-8" />
      <form onSubmit={e => { e.preventDefault(); onLogin(email); }} className="space-y-6">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-slate-950/50 border border-slate-700 p-4 rounded-2xl outline-none focus:border-indigo-500 transition text-white" placeholder="Seu e-mail..." />
        {error && <p className="text-rose-400 text-xs font-bold bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">{error}</p>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20">{loading ? 'Entrando...' : 'Acessar'}</button>
      </form>
    </div>
  );
};

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-20 space-y-8 animate-in fade-in">
    <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
    <h3 className="text-2xl font-black text-white animate-pulse">{message}</h3>
    <p className="text-slate-500">Isso pode levar alguns minutos devido ao volume de 50 questões.</p>
  </div>
);

const GeneratorCard: React.FC<{ onGenerate: (t: string, d: Difficulty) => void; error: string | null; onViewHistory: () => void; hasHistory: boolean }> = ({ onGenerate, error, onViewHistory, hasHistory }) => {
  const [text, setText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('médio');
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-4xl font-black text-white italic tracking-tighter">Novo Simulado</h2>
          <p className="text-slate-500 text-sm">Geração acadêmica de 50 questões.</p>
        </div>
        {hasHistory && <button onClick={onViewHistory} className="text-xs font-bold text-indigo-400 hover:text-white uppercase tracking-widest bg-indigo-500/10 px-6 py-3 rounded-xl border border-indigo-500/20 transition-all">Ranking Local</button>}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(['fácil', 'médio', 'difícil'] as Difficulty[]).map(d => (
          <button key={d} onClick={() => setDifficulty(d)} className={`py-4 rounded-2xl border font-black capitalize transition-all ${difficulty === d ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-950/40 border-slate-700 text-slate-500 hover:border-slate-500'}`}>{d}</button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Digite o tema para as 50 questões..." className="w-full h-48 bg-slate-950/50 border border-slate-700 p-6 rounded-[2rem] outline-none focus:border-indigo-500 transition text-slate-300 resize-none mb-6 shadow-inner" />
      {error && <p className="mb-6 text-rose-400 text-xs font-bold bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">{error}</p>}
      <button onClick={() => onGenerate(text, difficulty)} className="w-full py-6 bg-white text-slate-950 font-black rounded-[2rem] hover:bg-indigo-50 transition-all uppercase tracking-widest shadow-2xl">Gerar Simulado Completo</button>
    </div>
  );
};

const QuizView: React.FC<{ question: Question; total: number; current: number; onSelect: (idx: number) => void }> = ({ question, total, current, onSelect }) => (
  <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-10">
    <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
      <h3 className="text-xl font-black text-white italic">Questão {current} de {total}</h3>
      <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${(current/total)*100}%` }} />
      </div>
    </div>
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl">
      <p className="text-xl font-bold text-white mb-10 leading-relaxed">{question.question}</p>
      <div className="grid grid-cols-1 gap-4">
        {question.options.map((opt, i) => (
          <button key={i} onClick={() => onSelect(i)} className="group flex items-center gap-5 p-6 bg-slate-950/40 border border-slate-700 rounded-2xl text-left hover:border-indigo-500 hover:bg-indigo-500/5 transition-all">
            <span className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{String.fromCharCode(65 + i)}</span>
            <span className="text-slate-300 group-hover:text-white transition-colors">{opt}</span>
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
    <div className="space-y-10 py-10 animate-in fade-in duration-700">
      <div className={`p-10 rounded-[4rem] border ${status.border} ${status.bg} backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12`}>
        <div className="space-y-6 text-center md:text-left">
          <h2 className="text-6xl font-black text-white italic tracking-tighter">{status.icon} {status.label}</h2>
          <p className="text-slate-300 font-medium text-lg max-w-sm">{status.msg}</p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <button onClick={onDownload} className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 text-[10px] font-black uppercase text-white transition-all shadow-lg">Download Relatório</button>
            <button onClick={onRestart} className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-50 transition-all">Novo Simulado</button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="w-56 h-56 rounded-full flex items-center justify-center relative bg-slate-950/40 border border-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="112" cy="112" r={radius} fill="transparent" stroke="currentColor" strokeWidth="16" className="text-slate-800" />
              <circle cx="112" cy="112" r={radius} fill="transparent" stroke="currentColor" strokeWidth="16" 
                className={`${status.color} transition-all duration-[2000ms] ease-out drop-shadow-[0_0_8px_currentColor]`} 
                strokeDasharray={circ} strokeDashoffset={isNaN(off) ? circ : off} strokeLinecap="round" />
            </svg>
            <div className="text-center z-10 animate-in zoom-in duration-500 delay-300">
              <p className="text-7xl font-black text-white">{score}</p>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">de {quiz.questions.length}</p>
            </div>
          </div>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500 mt-2">
            Aproveitamento: {Math.round((score/quiz.questions.length)*100)}%
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <h4 className="text-2xl font-black text-white italic ml-4 border-l-4 border-indigo-600 pl-4 uppercase tracking-tighter">Resumo de Erros</h4>
        <div className="grid grid-cols-1 gap-4">
          {quiz.questions.map((q, i) => userAnswers[i] !== q.correctAnswerIndex && (
            <div key={i} className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-5">
              <p className="text-lg font-bold text-white mb-4 leading-relaxed">#{i+1} — {q.question}</p>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-400 text-sm">
                  <span className="text-[10px] font-black uppercase block mb-1 opacity-60">Sua Resposta</span>
                  {q.options[userAnswers[i]] || 'Não respondida'}
                </div>
                <div className="flex-1 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-sm font-bold">
                  <span className="text-[10px] font-black uppercase block mb-1 opacity-60 text-emerald-500/60">Gabarito Correto</span>
                  {q.options[q.correctAnswerIndex]}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-indigo-600/10 italic text-indigo-100/80 text-sm border border-indigo-500/20 flex gap-3">
                <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                "{q.mentorTip}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HistoryView: React.FC<{ history: HistoryItem[]; onBack: () => void }> = ({ history, onBack }) => (
  <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-10">
    <div className="flex justify-between items-center px-4">
      <div>
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Histórico de <span className="text-indigo-500">Desempenho</span></h2>
        <p className="text-slate-500 text-sm">Registro dos últimos 100 simulados.</p>
      </div>
      <button onClick={onBack} className="text-[10px] font-black uppercase text-slate-400 bg-white/5 border border-white/5 px-8 py-4 rounded-2xl hover:bg-white/10 transition-all">Voltar</button>
    </div>
    <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-950/80 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
            <tr><th className="px-10 py-8">Simulado</th><th className="px-10 py-8">Nível</th><th className="px-10 py-8 text-right">Nota Final</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {history.map(item => (
              <tr key={item.id} className="hover:bg-indigo-600/5 transition-all group">
                <td className="px-10 py-8">
                  <p className="font-bold text-slate-200 text-lg group-hover:text-white transition-colors">{item.subject}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{item.date}</p>
                </td>
                <td className="px-10 py-8">
                  <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black uppercase text-slate-400 border border-slate-700">{item.difficulty}</span>
                </td>
                <td className="px-10 py-8 text-right font-black text-2xl text-indigo-400">{item.correct} <span className="text-xs text-slate-600">/ {item.total}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {history.length === 0 && <div className="p-20 text-center text-slate-600 font-medium italic">Nenhum registro encontrado.</div>}
    </div>
  </div>
);
