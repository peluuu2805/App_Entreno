-- ============================================================
-- SCHEMA: Esquema Relacional para App de Entrenamiento de Fuerza
-- Ejecutar en Supabase SQL Editor (en orden, de arriba a abajo)
-- ============================================================

-- ============================================
-- TABLA 1: SEMANAS (Padre raíz)
-- ============================================
-- Representa un mesociclo semanal ("Semana 1", "SEMANA 26", etc.)
CREATE TABLE IF NOT EXISTS semanas (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA 2: DIAS (Hijo de semanas)
-- ============================================
-- Cada día de entrenamiento dentro de una semana
-- Ej: "ESPALDA", "PIERNA QUADS", "PECHO", "BRAZO", "PIERNA POSTERIOR"
CREATE TABLE IF NOT EXISTS dias (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    semana_id   BIGINT NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
    nombre      TEXT NOT NULL,
    orden       INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(semana_id, nombre)
);

-- ============================================
-- TABLA 3: SERIES (Hijo de dias) — Granularidad máxima
-- ============================================
-- Cada serie individual de un ejercicio con peso, reps, RIR y notas
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
-- ÍNDICES para consultas frecuentes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dias_semana ON dias(semana_id);
CREATE INDEX IF NOT EXISTS idx_series_dia ON series(dia_id);
CREATE INDEX IF NOT EXISTS idx_series_ejercicio ON series(ejercicio);
