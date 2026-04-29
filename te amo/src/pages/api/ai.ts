import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, text } = body;

    // Extraemos la API key de las variables de entorno locales
    const apiKey = import.meta.env.GEMINI_API_KEY;

    // Si el usuario aún no ha configurado la API Key, activamos el "Modo Simulación" seguro
    if (!apiKey) {
      return simulateResponse(action, text);
    }

    // Configuración de los Prompts para Gemini
    let systemPrompt = "";
    let userPrompt = text || "";

    if (action === 'compassion') {
      systemPrompt = "Eres un asistente de bienestar emocional extremadamente empático, cálido y compasivo. Tu objetivo es escuchar pensamientos negativos o de ansiedad del usuario y reformularlos con extrema empatía, validando sus sentimientos pero ofreciendo una perspectiva calmante. No uses frases clichés. El usuario usa la app 'Refugio Rosa'. Responde en máximo 60 palabras. IMPORTANTE: No uses NADA de formato Markdown (ni asteriscos, ni negritas, ni listas), responde solo con texto plano limpio y directo.";
    } else if (action === 'escape') {
      systemPrompt = "Eres un guía espiritual cristiano lleno de inmenso amor, empatía y consuelo celestial. Tu objetivo es generar una meditación profunda y sanadora: una descripción inmersiva de un lugar tranquilo y bellísimo donde la usuaria se encuentra a solas con Dios o con Jesús. La descripción debe transmitir una paz absoluta que sobrepase todo entendimiento. Describe cómo Él la reconforta en el silencio, cómo se siente Su presencia amorosa abrazándola, asegurándole que todo estará bien, que Él tiene el control de sus preocupaciones y que ella es su hija amada. Haz la descripción inmersiva y un poco más larga, de unos 2 a 3 párrafos fluidos y reconfortantes (aprox. 120-150 palabras). Usa pausas naturales en el texto. REGLA CRÍTICA: No pidas al usuario que cierre los ojos, ya que ella está leyendo este texto. IMPORTANTE: No uses NADA de formato Markdown (ni asteriscos, ni negritas, ni listas), responde solo con texto plano limpio.";
      userPrompt = "Llévame a otro lugar tranquilo y seguro con Él. Necesito sentir Su inmensa paz.";
    } else if (action === 'generate_report') {
      systemPrompt = "Eres un analista táctico de bienestar psicológico del Panel de Administración. Recibirás un resumen de las tareas completadas de un usuario durante la semana. Tu tarea es generar un breve reporte táctico en UN SOLO PÁRRAFO de máximo 3 oraciones. 1) Elogia el esfuerzo o detecta la tendencia. 2) Resume el comportamiento. 3) Sugiere una acción calmante para el fin de semana. IMPORTANTE: No uses NADA de formato Markdown (ni asteriscos, ni listas, ni saltos de línea largos), solo texto plano.";
      userPrompt = `Por favor analiza esta lista de victorias semanales del usuario: ${text}`;
    } else if (action === 'get_verse') {
      systemPrompt = "Eres un profundo conocedor de la Biblia. Tu única tarea es devolver UN versículo bíblico ALEATORIO en la traducción NVI (Nueva Versión Internacional) que hable sobre paz, consuelo, esperanza o el amor de Dios. Busca en libros variados (Salmos, Isaías, Sofonías, Juan, Romanos, etc) para que NUNCA se repitan los comunes. REGLA ESTRICTA DE FORMATO: Devuelve SOLO el texto del versículo en la primera línea. En la segunda línea devuelve SOLO la referencia del libro y capítulo (ej: Isaías 41:10). SIN comillas, SIN introducciones, SIN formato Markdown.";
      userPrompt = "Dame un versículo NVI aleatorio para confortar el alma hoy. Que sea diferente y hermoso.";
    } else if (action === 'fun_fact') {
      systemPrompt = "Eres un asistente dulce y romántico. Tu tarea es dar UN solo dato curioso muy corto, hermoso, y ESTRICTAMENTE VERÍDICO Y CIENTÍFICAMENTE COMPROBADO sobre la naturaleza, el universo, los animales o el amor. Devuelve SOLO el dato curioso de forma directa, SIN comentarios adicionales ni conclusiones románticas al final. Máximo 20 palabras. NADA de formato Markdown. Ejemplo: ¿Sabías que los caballitos de mar eligen una pareja para toda la vida y viajan agarrados de la cola?";
      // Usamos el texto (semilla) enviado para forzar variedad
      userPrompt = `Dime un dato curioso bonito, real y tierno. Variación ID: ${text || Date.now()}`;
    } else if (action === 'bible_guidance') {
      systemPrompt = "Eres un consejero espiritual cristiano lleno de sabiduría y amor. Tu tarea es recibir un sentimiento o problema de la usuaria y sugerir exactamente 1 o 2 pasajes de la Biblia (Libro, Capítulo y Versículo) que le den paz y dirección. REGLA: Da una breve explicación de 1 oración de por qué ese pasaje le ayudará hoy. No pidas que cierre los ojos. No uses Markdown. Responde en máximo 60 palabras de forma muy cálida.";
      userPrompt = `Me siento así hoy: ${text}. ¿Qué me recomiendas leer en la Biblia para encontrar paz?`;
    }

    // Intentamos con gemini-2.0-flash que suele tener cuota gratuita más amplia
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: (action === 'fun_fact') ? 1.0 : 0.7, 
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error (Falling back to simulation):", errorText);
      return simulateResponse(action, text);
    }

    const data = await response.json();
    
    // Validar que existan candidatos antes de acceder
    if (!data.candidates || data.candidates.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "La IA no generó una respuesta válida (posible filtro de seguridad)"
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extraer la respuesta generada por Gemini
    const resultText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({
      success: true,
      data: resultText
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("Error en AI Endpoint (Falling back to simulation):", error);
    // @ts-ignore
    const body = await request.clone().json().catch(() => ({}));
    return simulateResponse(body.action, body.text);
  }
}

// Función de contingencia (Fallback) para no romper la app mientras configuras la API
function simulateResponse(action: string, text: string) {
  let result = '';
  if (action === 'compassion') {
    result = `Entiendo perfectamente que te sientas así. "${text}" puede sentirse pesado, pero recuerda que estás haciendo lo mejor que puedes y eso basta. Tómate el tiempo que necesites, respira profundo... todo estará bien.`;
  } else if (action === 'escape') {
    const escapes = [
      "Te encuentras en un inmenso valle iluminado por el sol del amanecer. La brisa suave acaricia tu rostro mientras Jesús camina hacia ti. Al tomar tus manos, sientes que cualquier peso de ansiedad desaparece instantáneamente. Él te mira con una ternura infinita, sonríe y te dice al corazón que jamás te dejará sola. Sientes Su amor envolviéndote por completo, recordándote que eres su preciosa hija y que en Sus manos, todo, absolutamente todo, estará bien.",
      "Te encuentras sentada a la orilla de un lago de aguas tranquilas que reflejan el cielo infinito. Sientes la presencia viva de Dios a tu lado, como un manto cálido y seguro que abraza tu alma cansada. En la serenidad perfecta de este lugar, escuchas Su voz susurrar que conoce cada una de tus batallas y que ya tiene preparada la victoria. Respira profundo, porque Su gracia es suficiente y Su amor por ti no tiene límites ni final."
    ];
    result = escapes[Math.floor(Math.random() * escapes.length)];
  } else if (action === 'generate_report') {
    result = "Reporte Táctico: Se detecta un pico de estrés hacia mediados de semana debido a posible sobrecarga. Acción sugerida: Fomentar un bloqueo tecnológico después de las 20:00 hrs y recomendar una pausa activa con caminata matutina el sábado.";
  } else if (action === 'bible_guidance') {
    const pool = [
      "Te entiendo de todo corazón. Para este momento te recomiendo leer Filipenses 4:6-7. Ahí Dios nos recuerda que Su paz, que sobrepasa todo entendimiento, cuidará tu corazón cuando le entregas tus preocupaciones en oración. Él está contigo.",
      "Sé que te sientes así hoy, pero recuerda que no estás sola. Te sugiero leer Salmos 34:18. La Biblia dice que el Señor está cerca de los que tienen el corazón roto. Él está a tu lado abrazándote en este momento.",
      "Cuando sientas que las fuerzas te faltan, lee Isaías 41:10. Dios te dice directamente que no temas, porque Él es tu Dios que te fortalece y siempre te ayudará con Su mano victoriosa. Eres valiente.",
      "Para traer calma a tu mente, te recomiendo Juan 14:27. Jesús te regala una paz que el mundo no puede dar. Deja que Sus palabras tranquilicen tu espíritu hoy. Todo estará bien.",
      "Si te sientes cansada, lee Mateo 11:28. Es una invitación de Jesús para que descanses en Él. Entrega tu carga hoy y deja que Él renueve tus fuerzas. Te amo mucho y Él también."
    ];
    result = pool[Math.floor(Math.random() * pool.length)];
  }
  
  return new Response(JSON.stringify({ success: true, data: result }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
}
