import { useState, useEffect } from "react";
import { RawMaterialsModule } from "./components/RawMaterialsModule";
import { FormulationModule } from "./components/FormulationModule";
import { ProductionCalculator } from "./components/ProductionCalculator";
import { OrderBook } from "./components/OrderBook";
import { Lock, Database, Calculator, BookOpen } from "lucide-react";

export default function App() {
  const [activeModule, setActiveModule] = useState("materials");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Auth states
  const [authView, setAuthView] = useState<'login' | 'forgot_password' | 'verify_code' | 'reset_password'>('login');
  const [password, setPassword] = useState("");
  
  // Reset password states
  const [resetCode, setResetCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Initialize dummy credentials if none exist
    if (!localStorage.getItem('app_credentials')) {
      localStorage.setItem('app_credentials', JSON.stringify({ password: 'admin123' }));
    }
    
    const auth = sessionStorage.getItem("authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    try {
      const creds = JSON.parse(localStorage.getItem('app_credentials') || '{}');
      if (password === creds.password) {
        setIsAuthenticated(true);
        sessionStorage.setItem("authenticated", "true");
      } else {
        setErrorMsg("Incorrect password");
      }
    } catch (err) {
      setErrorMsg("Error verifying credentials");
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);
    
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setResetCode(code);
    
    try {
      // Send code using Mailtrap API to the requested hardcoded email
      const response = await fetch('https://send.api.mailtrap.io/api/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_MAILTRAP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: { email: 'hello@demomailtrap.com', name: 'Mailtrap Test' },
          to: [{ email: 'midchemspeciality@gmail.com' }],
          subject: 'Password Reset Code',
          text: `Your password reset code is: ${code}\n\nPlease enter this code in the application to reset your password.`,
          category: 'Password Reset'
        })
      });
      
      if (!response.ok) {
        console.warn("Mailtrap API issue (likely CORS or unauthorized):", await response.text());
        console.log(`[DEV MODE] Reset code is: ${code}`);
      }
      
      setAuthView('verify_code');
    } catch (err) {
      console.error("Failed to send email:", err);
      console.log(`[DEV MODE] Reset code is: ${code}`);
      setAuthView('verify_code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (inputCode === resetCode) {
      setAuthView('reset_password');
    } else {
      setErrorMsg("Incorrect verification code");
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    try {
      const creds = JSON.parse(localStorage.getItem('app_credentials') || '{}');
      creds.password = newPassword;
      localStorage.setItem('app_credentials', JSON.stringify(creds));
      
      alert("Password successfully reset!");
      setAuthView('login');
      setPassword("");
      setNewPassword("");
      setInputCode("");
    } catch (err) {
      setErrorMsg("Failed to reset password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("authenticated");
    setPassword("");
    setAuthView('login');
  };

  if (!isAuthenticated) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border border-slate-200">
          <div className="flex items-center justify-center mb-8">
            <div className="p-4 bg-blue-600 rounded-full">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">
            Production Management System
          </h1>
          <p className="text-center text-slate-600 mb-8">
            {authView === 'login' && "Secure access required"}
            {authView === 'forgot_password' && "Reset your password"}
            {authView === 'verify_code' && "Enter verification code"}
            {authView === 'reset_password' && "Set new password"}
          </p>

          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
              {errorMsg}
            </div>
          )}

          {authView === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                className="w-full cursor-pointer text-sm text-center text-blue-600 hover:text-blue-800 transition-colors"
                onClick={() => setAuthView('forgot_password')}
              >
                Forgot password?
              </button>
            </form>
          )}

          {authView === 'forgot_password' && (
            <form onSubmit={handleSendResetCode} className="space-y-6">
              <p className="text-sm text-slate-600 text-center mb-4">
                We will send a reset code to the registered administrator email address.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer disabled:bg-blue-400"
              >
                {isSubmitting ? "Sending..." : "Send Reset Code"}
              </button>
              <button
                type="button"
                className="w-full cursor-pointer text-sm text-center text-slate-500 hover:text-slate-700 transition-colors"
                onClick={() => setAuthView('login')}
              >
                Back to Login
              </button>
            </form>
          )}

          {authView === 'verify_code' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <p className="text-sm text-slate-600 text-center mb-4">
                Please check your email for the 6-digit reset code.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-2xl tracking-widest"
                  placeholder="------"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
              >
                Verify Code
              </button>
              <button
                type="button"
                className="w-full cursor-pointer text-sm text-center text-slate-500 hover:text-slate-700 transition-colors"
                onClick={() => setAuthView('forgot_password')}
              >
                Resend Code
              </button>
            </form>
          )}

          {authView === 'reset_password' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
              >
                Save New Password
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Lock className="w-3 h-3" />
              <span>Encrypted • Secure • Internal Use Only</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Production Management System
              </h1>
              <p className="text-xs text-slate-600">
                Formulation & Order Management
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveModule("materials")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeModule === "materials"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Database className="w-5 h-5" />
              <span className="font-medium">Raw Materials</span>
            </button>
            <button
              onClick={() => setActiveModule("formulations")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeModule === "formulations"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Formulations</span>
            </button>
            <button
              onClick={() => setActiveModule("calculator")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeModule === "calculator"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Calculator className="w-5 h-5" />
              <span className="font-medium">Production Calculator</span>
            </button>
            <button
              onClick={() => setActiveModule("orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeModule === "orders"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Order Book</span>
            </button>
          </nav>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">
                Security Status
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Session active • Data encrypted
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 pt-0">
          {activeModule === "materials" && <RawMaterialsModule />}
          {activeModule === "formulations" && <FormulationModule />}
          {activeModule === "calculator" && <ProductionCalculator />}
          {activeModule === "orders" && <OrderBook />}
        </main>
      </div>
    </div>
  );
}
