import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';

/**
 * LoginPage - Authentication page for user login
 *
 * Features:
 * - Google SSO integration (only method)
 * - Loading states and error handling
 * - Automatic redirect when authenticated
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithGoogle, isAuthenticated, isLoading, error, clearError } = useAuthStore();

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

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };

  return (
    <div className="w-full max-w-md pointer-events-auto">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-10">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Iniciar sesión
        </h1>
        <p className="text-gray-500 mb-8">
          Accede con tu cuenta de Google
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

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
              Conectando...
            </span>
          ) : (
            <>
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
              Continuar con Google
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Solo usuarios autorizados pueden acceder
        </p>
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
