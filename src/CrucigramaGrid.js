import React, { useState, useEffect } from 'react';

function CrucigramaGrid({ palabras }) {
  const [grid, setGrid] = useState([]);
  const [pistas, setPistas] = useState({ horizontal: [], vertical: [] });

  useEffect(() => {
    if (palabras && palabras.length > 0) {
      generarGridSimple();
    }
  }, [palabras]);

  const generarGridSimple = () => {
    const size = 15;
    const nuevoGrid = Array(size).fill(null).map(() => 
      Array(size).fill(null).map(() => ({ letra: '', bloqueado: true, letraCorrecta: '', numero: null }))
    );

    const pistasH = [];
    const pistasV = [];
    let numeroPista = 1;
    let filaActual = 2;
    let colActual = 2;

    palabras.forEach((palabra, idx) => {
      const esHorizontal = idx % 2 === 0;
      const word = palabra.palabra;

      if (esHorizontal) {
        if (colActual + word.length > size) {
          filaActual += 2;
          colActual = 2;
        }

        for (let i = 0; i < word.length; i++) {
          if (filaActual < size && colActual + i < size) {
            nuevoGrid[filaActual][colActual + i] = {
              letra: '',
              bloqueado: false,
              letraCorrecta: word[i],
              numero: i === 0 ? numeroPista : nuevoGrid[filaActual][colActual + i].numero
            };
          }
        }

        pistasH.push({ numero: numeroPista, pista: palabra.pista, respuesta: word });
        colActual += word.length + 2;
      } else {
        if (filaActual + word.length > size) {
          filaActual = 2;
          colActual += 3;
        }

        for (let i = 0; i < word.length; i++) {
          if (filaActual + i < size && colActual < size) {
            nuevoGrid[filaActual + i][colActual] = {
              letra: '',
              bloqueado: false,
              letraCorrecta: word[i],
              numero: i === 0 ? numeroPista : nuevoGrid[filaActual + i][colActual].numero
            };
          }
        }

        pistasV.push({ numero: numeroPista, pista: palabra.pista, respuesta: word });
        filaActual += word.length + 1;
      }

      numeroPista++;
    });

    setGrid(nuevoGrid);
    setPistas({ horizontal: pistasH, vertical: pistasV });
  };

  const handleInputChange = (fila, col, valor) => {
    if (valor.length > 1) valor = valor[0];
    
    const nuevoGrid = grid.map(row => [...row]);
    nuevoGrid[fila][col] = {
      ...nuevoGrid[fila][col],
      letra: valor.toUpperCase()
    };
    setGrid(nuevoGrid);
  };

  const verificarRespuestas = () => {
    let correctas = 0;
    let total = 0;

    grid.forEach((fila) => {
      fila.forEach((celda) => {
        if (!celda.bloqueado) {
          total++;
          if (celda.letra === celda.letraCorrecta) {
            correctas++;
          }
        }
      });
    });

    const porcentaje = Math.round((correctas / total) * 100);
    alert(`¡${correctas} de ${total} correctas! (${porcentaje}%)`);
  };

  const mostrarRespuestas = () => {
    const nuevoGrid = grid.map(row => [...row]);
    nuevoGrid.forEach((fila, i) => {
      fila.forEach((celda, j) => {
        if (!celda.bloqueado) {
          nuevoGrid[i][j] = {
            ...celda,
            letra: celda.letraCorrecta
          };
        }
      });
    });
    setGrid(nuevoGrid);
  };

  if (grid.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Generando crucigrama...</div>;
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <h2>🎯 Crucigrama Generado</h2>
      
      <div style={{ 
        display: 'inline-block', 
        border: '2px solid #333',
        marginBottom: '20px',
        backgroundColor: '#000'
      }}>
        {grid.map((fila, i) => (
          <div key={i} style={{ display: 'flex' }}>
            {fila.map((celda, j) => (
              <div
                key={j}
                style={{
                  width: '35px',
                  height: '35px',
                  border: '1px solid #999',
                  backgroundColor: celda.bloqueado ? '#000' : '#fff',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {celda.numero && (
                  <span style={{
                    position: 'absolute',
                    top: '1px',
                    left: '3px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: '#666'
                  }}>
                    {celda.numero}
                  </span>
                )}
                {!celda.bloqueado && (
                  <input
                    type="text"
                    maxLength="1"
                    value={celda.letra}
                    onChange={(e) => handleInputChange(i, j, e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      padding: '0'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div>
          <h3>➡️ Horizontales</h3>
          {pistas.horizontal.map((p) => (
            <div key={p.numero} style={{ marginBottom: '10px', fontSize: '14px' }}>
              <strong>{p.numero}.</strong> {p.pista}
            </div>
          ))}
        </div>
        <div>
          <h3>⬇️ Verticales</h3>
          {pistas.vertical.map((p) => (
            <div key={p.numero} style={{ marginBottom: '10px', fontSize: '14px' }}>
              <strong>{p.numero}.</strong> {p.pista}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
        <button
          onClick={verificarRespuestas}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ✓ Verificar Respuestas
        </button>
        <button
          onClick={mostrarRespuestas}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#ffc107',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          💡 Mostrar Respuestas
        </button>
      </div>
    </div>
  );
}

export default CrucigramaGrid;