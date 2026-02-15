import React, { useState } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import CrucigramaGrid from './CrucigramaGrid';

function CrucigramaGenerator() {
  const [tema, setTema] = useState('');
  const [loading, setLoading] = useState(false);
  const [palabras, setPalabras] = useState([]);

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

      const prompt = `Genera exactamente 20 palabras DIFERENTES Y VARIADAS relacionadas con el tema "${tema}" para un crucigrama.

IMPORTANTE: Usa palabras de distintas categorías, épocas, y aspectos del tema. NO repitas palabras similares o de la misma familia.

REGLAS ESTRICTAS:
1. Solo palabras de 4-12 letras
2. EN MAYÚSCULAS, sin acentos, sin espacios, sin guiones
3. Pistas estilo trivia intermedio-difícil (requieren conocimiento previo o especializado)
4. MÁXIMA VARIEDAD: incluye nombres, lugares, conceptos, objetos, eventos relacionados
5. Responde SOLO con JSON, sin texto antes ni después
6. Sin backticks de markdown
7. Sin explicaciones

FORMATO EXACTO:
[
{"palabra":"NADAL","pista":"Tenista nacido en Mallorca, 14 veces campeón de Roland Garros (apellido)"},
{"palabra":"FEDERER","pista":"Ganador de 8 títulos en Wimbledon, récord en la era Open (apellido)"}
]

Genera 20 palabras siguiendo este formato exacto, asegurándote de que sean lo más variadas posible dentro del tema "${tema}".`;

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
        
        return item;
      }).filter(Boolean); // Eliminar nulls

      console.log(`${palabrasGeneradas.length} palabras válidas generadas`);

      if (!palabrasGeneradas || palabrasGeneradas.length === 0) {
        throw new Error('No se generaron palabras válidas.');
      }
      
      setPalabras(palabrasGeneradas);
      
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