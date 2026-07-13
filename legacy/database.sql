-- ============================================================
-- DATABASE: Esquema Relacional para StudentFit OS
-- Ejecutar en Supabase SQL Editor (todo de arriba a abajo)
-- Jerarquía: SEMANAS → DIAS → SERIES
-- ============================================================

-- ============================================
-- TABLA 1: SEMANAS (Padre raíz)
-- ============================================
CREATE TABLE IF NOT EXISTS semanas (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA 2: DIAS (Hijo de semanas)
-- ============================================
CREATE TABLE IF NOT EXISTS dias (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    semana_id   BIGINT NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
    nombre      TEXT NOT NULL,
    orden       INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(semana_id, nombre)
);

-- ============================================
-- TABLA 3: SERIES (Hijo de dias)
-- ============================================
CREATE TABLE IF NOT EXISTS series (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dia_id        BIGINT NOT NULL REFERENCES dias(id) ON DELETE CASCADE,
    ejercicio     TEXT NOT NULL,
    num_serie     INT NOT NULL DEFAULT 1,
    peso          NUMERIC(6,2) NOT NULL,
    repeticiones  INT NOT NULL,
    rir           INT,
    notas         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dias_semana ON dias(semana_id);
CREATE INDEX IF NOT EXISTS idx_series_dia ON series(dia_id);
CREATE INDEX IF NOT EXISTS idx_series_ejercicio ON series(ejercicio);


-- ============================================================
-- MIGRACIÓN OPCIONAL: Si ya tienes datos en 'entrenamientos'
-- Descomenta y ejecuta este bloque DESPUÉS de crear las tablas
-- ============================================================

-- CREATE TABLE IF NOT EXISTS entrenamientos_backup AS SELECT * FROM entrenamientos;
--
-- INSERT INTO semanas (nombre)
-- SELECT DISTINCT semana FROM entrenamientos WHERE semana IS NOT NULL
-- ON CONFLICT (nombre) DO NOTHING;
--
-- INSERT INTO dias (semana_id, nombre)
-- SELECT DISTINCT s.id, e.rutina
-- FROM entrenamientos e
-- JOIN semanas s ON s.nombre = e.semana
-- WHERE e.rutina IS NOT NULL
-- ON CONFLICT (semana_id, nombre) DO NOTHING;
--
-- INSERT INTO series (dia_id, ejercicio, num_serie, peso, repeticiones, rir)
-- SELECT d.id, e.ejercicio, e.serie, e.peso, e.repeticiones, e.rir
-- FROM entrenamientos e
-- JOIN semanas s ON s.nombre = e.semana
-- JOIN dias d ON d.semana_id = s.id AND d.nombre = e.rutina;
