-- Tabla para registrar el historial y la ingesta diaria de alimentos
CREATE TABLE IF NOT EXISTS registros_alimentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha date DEFAULT CURRENT_DATE,
    tipo_comida text NOT NULL,
    nombre_alimento text NOT NULL,
    porcion text,
    calorias numeric NOT NULL,
    proteinas numeric DEFAULT 0,
    carbohidratos numeric DEFAULT 0,
    grasas numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE registros_alimentos ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS estrictas
CREATE POLICY "Los usuarios pueden ver sus propios registros de alimentos" 
ON registros_alimentos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propios registros de alimentos" 
ON registros_alimentos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios registros de alimentos" 
ON registros_alimentos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios registros de alimentos" 
ON registros_alimentos FOR DELETE 
USING (auth.uid() = user_id);
