/**
 * Helper per la stampa affidabile in Single Page Applications.
 * Clona l'elemento da stampare e lo posiziona direttamente alla radice del body,
 * evitando problemi di layout ereditati dai contenitori genitori (flex, scrollbar, overflow).
 */
export const printElement = (elementId: string) => {
  console.log(`printHelper: Avvio stampa dell'elemento con ID "${elementId}"...`);
  
  const element = document.getElementById(elementId);
  if (!element) {
    const errorMsg = `printHelper: Elemento "${elementId}" non trovato nel DOM.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Rimuove eventuali vecchi contenitori temporanei rimasti
  const existingContainer = document.getElementById('print-temp-container');
  if (existingContainer) {
    document.body.removeChild(existingContainer);
  }

  // Crea un contenitore temporaneo e clona l'elemento
  const printContainer = document.createElement('div');
  printContainer.id = 'print-temp-container';
  
  // Clona l'elemento per preservare il componente originale ed il suo stato
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Rimuove gli ID duplicati all'interno del clone per evitare collisioni di selettori
  clone.removeAttribute('id');
  
  printContainer.appendChild(clone);
  document.body.appendChild(printContainer);

  // Aggiunge la classe al body per attivare le regole CSS specifiche nel print media
  document.body.classList.add('printing-active');
  
  console.log("printHelper: Elemento clonato ed inserito nel body. Chiamata a window.print()...");

  let cleanupDone = false;
  const cleanup = () => {
    if (cleanupDone) return;
    cleanupDone = true;
    document.body.classList.remove('printing-active');
    if (document.body.contains(printContainer)) {
      document.body.removeChild(printContainer);
    }
    console.log("printHelper: Ripristinato layout originario e rimosso clone.");
  };

  // Registra l'evento dopo la stampa per la rimozione sicura del clone (supportato da Safari 13+)
  window.addEventListener('afterprint', cleanup, { once: true });

  try {
    window.print();
    console.log("printHelper: Stampa eseguita/inviata correttamente.");
  } catch (err) {
    console.error("printHelper: Eccezione catturata durante window.print():", err);
    cleanup();
    throw err;
  }
};
