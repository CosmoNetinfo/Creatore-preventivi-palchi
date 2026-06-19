export interface LocationInfo {
  comune: string;
  provincia: string;
  regione: string;
}

interface ComuneData {
  nome: string;
  sigla: string;
  regione: {
    nome: string;
  };
}

let comuniCache: ComuneData[] = [];

async function loadComuni(): Promise<ComuneData[]> {
  if (comuniCache.length > 0) return comuniCache;
  try {
    const response = await fetch('/comuni-italia.json');
    if (response.ok) {
      comuniCache = await response.json();
    }
  } catch (e) {
    console.error("Failed to load comuni dataset:", e);
  }
  return comuniCache;
}

/**
 * Risolve Comune, Provincia e Regione data una località in testo libero (es. "San Giacomo di Spoleto" o "Spoleto")
 */
export const getLocationInfo = async (query: string): Promise<LocationInfo | null> => {
  if (!query || !query.trim()) return null;
  const normalizedQuery = query.toLowerCase().trim();

  const list = await loadComuni();
  if (list.length === 0) return null;

  // 1. Cerca corrispondenza esatta
  let match = list.find(c => c.nome.toLowerCase() === normalizedQuery);
  if (match) {
    return {
      comune: match.nome,
      provincia: match.sigla,
      regione: match.regione.nome
    };
  }

  // 2. Cerca se il nome del comune è contenuto nella query dell'utente
  // Es. "San Giacomo di Spoleto" contiene "Spoleto".
  // Ordiniamo per lunghezza decrescente per evitare falsi positivi più corti.
  const potentialMatches = list
    .filter(c => c.nome.length > 2 && normalizedQuery.includes(c.nome.toLowerCase()))
    .sort((a, b) => b.nome.length - a.nome.length);

  if (potentialMatches.length > 0) {
    const best = potentialMatches[0];
    return {
      comune: best.nome,
      provincia: best.sigla,
      regione: best.regione.nome
    };
  }

  // 3. Cerca come sottostringa della località
  match = list.find(c => c.nome.toLowerCase().includes(normalizedQuery));
  if (match) {
    return {
      comune: match.nome,
      provincia: match.sigla,
      regione: match.regione.nome
    };
  }

  return null;
};
