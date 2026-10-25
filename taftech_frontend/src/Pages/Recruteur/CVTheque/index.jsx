// Page CVthèque recruteur (orchestrateur) : consentement, crédits, recherche/filtres, liste et détail des candidats.
import React from "react";
import { X } from "lucide-react";
import { tw } from "../../../theme";
import { useCVTheque } from "./useCVTheque";
import { SqueletteCVTheque, EcranConsentementCVTheque } from "./EcransAccesCVTheque";
import { BandeauCredits, OngletsCVTheque } from "./BandeauEtOnglets";
import { BarreRecherche } from "./BarreRecherche";
import { PanneauFiltres } from "./PanneauFiltres";
import { ListeCandidats } from "./ListeCandidats";
import { PanneauDetailCandidat } from "./PanneauDetailCandidat";
import { ModaleInvitation } from "./ModaleInvitation";

const CVTheque = () => {
  const cv = useCVTheque();

  if (cv.consentGiven === null) return <SqueletteCVTheque />;

  if (cv.consentGiven === false) {
    return (
      <EcranConsentementCVTheque
        consentChecked={cv.consentChecked}
        setConsentChecked={cv.setConsentChecked}
        consentLoading={cv.consentLoading}
        onAccepter={cv.handleAccepterConsentement}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <BandeauCredits creditsDisponibles={cv.creditsDisponibles} />
      <OngletsCVTheque
        activeTab={cv.activeTab}
        setActiveTab={cv.setActiveTab}
        setCurrentPage={cv.setCurrentPage}
      />

      <BarreRecherche
        showFiltres={cv.showFiltres}
        setShowFiltres={cv.setShowFiltres}
        filtresActifs={cv.filtresActifs}
        search={cv.search}
        setSearch={cv.setSearch}
        setCurrentPage={cv.setCurrentPage}
        offreId={cv.offreId}
        setOffreId={cv.setOffreId}
        tri={cv.tri}
        setTri={cv.setTri}
        showMatchingPanel={cv.showMatchingPanel}
        setShowMatchingPanel={cv.setShowMatchingPanel}
        offresActives={cv.offresActives}
      />

      {cv.showFiltres && (
        <PanneauFiltres
          constants={cv.constants}
          filtres={cv.filtres}
          setters={cv.setters}
          specialiteLibelle={cv.specialiteLibelle}
          setSpecialiteLibelle={cv.setSpecialiteLibelle}
          setCurrentPage={cv.setCurrentPage}
          rechercheAvancee={cv.rechercheAvancee}
          filtresExigence={cv.filtresExigence}
          offresActives={cv.offresActives}
          offreFiltresId={cv.offreFiltresId}
          setOffreFiltresId={cv.setOffreFiltresId}
          filtresActifs={cv.filtresActifs}
          onReset={cv.handleReset}
        />
      )}

      {/* SPLIT-VIEW : LISTE À GAUCHE + DÉTAIL À DROITE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ListeCandidats
          loading={cv.loading}
          candidats={cv.candidats}
          totalCandidats={cv.totalCandidats}
          totalPages={cv.totalPages}
          currentPage={cv.currentPage}
          setCurrentPage={cv.setCurrentPage}
          tri={cv.tri}
          offreId={cv.offreId}
          activeTab={cv.activeTab}
          filtresActifs={cv.filtresActifs}
          constants={cv.constants}
          accesCoordonnees={cv.accesCoordonnees}
          selectedCandidat={cv.selectedCandidat}
          onSelect={cv.handleSelectCandidat}
          onToggleFavori={cv.handleToggleFavori}
          onIgnorer={cv.handleIgnorer}
          onOuvrirInvitation={cv.handleOuvrirInvitation}
          onResetFiltres={cv.handleResetFiltresListe}
          debloque={cv.debloque}
          setDebloque={cv.setDebloque}
          vue={cv.vue}
          setVue={cv.setVue}
          ignores={cv.ignores}
          setIgnores={cv.setIgnores}
        />
        {cv.vue === "grille" ? (
          // Mode grille : la fiche s'ouvre dans une fenêtre au clic sur une carte (clic hors fenêtre ou croix pour fermer).
          cv.detailOuvert && cv.selectedCandidat && (
            <div className={`${tw.modalOverlay} p-4`} onClick={() => cv.setDetailOuvert(false)}>
              <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => cv.setDetailOuvert(false)}
                  aria-label="Fermer la fiche"
                  className={`absolute top-3 right-3 z-10 p-1.5 rounded-full ${tw.surface} ${tw.textMuted} shadow`}
                >
                  <X size={16} />
                </button>
                <PanneauDetailCandidat
                  detailRef={cv.detailRef}
                  candidat={cv.selectedCandidat}
                  documentsPartages={cv.documentsPartages}
                  openSections={cv.openSections}
                  toggleSection={cv.toggleSection}
                  debloquageEnCours={cv.debloquageEnCours}
                  onToggleFavori={cv.handleToggleFavori}
                  onDeverrouiller={cv.handleDeverrouillerCandidat}
                />
              </div>
            </div>
          )
        ) : (
          <PanneauDetailCandidat
            detailRef={cv.detailRef}
            candidat={cv.selectedCandidat}
            documentsPartages={cv.documentsPartages}
            openSections={cv.openSections}
            toggleSection={cv.toggleSection}
            debloquageEnCours={cv.debloquageEnCours}
            onToggleFavori={cv.handleToggleFavori}
            onDeverrouiller={cv.handleDeverrouillerCandidat}
          />
        )}
      </div>

      {cv.inviterCandidat && (
        <ModaleInvitation
          candidat={cv.inviterCandidat}
          offresActives={cv.offresActives}
          offreInvitation={cv.offreInvitation}
          setOffreInvitation={cv.setOffreInvitation}
          envoiInvitation={cv.envoiInvitation}
          onAnnuler={() => cv.setInviterCandidat(null)}
          onEnvoyer={cv.handleEnvoyerInvitation}
        />
      )}
    </div>
  );
};

export default CVTheque;
