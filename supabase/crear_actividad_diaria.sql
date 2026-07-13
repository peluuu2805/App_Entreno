CREATE TABLE IF NOT EXISTS actividad_diaria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    pasos INT DEFAULT 0,
    cardio INT DEFAULT 0,
    UNIQUE(user_id, fecha)
);
ALTER TABLE actividad_diaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Actividad propia" ON actividad_diaria FOR ALL USING (auth.uid() = user_id);
