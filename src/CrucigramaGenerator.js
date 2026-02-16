import React, { useState } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import CrucigramaGrid from './CrucigramaGrid';
import { guardarTemaUsado, guardarPalabras, mezclarPalabrasConBD } from './analyticsService';


function CrucigramaGenerator() {
  const [tema, setTema] = useState('');
  const [dificultad, setDificultad] = useState(5); // Valor por defecto: medio
  const [loading, setLoading] = useState(false);
  const [palabras, setPalabras] = useState([]);
  const getDificultadInstrucciones = (nivel) => {
  if (nivel <= 2) {
    return `DIFICULTAD MUY FÁCIL (${nivel}/10):
- Palabras y conceptos que TODO EL MUNDO conoce
- Pistas muy obvias y directas
- Información básica y popular
- Ejemplo: "Planeta rojo del sistema solar" = MARTE`;
  } else if (nivel <= 4) {
    return `DIFICULTAD FÁCIL (${nivel}/10):
- Conceptos conocidos por público general
- Pistas claras pero requieren pensar un poco
- Información común pero no obvia
- Ejemplo: "Capital de Francia conocida por la Torre Eiffel" = PARIS`;
  } else if (nivel <= 6) {
    return `DIFICULTAD MEDIA (${nivel}/10):
- Requiere conocimiento general sólido
- Pistas que no son obvias, hay que pensar
- Mezcla de información popular y específica
- Ejemplo: "Tenista con más Grand Slams en la historia (apellido)" = DJOKOVIC`;
  } else if (nivel <= 8) {
    return `DIFICULTAD DIFÍCIL (${nivel}/10):
- Requiere conocimiento especializado del tema
- Pistas con datos específicos (fechas, números, detalles)
- Información que solo fans/conocedores sabrían
- Ejemplo: "Director de Blade Runner estrenada en 1982 (apellido)" = SCOTT`;
  } else {
    return `DIFICULTAD MUY DIFÍCIL (${nivel}/10):
- Solo para EXPERTOS en el tema
- Pistas extremadamente específicas (fechas exactas, nombres completos, datos técnicos)
- Referencias oscuras que solo verdaderos especialistas conocen
- Ejemplo: "Compositor de la banda sonora de Blade Runner 2049 (apellido)" = ZIMMER`;
  }
};



  const generarCrucigrama = async () => {
    if (!tema.trim()) {
      alert('Por favor ingresa un tema');
      return;
    }

    setLoading(true);
    
    try {
      const client = new Anthropic({
        apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true
      });

      const prompt = `Genera exactamente 12 palabras DIFERENTES Y VARIADAS relacionadas con el tema "${tema}" para un crucigrama.

        NIVEL DE DIFICULTAD: ${dificultad}/10

        ${getDificultadInstrucciones(dificultad)}

        IMPORTANTE: Usa palabras de distintas categorías, épocas, y aspectos del tema. NO repitas palabras similares o de la misma familia.

        REGLAS ESTRICTAS:
        1. Solo palabras de 4-12 letras
        2. EN MAYÚSCULAS, sin acentos, sin espacios, sin guiones
        3. MÁXIMA VARIEDAD: incluye nombres, lugares, conceptos, objetos, eventos relacionados
        4. Responde SOLO con JSON, sin texto antes ni después
        5. Sin backticks de markdown
        6. Sin explicaciones

        FORMATO EXACTO:
        [
        {"palabra":"NADAL","pista":"Tenista nacido en Mallorca, 14 veces campeón de Roland Garros (apellido)"},
        {"palabra":"FEDERER","pista":"Ganador de 8 títulos en Wimbledon, récord en la era Open (apellido)"}
        ]

        Genera 12 palabras siguiendo este formato exacto, asegurándote de que sean lo más variadas posible dentro del tema "${tema}" con dificultad ${dificultad}/10.`;

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      let contenido = message.content[0].text.trim();
      contenido = contenido.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      contenido = contenido.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

      console.log('Respuesta de Claude:', contenido);

      let palabrasGeneradas;
      try {
        palabrasGeneradas = JSON.parse(contenido);
      } catch (parseError) {
        console.error('Error parseando JSON:', parseError);
        console.error('Contenido recibido:', contenido);
        
        // Intentar encontrar el array JSON en el texto
        const match = contenido.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            palabrasGeneradas = JSON.parse(match[0]);
            console.log('JSON recuperado exitosamente del fallback');
          } catch (e) {
            throw new Error('No se pudo parsear el JSON. Intenta de nuevo.');
          }
        } else {
          throw new Error('No se encontró un array JSON válido en la respuesta.');
        }
      }

      // Validar y corregir typos comunes (se ejecuta siempre)
        palabrasGeneradas = palabrasGeneradas.map(item => {
        // Corregir "pita" a "pista"
        if (item.pita && !item.pista) {
            item.pista = item.pita;
            delete item.pita;
            console.warn('Typo corregido: "pita" -> "pista" en palabra:', item.palabra);
        }
        
        // Validar que tenga palabra y pista
        if (!item.palabra || !item.pista) {
            console.warn('Palabra inválida detectada:', item);
            return null;
        }
        
        // Quitar acentos de las palabras
        const palabraOriginal = item.palabra;
        item.palabra = item.palabra
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
        
        if (palabraOriginal !== item.palabra) {
            console.warn(`Acentos removidos: "${palabraOriginal}" -> "${item.palabra}"`);
        }
        
        return item;
        }).filter(Boolean);

      console.log(`${palabrasGeneradas.length} palabras nuevas generadas`);

      if (!palabrasGeneradas || palabrasGeneradas.length === 0) {
        throw new Error('No se generaron palabras válidas.');
      }
      
      // Mezclar con palabras de BD (DESHABILITADO - causaba repeticiones)
        let palabrasFinales = palabrasGeneradas;
        /*
        try {
        palabrasFinales = await mezclarPalabrasConBD(palabrasGeneradas, tema);
        console.log('✅ Palabras mezcladas con BD');
        } catch (error) {
        console.error('Error mezclando con BD:', error);
        }
        */

        setPalabras(palabrasFinales);

        // Guardar analytics (solo palabras nuevas)
        try {
        await guardarTemaUsado(tema);
        await guardarPalabras(palabrasGeneradas, tema); // Guardar solo las nuevas generadas
        console.log('✅ Analytics guardados correctamente');
        } catch (error) {
        console.error('Error guardando analytics:', error);
        }
      
    } catch (error) {
      console.error('Error completo:', error);
      alert('Error al generar crucigrama: ' + error.message);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧩 Generador de Crucigramas IA</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Ingresa un tema (ej: Cine de los 80s)"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '2px solid #ddd'
          }}
          onKeyPress={(e) => e.key === 'Enter' && generarCrucigrama()}
        />

        <div style={{ marginBottom: '20px' }}>
            <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#333'
            }}>
                Dificultad: {dificultad}/10
                <span style={{ 
                marginLeft: '10px', 
                fontSize: '14px', 
                fontWeight: 'normal',
                color: '#666'
                }}>
                ({dificultad <= 2 ? 'Muy Fácil' : 
                    dificultad <= 4 ? 'Fácil' : 
                    dificultad <= 6 ? 'Medio' : 
                    dificultad <= 8 ? 'Difícil' : 'Muy Difícil'})
                </span>
            </label>
            
            <input
                type="range"
                min="1"
                max="10"
                value={dificultad}
                onChange={(e) => setDificultad(parseInt(e.target.value))}
                style={{
                width: '100%',
                height: '8px',
                borderRadius: '5px',
                outline: 'none',
                background: `linear-gradient(to right, 
                    #28a745 0%, 
                    #28a745 ${((dificultad - 1) / 9) * 100}%, 
                    #ddd ${((dificultad - 1) / 9) * 100}%, 
                    #ddd 100%)`,
                cursor: 'pointer'
                }}
            />
            
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '12px', 
                color: '#999',
                marginTop: '5px'
            }}>
                <span>1 - Muy Fácil</span>
                <span>10 - Experto</span>
            </div>
            </div>
      </div>

      <button
        onClick={generarCrucigrama}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Generando...' : 'Generar Crucigrama'}
      </button>

      {palabras.length > 0 && (
        <CrucigramaGrid palabras={palabras} />
      )}
    </div>
  );
}

export default CrucigramaGenerator;