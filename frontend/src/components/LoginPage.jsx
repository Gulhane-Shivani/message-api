import { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { api, DEMO } from '../api.js';

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const doLogin = async (em, pw) => {
    setLoading(true); setError('');
    try {
      const data = await api.login({ email: em, password: pw });
      if (data.status && data.user) {
        localStorage.setItem('pulsemail_user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.message || 'Invalid credentials.');
      }
    } catch {
      setError('Cannot reach the backend server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); doLogin(email, password); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-glow-indigo mb-4">
            <Mail className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">PulseMail</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Your fast internal messaging system</p>
        </div>

        <div className="card p-8 animate-slide-up">
          {error && (
            <div className="alert-error mb-5">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Dev Login */}
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Quick sign-in</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {DEMO.map((u, i) => (
              <button
                key={u.email}
                onClick={() => doLogin(u.email, u.password)}
                disabled={loading}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 group disabled:opacity-50"
              >
                <div className={`w-10 h-10 rounded-full ${u.color} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                  {u.name[0]}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">{u.name}</p>
                  <p className="text-[10px] text-slate-400 truncate w-full">{u.email.split('@')[0]}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400">or sign in manually</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="form-input pl-10" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-10" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
