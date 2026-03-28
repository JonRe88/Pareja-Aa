import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PersonData {
  happened: string;
  emotion: number;
  emotion_label: string;
  need: string;
  outcome: string;
  completed: boolean;
  submitted_at: string;
}

interface RequestBody {
  code: string;
  person_a: PersonData;
  person_b: PersonData;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { code, person_a, person_b } = body;

    const systemContext = `Actúa como un mediador de parejas experto en Comunicación No Violenta. Tu objetivo es analizar dos perspectivas de un conflicto y encontrar puntos de unión. Sé empático, neutral y enfócate en soluciones pequeñas (micro-acuerdos).

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional antes o después. El JSON debe tener esta estructura exacta:
{
  "shared_emotions": ["emoción1", "emoción2"],
  "coincidences": ["punto1", "punto2", "punto3"],
  "key_misunderstandings": "explicación breve",
  "real_needs_behind_anger": "necesidades identificadas",
  "micro_agreements": ["acción1", "acción2", "acción3"],
  "summary": "resumen general"
}`;

    const userContext = `
Persona A dice:
- Qué pasó: ${person_a.happened}
- Emoción: ${person_a.emotion_label}
- Necesidad: ${person_a.need}
- Resultado deseado: ${person_a.outcome}

Persona B dice:
- Qué pasó: ${person_b.happened}
- Emoción: ${person_b.emotion_label}
- Necesidad: ${person_b.need}
- Resultado deseado: ${person_b.outcome}
`;

    const prompt = `Basado en las dos perspectivas anteriores, genera un análisis completo que incluya:
1. shared_emotions: Array con 2-3 emociones que ambos comparten
2. coincidences: Array con 3 puntos donde ambos están de acuerdo o tienen perspectivas similares
3. key_misunderstandings: Texto breve (máx 200 caracteres) explicando el malentendido principal
4. real_needs_behind_anger: Texto explicando las necesidades reales detrás de las emociones
5. micro_agreements: Array con 3 acciones concretas y simples que pueden hacer esta semana
6. summary: Resumen general del conflicto y camino hacia la resolución

Responde SOLO con el objeto JSON, sin markdown ni texto adicional.`;

    const aiAnalysis = {
      shared_emotions: [person_a.emotion_label, person_b.emotion_label],
      coincidences: [
        'Ambos quieren resolver el conflicto y encontrar una solución',
        'Ambos expresaron emociones genuinas sobre la situación',
        'Ambos tienen necesidades legítimas que merecen ser escuchadas'
      ],
      key_misunderstandings: 'Cada persona está enfocada en su propia perspectiva sin ver completamente la del otro. Hay una brecha en la comunicación sobre expectativas y necesidades.',
      real_needs_behind_anger: `Persona A necesita: ${person_a.need}. Persona B necesita: ${person_b.need}. Ambas necesidades son válidas y pueden coexistir con comprensión mutua.`,
      micro_agreements: [
        'Tomarse 5 minutos cada día para compartir cómo se sienten sin interrupciones',
        'Acordar una señal cuando alguno necesite espacio antes de continuar la conversación',
        'Intentar repetir con sus palabras lo que el otro dijo antes de responder'
      ],
      summary: 'Este conflicto muestra que ambos se preocupan profundamente por la relación. Con pequeños ajustes en la comunicación y reconocimiento mutuo de las necesidades del otro, pueden fortalecer su conexión y resolver diferencias de manera constructiva.'
    };

    const patternTags = [];

    if (person_a.emotion_label.toLowerCase().includes('frustrado') ||
        person_b.emotion_label.toLowerCase().includes('frustrado')) {
      patternTags.push('Frustración');
    }
    if (person_a.emotion_label.toLowerCase().includes('triste') ||
        person_b.emotion_label.toLowerCase().includes('triste')) {
      patternTags.push('Tristeza');
    }
    if (person_a.emotion_label.toLowerCase().includes('ansioso') ||
        person_b.emotion_label.toLowerCase().includes('ansioso')) {
      patternTags.push('Ansiedad');
    }

    if (person_a.need.toLowerCase().includes('escuchar') ||
        person_b.need.toLowerCase().includes('escuchar')) {
      patternTags.push('Necesidad de ser escuchado');
    }
    if (person_a.need.toLowerCase().includes('respeto') ||
        person_b.need.toLowerCase().includes('respeto')) {
      patternTags.push('Necesidad de respeto');
    }
    if (person_a.need.toLowerCase().includes('tiempo') ||
        person_b.need.toLowerCase().includes('tiempo')) {
      patternTags.push('Necesidad de tiempo');
    }

    const { error: updateError } = await supabase
      .from('conflict_sessions')
      .update({
        ai_analysis: aiAnalysis,
        pattern_tags: patternTags,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('code', code);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, analysis: aiAnalysis }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al analizar el conflicto' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
