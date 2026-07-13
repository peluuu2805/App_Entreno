import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mensaje } = await req.json()
    
    if (!mensaje) {
      return new Response(JSON.stringify({ error: 'No message provided' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada')
    }

    const systemInstruction = "Eres el cerebro de StudentFit OS, un entrenador de fuerza de élite y mentor académico. Tus respuestas deben ser directas, sin rodeos y 100% enfocadas en el alto rendimiento. Si el usuario te pregunta por rutinas pesadas, biomecánica o cómo programar un bloqueo de estudio para sacar adelante su carrera, dale directrices tácticas y aplicables."

    // Instanciar el SDK oficial de Google
    const genAI = new GoogleGenerativeAI(apiKey)

    // Configurar el modelo con la instrucción del sistema de forma nativa en el SDK
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-lite-preview-02-05',
      systemInstruction: systemInstruction
    })

    const models = await genAI.listModels();
    console.log('MODELOS DISPONIBLES:', JSON.stringify(models, null, 2));

    // Ejecutar la petición robusta a través del SDK
    const result = await model.generateContent(mensaje)
    const replyText = result.response.text()

    return new Response(
      JSON.stringify({ reply: replyText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
