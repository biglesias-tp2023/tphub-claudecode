import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/* ─── TPHub Design System Colors ─── */
const P300 = '#6bb8e0';
const P400 = '#3a9fd4';
const P500 = '#0b7bb8';
const P600 = '#095789';
const P700 = '#074567';
const P800 = '#053448';
const P900 = '#03222e';
const A500 = '#ff8533';

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithGoogle, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 400,
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(24px) saturate(1.15)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.15)',
        borderRadius: 20,
        border: '1px solid rgba(9, 87, 137, 0.06)',
        boxShadow: '0 12px 48px rgba(5, 52, 72, 0.07), 0 2px 6px rgba(0,0,0,0.03)',
        padding: '40px 36px 32px',
        animation: 'slideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Brand header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <svg width="38" height="38" viewBox="0 0 866 850" fill="none">
          <path
            d="m304.81,209.81v-104.9h-120.87v104.9H63.58v135.66h120.36v194.79c0,120.88,84.35,205.23,205.23,205.23h187.73c120.88,0,205.23-84.35,205.23-205.23V209.81h-477.32Zm356.45,316.54c0,54.78-42.61,81.74-84.36,81.74h-187.73c-41.74,0-84.36-26.95-84.36-81.74v-180.88h118.04v109.38c0,33.24,26.94,60.18,60.18,60.18h0c33.24,0,60.18-26.94,60.18-60.18v-109.38h118.04v180.88Z"
            fill={P600}
          />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: P800, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            thinkpaladar
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: A500, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Hub
          </span>
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: P900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
        Bienvenido
      </h2>
      <p style={{ fontSize: 14, color: P500, margin: '0 0 28px', fontWeight: 400 }}>
        Accede a tu panel de analytics
      </p>

      {/* Error message */}
      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            fontSize: 13,
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      {/* Primary CTA — Google Login */}
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        onMouseEnter={() => !isLoading && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: 15,
          fontWeight: 600,
          fontFamily: 'inherit',
          color: '#fff',
          background: hovering
            ? `linear-gradient(180deg, ${P700} 0%, ${P800} 100%)`
            : `linear-gradient(180deg, ${P600} 0%, ${P700} 100%)`,
          border: 'none',
          borderRadius: 10,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          boxShadow: hovering
            ? '0 4px 16px rgba(9,87,137,0.35), 0 1px 3px rgba(0,0,0,0.1)'
            : '0 2px 10px rgba(9,87,137,0.25), 0 1px 2px rgba(0,0,0,0.06)',
          transition: 'all 0.2s ease',
          transform: hovering ? 'translateY(-1px)' : 'translateY(0)',
          letterSpacing: '-0.01em',
          opacity: isLoading ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {isLoading ? (
          <span>Conectando...</span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#fff"
                fillOpacity="0.9"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#fff"
                fillOpacity="0.7"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#fff"
                fillOpacity="0.5"
                d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.003 24.003 0 000 21.56l7.98-6.19z"
              />
              <path
                fill="#fff"
                fillOpacity="0.8"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Continuar con Google
          </>
        )}
      </button>

      {/* Info text */}
      <p style={{ fontSize: 12, color: P400, textAlign: 'center', marginTop: 20, fontWeight: 400 }}>
        Solo usuarios autorizados pueden acceder
      </p>

      {/* Security warning */}
      <p
        style={{
          fontSize: 11,
          color: P300,
          textAlign: 'center',
          marginTop: 16,
          lineHeight: 1.5,
          maxWidth: 320,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        No hagas clic en enlaces si un correo electrónico parece sospechoso.
        En ocasiones, los estafadores envían correos con enlaces de suplantación
        de identidad haciéndose pasar por ThinkPaladar.
      </p>
    </div>
  );
}
