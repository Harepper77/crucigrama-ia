import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit, updateDoc, increment, doc } from 'firebase/firestore';

// Guardar tema usado
export const guardarTemaUsado = async (tema) => {
  try {
    // Buscar si el tema ya existe
    const temasRef = collection(db, 'temas');
    const q = query(temasRef, where('nombre', '==', tema.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Tema existe, incrementar contador
      const temaDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'temas', temaDoc.id), {
        veces_usado: increment(1),
        ultima_vez: new Date()
      });
    } else {
      // Tema nuevo, crear
      await addDoc(collection(db, 'temas'), {
        nombre: tema.toLowerCase(),
        veces_usado: 1,
        primera_vez: new Date(),
        ultima_vez: new Date()
      });
    }
  } catch (error) {
    console.error('Error guardando tema:', error);
  }
};

// Guardar palabras generadas
export const guardarPalabras = async (palabras, tema) => {
  try {
    const batch = [];
    
    for (const palabra of palabras) {
      // Buscar si la palabra ya existe
      const palabrasRef = collection(db, 'palabras');
      const q = query(palabrasRef, where('palabra', '==', palabra.palabra));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Palabra existe, incrementar contador
        const palabraDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'palabras', palabraDoc.id), {
          veces_generada: increment(1),
          ultima_vez: new Date(),
          temas: [...(palabraDoc.data().temas || []), tema].filter((v, i, a) => a.indexOf(v) === i) // Evitar duplicados
        });
      } else {
        // Palabra nueva, crear
        batch.push(
          addDoc(collection(db, 'palabras'), {
            palabra: palabra.palabra,
            pista: palabra.pista,
            veces_generada: 1,
            primera_vez: new Date(),
            ultima_vez: new Date(),
            temas: [tema]
          })
        );
      }
    }

    await Promise.all(batch);
  } catch (error) {
    console.error('Error guardando palabras:', error);
  }
};

// Guardar estadísticas de partida
export const guardarEstadisticasPartida = async (stats) => {
  try {
    await addDoc(collection(db, 'partidas'), {
      tema: stats.tema,
      correctas: stats.correctas,
      total: stats.total,
      porcentaje: stats.porcentaje,
      tiempo_segundos: stats.tiempo,
      puntuacion: stats.puntosFinales,
      uso_pistas: stats.usoDePistas,
      fecha: new Date()
    });
  } catch (error) {
    console.error('Error guardando estadísticas:', error);
  }
};

// Obtener temas más usados
export const getTemasPopulares = async (limite = 10) => {
  try {
    const temasRef = collection(db, 'temas');
    const q = query(temasRef, orderBy('veces_usado', 'desc'), limit(limite));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error obteniendo temas populares:', error);
    return [];
  }
};

// Obtener palabras más repetidas
export const getPalabrasMasRepetidas = async (limite = 20) => {
  try {
    const palabrasRef = collection(db, 'palabras');
    const q = query(palabrasRef, orderBy('veces_generada', 'desc'), limit(limite));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error obteniendo palabras repetidas:', error);
    return [];
  }
};

// Calcular estadísticas generales
export const getEstadisticasGenerales = async () => {
  try {
    const [temas, palabras, partidas] = await Promise.all([
      getDocs(collection(db, 'temas')),
      getDocs(collection(db, 'palabras')),
      getDocs(collection(db, 'partidas'))
    ]);

    const totalTemas = temas.size;
    const totalPalabras = palabras.size;
    const totalPartidas = partidas.size;

    // Calcular promedios
    let sumaTiempo = 0;
    let sumaPuntuacion = 0;
    
    partidas.forEach(doc => {
      const data = doc.data();
      sumaTiempo += data.tiempo_segundos || 0;
      sumaPuntuacion += data.puntuacion || 0;
    });

    const tiempoPromedio = totalPartidas > 0 ? Math.round(sumaTiempo / totalPartidas) : 0;
    const puntuacionPromedio = totalPartidas > 0 ? Math.round(sumaPuntuacion / totalPartidas) : 0;

    return {
      totalTemas,
      totalPalabras,
      totalPartidas,
      tiempoPromedio,
      puntuacionPromedio
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas generales:', error);
    return null;
  }
};

// Obtener palabras por tema
export const getPalabrasPorTema = async (tema, limite = 50) => {
  try {
    const palabrasRef = collection(db, 'palabras');
    const q = query(
      palabrasRef, 
      where('temas', 'array-contains', tema.toLowerCase()),
      limit(limite)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error obteniendo palabras por tema:', error);
    return [];
  }
};

// Obtener palabras poco usadas de cualquier tema
export const getPalabrasPocoUsadas = async (limite = 20) => {
  try {
    const palabrasRef = collection(db, 'palabras');
    const q = query(
      palabrasRef,
      orderBy('veces_generada', 'asc'),
      limit(limite)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error obteniendo palabras poco usadas:', error);
    return [];
  }
};

// Mezclar palabras nuevas con BD
export const mezclarPalabrasConBD = async (palabrasNuevas, tema) => {
  try {
    // Obtener palabras existentes del mismo tema
    const palabrasTema = await getPalabrasPorTema(tema, 30);
    
    // Obtener palabras poco usadas de cualquier tema como relleno
    const palabrasPocoUsadas = await getPalabrasPocoUsadas(20);
    
    // Separar por frecuencia
    const pocoUsadasTema = palabrasTema.filter(p => p.veces_generada < 3);
    const comunesTema = palabrasTema.filter(p => p.veces_generada >= 3);
    
    // Calcular cuántas palabras necesitamos
    const totalNecesario = 20;
    const nuevasCount = Math.min(palabrasNuevas.length, 12);
    const restante = totalNecesario - nuevasCount;
    
    // Prioridad: poco usadas del tema > poco usadas generales > comunes del tema
    const pocoUsadasCount = Math.min(Math.floor(restante * 0.6), pocoUsadasTema.length);
    const pocoUsadasGeneralesCount = Math.min(
      Math.floor(restante * 0.3), 
      palabrasPocoUsadas.length
    );
    const comunesCount = restante - pocoUsadasCount - pocoUsadasGeneralesCount;
    
    // Mezclar
    const palabrasFinales = [
      ...palabrasNuevas.slice(0, nuevasCount),
      ...pocoUsadasTema.slice(0, pocoUsadasCount),
      ...palabrasPocoUsadas.slice(0, pocoUsadasGeneralesCount),
      ...comunesTema.slice(0, comunesCount)
    ];
    
    // Shuffle para que no estén ordenadas
    const shuffled = palabrasFinales.sort(() => Math.random() - 0.5);
    
    console.log(`📊 Mezcla de palabras:
    - Nuevas: ${nuevasCount}
    - Poco usadas (tema): ${pocoUsadasCount}
    - Poco usadas (general): ${pocoUsadasGeneralesCount}
    - Comunes (tema): ${comunesCount}
    - Total: ${shuffled.length}`);
    
    return shuffled.slice(0, 20); // Asegurar que sean exactamente 20
  } catch (error) {
    console.error('Error mezclando palabras:', error);
    return palabrasNuevas.slice(0, 20); // Fallback: solo usar nuevas
  }
};