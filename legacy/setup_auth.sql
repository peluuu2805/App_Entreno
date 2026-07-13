-- ============================================================
-- SETUP AUTH: Tabla user_settings + RLS para modelo BYOK
-- Ejecutar en Supabase SQL Editor DESPUÉS de habilitar Auth
-- ============================================================

-- ============================================
-- TABLA: user_settings (claves API por usuario)
-- ============================================
-- Cada usuario almacena sus propias API Keys de forma aislada.
-- El user_id es FK directa a auth.users — Supabase Auth gestiona esos usuarios.
CREATE TABLE IF NOT EXISTS user_settings (
    user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    gemini_api_key    TEXT,
    fatsecret_api_key TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Activar RLS: sin políticas, nadie puede leer ni escribir.
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Política SELECT: un usuario solo puede leer SU fila
CREATE POLICY "Users can view own settings"
    ON user_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política INSERT: un usuario solo puede crear SU fila
CREATE POLICY "Users can insert own settings"
    ON user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: un usuario solo puede modificar SU fila
CREATE POLICY "Users can update own settings"
    ON user_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCIÓN TRIGGER: actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
