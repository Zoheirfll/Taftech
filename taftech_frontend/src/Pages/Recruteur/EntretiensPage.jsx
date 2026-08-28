import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const clefJour = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const EntretiensPage = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moisAffiche, setMoisAffiche] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [jourSelectionne, setJourSelectionne] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await jobsService.getDashboard();
        setOffres(dash.offres || []);
      } catch (err) {
        reportError("ECHEC_LOAD_ENTRETIENS", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const entretiensParJour = useMemo(() => {
    const map = {};
    offres.forEach((o) => (o.candidatures || []).forEach((c) => {
      if (c.statut !== "ENTRETIEN" || !c.date_entretien) return;
      const d = new Date(c.date_entretien);
      const key = clefJour(d);
      if (!map[key]) map[key] = [];
      map[key].push({ ...c, offre_id: o.id, offre_titre: o.titre, date: d });
    }));
    Object.values(map).forEach((liste) => liste.sort((a, b) => a.date - b.date));
    return map;
  }, [offres]);

  const joursGrille = useMemo(() => {
    const premierJourMois = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1);
    const dernierJourMois = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 0);
    // Lundi = 0 pour l'alignement de la grille (getDay() renvoie 0=dimanche)
    const decalageDebut = (premierJourMois.getDay() + 6) % 7;
    const jours = [];
    for (let i = 0; i < decalageDebut; i++) jours.push(null);
    for (let jour = 1; jour <= dernierJourMois.getDate(); jour++) {
      jours.push(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), jour));
    }
    return jours;
  }, [moisAffiche]);

  const entretiensJourSelectionne = jourSelectionne ? (entretiensParJour[clefJour(jourSelectionne)] || []) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Entretiens</h1>
        <p className="text-sm text-slate-600 mt-1">Vue calendrier de tous les entretiens programmés.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={`lg:col-span-2 ${tw.card} p-4`}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() - 1, 1))} title="Mois précédent" className="p-1.5 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-bold text-slate-900 capitalize">{moisAffiche.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
            <button onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1))} title="Mois suivant" className="p-1.5 hover:bg-slate-100 rounded-lg">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {JOURS_SEMAINE.map((j) => <div key={j} className="text-[10px] font-semibold text-slate-500 uppercase py-1">{j}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {loading ? (
              <div className="col-span-7 py-16 text-center text-sm text-slate-500 animate-pulse">Chargement...</div>
            ) : (
              joursGrille.map((jour, i) => {
                if (!jour) return <div key={`vide-${i}`} />;
                const key = clefJour(jour);
                const entretiens = entretiensParJour[key] || [];
                const estAujourdhui = clefJour(new Date()) === key;
                const estSelectionne = jourSelectionne && clefJour(jourSelectionne) === key;
                return (
                  <button
                    key={key}
                    onClick={() => setJourSelectionne(jour)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors relative ${
                      estSelectionne ? "bg-teal-700 text-white" : estAujourdhui ? "bg-teal-50 text-teal-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {jour.getDate()}
                    {entretiens.length > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${estSelectionne ? "bg-white" : "bg-amber-500"}`} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className={`${tw.card} p-4`}>
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            {jourSelectionne ? jourSelectionne.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Sélectionnez un jour"}
          </h2>
          {!jourSelectionne ? (
            <p className="text-xs text-slate-500 italic">Cliquez sur un jour du calendrier pour voir les entretiens programmés.</p>
          ) : entretiensJourSelectionne.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Aucun entretien ce jour-là.</p>
          ) : (
            <div className="space-y-3">
              {entretiensJourSelectionne.map((c) => (
                <Link key={c.id} to={`/dashboard/offres/${c.offre_id}`} className="block p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-teal-300 transition-colors">
                  <div className="flex items-center gap-1.5 text-[11px] text-teal-700 font-bold mb-1">
                    <Clock size={12} />
                    {c.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {c.est_rapide ? `${c.prenom_rapide} ${c.nom_rapide}` : `${c.candidat?.first_name || ""} ${c.candidat?.last_name || ""}`}
                  </p>
                  <p className="text-xs text-slate-500">{c.offre_titre}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntretiensPage;
