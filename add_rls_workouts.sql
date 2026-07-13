-- ============================================================
-- SQL: Vaciar tablas y aplicar Row Level Security (RLS)
-- ============================================================

-- 1. Vaciar las tablas para empezar de cero sin conflictos
TRUNCATE TABLE series, dias, semanas RESTART IDENTITY CASCADE;

-- ============================================================
-- 2. Añadir user_id a todas las tablas para aislamiento de datos
-- ============================================================
ALTER TABLE semanas ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES auth.users(id);
ALTER TABLE dias ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES auth.users(id);
ALTER TABLE series ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES auth.users(id);

-- Opcional pero recomendado: Actualizar la restricción UNIQUE de días para que sea por usuario
ALTER TABLE dias DROP CONSTRAINT IF EXISTS dias_semana_id_nombre_key;
ALTER TABLE dias ADD CONSTRAINT dias_semana_id_nombre_user_key UNIQUE (semana_id, nombre, user_id);

-- ============================================================
-- 3. Habilitar RLS en todas las tablas
-- ============================================================
ALTER TABLE semanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Políticas para SEMANAS
-- ============================================================
CREATE POLICY "Semanas: Usuarios solo ven sus propios registros" ON semanas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Semanas: Usuarios solo insertan sus propios registros" ON semanas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Semanas: Usuarios solo actualizan sus propios registros" ON semanas
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Semanas: Usuarios solo borran sus propios registros" ON semanas
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. Políticas para DIAS
-- ============================================================
CREATE POLICY "Dias: Usuarios solo ven sus propios registros" ON dias
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Dias: Usuarios solo insertan sus propios registros" ON dias
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dias: Usuarios solo actualizan sus propios registros" ON dias
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dias: Usuarios solo borran sus propios registros" ON dias
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 6. Políticas para SERIES
-- ============================================================
CREATE POLICY "Series: Usuarios solo ven sus propios registros" ON series
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Series: Usuarios solo insertan sus propios registros" ON series
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Series: Usuarios solo actualizan sus propios registros" ON series
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Series: Usuarios solo borran sus propios registros" ON series
    FOR DELETE USING (auth.uid() = user_id);
