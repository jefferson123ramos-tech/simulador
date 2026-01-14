
import React, { useState } from 'react';
import { AppState, User, QuizData, Question } from './types';
import { supabase } from './supabaseClient';
import { generateQuiz } from './geminiService';

// --- Components ---

const Navbar: React.FC<{ email?: string; onLogout?: () => void }> = ({ email, onLogout }) => (
  <nav className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
    <div className="max-w-5xl mx-auto flex justify-between items-center">
      <h1 className="text-2xl font-bold tracking-tight">Simulado<span className="text-blue-400">AI</span></h1>
      {email && (
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-sm text-slate-300">{email}</span>
          <button 
            onClick={onLogout}
            className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded transition"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  </nav>
);

const Footer: React.FC = () => (
  <footer className="mt-auto py-6 border-t border-slate-200 text-center text-slate-500 text-sm">
    &copy; {new Date().getFullYear()} SimuladoAI - Estudo Inteligente.
  </footer>
);

export default function App() {
  const [state, setState] = useState<AppState>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // --- Handlers ---

  const handleLogin = async (emailInput: string) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) return;

    setError(null);
    setLoading(true);
    
    console.log(`Tentando login para: ${cleanEmail}`);

    try {
      const { data, error: sbError } = await supabase
        .from('users_control')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle(); // Usar maybeSingle evita erro se não encontrar nada

      if (sbError) {
        console.error("Erro Supabase:", sbError);
        setError(`Erro na conexão: ${sbError.message}`);
        return;
      }

      if (!data) {
        console.warn("Usuário não encontrado no banco.");
        setError("Cadastro não encontrado.");
        return;
      }

      console.log("Usuário encontrado:", data);

      if (data.status === 'pendente') {
        setError("Sua conta está em análise. Aguarde aprovação.");
      } else if (data.status === 'aprovado') {
        setUser(data);
        setState('generator');
      } else {
        setError("Status de conta desconhecido.");
      }
    } catch (e: any) {
      console.error("Erro inesperado no login:", e);
      setError("Erro ao conectar com o servidor. Verifique as configurações.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (text: string) => {
    if (!text.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const data = await generateQuiz(text);
      setQuiz(data);
      setUserAnswers([]);
      setCurrentQuestionIndex(0);
      setState('quiz');
    } catch (e: any) {
      console.error("Erro ao gerar simulado:", e);
      setError("Erro ao gerar o simulado. Verifique sua chave da API Gemini.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = index;
    setUserAnswers(newAnswers);

    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setState('result');
    }
  };

  const logout = () => {
    setUser(null);
    setQuiz(null);
    setState('login');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar email={user?.email} onLogout={logout} />
      
      <main className="flex-grow flex items-center justify-center p-4">
        {state === 'login' && (
          <LoginCard onLogin={handleLogin} loading={loading} error={error} />
        )}

        {state === 'generator' && (
          <GeneratorCard onGenerate={handleGenerate} loading={loading} error={error} />
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
          <ResultView 
            quiz={quiz} 
            userAnswers={userAnswers} 
            onRestart={() => setState('generator')} 
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

// --- Specific Screens ---

const LoginCard: React.FC<{ onLogin: (email: string) => void; loading: boolean; error: string | null }> = ({ onLogin, loading, error }) => {
  const [email, setEmail] = useState('');
  
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">SimuladoAI</h2>
        <p className="text-slate-500 text-sm mt-1">Digite seu e-mail para continuar</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onLogin(email); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
          <input 
            type="email" 
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
          {loading && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
          {loading ? 'Processando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

const GeneratorCard: React.FC<{ onGenerate: (text: string) => void; loading: boolean; error: string | null }> = ({ onGenerate, loading, error }) => {
  const [text, setText] = useState('');

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl border border-slate-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">O que vamos estudar hoje?</h2>
        <p className="text-slate-500 text-sm">Cole o conteúdo abaixo para gerar seu simulado.</p>
      </div>

      <textarea 
        className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none bg-slate-50 text-slate-700"
        placeholder="Cole aqui seu resumo, artigo ou tópicos de estudo..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-400 text-xs italic">Dica: Quanto mais detalhado o texto, melhor as questões.</p>
        <button 
          onClick={() => onGenerate(text)}
          disabled={loading || !text.trim()}
          className="w-full md:w-auto px-10 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Gerando Questões...
            </>
          ) : 'Gerar Simulado Agora'}
        </button>
      </div>
    </div>
  );
};

const QuizView: React.FC<{ question: Question; total: number; current: number; onSelect: (index: number) => void }> = ({ question, total, current, onSelect }) => {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100">
      <div className="flex justify-between items-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Questão {current} de {total}</span>
        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300" 
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-800 mb-8 leading-relaxed">
        {question.question}
      </h3>

      <div className="space-y-3">
        {question.options.map((option, idx) => (
          <button 
            key={idx}
            onClick={() => onSelect(idx)}
            className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition group flex items-start gap-4"
          >
            <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="text-slate-700 font-medium group-hover:text-slate-900">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ResultView: React.FC<{ quiz: QuizData; userAnswers: number[]; onRestart: () => void }> = ({ quiz, userAnswers, onRestart }) => {
  const score = userAnswers.reduce((acc, ans, idx) => {
    return acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0);
  }, 0);

  const errors = quiz.questions.filter((q, idx) => userAnswers[idx] !== q.correctAnswerIndex);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl border border-slate-100 my-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-slate-900">Resultado Final</h2>
        <div className="mt-4 flex flex-col items-center">
          <div className="relative">
            <svg className="w-32 h-32">
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
              <circle 
                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                className="text-blue-600 transition-all duration-1000 ease-out"
                strokeDasharray={Math.PI * 2 * 58}
                strokeDashoffset={(Math.PI * 2 * 58) * (1 - score / quiz.questions.length)}
                strokeLinecap="round"
                transform="rotate(-90 64 64)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-slate-900">{score}/{quiz.questions.length}</span>
            </div>
          </div>
          <p className="mt-4 text-slate-600 font-semibold text-lg">
            {score === quiz.questions.length ? 'Incrível! Domínio total.' : score >= 3 ? 'Bom trabalho!' : 'Continue estudando!'}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <h4 className="text-lg font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
          {errors.length > 0 ? (
            <>
              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Revisão de Erros
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Excelente! Você acertou todas.
            </>
          )}
        </h4>

        {errors.map((q) => {
          const originalIdx = quiz.questions.indexOf(q);
          const userAnswerIdx = userAnswers[originalIdx];
          return (
            <div key={q.id} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <p className="font-bold text-slate-900 mb-4">{q.question}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                  <span className="text-xs font-bold text-red-600 uppercase">Sua Escolha</span>
                  <p className="text-sm text-red-800 mt-1">{q.options[userAnswerIdx] || 'Nenhuma'}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <span className="text-xs font-bold text-green-600 uppercase">Correta</span>
                  <p className="text-sm text-green-800 mt-1">{q.options[q.correctAnswerIndex]}</p>
                </div>
              </div>

              <div className="flex gap-4 items-start bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-bold text-blue-900 text-sm">Dica do Mentor</h5>
                  <p className="text-blue-800 text-sm mt-1 leading-relaxed">
                    {q.mentorTip}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={onRestart}
        className="mt-10 w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2"
      >
        Novo Simulado
      </button>
    </div>
  );
};
