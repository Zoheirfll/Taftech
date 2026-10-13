// Panneau de filtres avancés de la CVthèque (listes, champs libres, filtres rapides en pastilles).
import React from "react";
import { Link } from "react-router-dom";
import Select from "react-select";
import { CheckCircle2, Sparkles } from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import { MetierAutocomplete } from "../../../Components/MetierAutocomplete";
import { OPTIONS_EXPERIENCE } from "./cvthequeUtils";

// Pastille de filtre rapide (bascule on/off).
const ChipFiltre = ({ actif, onToggle, children }) => (
  <button
    onClick={onToggle}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      actif ? tw.chipTealActiveAlt : tw.chipNeutralInactive
    }`}
  >
    {actif && <CheckCircle2 size={14} />}
    {children}
  </button>
);

export const PanneauFiltres = ({
  constants,
  filtres,
  setters,
  specialiteLibelle,
  setSpecialiteLibelle,
  setCurrentPage,
  rechercheAvancee,
  filtresActifs,
  onReset,
}) => {
  const {
    wilaya, diplome, experience, mobilite, disponibilite, langues,
    competencesFiltre, permis, vehicule, passeport, serviceMilitaire,
    niveauExperience, avecPhoto, avecCV, inscritRecent,
  } = filtres;
  const {
    setWilaya, setSpecialite, setDiplome, setExperience, setMobilite,
    setDisponibilite, setLangues, setCompetencesFiltre, setPermis, setVehicule,
    setPasseport, setServiceMilitaire, setNiveauExperience, setAvecPhoto,
    setAvecCV, setInscritRecent,
  } = setters;

  return (
    <div className={`${tw.cardColors} rounded-2xl p-5 mb-6`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Select
          options={constants.wilayas}
          placeholder="Wilaya"
          isClearable
          value={constants.wilayas.find((w) => w.value === wilaya) || null}
          onChange={(val) => {
            setWilaya(val ? val.value : "");
            setCurrentPage(1);
          }}
          styles={selectStylesTeal}
        />
        <div className="min-w-55">
          <MetierAutocomplete
            value={specialiteLibelle}
            placeholder="Métier..."
            onSelect={(item) => {
              setSpecialite(String(item.metier_id));
              setSpecialiteLibelle(item.appellation_libelle);
              setCurrentPage(1);
            }}
          />
        </div>
        <Select
          options={constants.diplomes}
          placeholder="Diplôme"
          isClearable
          value={
            constants.diplomes.find((d) => d.value === diplome) || null
          }
          onChange={(val) => {
            setDiplome(val ? val.value : "");
            setCurrentPage(1);
          }}
          styles={selectStylesTeal}
        />
        <Select
          options={OPTIONS_EXPERIENCE}
          placeholder="Expérience minimum"
          isClearable
          value={
            OPTIONS_EXPERIENCE.find((e) => e.value === experience) || null
          }
          onChange={(val) => {
            setExperience(val ? val.value : "");
            setCurrentPage(1);
          }}
          styles={selectStylesTeal}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Select
          options={constants.mobilites || []}
          placeholder="Mobilité"
          isClearable
          value={(constants.mobilites || []).find((m) => m.value === mobilite) || null}
          onChange={(val) => {
            setMobilite(val ? val.value : "");
            setCurrentPage(1);
          }}
          styles={selectStylesTeal}
        />
        <Select
          options={constants.disponibilites || []}
          placeholder="Disponibilité"
          isClearable
          value={(constants.disponibilites || []).find((d) => d.value === disponibilite) || null}
          onChange={(val) => {
            setDisponibilite(val ? val.value : "");
            setCurrentPage(1);
          }}
          styles={selectStylesTeal}
        />
        <input
          type="text"
          value={langues}
          onChange={(e) => { setLangues(e.target.value); setCurrentPage(1); }}
          placeholder={rechercheAvancee ? "Langue" : "Langue (palier Business+)"}
          disabled={!rechercheAvancee}
          title={!rechercheAvancee ? "Filtre réservé au palier Business ou supérieur" : undefined}
          className={`${tw.input} ${!rechercheAvancee ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        <input
          type="text"
          value={competencesFiltre}
          onChange={(e) => { setCompetencesFiltre(e.target.value); setCurrentPage(1); }}
          placeholder={rechercheAvancee ? "Compétence" : "Compétence (palier Business+)"}
          disabled={!rechercheAvancee}
          title={!rechercheAvancee ? "Filtre réservé au palier Business ou supérieur" : undefined}
          className={`${tw.input} ${!rechercheAvancee ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Select
          options={constants.experiences || []}
          placeholder={rechercheAvancee ? "Niveau d'expérience déclaré" : "Niveau d'expérience (palier Business+)"}
          isClearable
          isDisabled={!rechercheAvancee}
          value={(constants.experiences || []).find((n) => n.value === niveauExperience) || null}
          onChange={(val) => {
            setNiveauExperience(val ? val.value : "");
            setCurrentPage(1);
          }}
          styles={selectStylesTeal}
        />
        <Select
          options={constants.services_militaires || []}
          placeholder={rechercheAvancee ? "Service militaire" : "Service militaire (palier Business+)"}
          isClearable
          isDisabled={!rechercheAvancee}
          value={(constants.services_militaires || []).find((s) => s.value === serviceMilitaire) || null}
          onChange={(val) => {
            setServiceMilitaire(val ? val.value : "");
            setCurrentPage(1);
          }}
          styles={selectStylesTeal}
        />
      </div>
      {!rechercheAvancee && (
        <p className={`text-xs ${tw.textMuted} -mt-2 mb-4`}>
          🔒 Filtres langues/compétences/expérience/service militaire réservés au palier Business ou supérieur.{" "}
          <Link to="/recruteurs/abonnements" className="text-teal-700 font-semibold hover:underline">Voir les paliers</Link>
        </p>
      )}

      {/* Filtres rapides en checkboxes */}
      <div className={`flex flex-wrap gap-2 items-center pt-3 border-t ${tw.borderSubtle}`}>
        <span className={`text-xs font-medium mr-2 ${tw.textMuted}`}>
          Filtres rapides :
        </span>
        <ChipFiltre actif={avecPhoto} onToggle={() => setAvecPhoto(!avecPhoto)}>
          Avec photo
        </ChipFiltre>
        <ChipFiltre actif={avecCV} onToggle={() => setAvecCV(!avecCV)}>
          Avec CV téléchargé
        </ChipFiltre>
        <ChipFiltre actif={inscritRecent} onToggle={() => setInscritRecent(!inscritRecent)}>
          <Sparkles size={12} />
          Inscrits récemment
        </ChipFiltre>
        <ChipFiltre actif={permis} onToggle={() => setPermis(!permis)}>
          Permis de conduire
        </ChipFiltre>
        <ChipFiltre actif={vehicule} onToggle={() => setVehicule(!vehicule)}>
          Véhicule personnel
        </ChipFiltre>
        <ChipFiltre actif={passeport} onToggle={() => setPasseport(!passeport)}>
          Passeport valide
        </ChipFiltre>

        {filtresActifs > 0 && (
          <button
            onClick={onReset}
            className={`ml-auto text-xs font-medium transition-colors ${tw.textMuted700HoverTeal}`}
          >
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
};
