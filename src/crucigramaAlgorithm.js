// Algoritmo para generar crucigramas con palabras que se cruzan

export function generarCrucigramaConCruces(palabras) {
  const MAX_INTENTOS = 200; // Más intentos para encontrar mejor layout con 20 palabras
  let mejorGrid = null;
  let maxCruces = -1;

  // Intentar múltiples veces para encontrar el mejor layout
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const resultado = intentarGenerarCrucigrama(palabras);
    if (resultado && resultado.cruces > maxCruces) {
      maxCruces = resultado.cruces;
      mejorGrid = resultado;
    }
  }

  return mejorGrid;
}

function intentarGenerarCrucigrama(palabras) {
  const size = 25;
  const grid = crearGridVacio(size);
  const palabrasColocadas = [];
  let totalCruces = 0;

  // Ordenar palabras por longitud (más largas primero)
  const palabrasOrdenadas = [...palabras].sort((a, b) => b.palabra.length - a.palabra.length);

  // Colocar la primera palabra en el centro horizontal
  const primeraPalabra = palabrasOrdenadas[0];
  const startRow = Math.floor(size / 2);
  const startCol = Math.floor((size - primeraPalabra.palabra.length) / 2);
  
  if (!colocarPalabra(grid, primeraPalabra, startRow, startCol, 'horizontal', palabrasColocadas, 1)) {
    return null;
  }

  let numeroPista = 2;

  // Intentar colocar el resto de palabras - SOLO si cruzan con palabras existentes
  for (let i = 1; i < palabrasOrdenadas.length; i++) {
    const palabra = palabrasOrdenadas[i];
    let colocada = false;

    // SOLO intentar cruzar con palabras ya colocadas (NO espacios libres)
    for (const palabraBase of palabrasColocadas) {
      const cruces = encontrarPuntosDeCruce(palabra.palabra, palabraBase.palabra);
      
      for (const cruce of cruces) {
        const orientacion = palabraBase.orientacion === 'horizontal' ? 'vertical' : 'horizontal';
        let row, col;

        if (orientacion === 'vertical') {
          row = palabraBase.row - cruce.indicePalabra;
          col = palabraBase.col + cruce.indiceBase;
        } else {
          row = palabraBase.row + cruce.indiceBase;
          col = palabraBase.col - cruce.indicePalabra;
        }

        if (colocarPalabra(grid, palabra, row, col, orientacion, palabrasColocadas, numeroPista)) {
          colocada = true;
          totalCruces++;
          numeroPista++;
          break;
        }
      }

      if (colocada) break;
    }

    // NO colocar en espacios libres - si no cruza, se descarta la palabra
    // Esto garantiza que todas las palabras estén conectadas
  }

  // Solo aceptar si se colocaron al menos 12 palabras
  if (palabrasColocadas.length < 12) {
    return null;
  }

  // Recortar el grid para eliminar filas/columnas vacías
  const gridRecortado = recortarGrid(grid, palabrasColocadas);

  return {
    grid: gridRecortado.grid,
    palabrasColocadas: gridRecortado.palabrasColocadas,
    cruces: totalCruces,
    size: { rows: gridRecortado.grid.length, cols: gridRecortado.grid[0].length }
  };
}

function crearGridVacio(size) {
  return Array(size).fill(null).map(() => 
    Array(size).fill(null).map(() => ({ letra: '', bloqueado: true, letraCorrecta: '', numero: null }))
  );
}

function encontrarPuntosDeCruce(palabra1, palabra2) {
  const cruces = [];
  for (let i = 0; i < palabra1.length; i++) {
    for (let j = 0; j < palabra2.length; j++) {
      if (palabra1[i] === palabra2[j]) {
        cruces.push({ indicePalabra: i, indiceBase: j });
      }
    }
  }
  return cruces;
}

