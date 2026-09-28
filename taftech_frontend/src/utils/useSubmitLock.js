import { useCallback, useRef, useState } from "react";

// Bloque un formulaire pendant l'appel serveur : évite le double envoi (double-clic)
// et permet de désactiver le bouton. Usage : const [busy, lock] = useSubmitLock();
// <form onSubmit={lock(handleSubmit)}> … <button type="submit" disabled={busy}>
export const useSubmitLock = () => {
  const [busy, setBusy] = useState(false);
  const enCours = useRef(false);
  const lock = useCallback((handler) => async (e) => {
    if (enCours.current) {
      e?.preventDefault?.();
      return;
    }
    enCours.current = true;
    setBusy(true);
    try {
      return await handler(e);
    } finally {
      enCours.current = false;
      setBusy(false);
    }
  }, []);
  return [busy, lock];
};
