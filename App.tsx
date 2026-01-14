
import React, { useState, useEffect } from 'react';
import { AppState, User, QuizData, Question, Difficulty, HistoryItem } from './types';
import { supabase } from './supabaseClient';
import { generateQuiz } from './geminiService';

// --- Helpers ---
const getGradeStatus = (score: number, total: number) => {
  const percent = (score / total) * 100;
  if (percent >= 70) return { label: 'APROVADO', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: '🏆', msg: 'Desempenho de excelência! Você demonstrou domínio profissional do conteúdo.' };
  if (percent >= 50) return { label: 'RECUPERAÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: '⚡', msg: 'Bom caminho, mas ainda restam lacunas importantes no seu aprendizado.' };
  return { label: 'REPROVADO', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: '📚', msg: 'Atenção redobrada: Seu aproveitamento indica que o conteúdo ainda não foi assimilado.' };
};

const Navbar: React.FC<{ email?: string; onLogout?: () => void; onGoHome?: () => void }> = ({ email, onLogout, onGoHome }) => (
  <nav className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 text-white p-4 sticky top-0 z-50">
    <div className="max-w-6xl mx-auto flex justify-between items-center">
      <div className="flex items-center gap-2 cursor-pointer group" onClick={onGoHome}>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform">S</div>
        <h1 className="text-xl font-black tracking-tighter uppercase italic">Simula<span className="text-indigo-500">facil</span></h1>
      </div>
      {email && (
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-[10px] uppercase font-bold text-slate-500 leading-none">Conta Ativa</p>
            <p className="text-xs font-medium text-slate-300">{email}</p>
          </div>
          <button onClick={onLogout} className="p-2 hover:bg-rose-500/10 rounded-full transition text-slate-400 hover:text-rose-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}
    </div>
  </nav>
);

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

  // Carregar histórico persistente do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('simulafacil_v1_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error("Erro ao carregar histórico local");
    }
  }, []);

  useEffect(() => {
    if (loading && state === 'generator') {
      const msgs = ["Gerando questões exclusivas...", "Aplicando nível " + currentDifficulty + "...", "Consultando banco de exames...", "Finalizando seu simulado..."];
      let i = 0;
      const interval = setInterval(() => { i = (i + 1) % msgs.length; setLoadingMsg(msgs[i]); }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading, state, currentDifficulty]);

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
    } catch (e) { setError("Erro de servidor."); } finally { setLoading(false); }
  };

  const handleGenerate = async (text: string, difficulty: Difficulty) => {
    if (!text.trim()) { setError("Por favor, informe o tema."); return; }
    setLoading(true);
    setError(null);
    const subject = text.length > 35 ? text.substring(0, 32) + "..." : text;
    setCurrentSubject(subject);
    setCurrentDifficulty(difficulty);
    try {
      const data = await generateQuiz(text, difficulty);
      setQuiz(data);
      setUserAnswers([]);
      setCurrentQuestionIndex(0);
      setState('quiz');
    } catch (e) { setError("Erro ao gerar. Tente novamente."); } finally { setLoading(false); }
  };

  const handleAnswerSelect = (index: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = index;
    setUserAnswers(newAnswers);
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      saveToPersistentHistory(newAnswers);
      setState('result');
    }
  };

  const saveToPersistentHistory = (answers: number[]) => {
    if (!quiz) return;
    const score = answers.reduce((acc, ans, idx) => acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0), 0);
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      subject: currentSubject,
      date: new Date().toLocaleString('pt-BR'),
      correct: score,
      total: quiz.questions.length,
      difficulty: currentDifficulty
    };
    const newHistory = [newItem, ...history].slice(0, 100); // Guardamos até 100 registros
    setHistory(newHistory);
    localStorage.setItem('simulafacil_v1_history', JSON.stringify(newHistory));
  };

  const downloadReport = () => {
    if (!quiz) return;
    const score = userAnswers.reduce((acc, ans, idx) => acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0), 0);
    let content = `SIMULAFACIL - RELATÓRIO ACADÊMICO\n`;
    content += `====================================\n`;
    content += `Tema: ${currentSubject}\n`;
    content += `Nível: ${currentDifficulty.toUpperCase()}\n`;
    content += `Pontuação: ${score} de ${quiz.questions.length}\n`;
    content += `Data: ${new Date().toLocaleString()}\n\n`;
    content += `QUESTÕES INCORRETAS:\n`;
    
    quiz.questions.forEach((q, i) => {
      if (userAnswers[i] !== q.correctAnswerIndex) {
        content += `\n[${i + 1}] ${q.question}\n`;
        content += `Sua resposta: ${q.options[userAnswers[i]] || 'Pulada'}\n`;
        content += `Gabarito: ${q.options[q.correctAnswerIndex]}\n`;
        content += `Explicação: ${q.mentorTip}\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultado-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    if (confirm("Deseja realmente apagar todo o seu histórico e rank?")) {
      setHistory([]);
      localStorage.removeItem('simulafacil_v1_history');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0c10] text-slate-200">
      <Navbar 
        email={user?.email} 
        onLogout={() => { setUser(null); setState('login'); }} 
        onGoHome={() => user && setState('generator')}
      />
      
      <main className="flex-grow flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/5 blur-[120px] rounded-full" />

        <div className="w-full max-w-5xl z-10 animate-in fade-in duration-700">
          {state === 'login' && <LoginCard onLogin={handleLogin} loading={loading} error={error} />}
          {state === 'generator' && (
            loading ? <LoadingView message={loadingMsg} /> : <GeneratorCard onGenerate={handleGenerate} error={error} history={history} onViewHistory={() => setState('history')} />
          )}
          {state === 'quiz' && quiz && (
            <QuizView 
              question={quiz.questions[currentQuestionIndex]} 
              total={quiz.questions.length}
              current={currentQuestionIndex + 1}
              onSelect={handleAnswerSelect}
            />
          )}
          {state === 'result' && quiz && (
            <ResultView quiz={quiz} userAnswers={userAnswers} onRestart={() => setState('generator')} onDownload={downloadReport} />
          )}
          {state === 'history' && (
            <HistoryView history={history} onBack={() => setState('generator')} onClear={clearHistory} />
          )}
        </div>
      </main>
    </div>
  );
}

// --- Specific Views ---

const LoginCard: React.FC<{ onLogin: (e: string) => void; loading: boolean; error: string | null }> = ({ onLogin, loading, error }) => {
  const [email, setEmail] = useState('');
  return (
    <div className="max-w-md mx-auto bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-indigo-600/20 rounded-3xl mb-4 text-indigo-400">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-3.613A10.959 10.959 0 012.25 11c0-2.83 1.065-5.413 2.82-7.374m1.246-1.246A10.97 10.97 0 0112 2.25c2.785 0 5.3 1.033 7.233 2.726m1.764 1.764A10.97 10.97 0 0121.75 11c0 2.83-1.065 5.413-2.82 7.374m-1.246 1.246A10.97 10.97 0 0112 19.75c-2.785 0-5.3-1.033-7.233-2.726" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 className="text-3xl font-black text-white">Simulafacil</h2>
        <p className="text-slate-400 mt-2 text-sm">Entre para salvar seu progresso local</p>
      </div>
      <form onSubmit={e => { e.preventDefault(); onLogin(email); }} className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail Cadastrado</label>
          <input 
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full bg-slate-950/50 border border-slate-700 p-4 rounded-2xl outline-none focus:border-indigo-500 transition text-white"
            placeholder="exemplo@gmail.com"
          />
        </div>
        {error && <div className="text-rose-400 text-xs font-bold bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">{error}</div>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95">
          {loading ? 'Validando...' : 'Iniciar Jornada'}
        </button>
      </form>
    </div>
  );
};

const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-20 space-y-8 animate-in zoom-in-95 duration-500">
    <div className="relative w-24 h-24 mx-auto">
      <div className="absolute inset-0 border-4 border-indigo-600/10 rounded-full" />
      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
    </div>
    <div className="space-y-2">
      <h3 className="text-2xl font-black text-white animate-pulse">{message}</h3>
      <p className="text-slate-500">Isso pode levar até 10 segundos para exatidão máxima.</p>
    </div>
  </div>
);

const GeneratorCard: React.FC<{ onGenerate: (t: string, d: Difficulty) => void; error: string | null; history: HistoryItem[]; onViewHistory: () => void }> = ({ onGenerate, error, history, onViewHistory }) => {
  const [text, setText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('médio');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter italic">Novo Simulado</h2>
            <p className="text-slate-400 mt-2 text-lg">Qual o foco do seu estudo hoje?</p>
          </div>
          {history.length > 0 && (
            <button onClick={onViewHistory} className="group flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-600/20">
              <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Ver Meu Rank
            </button>
          )}
        </div>

        <div className="mb-6">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 block">Nível do Desafio</label>
          <div className="grid grid-cols-3 gap-3">
            {(['fácil', 'médio', 'difícil'] as Difficulty[]).map((level) => (
              <button key={level} onClick={() => setDifficulty(level)} className={`py-4 rounded-xl border font-black capitalize transition-all text-xs tracking-widest ${difficulty === level ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950/40 border-slate-700 text-slate-500'}`}>
                {level}
              </button>
            ))}
          </div>
        </div>

        <textarea 
          value={text} onChange={e => setText(e.target.value)}
          placeholder="Ex: 'Ética Profissional' ou cole seu resumo aqui..."
          className="w-full h-52 bg-slate-950/50 border border-slate-700 p-6 rounded-3xl outline-none focus:border-indigo-500 transition text-slate-300 font-medium leading-relaxed resize-none shadow-inner"
        />
        
        {error && <div className="mt-4 text-rose-400 text-xs font-bold bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">{error}</div>}
        <button onClick={() => onGenerate(text, difficulty)} className="mt-8 w-full px-16 py-6 bg-white text-slate-950 font-black rounded-3xl hover:bg-indigo-50 shadow-2xl transition-all uppercase tracking-widest text-sm active:scale-95">
          Criar Simulado de 50 Questões
        </button>
      </div>
    </div>
  );
};

