---
name: supabase-db-manager
description: Manual estricto sobre la arquitectura del proyecto (React, Tailwind, Supabase) y las reglas de esquema relacional y Row Level Security (RLS) que el agente debe respetar al interactuar con el código.
---

# Supabase DB Manager & Architecture Skill

Este manual contiene el contexto fundamental y estricto del proyecto. Cuando vayas a interactuar con el código, leer base de datos, o modificar componentes, **DEBES respetar obligatoriamente** estas reglas.

## 1. Stack Tecnológico del Proyecto

- **Frontend Framework**: React (inicializado con Vite).
- **Estilos**: Tailwind CSS v4 (modo oscuro por defecto usando utilidades).
- **Backend / Base de Datos**: Supabase (PostgreSQL + Auth + PostgREST).
- **Enrutamiento**: React Router DOM (con protección de rutas para usuarios logueados).

## 2. Arquitectura de Base de Datos y Modelo Relacional

El sistema de gestión de entrenamientos se compone de una estricta jerarquía relacional de 3 niveles y una tabla de ajustes. Todas están fuertemente tipadas y validadas con Foreign Keys.

### A. Jerarquía de Entrenamiento (Tablas)

1. **`semanas`** (Padre raíz)
   - `id` (BIGINT, PK)
   - `user_id` (UUID, FK a `auth.users`) -> **OBLIGATORIO**
   - `nombre` (TEXT, Ej: "SEMANA 26")

2. **`dias`** (Hijo de semanas)
   - `id` (BIGINT, PK)
   - `semana_id` (BIGINT, FK a `semanas` con `ON DELETE CASCADE`)
   - `user_id` (UUID, FK a `auth.users`) -> **OBLIGATORIO**
   - `nombre` (TEXT, Ej: "Espalda")
   - `UNIQUE(semana_id, nombre, user_id)` -> Previene días duplicados por semana/usuario.

3. **`series`** (Hijo de días)
   - `id` (BIGINT, PK)
   - `dia_id` (BIGINT, FK a `dias` con `ON DELETE CASCADE`)
   - `user_id` (UUID, FK a `auth.users`) -> **OBLIGATORIO**
   - `ejercicio` (TEXT)
   - `num_serie` (INT)
   - `peso` (NUMERIC)
   - `repeticiones` (INT)
   - `rir` (INT, Opcional)
   - `notas` (TEXT, Opcional)

### B. Modelo BYOK (Bring Your Own Key)

1. **`user_settings`**
   - `user_id` (UUID, PK y FK a `auth.users`)
   - `gemini_api_key` (TEXT)
   - `fatsecret_api_key` (TEXT)

## 3. Reglas Críticas de Aislamiento de Datos (RLS)

> **REGLA DE ORO:** Absolutamente TODAS las inserciones, actualizaciones y consultas de las tablas de entrenamiento deben respetar la propiedad del dato mediante el `user_id`.

El esquema de la base de datos de Supabase tiene activo el **Row Level Security (RLS)** en todas sus tablas (`semanas`, `dias`, `series`, `user_settings`).

### Lo que significa en el código React:
1. Siempre que hagas un `.insert()` en Supabase a `semanas`, `dias` o `series`, **DEBES incluir explícitamente el `user_id`** del usuario autenticado (extraído de `AuthContext`). Si omites el `user_id`, el INSERT fallará debido a las políticas RLS.
2. No necesitas añadir `.eq('user_id', user.id)` explícitamente en los `.select()`, `.update()` o `.delete()`, porque el RLS de Supabase filtra de manera automática la sesión autenticada (`auth.uid() = user_id`).
3. El frontend no debe mantener estados en caché que pertenezcan a un usuario si la sesión cambia. Al hacer logout, el estado global se debe limpiar.

## 4. Obtención de Datos Eficiente
Para obtener la vista jerárquica de entrenamientos en el Dashboard, utiliza el motor de "embedded selects" de PostgREST en una sola petición:

```javascript
const { data, error } = await supabase
  .from('dias')
  .select('*, series(*)')
  .eq('semana_id', semanaId);
```
Nunca realices bucles o N+1 queries para extraer la jerarquía; delega el trabajo al motor relacional de Supabase.
