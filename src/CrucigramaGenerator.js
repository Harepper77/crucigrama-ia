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

      const prompt = `Genera 10 palabras relacionadas con el tema "${tema}" para un crucigrama. Para cada palabra proporciona: la palabra (en mayúsculas, sin acentos, sin espacios) y una pista estilo trivia (difícil, que requiera conocimiento especializado). IMPORTANTE: Responde ÚNICAMENTE con un array JSON válido, sin texto adicional, sin backticks de markdown, sin explicaciones. Formato exacto: [{"palabra": "NADAL", "pista": "Tenista nacido en Mallorca, ganador 14 veces de Roland Garros (apellido)"}, {"palabra": "FEDERER", "pista": "Ganador de 8 títulos en Wimbledon, récord en la era Open (apellido)"}]`;

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      let contenido = message.content[0].text.trim();
      contenido = contenido.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.log('Respuesta de Claude:', contenido);
      
      const palabrasGeneradas = JSON.parse(contenido);
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