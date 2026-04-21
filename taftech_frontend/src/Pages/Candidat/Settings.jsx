import React, { useState } from "react";
import toast from "react-hot-toast";

const Settings = () => {
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return toast.error("Les nouveaux mots de passe ne correspondent pas.");
    }
    toast.success("Demande de changement envoyée (Backend à connecter)");
  };

  return (
    <div className="max-w-4xl space-y-8 animate-fadeIn">
      <h1 className="text-3xl font-black text-gray-900 tracking-tight">
        Paramètres
      </h1>

      {/* BLOC NOTIFICATIONS */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <h2 className="text-lg font-black text-gray-800 mb-6">
          Gérer mes notifications
        </h2>
        <div className="space-y-6">
          {[
            {
              t: "Offres exclusives",
              d: "Reçois des offres spéciales de nos partenaires.",
            },
            {
              t: "Actualité et newsletter",
              d: "Découvre les tendances du marché et astuces pro.",
            },
            {
              t: "Emails de mise à jour",
              d: "Nouveautés et améliorations de TafTech.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0"
            >
              <div>
                <p className="font-bold text-gray-800 text-sm">{item.t}</p>
                <p className="text-xs text-gray-400 font-medium">{item.d}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked={i === 0}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* BLOC MOT DE PASSE */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <h2 className="text-lg font-black text-gray-800 mb-6">
          Modifier mon mot de passe
        </h2>
        <form
          onSubmit={handleUpdatePassword}
          className="flex flex-col md:flex-row gap-4"
        >
          <input
            type="password"
            placeholder="Mot de passe actuel"
            className="flex-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setPasswords({ ...passwords, old: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="Nouveau"
            className="flex-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setPasswords({ ...passwords, new: e.target.value })
            }
          />
          <button
            type="submit"
            className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-black transition-all"
          >
            MODIFIER
          </button>
        </form>
      </section>

      {/* BLOC SUPPRESSION */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-red-50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-red-600">Gérer mon compte</h2>
          <p className="text-xs text-gray-400 font-medium">
            Attention, cette action est irréversible.
          </p>
        </div>
        <button className="text-red-500 font-black text-sm hover:underline uppercase tracking-widest">
          Supprimer mon compte
        </button>
      </section>
    </div>
  );
};

export default Settings;
