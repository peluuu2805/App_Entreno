-- ==========================================
-- CREACIÓN DE TABLA: recetario_usuario
-- ==========================================

CREATE TABLE IF NOT EXISTS public.recetario_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    calorias NUMERIC DEFAULT 0,
    proteinas NUMERIC DEFAULT 0,
    carbohidratos NUMERIC DEFAULT 0,
    grasas NUMERIC DEFAULT 0,
    barcode TEXT,
    origen TEXT CHECK (origen IN ('ia', 'barcode', 'manual')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint única para evitar alimentos duplicados por usuario
    CONSTRAINT unique_user_alimento UNIQUE (user_id, nombre)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.recetario_usuario ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (RLS)
CREATE POLICY "Users can insert their own recipes"
    ON public.recetario_usuario
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own recipes"
    ON public.recetario_usuario
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
    ON public.recetario_usuario
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
    ON public.recetario_usuario
    FOR DELETE
    USING (auth.uid() = user_id);

-- Función para actualizar el 'updated_at'
CREATE OR REPLACE FUNCTION set_updated_at_recetario()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para el updated_at
DROP TRIGGER IF EXISTS trg_set_updated_at_recetario ON public.recetario_usuario;
CREATE TRIGGER trg_set_updated_at_recetario
BEFORE UPDATE ON public.recetario_usuario
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_recetario();
