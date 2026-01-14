
import React, { useState, useEffect } from 'react';
import { User, QuizData, Question, Difficulty, HistoryItem } from './types';

// --- Sub-componente Logo ---
export const Logo: React.FC<{ size?: 'sm' | 'lg', className?: string, onClick?: () => void }> = ({ size = 'sm', className = '', onClick }) => {
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
          <span className="text-white">Simulado</span>
          <span className="text-indigo-500">AI</span>
        </h1>
      </div>
    </div>
  );
};

// --- View de Login ---
export const LoginCard: React.FC<{ onLogin: (e: string) => void; loading: boolean; error: string | null }> = ({ onLogin, loading, error }) => {
  const [email, setEmail] = useState('');
  return (
    <div className="max-w-md mx-auto bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-12 rounded-[3rem] shadow-2xl animate-in fade-in zoom-in duration-300">
      <Logo size="lg" className="justify-center mb-10" />
      <form onSubmit={e => { e.preventDefault(); onLogin(email); }} className="space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 ml-4 mb-2 block tracking-widest italic">Acesso Acadêmico</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            className="w-full bg-slate-950/50 border border-slate-700 p-5 rounded-2xl outline-none focus:border-indigo-500 transition text-white placeholder:text-slate-600 shadow-inner" 
            placeholder="E-mail do estudante" 
          />
        </div>
        {error && <div className="text-rose-400 text-[11px] font-bold bg-rose-400/10 p-4 rounded-xl border border-rose-400/20">{error}</div>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
          {loading ? 'Acessando Portal...' : 'Entrar Agora'}
        </button>
      </form>
    </div>
  );
};

// --- View de Carregamento ---
export const LoadingView: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-20 space-y-8 animate-in fade-in">
    <div className="relative w-24 h-24 mx-auto">
      <div className="absolute inset-0 border-4 border-indigo-600/20 rounded-full" />
      <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
    <div className="space-y-2">
      <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">{message}</h3>
      <p className="text-slate-500 text-sm font-medium italic">A IA está processando 50 itens exclusivos para você...</p>
    </div>
  </div>
);

// --- View do Gerador ---
export const GeneratorCard: React.FC<{ onGenerate: (t: string, d: Difficulty) => void; error: string | null; onViewHistory: () => void; hasHistory: boolean }> = ({ onGenerate, error, onViewHistory, hasHistory }) => {
  const [text, setText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('médio');
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Novo Simulado</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Geraremos um teste completo com 50 questões.</p>
        </div>
        {hasHistory && <button onClick={onViewHistory} className="text-[10px] font-black text-indigo-400 hover:text-white uppercase tracking-widest bg-indigo-500/10 px-6 py-4 rounded-xl border border-indigo-500/20 transition-all hover:shadow-lg">Meu Histórico</button>}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(['fácil', 'médio', 'difícil'] as Difficulty[]).map(d => (
          <button key={d} onClick={() => setDifficulty(d)} className={`py-4 rounded-2xl border font-black capitalize transition-all text-xs tracking-widest ${difficulty === d ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/30' : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-600'}`}>{d}</button>
        ))}
      </div>
      <div className="relative mb-8">
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Descreva o tema ou cole seu material de estudo aqui..." className="w-full h-56 bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem] outline-none focus:border-indigo-500 transition text-slate-300 resize-none shadow-inner text-lg placeholder:text-slate-700" />
        <div className="absolute bottom-6 right-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Motor Gemini 3.0</div>
      </div>
      {error && <div className="mb-8 text-rose-400 text-xs font-bold bg-rose-400/10 p-5 rounded-2xl border border-rose-400/20">{error}</div>}
      <button onClick={() => onGenerate(text, difficulty)} className="w-full py-7 bg-white text-slate-950 font-black rounded-[2.5rem] hover:bg-indigo-50 transition-all uppercase tracking-[0.2em] shadow-2xl active:scale-95 group overflow-hidden relative">
        <span className="relative z-10">Gerar Simulado de 50 Itens</span>
      </button>
    </div>
  );
};