const QuizView: React.FC<{ question: Question; total: number; current: number; onSelect: (idx: number) => void }> = ({ question, total, current, onSelect }) => (
  <div className="max-w-3xl mx-auto space-y-10 animate-in slide-in-from-right-10 duration-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Sessão em Curso</p>
        <h3 className="text-2xl font-black text-white italic">Questão {current.toString().padStart(2, '0')}</h3>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Progresso</p>
        <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${(current/total)*100}%` }} />
        </div>
      </div>
    </div>
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl">
      <p className="text-xl font-bold text-white leading-snug mb-10">{question.question}</p>
      <div className="grid grid-cols-1 gap-4">
        {question.options.map((opt, i) => (
          <button key={i} onClick={() => onSelect(i)} className="group flex items-center gap-5 p-6 bg-slate-950/40 border border-slate-700 rounded-3xl text-left hover:border-indigo-500 hover:bg-indigo-500/5 transition-all">
            <span className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{String.fromCharCode(65 + i)}</span>
            <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const ResultView: React.FC<{ quiz: QuizData; userAnswers: number[]; onRestart: () => void; onDownload: () => void }> = ({ quiz, userAnswers, onRestart, onDownload }) => {
  const score = userAnswers.reduce((acc, ans, idx) => acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0), 0);
  const status = getGradeStatus(score, quiz.questions.length);
  const errors = quiz.questions.filter((q, i) => userAnswers[i] !== q.correctAnswerIndex);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => { 
    const t = setTimeout(() => setAnimatedScore(score), 200); 
    return () => clearTimeout(t); 
  }, [score]);

  const radius = 74;
  const circ = 2 * Math.PI * radius;
  const off = circ - (animatedScore / quiz.questions.length) * circ;

  return (
    <div className="space-y-10 py-10 animate-in fade-in duration-1000">
      <div className={`p-10 rounded-[3.5rem] border ${status.border} ${status.bg} backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12`}>
        <div className="space-y-5 text-center md:text-left">
          <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${status.color}`}>Relatório Acadêmico</span>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter italic">
            {status.icon} {status.label}
          </h2>
          <p className="text-slate-300 max-w-sm font-medium text-lg leading-relaxed">{status.msg}</p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
            <button onClick={onDownload} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-white">
              Download Relatório (.txt)
            </button>
            <button onClick={onRestart} className="px-6 py-3 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all">
              Novo Simulado
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-48 h-48 rounded-full border-[14px] border-slate-800 flex items-center justify-center relative shadow-inner">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="96" cy="96" r={radius} fill="transparent" stroke="currentColor" strokeWidth="14" className={`${status.color} transition-all duration-[2000ms] ease-out`} strokeDasharray={circ} strokeDashoffset={isNaN(off) ? circ : off} strokeLinecap="round" />
            </svg>
            <div className="text-center animate-in zoom-in duration-1000 delay-500">
              <p className="text-6xl font-black text-white">{score}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase mt-1">de {quiz.questions.length}</p>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-6 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800">
            {Math.round((score/quiz.questions.length)*100)}% Aproveitamento
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <h4 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3 ml-2">
          <span className="w-2 h-8 bg-indigo-600 rounded-full" />
          Revisão de Erros ({errors.length})
        </h4>
        <div className="grid grid-cols-1 gap-6">
          {errors.map((q, idx) => {
            const uIdx = quiz.questions.indexOf(q);
            return (
              <div key={idx} className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] hover:border-slate-700 transition-all">
                <p className="text-lg font-bold text-white mb-6 leading-relaxed">#{(uIdx + 1).toString().padStart(2, '0')} — {q.question}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10"><p className="text-[10px] font-black text-rose-400 uppercase mb-1">Sua Resposta</p><p className="text-sm font-medium text-slate-400">{q.options[userAnswers[uIdx]] || 'Não respondida'}</p></div>
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10"><p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Gabarito</p><p className="text-sm font-medium text-emerald-100">{q.options[q.correctAnswerIndex]}</p></div>
                </div>
                <div className="bg-indigo-600/10 border border-indigo-600/20 p-6 rounded-[2rem] flex gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Análise do Mentor</p><p className="text-sm font-medium text-indigo-100 italic leading-relaxed">"{q.mentorTip}"</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const HistoryView: React.FC<{ history: HistoryItem[]; onBack: () => void; onClear: () => void }> = ({ history, onBack, onClear }) => {
  const [sortMode, setSortMode] = useState<'recent' | 'best'>('best');
  
  const sortedHistory = [...history].sort((a, b) => {
    if (sortMode === 'best') return (b.correct / b.total) - (a.correct / a.total);
    return parseInt(b.id) - parseInt(a.id);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10 animate-in slide-in-from-bottom-10 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 px-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">Meu Rank <span className="text-indigo-500">Pessoal</span></h2>
          <p className="text-slate-500 text-sm mt-1">Seus melhores resultados salvos localmente.</p>
        </div>
        <div className="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button onClick={() => setSortMode('best')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sortMode === 'best' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Melhores Notas</button>
          <button onClick={() => setSortMode('recent')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sortMode === 'recent' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Mais Recentes</button>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/60 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-10 py-7">Posição / Tema</th>
                <th className="px-10 py-7 text-center">Nível</th>
                <th className="px-10 py-7 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedHistory.map((item, idx) => {
                const perc = Math.round((item.correct / item.total) * 100);
                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-6">
                        <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-orange-400 text-orange-950' : 'bg-slate-800 text-slate-500'}`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1).toString().padStart(2, '0')}
                        </span>
                        <div>
                          <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{item.subject}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{item.date.split(',')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7 text-center">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.difficulty === 'difícil' ? 'bg-rose-500/10 text-rose-400' : item.difficulty === 'médio' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {item.difficulty}
                      </span>
                    </td>
                    <td className="px-10 py-7 text-right">
                      <div className="inline-block px-4 py-2 bg-slate-950/40 rounded-2xl border border-slate-800">
                        <p className={`text-sm font-black ${perc >= 70 ? 'text-emerald-400' : perc >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {item.correct}/{item.total} ({perc}%)
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {history.length === 0 && <div className="p-32 text-center text-slate-600 font-medium italic">Seu rank está vazio. Conclua um simulado para começar!</div>}
      </div>

      <div className="flex justify-between items-center px-4">
        <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all bg-white/5 px-6 py-3 rounded-2xl">Voltar ao Gerador</button>
        {history.length > 0 && (
          <button onClick={onClear} className="text-[10px] font-black uppercase tracking-widest text-rose-500/50 hover:text-rose-400 transition-all">Limpar Tudo</button>
        )}
      </div>
    </div>
  );
};
