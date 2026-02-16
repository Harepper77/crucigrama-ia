import React, { useState, useEffect, useRef } from 'react';
import { generarCrucigramaConCruces } from './crucigramaAlgorithm';
import { guardarEstadisticasPartida } from './analyticsService';

function CrucigramaGrid({ palabras }) {
  const [grid, setGrid] = useState([]);
  const [pistas, setPistas] = useState({ horizontal: [], vertical: [] });
  const [loading, setLoading] = useState(true);
  const [celdaActiva, setCeldaActiva] = useState(null);
  const [direccionActiva, setDireccionActiva] = useState('horizontal');
  const [palabraActiva, setPalabraActiva] = useState(null);
  const inputRefs = useRef({});
  const [timerIniciado, setTimerIniciado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [usoDePistas, setUsoDePistas] = useState(0);
  const [puntuacion, setPuntuacion] = useState(null);

  useEffect(() => {
    if (palabras && palabras.length > 0) {
      generarGridConCruces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palabras]);

  useEffect(() => {
    if (celdaActiva) {
      calcularPalabraActiva();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celdaActiva, direccionActiva]);

  useEffect(() => {
    let interval = null;
    if (timerIniciado && !loading) {
      interval = setInterval(() => {
        setSegundos(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerIniciado, loading]);

  const generarGridConCruces = () => {
    setLoading(true);
    
    setTimeout(() => {
      const resultado = generarCrucigramaConCruces(palabras);
      
      if (resultado) {
        // Crear una copia mutable del grid
        const gridMutable = resultado.grid.map(row => row.map(cell => ({...cell})));

        // Agrupar por número para manejar palabras que comparten celda inicial
        const palabrasPorNumero = {};
        resultado.palabrasColocadas.forEach(p => {
          if (!palabrasPorNumero[p.numero]) {
            palabrasPorNumero[p.numero] = [];
          }
          palabrasPorNumero[p.numero].push(p);
        });

        // Reasignar números únicos a palabras que compartan número
        let nuevoNumero = 1;
        const palabrasConNumerosUnicos = [];

        Object.keys(palabrasPorNumero)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .forEach(num => {
            const palabrasEnNumero = palabrasPorNumero[num];
            palabrasEnNumero.forEach(p => {
              palabrasConNumerosUnicos.push({
                ...p,
                numeroOriginal: p.numero,
                numero: nuevoNumero
              });
              
              // Actualizar el número en el grid mutable
              const r = p.row;
              const c = p.col;
              if (gridMutable[r] && gridMutable[r][c]) {
                gridMutable[r][c].numero = nuevoNumero;
              }
              
              nuevoNumero++;
            });
          });

        const pistasH = palabrasConNumerosUnicos
          .filter(p => p.orientacion === 'horizontal')
          .sort((a, b) => a.numero - b.numero);

        const pistasV = palabrasConNumerosUnicos
          .filter(p => p.orientacion === 'vertical')
          .sort((a, b) => a.numero - b.numero);

        setGrid(gridMutable); // Usar el grid modificado
        setPistas({ horizontal: pistasH, vertical: pistasV });

        console.log(`Pistas: ${pistasH.length} horizontales, ${pistasV.length} verticales`);
        console.log(`Crucigrama generado con ${resultado.cruces} cruces`);
      } else {
        alert('No se pudo generar el crucigrama. Intenta con otro tema.');
      }
      
      setLoading(false);
    }, 100);
  };

  const calcularPalabraActiva = () => {
    if (!celdaActiva) return;

    const todasLasPalabras = [...pistas.horizontal, ...pistas.vertical];
    const palabrasEnCelda = todasLasPalabras.filter(p => {
      if (p.orientacion === direccionActiva) {
        if (direccionActiva === 'horizontal') {
          return p.row === celdaActiva.row && 
                 celdaActiva.col >= p.col && 
                 celdaActiva.col < p.col + p.palabra.length;
        } else {
          return p.col === celdaActiva.col && 
                 celdaActiva.row >= p.row && 
                 celdaActiva.row < p.row + p.palabra.length;
        }
      }
      return false;
    });

    if (palabrasEnCelda.length > 0) {
      setPalabraActiva(palabrasEnCelda[0]);
    }
  };

  const handleCeldaClick = (row, col) => {
    if (grid[row][col].bloqueado) return;

    if (celdaActiva && celdaActiva.row === row && celdaActiva.col === col) {
      setDireccionActiva(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
    } else {
      setCeldaActiva({ row, col });
    }
  };

  const handleInputChange = (fila, col, valor, e) => {
    if (!timerIniciado && valor.length > 0) {
      setTimerIniciado(true);
    }
    
    if (e) {
      e.preventDefault();
    }

    if (valor.length === 0) {
      const nuevoGrid = grid.map(row => [...row]);
      nuevoGrid[fila][col] = {
        ...nuevoGrid[fila][col],
        letra: ''
      };
      setGrid(nuevoGrid);
      moverCelda(fila, col, 'atras');
      return;
    }

    const letra = valor[valor.length - 1].toUpperCase();
    
    if (grid[fila][col].letra === letra) {
      moverCelda(fila, col, 'adelante');
      return;
    }

    const nuevoGrid = grid.map(row => [...row]);
    nuevoGrid[fila][col] = {
      ...nuevoGrid[fila][col],
      letra: letra
    };
    setGrid(nuevoGrid);

    setTimeout(() => {
      moverCelda(fila, col, 'adelante');
    }, 0);
  };

  const moverCelda = (row, col, direccion) => {
    if (!palabraActiva) return;

    let nuevaRow = row;
    let nuevaCol = col;
    let intentos = 0;
    const maxIntentos = palabraActiva.palabra.length;

    while (intentos < maxIntentos) {
      if (direccionActiva === 'horizontal') {
        nuevaCol = direccion === 'adelante' ? nuevaCol + 1 : nuevaCol - 1;
      } else {
        nuevaRow = direccion === 'adelante' ? nuevaRow + 1 : nuevaRow - 1;
      }

      if (nuevaRow < 0 || nuevaRow >= grid.length || 
          nuevaCol < 0 || nuevaCol >= grid[0].length) {
        return;
      }

      if (grid[nuevaRow][nuevaCol].bloqueado) {
        return;
      }

      const dentroDeWord = direccionActiva === 'horizontal'
        ? nuevaRow === palabraActiva.row && 
          nuevaCol >= palabraActiva.col && 
          nuevaCol < palabraActiva.col + palabraActiva.palabra.length
        : nuevaCol === palabraActiva.col && 
          nuevaRow >= palabraActiva.row && 
          nuevaRow < palabraActiva.row + palabraActiva.palabra.length;

      if (!dentroDeWord) {
        return;
      }

      if (!grid[nuevaRow][nuevaCol].letra) {
        setCeldaActiva({ row: nuevaRow, col: nuevaCol });
        
        const key = `${nuevaRow}-${nuevaCol}`;
        if (inputRefs.current[key]) {
          inputRefs.current[key].focus();
        }
        return;
      }

      intentos++;
    }
  };

  const handleKeyDown = (e, row, col) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setDireccionActiva('horizontal');
      moverCelda(row, col, 'adelante');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setDireccionActiva('horizontal');
      moverCelda(row, col, 'atras');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDireccionActiva('vertical');
      moverCelda(row, col, 'adelante');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDireccionActiva('vertical');
      moverCelda(row, col, 'atras');
    } else if (e.key === 'Backspace' && !grid[row][col].letra) {
      e.preventDefault();
      moverCelda(row, col, 'atras');
    }
  };

  const esCeldaEnPalabraActiva = (row, col) => {
    if (!palabraActiva) return false;

    if (palabraActiva.orientacion === 'horizontal') {
      return palabraActiva.row === row && 
             col >= palabraActiva.col && 
             col < palabraActiva.col + palabraActiva.palabra.length;
    } else {
      return palabraActiva.col === col && 
             row >= palabraActiva.row && 
             row < palabraActiva.row + palabraActiva.palabra.length;
    }
  };

  const esPalabraCompleta = (palabra) => {
    if (!palabra) return false;
    
    for (let i = 0; i < palabra.palabra.length; i++) {
      const r = palabra.orientacion === 'horizontal' ? palabra.row : palabra.row + i;
      const c = palabra.orientacion === 'horizontal' ? palabra.col + i : palabra.col;
      
      if (grid[r] && grid[r][c]) {
        if (grid[r][c].letra !== grid[r][c].letraCorrecta) {
          return false;
        }
      } else {
        return false;
      }
    }
    
    return true;
  };

  const esCeldaEnPalabraCompleta = (row, col) => {
    const todasLasPalabras = [...pistas.horizontal, ...pistas.vertical];
    
    for (const palabra of todasLasPalabras) {
      if (esPalabraCompleta(palabra)) {
        if (palabra.orientacion === 'horizontal') {
          if (palabra.row === row && col >= palabra.col && col < palabra.col + palabra.palabra.length) {
            return true;
          }
        } else {
          if (palabra.col === col && row >= palabra.row && row < palabra.row + palabra.palabra.length) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  const verificarRespuestas = async () => {
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
    
    const puntosPorLetra = 10;
    const puntosBase = correctas * puntosPorLetra;
    
    const tiempoEnMinutos = segundos / 60;
    let bonusVelocidad = 0;
    if (porcentaje === 100) {
      bonusVelocidad = Math.max(0, Math.round(500 - (tiempoEnMinutos * 50)));
    }
    
    const penalizacionPistas = usoDePistas * 100;
    const bonusCompleto = (porcentaje === 100 && usoDePistas === 0) ? 300 : 0;
    const puntosFinales = Math.max(0, puntosBase + bonusVelocidad + bonusCompleto - penalizacionPistas);
    
    setPuntuacion({
      correctas,
      total,
      porcentaje,
      tiempo: segundos,
      puntosBase,
      bonusVelocidad,
      bonusCompleto,
      penalizacionPistas,
      puntosFinales
    });
    
    setTimerIniciado(false);

    // Guardar estadísticas en Firebase
    try {
    await guardarEstadisticasPartida({
        tema: 'General', // Podemos mejorar esto después pasando el tema desde Generator
        correctas,
        total,
        porcentaje,
        tiempo: segundos,
        puntosFinales,
        usoDePistas
    });
    console.log('✅ Estadísticas guardadas en Firebase');
    } catch (error) {
    console.error('Error guardando estadísticas:', error);
    }
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
    setUsoDePistas(prev => prev + 1);
    setTimerIniciado(false);
  };

  const formatearTiempo = (segs) => {
    const minutos = Math.floor(segs / 60);
    const segundosRestantes = segs % 60;
    return `${minutos}:${segundosRestantes.toString().padStart(2, '0')}`;
  };

  if (loading || grid.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>🧩 Generando crucigrama con cruces reales...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Esto puede tomar unos segundos</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <h2>🎯 Crucigrama Generado</h2>
      
      {/* Timer */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            ⏱️ {formatearTiempo(segundos)}
          </span>
          {!timerIniciado && segundos === 0 && (
            <span style={{ marginLeft: '10px', color: '#666', fontSize: '14px' }}>
              Comienza a escribir para iniciar el timer
            </span>
          )}
        </div>
        {usoDePistas > 0 && (
          <div style={{ color: '#dc3545', fontSize: '14px' }}>
            💡 Pistas usadas: {usoDePistas} (-{usoDePistas * 100} pts)
          </div>
        )}
      </div>
      
      <p style={{ color: '#666', marginBottom: '10px' }}>
        Grid de {grid.length}x{grid[0].length} • {pistas.horizontal.length} horizontales • {pistas.vertical.length} verticales
      </p>
      <p style={{ color: '#999', fontSize: '13px', marginBottom: '20px' }}>
        💡 Usa las flechas del teclado para navegar • Clic en una celda para cambiar dirección
      </p>
      
      {/* Grid */}
      <div style={{ 
        display: 'inline-block', 
        border: '2px solid #333',
        marginBottom: '20px',
        backgroundColor: '#000'
      }}>
        {grid.map((fila, i) => (
          <div key={i} style={{ display: 'flex' }}>
            {fila.map((celda, j) => {
              const key = `${i}-${j}`;
              const esActiva = celdaActiva && celdaActiva.row === i && celdaActiva.col === j;
              const enPalabraActiva = esCeldaEnPalabraActiva(i, j);
              const enPalabraCompleta = esCeldaEnPalabraCompleta(i, j);
              
              return (
                <div
                  key={j}
                  onClick={() => handleCeldaClick(i, j)}
                  style={{
                    width: '35px',
                    height: '35px',
                    border: '1px solid #999',
                    backgroundColor: celda.bloqueado ? '#000' : 
                                    esActiva ? '#FFD700' : 
                                    enPalabraCompleta ? '#90EE90' :
                                    enPalabraActiva ? '#E8F4FD' : '#fff',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: celda.bloqueado ? 'default' : 'pointer'
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
                      ref={el => inputRefs.current[key] = el}
                      type="text"
                      maxLength="1"
                      value={celda.letra}
                      onChange={(e) => handleInputChange(i, j, e.target.value, e)}
                      onKeyDown={(e) => handleKeyDown(e, i, j)}
                      onFocus={() => setCeldaActiva({ row: i, col: j })}
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
                        padding: '0',
                        cursor: 'pointer'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Pistas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div>
          <h3>➡️ Horizontales ({pistas.horizontal.length})</h3>
          {pistas.horizontal.map((p) => (
            <div key={`h-${p.numero}`} style={{ marginBottom: '10px', fontSize: '14px' }}>
              <strong>{p.numero}.</strong> {p.pista || '❌ PISTA FALTANTE'}
              {!p.pista && <span style={{ color: 'red', fontSize: '11px' }}> (palabra: {p.palabra})</span>}
            </div>
          ))}
        </div>
        <div>
          <h3>⬇️ Verticales ({pistas.vertical.length})</h3>
          {pistas.vertical.map((p) => (
            <div key={`v-${p.numero}`} style={{ marginBottom: '10px', fontSize: '14px' }}>
              <strong>{p.numero}.</strong> {p.pista || '❌ PISTA FALTANTE'}
              {!p.pista && <span style={{ color: 'red', fontSize: '11px' }}> (palabra: {p.palabra})</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Puntuación Mejorado */}
      {puntuacion && (
        <div 
          onClick={() => setPuntuacion(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-in'
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(50px) scale(0.9);
              }
              to { 
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            @keyframes confetti {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
            }
            .confetti {
              position: absolute;
              width: 10px;
              height: 10px;
              background: #f0f;
              animation: confetti 3s ease-out forwards;
            }
          `}</style>
          
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative',
              animation: 'slideUp 0.4s ease-out',
              border: puntuacion.porcentaje === 100 ? '3px solid #FFD700' : 'none'
            }}
          >
            {puntuacion.porcentaje === 100 && (
              <>
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: '-20px',
                      background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)],
                      animationDelay: `${Math.random() * 0.5}s`
                    }}
                  />
                ))}
              </>
            )}
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '10px' }}>
                {puntuacion.porcentaje === 100 ? '🏆' : puntuacion.porcentaje >= 80 ? '🎉' : puntuacion.porcentaje >= 60 ? '👍' : '📊'}
              </div>
              <h2 style={{ margin: 0, color: '#333', fontSize: '28px' }}>
                {puntuacion.porcentaje === 100 ? '¡Perfecto!' : 
                 puntuacion.porcentaje >= 80 ? '¡Excelente!' :
                 puntuacion.porcentaje >= 60 ? '¡Bien hecho!' : 'Resultados'}
              </h2>
            </div>
            
            <div style={{ 
              fontSize: '20px', 
              marginBottom: '25px',
              textAlign: 'center',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px'
            }}>
              <strong style={{ fontSize: '32px', color: '#007bff' }}>{puntuacion.correctas}</strong>
              <span style={{ margin: '0 8px' }}>de</span>
              <strong style={{ fontSize: '32px', color: '#6c757d' }}>{puntuacion.total}</strong>
              <div style={{ marginTop: '8px', fontSize: '16px', color: '#666' }}>
                ({puntuacion.porcentaje}% completado)
              </div>
            </div>
            
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '12px', 
              marginBottom: '20px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px' }}>⏱️ Tiempo</span>
                <strong style={{ fontSize: '16px' }}>{formatearTiempo(puntuacion.tiempo)}</strong>
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px' }}>✍️ Letras correctas</span>
                <strong style={{ fontSize: '16px', color: '#007bff' }}>+{puntuacion.puntosBase} pts</strong>
              </div>
              {puntuacion.bonusVelocidad > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px' }}>⚡ Bonus velocidad</span>
                  <strong style={{ fontSize: '16px', color: '#28a745' }}>+{puntuacion.bonusVelocidad} pts</strong>
                </div>
              )}
              {puntuacion.bonusCompleto > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px' }}>🏆 Sin ayuda</span>
                  <strong style={{ fontSize: '16px', color: '#28a745' }}>+{puntuacion.bonusCompleto} pts</strong>
                </div>
              )}
              {puntuacion.penalizacionPistas > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px' }}>💡 Pistas usadas</span>
                  <strong style={{ fontSize: '16px', color: '#dc3545' }}>-{puntuacion.penalizacionPistas} pts</strong>
                </div>
              )}
            </div>
            
            <div style={{ 
              fontSize: '48px', 
              fontWeight: 'bold', 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '25px',
              padding: '10px'
            }}>
              {puntuacion.puntosFinales} puntos
            </div>
            
            <button
              onClick={() => setPuntuacion(null)}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Botones */}
      <div style={{ marginTop: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
            onClick={verificarRespuestas}
            style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            flex: '1',
            minWidth: '180px'
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
            cursor: 'pointer',
            flex: '1',
            minWidth: '180px'
            }}
        >
            💡 Mostrar Respuestas
        </button>
        <button
            onClick={() => window.location.reload()}
            style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            flex: '1',
            minWidth: '180px'
            }}
        >
            🔄 Nuevo Crucigrama
        </button>
        </div>
    </div>
  );
}

export default CrucigramaGrid;