// --- View de Questão (Quiz) ---
export const QuizView: React.FC<{ question: Question; total: number; current: number; onSelect: (idx: number) => void }> = ({ question, total, current, onSelect }) => (
  <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-10">
    <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md shadow-lg">
      <div>
        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Questão {current} / {total}</h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Desempenho: {Math.round((current/total)*100)}% concluído</p>
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

// --- View de Resultado Final ---
export const ResultView: React.FC<{ quiz: QuizData; userAnswers: number[]; onRestart: () => void; onDownload: () => void }> = ({ quiz, userAnswers, onRestart, onDownload }) => {
  const score = userAnswers.reduce((acc, ans, idx) => acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0), 0);
  const getGradeStatus = (s: number, t: number) => {
    const p = (s / t) * 100;
    if (p >= 70) return { label: 'APROVADO', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: '🏆', msg: 'Excepcional! Você demonstra um domínio avançado do conteúdo.' };
    if (p >= 50) return { label: 'RECUPERAÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: '⚡', msg: 'Bom trabalho, mas ainda há pontos importantes para revisão.' };
    return { label: 'REPROVADO', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: '📚', msg: 'Atenção: Recomendamos reforçar seus estudos neste tema.' };
  };
  const status = getGradeStatus(score, quiz.questions.length);
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimatedScore(score), 500); return () => clearTimeout(t); }, [score]);

  const radius = 80;
  const circ = 2 * Math.PI * radius;
  const off = circ - (animatedScore / quiz.questions.length) * circ;

  return (
    <div className="space-y-12 py-10 animate-in fade-in duration-1000">
      <div className={`p-12 rounded-[4rem] border ${status.border} ${status.bg} backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-16 relative overflow-hidden`}>
        <div className="space-y-8 text-center md:text-left z-10">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 block">Performance SimuladoAI</span>
            <h2 className="text-7xl font-black text-white italic tracking-tighter uppercase">{status.icon} {status.label}</h2>
          </div>
          <p className="text-slate-300 font-medium text-xl max-w-md leading-relaxed">{status.msg}</p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <button onClick={onDownload} className="px-8 py-5 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 text-[11px] font-black uppercase text-white transition-all shadow-xl active:scale-95">Baixar Relatório</button>
            <button onClick={onRestart} className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-indigo-50 transition-all active:scale-95">Reiniciar</button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6 z-10">
          <div className="w-64 h-64 rounded-full flex items-center justify-center relative bg-slate-950/60 border border-slate-800 shadow-2xl">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="128" cy="128" r={radius} fill="transparent" stroke="rgba(30, 41, 59, 0.5)" strokeWidth="18" />
              <circle cx="128" cy="128" r={radius} fill="transparent" stroke="currentColor" strokeWidth="18" 
                className={`${status.color} transition-all duration-[2500ms] ease-out drop-shadow-[0_0_15px_currentColor]`} 
                strokeDasharray={circ} strokeDashoffset={isNaN(off) ? circ : off} strokeLinecap="round" />
            </svg>
            <div className="text-center z-10">
              <p className="text-8xl font-black text-white tracking-tighter">{score}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Acertos</p>
            </div>
          </div>
          <div className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 bg-slate-900/80 px-6 py-2 rounded-full border border-slate-800">Taxa: {Math.round((score/quiz.questions.length)*100)}%</div>
        </div>
      </div>
      <div className="space-y-8">
        <h4 className="text-3xl font-black text-white italic ml-6 border-l-8 border-indigo-600 pl-6 uppercase tracking-tighter">Análise de Erros</h4>
        <div className="grid grid-cols-1 gap-6">
          {quiz.questions.map((q, i) => userAnswers[i] !== q.correctAnswerIndex && (
            <div key={i} className="bg-slate-900/40 border border-slate-800 p-10 rounded-[3rem] animate-in fade-in slide-in-from-bottom-8">
              <div className="flex items-start gap-4 mb-8">
                <span className="w-10 h-10 shrink-0 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center font-black text-xs">#{i+1}</span>
                <p className="text-xl font-bold text-white leading-tight mt-1">{q.question}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10">
                  <span className="text-[9px] font-black uppercase text-rose-500/50 mb-3 block">Resposta Fornecida</span>
                  <p className="text-rose-400 font-medium">{q.options[userAnswers[i]] || 'Não respondida'}</p>
                </div>
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                   <span className="text-[9px] font-black uppercase text-emerald-500/50 mb-3 block">Gabarito Oficial</span>
                  <p className="text-emerald-400 font-bold">{q.options[q.correctAnswerIndex]}</p>
                </div>
              </div>
              <div className="p-8 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/20 italic text-indigo-200/90 text-sm leading-relaxed">Explicação: "{q.mentorTip}"</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- View de Histórico ---
export const HistoryView: React.FC<{ history: HistoryItem[]; onBack: () => void }> = ({ history, onBack }) => (
  <div className="max-w-5xl mx-auto space-y-12 animate-in slide-in-from-bottom-10">
    <div className="flex justify-between items-end px-6">
      <div>
        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">Evolução</h2>
        <p className="text-slate-500 text-sm font-medium">Histórico de desempenho em simulados gerados por IA.</p>
      </div>
      <button onClick={onBack} className="text-[10px] font-black uppercase text-slate-400 bg-white/5 border border-white/10 px-10 py-5 rounded-2xl hover:bg-white/10 transition-all">Voltar ao Gerador</button>
    </div>
    <div className="bg-slate-900/40 border border-slate-800 rounded-[3.5rem] overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-950/80 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
            <tr><th className="px-12 py-10">Conteúdo Estudado</th><th className="px-12 py-10">Nível</th><th className="px-12 py-10 text-right">Resultado</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {history.map(item => (
              <tr key={item.id} className="hover:bg-indigo-600/5 transition-all">
                <td className="px-12 py-10">
                  <p className="font-bold text-slate-100 text-xl tracking-tight">{item.subject}</p>
                  <p className="text-[10px] text-slate-600 font-black uppercase mt-2">{item.date}</p>
                </td>
                <td className="px-12 py-10">
                  <span className="px-5 py-2 bg-slate-800/50 rounded-xl text-[10px] font-black uppercase text-slate-400 border border-slate-700">{item.difficulty}</span>
                </td>
                <td className="px-12 py-10 text-right">
                    <span className="text-3xl font-black text-indigo-400">{item.correct}</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase ml-2">/ {item.total}</span>
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={3} className="px-12 py-20 text-center text-slate-600 font-black uppercase tracking-widest italic">Nenhum simulado realizado ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
