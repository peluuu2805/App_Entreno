-- ============================================================
-- SQL: Actualización de Tabla Ejercicios (Modelo Híbrido)
-- ============================================================

-- 1. CREACIÓN DE LA TABLA (o actualización si no existe)
-- Nota: Si la tabla ya existe y tiene datos, es preferible hacer ALTER TABLE, 
-- pero como no estaba versionada, la definimos completamente.
CREATE TABLE IF NOT EXISTS ejercicios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL,
    nombre TEXT NOT NULL UNIQUE,
    grupo_muscular_principal TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;

-- Política de Lectura (SELECT): Híbrida
-- Un usuario puede ver ejercicios Globales (user_id IS NULL) o los creados por él.
CREATE POLICY "Ejercicios: Lectura híbrida (Globales + Propios)" ON ejercicios
    FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

-- Política de Inserción (INSERT): Solo propios
CREATE POLICY "Ejercicios: Solo insertar propios" ON ejercicios
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política de Actualización (UPDATE): Solo propios
CREATE POLICY "Ejercicios: Solo actualizar propios" ON ejercicios
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Política de Borrado (DELETE): Solo propios
CREATE POLICY "Ejercicios: Solo borrar propios" ON ejercicios
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 3. POBLACIÓN INICIAL (SEEDING) - Ejercicios Globales
-- ============================================================
INSERT INTO ejercicios (nombre, grupo_muscular_principal, user_id) VALUES
    ('PRESS DE BANCA', 'PECHO', NULL),
    ('PRESS INCLINADO MANCUERNAS', 'PECHO', NULL),
    ('CRUCES DE POLEAS', 'PECHO', NULL),
    ('SENTADILLAS', 'CUÁDRICEPS', NULL),
    ('PRENSA', 'CUÁDRICEPS', NULL),
    ('EXTENSIONES DE CUÁDRICEPS', 'CUÁDRICEPS', NULL),
    ('PESO MUERTO RUMANO', 'ISQUIOSURALES', NULL),
    ('CURL FEMORAL TUMBADO', 'ISQUIOSURALES', NULL),
    ('DOMINADAS', 'ESPALDA', NULL),
    ('REMO CON BARRA', 'ESPALDA', NULL),
    ('JALÓN AL PECHO', 'ESPALDA', NULL),
    ('PRESS MILITAR', 'HOMBROS', NULL),
    ('ELEVACIONES LATERALES', 'HOMBROS', NULL),
    ('CURL DE BÍCEPS', 'BÍCEPS', NULL),
    ('EXTENSIÓN DE TRÍCEPS EN POLEA', 'TRÍCEPS', NULL),
    ('ELEVACIÓN DE TALONES', 'GEMELOS', NULL)
ON CONFLICT (nombre) DO NOTHING;
