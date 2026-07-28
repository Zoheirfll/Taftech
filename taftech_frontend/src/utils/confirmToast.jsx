import React, { useEffect, useState } from "react";

// Remplace window.confirm() (popup navigateur moche, "localhost dit...") par une modale
// stylée dans le thème de l'app. Mini store maison (pas react-hot-toast.custom, qui a un
// souci de résolution ESM/CJS avec Vitest) — un seul <ConfirmModalHost /> monté à la racine
// (App.jsx) écoute et affiche la demande active.
let listeners = [];
let current = null;

function notify() {
  listeners.forEach((l) => l(current));
}

/** Ouvre la modale de confirmation. `onConfirm` n'est appelé que si l'utilisateur valide. */
export function confirmToast(message, onConfirm) {
  current = { message, onConfirm };
  notify();
}

function closeConfirm() {
  current = null;
  notify();
}

export const ConfirmModalHost = () => {
  const [request, setRequest] = useState(current);

  useEffect(() => {
    listeners.push(setRequest);
    return () => {
      listeners = listeners.filter((l) => l !== setRequest);
    };
  }, []);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <p className="text-sm font-medium text-slate-900">{request.message}</p>
        <div className="flex gap-2 justify-end mt-5">
          <button
            type="button"
            onClick={closeConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              const { onConfirm } = request;
              closeConfirm();
              onConfirm();
            }}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};
