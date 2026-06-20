import { useState } from 'react';
import { Mail, Lock, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../api.js';

export default function LoginPage({ onLogin }) {
  const [mode, setMode]         = useState('login'); // 'login' | 'register'
  
  // Login fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName]         = useState('');
  const [regEmail, setRegEmail]       = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm]   = useState('');

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const resetMessages = () => { setError(''); setSuccess(''); };

  // ---- Login ----
  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages(); setLoading(true);
    try {
      const data = await api.login({ email, password });
      if (data.status && data.user) {
        const userData = { ...data.user, token: data.token };
        localStorage.setItem('pulsemail_user', JSON.stringify(userData));
        onLogin(userData);
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError(err.message || 'Cannot reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // ---- Register ----
  const handleRegister = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!regName.trim()) { setError('Full name is required.'); return; }
    if (regPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (regPassword !== regConfirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const data = await api.register({ name: regName.trim(), email: regEmail, password: regPassword });
      if (data.status && data.user) {
        const userData = { ...data.user, token: data.token };
        localStorage.setItem('pulsemail_user', JSON.stringify(userData));
        setSuccess('Account created successfully!');
        setTimeout(() => {
          onLogin(userData);
        }, 1000);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.message || 'Cannot reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-glow-indigo mb-4">
            <Mail className="text-white" size={30} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">PulseMail</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Fast, secure internal messaging</p>
        </div>

        <div className="card p-8 animate-slide-up">
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-7">
            {['login', 'register'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); resetMessages(); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 capitalize
                  ${mode === m
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-card'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert-error mb-5 animate-fade-in">
              <AlertCircle size={15} /><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert-success mb-5 animate-fade-in">
              <CheckCircle size={15} /><span>{success}</span>
            </div>
          )}

          {/* ---- LOGIN FORM ---- */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="form-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="password" required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input pl-10"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
                {loading
                  ? <><Loader2 size={15} className="animate-spin" />Signing in…</>
                  : 'Sign In'}
              </button>

              <p className="text-center text-xs text-slate-400">
                No account?{' '}
                <button type="button" onClick={() => { setMode('register'); resetMessages(); }}
                  className="font-semibold text-primary-500 hover:text-primary-600 underline-offset-2 hover:underline">
                  Create one free
                </button>
              </p>
            </form>
          )}

          {/* ---- REGISTER FORM ---- */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text" required
                    value={regName} onChange={e => setRegName(e.target.value)}
                    placeholder="Your full name"
                    className="form-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email" required
                    value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="form-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="password" required minLength={6}
                    value={regPassword} onChange={e => setRegPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="form-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="password" required minLength={6}
                    value={regConfirm} onChange={e => setRegConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className={`form-input pl-10 ${regConfirm && regConfirm !== regPassword ? 'border-red-400 focus:ring-red-400/40' : ''}`}
                  />
                </div>
                {regConfirm && regConfirm !== regPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
                {loading
                  ? <><Loader2 size={15} className="animate-spin" />Creating account…</>
                  : 'Create Account'}
              </button>

              <p className="text-center text-xs text-slate-400">
                Already have an account?{' '}
                <button type="button" onClick={() => { setMode('login'); resetMessages(); }}
                  className="font-semibold text-primary-500 hover:text-primary-600 underline-offset-2 hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
