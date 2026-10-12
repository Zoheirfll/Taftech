// Orchestrateur du tableau de bord recruteur : lit le hook et assemble en-tête, KPIs, widgets et modale d'invitation.
import { useDashboardRecruteur } from "./useDashboardRecruteur";
import { SqueletteDashboard, PremiumExpire, ErreurDashboard } from "./EtatsDashboard";
import { EnteteDashboard } from "./EnteteDashboard";
import { BarrePeriodeRapport } from "./BarrePeriodeRapport";
import { KpiCards } from "./KpiCards";
import { FiltresGraphiques } from "./FiltresGraphiques";
import { WidgetEvolution } from "./WidgetEvolution";
import { WidgetPipeline } from "./WidgetPipeline";
import { WidgetCandidatsRecommandes } from "./WidgetCandidatsRecommandes";
import { WidgetOffresActives } from "./WidgetOffresActives";
import { WidgetSources } from "./WidgetSources";
import { WidgetActivite } from "./WidgetActivite";
import { BlocsActionsBas } from "./BlocsActionsBas";
import { ModalInvitation } from "./ModalInvitation";

const DashboardRecruteur = () => {
  const d = useDashboardRecruteur();

  if (d.loading) return <SqueletteDashboard />;
  if (d.error === "PREMIUM_EXPIRE") return <PremiumExpire />;
  if (d.error) return <ErreurDashboard message={d.error} />;

  return (
    <div className="w-full px-0 py-2">
      <EnteteDashboard
        entreprise={d.entreprise}
        offres={d.offres}
        isPremium={d.isPremium}
        premiumExpire={d.premiumExpire}
        stats={d.stats}
        navigate={d.navigate}
        handleExportExcelGlobal={d.handleExportExcelGlobal}
      />

      <BarrePeriodeRapport
        dateDebut={d.dateDebut}
        setDateDebut={d.setDateDebut}
        dateFin={d.dateFin}
        setDateFin={d.setDateFin}
        handleTelechargerRapport={d.handleTelechargerRapport}
      />

      {d.kpis && <KpiCards kpis={d.kpis} evolution={d.evolution} />}

      {d.offres.length > 0 && (
        <>
          <FiltresGraphiques
            offres={d.offres}
            filtreOffreId={d.filtreOffreId}
            setFiltreOffreId={d.setFiltreOffreId}
            periodeEvolution={d.periodeEvolution}
            setPeriodeEvolution={d.setPeriodeEvolution}
          />

          {/* Ligne 1 : Évolution | Pipeline | Candidats recommandés (hauteur alignée) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 mb-2.5 items-stretch">
            <WidgetEvolution
              evolution={d.evolution}
              evolutionPrevValues={d.evolutionPrevValues}
              chartType={d.chartType}
              setChartType={d.setChartType}
              showComparaison={d.showComparaison}
              setShowComparaison={d.setShowComparaison}
              showConversion={d.showConversion}
              setShowConversion={d.setShowConversion}
            />
            <WidgetPipeline funnelEtapes={d.funnelEtapes} pipeline={d.pipeline} />
            {d.candidatsRecommandesTous.length > 0 ? (
              <WidgetCandidatsRecommandes
                candidatsRecommandesTous={d.candidatsRecommandesTous}
                navigate={d.navigate}
                handleToggleFavoriRecommande={d.handleToggleFavoriRecommande}
                setOffreInvitation={d.setOffreInvitation}
                setInviterCandidat={d.setInviterCandidat}
              />
            ) : <div />}
          </div>

          {/* Ligne 2 : Offres actives | Sources | Activité récente (hauteur alignée) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 mb-5 items-stretch">
            <WidgetOffresActives offres={d.offres} />
            <WidgetSources
              sourcesDonut={d.sourcesDonut}
              periodeSources={d.periodeSources}
              setPeriodeSources={d.setPeriodeSources}
            />
            <WidgetActivite activite={d.activite} />
          </div>
        </>
      )}

      <BlocsActionsBas
        recherches={d.recherches}
        rechercheMotsCles={d.rechercheMotsCles}
        setRechercheMotsCles={d.setRechercheMotsCles}
        handleRechercheCVTheque={d.handleRechercheCVTheque}
        handleAppliquerRecherche={d.handleAppliquerRecherche}
        titreIA={d.titreIA}
        setTitreIA={d.setTitreIA}
        palierActif={d.palierActif}
        handleGenererOffreIA={d.handleGenererOffreIA}
      />

      {d.inviterCandidat && (
        <ModalInvitation
          inviterCandidat={d.inviterCandidat}
          setInviterCandidat={d.setInviterCandidat}
          offres={d.offres}
          offreInvitation={d.offreInvitation}
          setOffreInvitation={d.setOffreInvitation}
          envoiInvitation={d.envoiInvitation}
          handleEnvoyerInvitation={d.handleEnvoyerInvitation}
        />
      )}
    </div>
  );
};

export default DashboardRecruteur;
