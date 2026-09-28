import React from "react";
import { AlertCircle } from "lucide-react";

// Message d'erreur affiché sous un champ de formulaire. Le champ lui-même reçoit
// aria-invalid pour la bordure rouge (règle globale dans index.css).
const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
      <AlertCircle size={12} className="shrink-0" /> {message}
    </p>
  ) : null;

export default FieldError;
