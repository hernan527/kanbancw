const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

class AIServicio {
  async analizarLead(leadData) {
    try {
      const prompt = this.construirPrompt(leadData);
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system", 
            content: `Eres un experto en análisis de perfiles de clientes para seguros de salud en Argentina 2024. Tu misión es analizar el perfil del cliente y asignarles:

1. Un score de calidad (0-100) basado en su perfil económico y demográfico
2. Un análisis detallado de su perfil rieso para aseguradores  
3. Un precio sugerido mensual en pesos argentinos (ARS)

Consideraciones para Argentina 2024:
- Ingresos menores a $200,000 ARS/mes: económico popular
- Ingresos $200,000-600,000 ARS/mes: clase media en Argentina actual
- Ingresos superiores a $600,000 ARS/mes: clase media alta
- Zonas como CABA, zona norte (Pilar, San Isidro), Córdoba capital y Rosario son zonas más valuadas

Formato de respuesta JSON estricto:
{
  "score": numero 0-100,
  "analisis": "breve análisis de 2-3 oraciones sobre el perfil",
  "precio_sugerido": numero entero en ARS
}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.3-70b-specdec",
        temperature: 0.3,
        max_tokens: 500,
      });

      const respuesta = completion.choices[0].message.content;
      const analisis = JSON.parse(respuesta);
      
      return {
        score: analisis.score,
        analisis: analisis.analisis,
        precio_sugerido: analisis.precio_sugerido,
        procesado_en: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error al analizar lead con IA:', error);
      // valores por defecto si falla la IA
      return {
        score: 50,
        analisis: 'análisis con IA temporalmente no disponible',
        precio_sugerido: 25000,
        error: true
      };
    }
  }
  
  construirPrompt(datos) {
    return `
Analiza este cliente de seguro de salud:
- Nombre: ${datos.nombre}
- Edad: ${datos.edad} años
- Estado civil: ${datos.estado_civil}
- Hijos: ${datos.hijos}
- Profesión: ${datos.profesion}
- Ingresos mensuales: ${new Intl.NumberFormat('de-DE').format(datos.ingresos_mensuales)} ARS
- Zona de residencia: ${datos.zona_residencia}
- Tipo de plan que consulta: ${datos.tipo_plan}

Proporciona el análisis en formato JSON exacto según las instrucciones del sistema.`;
  }
}

module.exports = new AIServicio();