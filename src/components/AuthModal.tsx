import React, { useState } from 'react';
import {
  X,
  LogIn,
  Mail,
  Lock,
  User as UserIcon,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  HelpCircle,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Database,
  CloudCheck,
} from 'lucide-react';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  loginAnonymouslyUser,
  getAuthErrorMessage,
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialError?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialError }) => {
  const [activeTab, setActiveTab] = useState<'google' | 'email' | 'help'>('google');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'your-domain.vercel.app';
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleCopyDomain = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleGoogleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const user = await loginWithGoogle();
      if (user) {
        setSuccessMsg(`Welcome, ${user.displayName || user.email || 'Focus Agent'}!`);
        setTimeout(() => onClose(), 600);
      }
    } catch (err: any) {
      console.warn('Auth Modal Google Sign-in error:', err);
      setError(err?.message || getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      if (isRegisterMode) {
        const user = await registerWithEmail(email, password, displayName);
        setSuccessMsg(`Account created! Welcome, ${user.displayName || user.email}!`);
      } else {
        const user = await loginWithEmail(email, password);
        setSuccessMsg(`Logged in successfully! Welcome, ${user.displayName || user.email}!`);
      }

      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setError(err?.message || getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginAnonymouslyUser();
      setSuccessMsg('Logged in as Guest with Cloud Sync!');
      setTimeout(() => onClose(), 700);
    } catch (err: any) {
      setError(err?.message || getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isDomainError = error && (error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('domain'));

  return (
    <div
      id="auth-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none font-pixel-heading overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0e1017] border-2 border-[#ff3b00] w-full max-w-lg shadow-[0_0_35px_rgba(255,59,0,0.35)] overflow-hidden rounded-xs my-auto">
        
        {/* Header Bar */}
        <div className="bg-[#151722] px-4 py-3 border-b-2 border-[#242634] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogIn size={15} className="text-[#ff3b00]" />
            <span className="text-[9.5px] text-white font-bold tracking-wider">
              AUTHENTICATION & CLOUD SYNC
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#242634] bg-[#0b0d13] text-[8px] font-pixel-label">
          <button
            type="button"
            onClick={() => { setActiveTab('google'); setError(null); }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r border-[#242634] ${
              activeTab === 'google'
                ? 'bg-[#181a26] text-[#ff3b00] border-b-2 border-b-[#ff3b00] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles size={11} />
            <span>GOOGLE SIGN-IN</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setError(null); }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r border-[#242634] ${
              activeTab === 'email'
                ? 'bg-[#181a26] text-[#ff3b00] border-b-2 border-b-[#ff3b00] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail size={11} />
            <span>EMAIL & PASS</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('help'); setError(null); }}
            className={`py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'help'
                ? 'bg-[#181a26] text-[#ff3b00] border-b-2 border-b-[#ff3b00] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="GitHub Key Protection & Vercel Fix Guide"
          >
            <HelpCircle size={11} />
            <span className="hidden sm:inline">PROTECT KEYS / VERCEL</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">

          {/* Success Banner */}
          {successMsg && (
            <div className="bg-[#0e2417] border border-[#39d353] text-[#39d353] px-3.5 py-2.5 text-[8.5px] font-pixel-label flex items-center gap-2">
              <Check size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-red-950/80 border border-red-700/80 text-red-200 p-3 text-[8px] font-pixel-label space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>

              {/* If domain unauthorized: offer copy button and instructions */}
              {isDomainError && (
                <div className="bg-[#120a0a] border border-red-800/60 p-2.5 rounded-xs mt-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[7.5px] text-zinc-300">YOUR DOMAIN TO AUTHORIZE:</span>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="bg-red-900/60 hover:bg-red-800 text-white px-2 py-1 text-[7px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedDomain ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                      <span>{copiedDomain ? 'COPIED!' : 'COPY DOMAIN'}</span>
                    </button>
                  </div>
                  <div className="bg-black/50 p-1.5 font-mono text-[8px] text-red-300 break-all select-all">
                    {currentHost}
                  </div>
                  <p className="text-[7px] text-zinc-400 leading-normal">
                    📌 <strong>Quick Fix in 30 Seconds:</strong> Go to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains &gt; Click "Add domain" and paste <code className="text-zinc-200">{currentHost}</code>.
                  </p>
                  <p className="text-[7px] text-amber-300">
                    💡 Or switch to the <strong>EMAIL & PASS</strong> tab above to sign in immediately without any domain setup!
                  </p>
                </div>
              )}

              {/* If in iframe: show open in new tab */}
              {isInIframe && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 text-[7.5px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={10} />
                    <span>OPEN IN STANDALONE TAB (BYPASSES IFRAME BLOCK)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: GOOGLE SIGN-IN */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <p className="text-[8px] font-pixel-label text-zinc-300 leading-relaxed">
                Connect your Google Account to automatically synchronize your pomodoro sessions, custom tasks, daily consistency streak, and habits to the cloud.
              </p>

              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={loading}
                className="w-full bg-[#1b1e2c] hover:bg-[#ff3b00] hover:text-black text-white border-2 border-[#ff3b00] py-3 px-4 flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-md active:translate-y-0.5 disabled:opacity-50"
              >
                {/* Google "G" icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-[9px] font-bold tracking-wider">
                  {loading ? 'AUTHENTICATING WITH GOOGLE...' : 'CONTINUE WITH GOOGLE'}
                </span>
              </button>

              {/* Status Note */}
              <div className="bg-[#12141f] border border-[#232738] p-3 text-[7.5px] font-pixel-label text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Database size={11} className="text-[#39d353]" />
                  <span className="font-bold">MULTI-DEVICE REAL-TIME CLOUD REPLICATION</span>
                </div>
                <p className="leading-normal">
                  Your streak data and custom routines stay synced across your PC browser, phone, and Android PWA app.
                </p>
              </div>

              {/* Instant Guest / Anonymous Option */}
              <div className="pt-2 border-t border-[#1e2130] flex items-center justify-between text-[7.5px] font-pixel-label">
                <span className="text-zinc-500">Need quick cloud sync without Google?</span>
                <button
                  type="button"
                  onClick={handleAnonymousSubmit}
                  disabled={loading}
                  className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  Quick Guest Cloud Sync ↗
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL & PASSWORD (WORKS EVERYWHERE WITHOUT DOMAIN RESTRICTIONS) */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-3 font-pixel-label">
              <div className="bg-[#131622] border border-[#272b3f] p-2.5 text-[7.5px] text-zinc-300 flex items-center justify-between">
                <span>{isRegisterMode ? 'CREATE NEW ACCOUNT' : 'SIGN IN WITH EXISTING ACCOUNT'}</span>
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(!isRegisterMode); setError(null); }}
                  className="text-[#ff3b00] hover:underline cursor-pointer font-bold"
                >
                  {isRegisterMode ? 'ALREADY HAVE ACCOUNT?' : 'NEED AN ACCOUNT?'}
                </button>
              </div>

              {isRegisterMode && (
                <div className="space-y-1">
                  <label className="text-[7.5px] text-zinc-400 uppercase flex items-center gap-1">
                    <UserIcon size={10} /> Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="E.g. Agent 007"
                    className="w-full bg-[#161824] border border-[#2e3247] px-3 py-2 text-white text-[9px] focus:border-[#ff3b00] outline-hidden font-mono"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[7.5px] text-zinc-400 uppercase flex items-center gap-1">
                  <Mail size={10} /> Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@praxis.io"
                  className="w-full bg-[#161824] border border-[#2e3247] px-3 py-2 text-white text-[9px] focus:border-[#ff3b00] outline-hidden font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[7.5px] text-zinc-400 uppercase flex items-center gap-1">
                  <Lock size={10} /> Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#161824] border border-[#2e3247] px-3 py-2 text-white text-[9px] focus:border-[#ff3b00] outline-hidden font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff3b00] hover:bg-[#ff5722] text-black font-bold py-2.5 text-[8.5px] tracking-wider uppercase cursor-pointer transition-colors disabled:opacity-50 mt-2"
              >
                {loading
                  ? 'PROCESSING...'
                  : isRegisterMode
                  ? 'CREATE CLOUD ACCOUNT'
                  : 'SIGN IN TO PRAXIS'}
              </button>

              <div className="text-[7px] text-zinc-500 pt-1 text-center">
                ✔ Email authentication works on Vercel and all custom domains without needing OAuth domain approval.
              </div>
            </form>
          )}

          {/* TAB 3: KEY PROTECTION & VERCEL GUIDE */}
          {activeTab === 'help' && (
            <div className="space-y-3.5 text-[7.5px] font-pixel-label text-zinc-300">
              
              {/* GitHub Security Notification Fix */}
              <div className="bg-[#12141f] border border-[#232738] p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[8px]">
                  <ShieldAlert size={12} />
                  <span>HOW TO STOP GITHUB KEY PROTECTION NOTIFICATIONS</span>
                </div>
                <p className="leading-relaxed text-zinc-400">
                  GitHub Secret Scanning automatically flags Google API keys when pushed to a public repository. Here is how professional software engineers handle it:
                </p>
                <div className="bg-black/60 p-2.5 border border-zinc-800 space-y-2 font-mono text-[7px] text-emerald-400">
                  <div className="text-zinc-400"># 1. Untrack the local config file from git history:</div>
                  <div className="select-all bg-zinc-950 p-1">git rm --cached firebase-applet-config.json</div>
                  <div className="text-zinc-400"># 2. Commit and push the untracked change:</div>
                  <div className="select-all bg-zinc-950 p-1">git commit -m "Protect firebase keys via environment variables"</div>
                  <div className="select-all bg-zinc-950 p-1">git push origin main</div>
                </div>
              </div>

              {/* Vercel Environment Variables Setup */}
              <div className="bg-[#12141f] border border-[#232738] p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[#ff3b00] font-bold text-[8px]">
                  <CloudCheck size={12} />
                  <span>HOW TO FIX FIREBASE & VERCEL DEPLOYMENT</span>
                </div>
                <p className="leading-relaxed text-zinc-400">
                  On Vercel, professional apps configure keys in <strong>Project Settings &gt; Environment Variables</strong>:
                </p>
                <div className="bg-black/60 p-2 border border-zinc-800 font-mono text-[7px] space-y-1 text-zinc-300">
                  <div>VITE_FIREBASE_API_KEY = &lt;your-api-key&gt;</div>
                  <div>VITE_FIREBASE_AUTH_DOMAIN = praxis-6c979.firebaseapp.com</div>
                  <div>VITE_FIREBASE_PROJECT_ID = praxis-6c979</div>
                </div>
              </div>

              {/* Google Cloud Console HTTP Referrer Restriction */}
              <div className="bg-[#12141f] border border-[#232738] p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[8px]">
                  <ArrowRight size={12} />
                  <span>GOOGLE CLOUD KEY RESTRICTIONS (BEST PRACTICE)</span>
                </div>
                <p className="leading-relaxed text-zinc-400">
                  Firebase Web API keys are client-facing identifiers. To lock down the key completely:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-zinc-400">
                  <li>Open <strong>Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</strong></li>
                  <li>Click on your Firebase API key</li>
                  <li>Under <strong>Application restrictions</strong>, select <strong>Websites</strong></li>
                  <li>Add your domains: <code className="text-zinc-200">*.vercel.app/*</code> and <code className="text-zinc-200">localhost:*</code></li>
                  <li>Under <strong>API restrictions</strong>, restrict to: <em>Identity Toolkit API</em> &amp; <em>Cloud Firestore API</em></li>
                </ol>
              </div>

            </div>
          )}

          {/* Guest Mode Action Bar */}
          <div className="pt-3 border-t border-[#1e2130] flex flex-wrap items-center justify-between gap-2 text-[7.5px] font-pixel-label">
            <span className="text-zinc-500">Don't want to sign in right now?</span>
            <button
              type="button"
              onClick={onClose}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 cursor-pointer transition-colors"
            >
              CONTINUE IN LOCAL GUEST MODE
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
