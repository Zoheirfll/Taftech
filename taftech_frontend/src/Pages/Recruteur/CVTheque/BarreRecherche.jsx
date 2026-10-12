// Barre de recherche de la CVthèque : bouton filtres, mots-clés, tri et panneau "Matching IA" par offre.
import React from "react";
import Select from "react-select";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronRight,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import { OPTIONS_TRI } from "./cvthequeUtils";

export const BarreRecherche = ({
  showFiltres,
  setShowFiltres,
  filtresActifs,
  search,
  setSearch,
  setCurrentPage,
  offreId,
  setOffreId,
  tri,
  setTri,
  showMatchingPanel,
  setShowMatchingPanel,
  offresActives,
}) => (
  <>
    {/* BARRE DE RECHERCHE + BOUTON FILTRES */}
    <div className="flex flex-col md:flex-row gap-3 mb-4">
      <button
        onClick={() => setShowFiltres(!showFiltres)}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors border ${tw.buttonFilterOutline}`}
      >
        <SlidersHorizontal size={16} />
        Filtres
        {filtresActifs > 0 && (
          <span className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full ${tw.bgTeal} ${tw.textOnDark}`}>
            {filtresActifs}
          </span>
        )}
      </button>

      <div className="flex-1 relative">
        <Search
          size={18}
          className={`absolute left-4 top-1/2 -translate-y-1/2 ${tw.textMuted}`}
        />
        <input
          type="text"
          placeholder="Mots clés, métier, poste..."
          className={`w-full pl-11 pr-4 py-2.5 rounded-xl text-sm ${tw.inputColorsWhiteTeal}`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {!offreId && (
        <Select
          options={OPTIONS_TRI}
          value={OPTIONS_TRI.find((o) => o.value === tri)}
          onChange={(val) => setTri(val.value)}
          styles={selectStylesTeal}
          isSearchable={false}
          className="md:w-48"
        />
      )}

      <div className="relative shrink-0">
        <button
          onClick={() => setShowMatchingPanel(p => !p)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            offreId
              ? tw.chipTealActive
              : tw.chipTealInactive
          }`}
        >
          <Zap size={15} />
          {offreId ? "Matching actif" : "Matching IA"}
          {offreId
            ? <button onClick={(e) => { e.stopPropagation(); setOffreId(""); setShowMatchingPanel(false); }} className="ml-1 opacity-70 hover:opacity-100"><X size={13} /></button>
            : <ChevronRight size={13} className={`transition-transform ${showMatchingPanel ? "rotate-90" : ""}`} />
          }
        </button>

        {showMatchingPanel && (
          <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-xl z-30 p-4 ${tw.cardColors}`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={15} className={tw.textTeal} />
              <p className={`text-sm font-bold ${tw.textTeal800}`}>Matching IA</p>
              <button onClick={() => setShowMatchingPanel(false)} className={`ml-auto ${tw.textMuted}`}><X size={14} /></button>
            </div>
            <p className={`text-xs mb-3 ${tw.bodyText}`}>Choisissez une offre pour trier les candidats par compatibilité automatique.</p>
            <Select
              options={[{ value: "", label: "Choisir une offre…" }, ...offresActives]}
              value={offresActives.find(o => o.value === offreId) || null}
              onChange={(val) => { setOffreId(val?.value || ""); setCurrentPage(1); if (val?.value) setShowMatchingPanel(false); }}
              styles={selectStylesTeal}
              placeholder="Choisir une offre…"
              menuPosition="fixed"
            />
            {offreId && (
              <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${tw.textTeal}`}>
                <CheckCircle2 size={13} className={tw.textTeal600} />
                Actif : {offresActives.find(o => o.value === offreId)?.label}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {offreId && (
      <div className={`mb-4 flex items-center gap-2 ${tw.bgTealSoft} border ${tw.borderTeal200} rounded-xl px-4 py-2`}>
        <Zap size={14} className={`${tw.textTeal} shrink-0`} />
        <span className={`text-sm font-semibold ${tw.textTeal800}`}>Matching actif — <span className={`font-normal ${tw.textTeal}`}>{offresActives.find(o => o.value === offreId)?.label}</span></span>
        <button onClick={() => setOffreId("")} className={`ml-auto ${tw.closeLinkTeal}`}><X size={14} /></button>
      </div>
    )}
  </>
);
