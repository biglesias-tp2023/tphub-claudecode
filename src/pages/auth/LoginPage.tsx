import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';

/**
 * LoginPage - Authentication page for user login
 *
 * SOLID Principles applied:
 * - SRP (Single Responsibility): Only handles login form UI and validation
 * - OCP (Open/Closed): Auth logic delegated to authStore (extensible)
 * - DIP (Dependency Inversion): Depends on useAuthStore abstraction, not implementation
 *
 * Features:
 * - Email validation (restricted to @thinkpaladar.com domain)
 * - Password input with visibility toggle
 * - Remember me functionality
 * - Google SSO integration
 * - Loading states and error handling
 * - Automatic redirect when authenticated
 *
 * Security:
 * - Domain restriction prevents unauthorized access
 * - Password field uses secure input type
 * - Anti-phishing warning displayed to users
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, isLoading, error, clearError, isDevMode, devLogin } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  const validateEmail = (emailToValidate: string): boolean => {
    if (!emailToValidate) {
      setLocalError('El correo electrónico es requerido');
      return false;
    }
    if (!emailToValidate.toLowerCase().endsWith('@thinkpaladar.com')) {
      setLocalError('Solo se permite acceso con email @thinkpaladar.com');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateEmail(email)) return;

    if (!isDevMode && !password) {
      setLocalError('La contraseña es requerida');
      return;
    }

    await login(email, password);
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    if (isDevMode) {
      devLogin('google@thinkpaladar.com');
    } else {
      await loginWithGoogle();
    }
  };

  const displayError = localError || error;

  return (
    <div className="w-full max-w-md pointer-events-auto">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-10">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">
          Iniciar sesión en tu cuenta
        </h1>

        {/* Error message */}
        {displayError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{displayError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-600 mb-2"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLocalError(null);
              }}
              className={cn(
                'w-full px-4 py-3 border rounded-lg transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                'placeholder:text-gray-400',
                displayError ? 'border-red-300' : 'border-gray-200'
              )}
              placeholder="tu@thinkpaladar.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-600"
              >
                Contraseña
              </label>
              <a
                href="#"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                ¿Olvidaste la contraseña?
              </a>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLocalError(null);
                }}
                className={cn(
                  'w-full px-4 py-3 pr-12 border rounded-lg transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                  'placeholder:text-gray-400',
                  displayError ? 'border-red-300' : 'border-gray-200'
                )}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label
              htmlFor="remember"
              className="ml-2 text-sm text-gray-600"
            >
              Recuérdame en este dispositivo
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200',
              'bg-primary-600 hover:bg-primary-700',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200" />
          <span className="px-4 text-sm text-gray-400">O</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Google SSO */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className={cn(
            'w-full py-3 px-4 rounded-lg font-medium transition-all duration-200',
            'border border-gray-200 bg-white text-gray-700',
            'hover:bg-gray-50 hover:border-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-gray-200',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-3'
          )}
        >
          {/* Google Icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Iniciar sesión con Google
        </button>
      </div>

      {/* Security Warning */}
      <p className="mt-6 text-xs text-gray-400 text-center leading-relaxed max-w-sm mx-auto">
        No hagas clic en enlaces si un correo electrónico parece sospechoso.
        En ocasiones, los estafadores envían correos con enlaces de suplantación
        de identidad haciéndose pasar por ThinkPaladar.
      </p>

      {/* Footer */}
      <div className="mt-4 text-center">
        <span className="text-xs text-gray-400">
          © ThinkPaladar SL{' '}
        </span>
        <a
          href="#"
          className="text-xs text-primary-400 hover:text-primary-300 hover:underline"
        >
          Privacidad y condiciones
        </a>
      </div>
    </div>
  );
}
