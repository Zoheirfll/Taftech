// Colonne de gauche de la CVthèque : compteur, squelettes, états vides, cartes candidats et pagination.
import React from "react";
import { ChevronLeft, ChevronRight, Star, User } from "lucide-react";
import { tw } from "../../../theme";
import { OPTIONS_TRI } from "./cvthequeUtils";
import { CarteCandidat } from "./CarteCandidat";

export const ListeCandidats = ({
  loading,
  candidats,
  totalCandidats,
  totalPages,
  currentPage,
  setCurrentPage,
  tri,
  offreId,
  activeTab,
  filtresActifs,
  constants,
  accesCoordonnees,
  selectedCandidat,
  onSelect,
  onToggleFavori,
  onOuvrirInvitation,
  onResetFiltres,
}) => (
  <div className="lg:col-span-5 space-y-3">
    {/* Compteur intégré en haut de liste */}
    <div className="flex items-center justify-between px-1">
      <p className={`text-xs ${tw.bodyText}`}>
        {loading ? "Recherche…" : <><span className={`font-semibold ${tw.bodyText}`}>{totalCandidats}</span> {totalCandidats > 1 ? "profils" : "profil"}</>}
      </p>
      {!offreId && !loading && (
        <p className={`text-xs ${tw.textMuted}`}>Tri : {OPTIONS_TRI.find(o => o.value === tri)?.label}</p>
      )}
    </div>

    {loading ? (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`${tw.cardColors} rounded-xl p-4 animate-pulse`}>
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-lg shrink-0 ${tw.bgSlate200}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-3 rounded w-3/4 ${tw.bgSlate200}`} />
                <div className={`h-2.5 rounded w-1/2 ${tw.surfaceSubtle}`} />
                <div className="flex gap-1.5 mt-1">
                  <div className={`h-2 rounded w-16 ${tw.surfaceSubtle}`} />
                  <div className={`h-2 rounded w-20 ${tw.surfaceSubtle}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : candidats.length === 0 ? (
      <div className={`${tw.cardColors} rounded-xl p-8 text-center`}>
        {activeTab === "favoris" ? (
          <>
            <Star size={32} className={`${tw.textSubtle} mx-auto mb-3`} />
            <p className={`text-sm font-medium ${tw.textStrong}`}>
              Aucun favori pour l'instant
            </p>
            <p className={`text-xs mt-1 ${tw.textMuted}`}>
              Cliquez sur l'étoile d'un profil pour l'ajouter ici
            </p>
          </>
        ) : (
          <>
            <User size={32} className={`${tw.textSubtle} mx-auto mb-3`} />
            <p className={`text-sm font-medium ${tw.textStrong}`}>
              Aucun profil trouvé
            </p>
            <p className={`text-xs mt-1 mb-4 ${tw.textMuted}`}>
              Essayez d'élargir vos critères
            </p>
            {filtresActifs > 0 && (
              <button
                type="button"
                onClick={onResetFiltres}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg ${tw.buttonSecondary}`}
              >
                Réinitialiser les filtres
              </button>
            )}
          </>
        )}
      </div>
    ) : (
      candidats.map((candidat) => (
        <CarteCandidat
          key={candidat.user_id}
          candidat={candidat}
          isSelected={selectedCandidat?.user_id === candidat.user_id}
          offreId={offreId}
          constants={constants}
          accesCoordonnees={accesCoordonnees}
          onSelect={onSelect}
          onToggleFavori={onToggleFavori}
          onOuvrirInvitation={onOuvrirInvitation}
        />
      ))
    )}

    {/* Pagination */}
    {totalPages > 1 && (
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed ${tw.textMutedHoverStrong}`}
        >
          <ChevronLeft size={16} />
          Précédent
        </button>
        <span className={`text-xs ${tw.textMuted}`}>
          Page {currentPage} / {totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((p) => Math.min(totalPages, p + 1))
          }
          disabled={currentPage === totalPages}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed ${tw.textMutedHoverStrong}`}
        >
          Suivant
          <ChevronRight size={16} />
        </button>
      </div>
    )}
  </div>
);
