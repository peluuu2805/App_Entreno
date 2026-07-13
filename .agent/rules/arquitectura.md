    # CLAUDE.md - Contrato Arquitectónico de StudentFit OS

## Propósito Ontológico
Aplicación web profesional de rendimiento y salud para gestionar tablas de entrenamiento, progresión de fuerza mediante gráficos, analíticas antropométricas y seguimiento nutricional.

## Mapa Topológico del Ecosistema
- `/index.html` -> Interfaz de usuario principal (Single Page Application).
- `/app.js` -> Lógica de control frontend, gestión de estados y gráficos (Chart.js).
- `/supabase.js` -> Cliente de conexión e inyección de datos para Supabase.
- `/styles.css` -> Arquitectura de diseño visual y maquetación interactiva.

## Pilares Técnicos e Innegociables
1. **Entrenamiento Diario**: Tabla con campos estrictos:Semana,Rutina(Día), Ejercicio, Serie, Peso, Repeticiones, RIR (Repeticiones en Recámara).
2. **Gráficos de Progresión**: Bloques de visualización cada 4 semanas para Repeticiones vs Peso por ejercicio aislado, y evolución de medidas corporales (Peso, Altura, Diámetros).
3. **Conexión Nutricional**: Integración con la API de FatSecret para tracking calórico y de macronutrientes.
4. **Chatbot IA**: Asistente de consultas integrado mediante interfaz simulada/API en el cliente.
5. **Persistencia**: Sincronización estricta con las tablas relacionales de Supabase.

## Restricciones Negativas y Reglas de Codificación
- PROHIBIDO generar código parcial, con marcadores de posición (`// aquí va el código`) o comentarios flotantes redundantes.
- Todo bloque de código HTML, JS o CSS modificado debe entregarse completo y sanitizado para evitar la degradación del contexto.
- El diseño visual debe ser moderno y limpio; no se generará código CSS final hasta que el usuario apruebe la paleta cromática de la interfaz.