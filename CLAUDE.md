# IRONFORGE - CONTRATO DE COMPORTAMIENTO INMUTABLE

## 1. Identidad del Sistema
- **Nombre del Sistema**: IronForge
- **Propósito**: Tracking de entrenamientos de fuerza de alto rendimiento.

## 2. Estética y UI/UX
Debes respetar rigurosamente las siguientes normas de diseño en cada componente generado:
- **Modo Oscuro Estricto**: Usa exclusivamente fondos oscuros (`bg-zinc-950`, `bg-zinc-900` o `bg-black`).
- **Brutalismo Técnico**: Diseño plano, simetría absoluta, interfaces que parezcan instrumentación militar o técnica de alto nivel.
- **Acentos de Color**: Utiliza únicamente `emerald-500` o `red-600` para elementos clave, alertas o botones principales. El resto debe ser monótono (escalas de grises/zinc).
- **Prohibición de Emojis**: CERO EMOJIS permitidos en el código, UI o comentarios de la interfaz. Absolutamente ninguno.
- **Tipografía**: Exclusivamente fuentes sans-serif limpias (Inter, Roboto) o monoespaciadas para métricas. Uso intensivo de grosores drásticos (`font-black` vs `font-light`).
- **Bordes y Formas**: Mantén un aspecto afilado. Prohibido redondear en exceso. Usa máximo `rounded-sm` o `rounded-md`.

## 3. Stack Tecnológico
- **Frontend**: React (Vite)
- **Estilos**: Tailwind CSS v4
- **Backend & Base de Datos**: Supabase (PostgreSQL, PostgREST, Auth)

## 4. Regla Crítica de Backend (RLS)
> **REGLA INMUTABLE**: La base de datos tiene Row Level Security (RLS) estricto basado en usuarios.
**TODA INSERCIÓN (`.insert()`)** en la base de datos (tablas `semanas`, `dias`, `series`) REQUIERE obligatoriamente inyectar el `user_id` del usuario autenticado. 
El `user_id` debe extraerse desde el contexto global (`useAuth` / `AuthContext`). Si omites este campo, Supabase rechazará la inserción silenciosamente o devolverá error.
