import React, { useState } from "react";
import api from "../api/axiosConfig";

const RegisterCandidat = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    nin: "",
    consentement_loi_18_07: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("accounts/register/candidat/", formData);
      alert("Compte créé ! Bienvenue sur TafTech.");
    } catch (err) {
      console.error(err.response.data);
      alert("Vérifiez vos informations (NIN à 18 chiffres, etc.)");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-blue-600 mb-6 text-center">
          TafTech 🇩🇿
        </h1>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Inscription Candidat
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
          />
          <input
            type="email"
            placeholder="Email professionnel ou personnel"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="Mot de passe (8 caractères min)"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="NIN (Numéro d'Identification National)"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
          />

          <div className="flex items-start space-x-2 py-2">
            <input
              type="checkbox"
              className="mt-1"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  consentement_loi_18_07: e.target.checked,
                })
              }
            />
            <p className="text-sm text-gray-600">
              J'accepte que mes données soient traitées conformément à la{" "}
              <b>Loi 18-07</b> relative à la protection des personnes physiques.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Créer mon compte
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterCandidat;
