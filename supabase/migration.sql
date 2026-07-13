-- ============================================================
-- MIGRACIÓN: Mover datos de 'entrenamientos' → esquema relacional
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- 1. BACKUP de seguridad de la tabla original
CREATE TABLE IF NOT EXISTS entrenamientos_backup AS
SELECT * FROM entrenamientos;

-- 2. Insertar semanas únicas extraídas de los registros existentes
INSERT INTO semanas (nombre)
SELECT DISTINCT semana
FROM entrenamientos
WHERE semana IS NOT NULL
ON CONFLICT (nombre) DO NOTHING;

-- 3. Insertar días únicos (combinación semana + rutina)
INSERT INTO dias (semana_id, nombre)
SELECT DISTINCT s.id, e.rutina
FROM entrenamientos e
JOIN semanas s ON s.nombre = e.semana
WHERE e.rutina IS NOT NULL
ON CONFLICT (semana_id, nombre) DO NOTHING;

-- 4. Insertar todas las series vinculándolas a sus días correctos
INSERT INTO series (dia_id, ejercicio, num_serie, peso, repeticiones, rir)
SELECT
    d.id,
    e.ejercicio,
    e.serie,
    e.peso,
    e.repeticiones,
    e.rir
FROM entrenamientos e
JOIN semanas s ON s.nombre = e.semana
JOIN dias d ON d.semana_id = s.id AND d.nombre = e.rutina;

-- 5. Verificación rápida: contar registros migrados
SELECT
    (SELECT COUNT(*) FROM semanas) AS total_semanas,
    (SELECT COUNT(*) FROM dias) AS total_dias,
    (SELECT COUNT(*) FROM series) AS total_series,
    (SELECT COUNT(*) FROM entrenamientos) AS total_originales;

-- 6. (OPCIONAL) Eliminar tabla vieja cuando estés seguro de que todo está correcto
-- DROP TABLE entrenamientos;
-- NOTA: Descomenta la línea anterior SOLO después de verificar que la migración es correcta
