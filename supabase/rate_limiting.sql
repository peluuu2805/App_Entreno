-- Crear tabla de control de tasa
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en la tabla
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Índice para búsquedas rápidas de ventana de tiempo
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action_time 
ON public.rate_limits (user_id, action_type, created_at);

-- Función que evalúa la limitación y bloquea si se supera
CREATE OR REPLACE FUNCTION public.check_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_count INT;
    max_requests INT := 5;
    window_interval INTERVAL := '15 minutes';
    current_user_id UUID;
BEGIN
    -- Obtener el ID del usuario actual de la sesión
    current_user_id := auth.uid();
    
    -- Si no hay usuario (ej. superuser backend), dejar pasar
    IF current_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Limpiar registros viejos esporádicamente para esta acción (10% de probabilidad para no afectar rendimiento)
    IF random() < 0.1 THEN
        DELETE FROM public.rate_limits 
        WHERE user_id = current_user_id 
          AND action_type = TG_TABLE_NAME 
          AND created_at < now() - window_interval;
    END IF;

    -- Contar peticiones recientes
    SELECT count(*)
    INTO request_count
    FROM public.rate_limits
    WHERE user_id = current_user_id
      AND action_type = TG_TABLE_NAME
      AND created_at >= now() - window_interval;

    -- Si se supera el límite, lanzar excepción (P0429 es un código de error custom nuestro)
    IF request_count >= max_requests THEN
        RAISE EXCEPTION 'Too Many Requests: Superado el límite de % peticiones en %', max_requests, window_interval
        USING ERRCODE = 'P0429';
    END IF;

    -- Registrar la petición actual
    INSERT INTO public.rate_limits (user_id, action_type)
    VALUES (current_user_id, TG_TABLE_NAME);

    RETURN NEW;
END;
$$;

-- Aplicar el trigger a tablas críticas (ejemplo: recetario_usuario y entrenamientos)
DROP TRIGGER IF EXISTS tr_rate_limit_recetario ON public.recetario_usuario;
CREATE TRIGGER tr_rate_limit_recetario
    BEFORE INSERT ON public.recetario_usuario
    FOR EACH ROW
    EXECUTE FUNCTION public.check_rate_limit();

DROP TRIGGER IF EXISTS tr_rate_limit_entrenamientos ON public.entrenamientos;
CREATE TRIGGER tr_rate_limit_entrenamientos
    BEFORE INSERT ON public.entrenamientos
    FOR EACH ROW
    EXECUTE FUNCTION public.check_rate_limit();
