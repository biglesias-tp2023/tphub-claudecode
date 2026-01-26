import { useEffect } from 'react';

/**
 * Hook para bloquear el scroll del body cuando un modal está abierto.
 * Previene que el fondo haga scroll mientras se puede hacer scroll en el modal.
 *
 * @param isLocked - Si true, bloquea el scroll del body
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    // Guardar la posición actual del scroll antes de bloquear
    const scrollY = window.scrollY;

    // Calcular el ancho del scrollbar para compensar y evitar "salto" visual
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Aplicar estilos para bloquear el scroll del body
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Cleanup: restaurar estilos cuando el modal se cierra
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';

      // Restaurar la posición del scroll a donde estaba
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