function colocarPalabra(grid, palabra, row, col, orientacion, palabrasColocadas, numeroPista) {
    const word = palabra.palabra;
    const size = grid.length;

    // Verificar límites
    if (orientacion === 'horizontal') {
        if (col < 0 || col + word.length > size || row < 0 || row >= size) return false;
    } else {
        if (row < 0 || row + word.length > size || col < 0 || col >= size) return false;
    }

    // Verificar que no haya conflictos
    for (let i = 0; i < word.length; i++) {
        const r = orientacion === 'horizontal' ? row : row + i;
        const c = orientacion === 'horizontal' ? col + i : col;
        
        const celda = grid[r][c];
        if (!celda.bloqueado && celda.letraCorrecta !== word[i]) {
        return false; // Conflicto
        }
    }

    // Verificar espacios antes y después
    if (!verificarEspaciosAdyacentes(grid, row, col, word.length, orientacion)) {
        return false;
    }

    // IMPORTANTE: Solo asignar número si la primera celda no tiene número
    // o si la orientación es diferente
    const celdaInicial = grid[row][col];
    let numeroAUsar = numeroPista;
    
    if (celdaInicial.numero) {
        // Ya hay un número, verificar si es de diferente orientación
        const palabraExistente = palabrasColocadas.find(p => 
        p.row === row && p.col === col && p.numero === celdaInicial.numero
        );
        
        if (palabraExistente && palabraExistente.orientacion !== orientacion) {
        // Usar nuevo número para esta orientación
        numeroAUsar = numeroPista;
        } else {
        // Misma orientación, no colocar
        return false;
        }
    }

    // Colocar la palabra
    for (let i = 0; i < word.length; i++) {
        const r = orientacion === 'horizontal' ? row : row + i;
        const c = orientacion === 'horizontal' ? col + i : col;
        
        if (i === 0) {
        grid[r][c] = {
            letra: '',
            bloqueado: false,
            letraCorrecta: word[i],
            numero: numeroAUsar
        };
        } else {
        grid[r][c] = {
            letra: '',
            bloqueado: false,
            letraCorrecta: word[i],
            numero: grid[r][c].numero // Mantener número existente si hay
        };
        }
    }

    palabrasColocadas.push({
        palabra: palabra.palabra,
        pista: palabra.pista,
        row,
        col,
        orientacion,
        numero: numeroAUsar
    });

    return true;
    }

function verificarEspaciosAdyacentes(grid, row, col, length, orientacion) {
  const size = grid.length;
  
  if (orientacion === 'horizontal') {
    // Verificar antes
    if (col > 0 && !grid[row][col - 1].bloqueado) return false;
    // Verificar después
    if (col + length < size && !grid[row][col + length].bloqueado) return false;
    
    // Verificar arriba y abajo de cada letra
    for (let i = 0; i < length; i++) {
      const c = col + i;
      if (row > 0 && !grid[row - 1][c].bloqueado && grid[row][c].bloqueado) return false;
      if (row < size - 1 && !grid[row + 1][c].bloqueado && grid[row][c].bloqueado) return false;
    }
  } else {
    // Verificar antes
    if (row > 0 && !grid[row - 1][col].bloqueado) return false;
    // Verificar después
    if (row + length < size && !grid[row + length][col].bloqueado) return false;
    
    // Verificar izquierda y derecha de cada letra
    for (let i = 0; i < length; i++) {
      const r = row + i;
      if (col > 0 && !grid[r][col - 1].bloqueado && grid[r][col].bloqueado) return false;
      if (col < size - 1 && !grid[r][col + 1].bloqueado && grid[r][col].bloqueado) return false;
    }
  }
  
  return true;
}

function encontrarEspacioLibre(grid, longitud, size) {
  const posiciones = [];
  
  // Buscar espacios horizontales
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - longitud; c++) {
      let valido = true;
      for (let i = 0; i < longitud; i++) {
        if (!grid[r][c + i].bloqueado) {
          valido = false;
          break;
        }
      }
      if (valido) posiciones.push({ row: r, col: c, orientacion: 'horizontal' });
    }
  }
  
  // Buscar espacios verticales
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - longitud; r++) {
      let valido = true;
      for (let i = 0; i < longitud; i++) {
        if (!grid[r + i][c].bloqueado) {
          valido = false;
          break;
        }
      }
      if (valido) posiciones.push({ row: r, col: c, orientacion: 'vertical' });
    }
  }
  
  return posiciones.length > 0 ? posiciones[Math.floor(Math.random() * posiciones.length)] : null;
}

function recortarGrid(grid, palabrasColocadas) {
  let minRow = grid.length;
  let maxRow = 0;
  let minCol = grid[0].length;
  let maxCol = 0;

  // Encontrar límites del contenido
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (!grid[r][c].bloqueado) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  // Agregar margen de 1 celda
  minRow = Math.max(0, minRow - 1);
  minCol = Math.max(0, minCol - 1);
  maxRow = Math.min(grid.length - 1, maxRow + 1);
  maxCol = Math.min(grid[0].length - 1, maxCol + 1);

  // Crear grid recortado
  const nuevoGrid = [];
  for (let r = minRow; r <= maxRow; r++) {
    const fila = [];
    for (let c = minCol; c <= maxCol; c++) {
      fila.push(grid[r][c]);
    }
    nuevoGrid.push(fila);
  }

  // Ajustar posiciones de palabras
  const palabrasAjustadas = palabrasColocadas.map(p => ({
    ...p,
    row: p.row - minRow,
    col: p.col - minCol
  }));

  return { grid: nuevoGrid, palabrasColocadas: palabrasAjustadas };
}