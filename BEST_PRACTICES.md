# TPHub - Best Practices & Code Quality Guidelines

Este documento sirve como recordatorio permanente de las mejores prácticas a seguir y problemas comunes a evitar en el desarrollo del proyecto.

## Tabla de Contenidos

1. [Memory Leaks](#memory-leaks)
2. [Variables de Entorno](#variables-de-entorno)
3. [localStorage y Persistencia](#localstorage-y-persistencia)
4. [Performance y Bundle Size](#performance-y-bundle-size)
5. [TypeScript y Tipos](#typescript-y-tipos)
6. [React Patterns](#react-patterns)
7. [Checklist de Code Review](#checklist-de-code-review)

---

## Memory Leaks

### Timers (setTimeout, setInterval)

**MAL:**
```tsx
function MyComponent() {
  const [visible, setVisible] = useState(false);

  const handleClick = () => {
    setVisible(true);
    setTimeout(() => setVisible(false), 2000); // Memory leak si se desmonta
  };
}
```

**BIEN:**
```tsx
function MyComponent() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = () => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2000);
  };
}
```

### Event Listeners

**MAL:**
```tsx
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Sin cleanup - memory leak
}, []);
```

**BIEN:**
```tsx
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### Subscriptions y Async Operations

```tsx
useEffect(() => {
  let isMounted = true;

  async function fetchData() {
    const data = await api.getData();
    if (isMounted) {
      setData(data);
    }
  }

  fetchData();

  return () => {
    isMounted = false;
  };
}, []);
```

---

## Variables de Entorno

### Nunca Hardcodear Configuraciones

**MAL:**
```tsx
const USE_LOCAL_STORAGE = true; // Hardcodeado
const API_URL = 'https://api.example.com';
```

**BIEN:**
```tsx
const USE_LOCAL_STORAGE = import.meta.env.VITE_USE_LOCAL_STORAGE !== 'false';
const API_URL = import.meta.env.VITE_API_URL;
```

### Archivos de Entorno

| Archivo | Propósito | Commit |
|---------|-----------|--------|
| `.env.example` | Template con variables (sin valores secretos) | Si |
| `.env.local` | Desarrollo local | No |
| `.env.production` | Valores de producción (solo claves públicas) | Si |

### Variables Actuales del Proyecto

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Feature Flags
VITE_DEV_AUTH_BYPASS=false           # true para desarrollo sin auth
VITE_CAMPAIGNS_USE_LOCAL_STORAGE=true # false para usar Supabase

# AWS (solo en Vercel Dashboard para producción)
VITE_AWS_ACCESS_KEY_ID=
VITE_AWS_SECRET_ACCESS_KEY=
```

---

## localStorage y Persistencia

### Siempre Validar Datos Parseados

**MAL:**
```tsx
const data = JSON.parse(localStorage.getItem('key')!);
// Sin validación - puede crashear con datos corruptos
```

**BIEN:**
```tsx
function getStoredData<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;

    const parsed = JSON.parse(stored);

    // Validar estructura
    if (!isValidData(parsed)) {
      console.warn(`[Storage] Invalid data for ${key}, using defaults`);
      return defaultValue;
    }

    return parsed;
  } catch (error) {
    console.warn(`[Storage] Failed to parse ${key}:`, error);
    return defaultValue;
  }
}
```

### Validar Tipos Específicos

```tsx
// Para arrays
if (!Array.isArray(parsed)) return [];

// Para objetos con estructura conocida
if (!parsed || typeof parsed !== 'object') return defaultValue;
if (!parsed.state || typeof parsed.state !== 'object') return defaultValue;

// Para enums
const validChannels = ['glovo', 'ubereats', 'justeat'];
const channels = parsed.filter((ch: unknown) =>
  typeof ch === 'string' && validChannels.includes(ch)
);
```

---

## Performance y Bundle Size

### Lazy Loading de Rutas

Implementar lazy loading para páginas que:
- Usan librerías pesadas (mapas, gráficos, PDFs)
- Tienen muchos componentes
- No se acceden frecuentemente

```tsx
// routes.tsx
const MapsPage = lazy(() => import('@/pages/maps').then(m => ({ default: m.MapsPage })));
const CalendarPage = lazy(() => import('@/pages/calendar').then(m => ({ default: m.CalendarPage })));

// Con Suspense wrapper
<Suspense fallback={<PageLoader />}>
  <MapsPage />
</Suspense>
```

### Dynamic Imports para Librerías Pesadas

```tsx
// Para exportación (jsPDF ~200KB, xlsx ~400KB)
async function exportToPDF() {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  // ...
}

// Pre-cargar en hover para UX más fluida
<button
  onMouseEnter={() => import('jspdf')}
  onClick={exportToPDF}
>
  Exportar PDF
</button>
```

### Pendiente de Implementar

- [ ] Convertir funciones de `utils/export.ts` a async con dynamic imports
- [ ] Analizar bundle con `npx vite-bundle-visualizer`
- [ ] Considerar splitting de recharts por tipo de gráfico

---

## TypeScript y Tipos

### Evitar `any`

**MAL:**
```tsx
function processData(data: any) {
  return data.map((item: any) => item.value);
}
```

**BIEN:**
```tsx
interface DataItem {
  id: string;
  value: number;
}

function processData(data: DataItem[]) {
  return data.map(item => item.value);
}
```

### Type Casting Seguro

**MAL:**
```tsx
const channels = db.channels as ChannelId[]; // Sin validación
```

**BIEN:**
```tsx
function validateChannels(channels: unknown): ChannelId[] {
  if (!Array.isArray(channels)) return [];
  const valid: ChannelId[] = ['glovo', 'ubereats', 'justeat'];
  return channels.filter((ch): ch is ChannelId =>
    typeof ch === 'string' && valid.includes(ch as ChannelId)
  );
}

const channels = validateChannels(db.channels);
```

### Usar `unknown` en vez de `any`

```tsx
// En catch blocks
try {
  // ...
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

---

## React Patterns

### Evitar Re-renders Innecesarios

```tsx
// useMemo para cálculos costosos
const filteredData = useMemo(() =>
  data.filter(item => item.active).sort((a, b) => a.name.localeCompare(b.name)),
  [data]
);

// useCallback para funciones pasadas a children
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []);

// React.memo para componentes que reciben props estables
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  // ...
});
```

### Componentes Grandes

Si un componente tiene más de 300-400 líneas:
1. Extraer subcomponentes
2. Extraer hooks personalizados
3. Separar lógica en utils

### Dependencias de useEffect

```tsx
// Incluir TODAS las dependencias
useEffect(() => {
  fetchData(userId, filters);
}, [userId, filters]); // userId y filters deben estar aquí

// Para funciones, usar useCallback
const fetchData = useCallback(() => {
  // ...
}, [dependency]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

---

## Checklist de Code Review

### Antes de Crear PR

- [ ] No hay `console.log` de debug
- [ ] No hay `any` types innecesarios
- [ ] No hay `@ts-ignore` o `@ts-nocheck`
- [ ] Timers y listeners tienen cleanup
- [ ] localStorage tiene validación
- [ ] Variables sensibles están en `.env`
- [ ] Nuevas dependencias pesadas usan lazy loading
- [ ] TODOs tienen contexto suficiente

### Alertas Comunes

| Pattern | Problema | Solución |
|---------|----------|----------|
| `setTimeout` sin ref | Memory leak | Usar useRef + cleanup |
| `JSON.parse(x!)` | Crash con datos inválidos | Try-catch + validación |
| `as SomeType` | Type unsafe | Type guard function |
| `useEffect([])` sin cleanup | Posible leak | Return cleanup function |
| Import de librería grande | Bundle bloat | Dynamic import |

---

## Recursos

- [React Performance](https://react.dev/learn/render-and-commit)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)

---

*Última actualización: Febrero 2026*
