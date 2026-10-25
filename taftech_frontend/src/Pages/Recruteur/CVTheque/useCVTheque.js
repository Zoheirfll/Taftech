// Hook de la CVthèque : tout l'état (filtres, liste, sélection, crédits, consentement), les effets et les actions.
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { notifier } from "../../../utils/notifier";
import { jobsService } from "../../../Services/jobsService";
import { authService } from "../../../Services/authService";
import { reportError } from "../../../utils/errorReporter";
import { confirmToast } from "../../../utils/confirmToast";

export const useCVTheque = () => {
  const [candidats, setCandidats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
    mobilites: [],
    disponibilites: [],
    services_militaires: [],
    experiences: [],
  });

  // Filtres
  const [search, setSearch] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [specialiteLibelle, setSpecialiteLibelle] = useState("");
  const [diplome, setDiplome] = useState("");
  const [experience, setExperience] = useState("");
  const [mobilite, setMobilite] = useState("");
  const [disponibilite, setDisponibilite] = useState("");
  const [langues, setLangues] = useState("");
  const [competencesFiltre, setCompetencesFiltre] = useState("");
  const [permis, setPermis] = useState(false);
  const [vehicule, setVehicule] = useState(false);
  const [passeport, setPasseport] = useState(false);
  const [serviceMilitaire, setServiceMilitaire] = useState("");
  const [niveauExperience, setNiveauExperience] = useState("");
  const [avecPhoto, setAvecPhoto] = useState(false);
  const [avecCV, setAvecCV] = useState(false);
  const [inscritRecent, setInscritRecent] = useState(false);
  const [tri, setTri] = useState("recents");
  // Onglet « Débloqués / Verrouillés » (filtre côté serveur : "" | "oui" | "non").
  const [debloque, setDebloque] = useState("");
  // Mode d'affichage liste (défaut) / grille ; simple préférence du recruteur, jamais critique.
  const [vue, setVueState] = useState(() => {
    try {
      return localStorage.getItem("cvtheque_vue") === "grille" ? "grille" : "liste";
    } catch {
      return "liste";
    }
  });
  const setVue = (valeur) => {
    setVueState(valeur);
    try {
      localStorage.setItem("cvtheque_vue", valeur);
    } catch {
      /* préférence facultative : sans stockage, la vue revient à la liste au rechargement */
    }
  };
  // Fiche ouverte en fenêtre (mode grille) et profils écartés d'un balayage (jusqu'au rechargement).
  const [detailOuvert, setDetailOuvert] = useState(false);
  const [ignores, setIgnores] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCandidats, setTotalCandidats] = useState(0);

  // UI
  const [selectedCandidat, setSelectedCandidat] = useState(null);
  const [documentsPartages, setDocumentsPartages] = useState([]);
  const [showFiltres, setShowFiltres] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("favoris") === "true" ? "favoris" : "tous",
  ); // "tous" ou "favoris"

  const [creditsDisponibles, setCreditsDisponibles] = useState({ mensuel_restant: null, achetes_restant: 0 });
  const [debloquageEnCours, setDebloquageEnCours] = useState(null);
  // acces_coordonnees (palier Pro+) reste un flag distinct des crédits — gate uniquement le
  // bouton "Inviter à postuler" (InviterCandidatCVThequeAPIView, hors périmètre des crédits,
  // inchangé côté backend). Le dashboard reste la seule source de ce flag depuis que
  // CVThequeView n'expose plus is_premium.
  const [accesCoordonnees, setAccesCoordonnees] = useState(false);
  const [rechercheAvancee, setRechercheAvancee] = useState(true);
  // Filtres permis/véhicule/passeport/service militaire autorisés par l'offre sélectionnée
  // (renvoyés par le serveur : correction client n°19, critère professionnel de l'offre requis).
  const [filtresExigence, setFiltresExigence] = useState([]);
  const [consentGiven, setConsentGiven] = useState(null); // null = chargement, false = à demander, true = ok
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  // Matching IA par offre
  const [offreId, setOffreId] = useState("");
  // Offre qui autorise les filtres permis/véhicule/passeport/situation militaire (sans classement,
  // donc utilisable à tous les paliers) ; à défaut, l'offre du matching IA s'applique.
  const [offreFiltresId, setOffreFiltresId] = useState("");
  const [offresActives, setOffresActives] = useState([]);
  const [showMatchingPanel, setShowMatchingPanel] = useState(false);

  // Invitation à postuler (sous-projet source candidature)
  const [inviterCandidat, setInviterCandidat] = useState(null);
  const [offreInvitation, setOffreInvitation] = useState("");
  const [envoiInvitation, setEnvoiInvitation] = useState(false);

  // Accordéon détail
  const [openSections, setOpenSections] = useState({ competences: true, langues: true });
  const toggleSection = (key) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  // Ref pour scroll mobile vers détail
  const detailRef = useRef(null);
  const handleSelectCandidat = (candidat) => {
    setSelectedCandidat(candidat);
    setDetailOuvert(true);
    setTimeout(() => {
      if (window.innerWidth < 1024 && detailRef.current) {
        detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  // Resynchronise l'onglet actif et la recherche avec l'URL à chaque navigation
  // (mount ET changement de query string sur la même route — React Router ne
  // remonte pas le composant quand seule la query string change).
  useEffect(() => {
    setActiveTab(searchParams.get("favoris") === "true" ? "favoris" : "tous");
    const searchParam = searchParams.get("search");
    if (searchParam !== null) {
      setSearch(searchParam);
    }
    setCurrentPage(1);
  }, [searchParams]);

  useEffect(() => {
    jobsService.getDashboard()
      .then((dash) => setAccesCoordonnees(!!dash.acces_coordonnees))
      .catch((err) => reportError("ECHEC_GET_ACCES_COORDONNEES", err));
  }, []);

  // Documents privés que ce candidat a explicitement partagés avec notre entreprise —
  // voir jobs/views/candidat_dashboard.py::_entreprises_relation_candidat (nécessite déjà
  // une candidature reçue ou un déblocage crédit existant, sinon la liste est vide).
  useEffect(() => {
    setDocumentsPartages([]);
    const candidatId = selectedCandidat?.user_id;
    if (!candidatId) return;
    jobsService
      .getDocumentsPartages(candidatId)
      .then(setDocumentsPartages)
      .catch((err) => reportError("ECHEC_DOCUMENTS_PARTAGES_CVTHEQUE", err));
  }, [selectedCandidat?.user_id]);

  useEffect(() => {
    const checkConsent = async () => {
      try {
        const me = await authService.getMe();
        setConsentGiven(!!me.consentement_cvtheque);
      } catch (err) {
        reportError("ECHEC_CHECK_CONSENTEMENT_CVTHEQUE", err);
        setConsentGiven(false);
      }
    };
    checkConsent();
  }, []);

  const handleAccepterConsentement = async () => {
    setConsentLoading(true);
    try {
      await authService.accepterConsentementCVTheque();
      setConsentGiven(true);
    } catch (err) {
      notifier.echec("Enregistrement du consentement impossible", err);
    } finally {
      setConsentLoading(false);
    }
  };

  useEffect(() => {
    if (!consentGiven) return;
    const loadInit = async () => {
      try {
        const [data, dash] = await Promise.all([
          jobsService.getConstants(),
          jobsService.getDashboard(),
        ]);
        setConstants(data);
        const offres = (dash.offres || []).filter(o => o.est_active && !o.est_cloturee && o.statut_moderation === 'APPROUVEE');
        setOffresActives(offres.map(o => ({ value: String(o.id), label: o.titre })));
      } catch (err) {
        notifier.echec("Chargement des filtres impossible", err);
        reportError("ECHEC_CHARGEMENT_FILTRES_CVTHEQUE", err);
      }
    };
    loadInit();
  }, [consentGiven]);

  const chargerCandidats = useCallback(async () => {
    setLoading(true);
    try {
      const filtres = {
        search,
        wilaya,
        specialite,
        diplome,
        experience,
        mobilite,
        disponibilite,
        langues,
        competences: competencesFiltre,
        permis,
        vehicule,
        passeport,
        service_militaire: serviceMilitaire,
        niveau_experience: niveauExperience,
        avec_photo: avecPhoto,
        avec_cv: avecCV,
        inscrit_recent: inscritRecent,
        favoris: activeTab === "favoris",
        debloque,
        tri,
        ...(offreId ? { offre_id: offreId } : {}),
        ...(offreFiltresId ? { offre_filtres_id: offreFiltresId } : {}),
      };
      const data = await jobsService.searchCVtheque(filtres, currentPage);
      setCandidats(data.results || []);
      setTotalCandidats(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / 10));
      if (data.credits_disponibles !== undefined) setCreditsDisponibles(data.credits_disponibles);
      if (data.recherche_avancee !== undefined) setRechercheAvancee(data.recherche_avancee);
      setFiltresExigence(data.filtres_exigence_autorises || []);

      // Auto-sélection du premier candidat sur desktop
      // Garde le candidat déjà sélectionné (version rafraîchie) s'il est toujours dans la liste :
      // sinon un déblocage ferait sauter la fiche vers le premier candidat.
      const resultats = data.results || [];
      setSelectedCandidat((prev) => resultats.find((c) => c.user_id === prev?.user_id) ?? resultats[0] ?? null);
    } catch (error) {
      if (error.error) notifier.erreur("Recherche impossible", error.error);
      reportError("ECHEC_RECHERCHE_CVTHEQUE", error);
      setCandidats([]);
      setFiltresExigence([]);
    } finally {
      setLoading(false);
    }
  }, [
    search,
    wilaya,
    specialite,
    diplome,
    experience,
    mobilite,
    disponibilite,
    langues,
    competencesFiltre,
    permis,
    vehicule,
    passeport,
    serviceMilitaire,
    niveauExperience,
    avecPhoto,
    avecCV,
    inscritRecent,
    tri,
    activeTab,
    debloque,
    currentPage,
    offreId,
    offreFiltresId,
  ]);

  useEffect(() => {
    if (!consentGiven) return;
    const delayDebounce = setTimeout(() => {
      chargerCandidats();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [chargerCandidats, consentGiven]);

  // Un filtre qui n'est plus autorisé (offre changée ou retirée) est remis à zéro : il ne doit
  // ni rester coché à l'écran, ni compter parmi les filtres actifs.
  useEffect(() => {
    if (!filtresExigence.includes("permis")) setPermis(false);
    if (!filtresExigence.includes("vehicule")) setVehicule(false);
    if (!filtresExigence.includes("passeport")) setPasseport(false);
    if (!filtresExigence.includes("service_militaire")) setServiceMilitaire("");
  }, [filtresExigence]);

  const handleReset = () => {
    setSearch("");
    setWilaya("");
    setSpecialite("");
    setDiplome("");
    setExperience("");
    setMobilite("");
    setDisponibilite("");
    setLangues("");
    setCompetencesFiltre("");
    setPermis(false);
    setVehicule(false);
    setPasseport(false);
    setServiceMilitaire("");
    setNiveauExperience("");
    setAvecPhoto(false);
    setAvecCV(false);
    setInscritRecent(false);
    setTri("recents");
    setOffreId("");
    setOffreFiltresId("");
    setCurrentPage(1);
  };

  // Réinitialisation partielle proposée depuis l'état "Aucun profil trouvé".
  const handleResetFiltresListe = () => {
    setWilaya("");
    setSpecialite("");
    setDiplome("");
    setExperience("");
    setAvecPhoto(false);
    setAvecCV(false);
    setInscritRecent(false);
  };

  const handleDeverrouillerCandidat = (candidat) => {
    confirmToast("Débloquer ce profil (1 crédit) ? Coordonnées et CV seront accessibles pour votre équipe tant que le candidat laisse son profil actif et visible : il peut à tout moment le masquer ou supprimer son compte, l'accès cesse alors.", async () => {
      setDebloquageEnCours(candidat.user_id);
      try {
        const result = await jobsService.deverrouillerCandidat(candidat.user_id);
        setCreditsDisponibles(result.credits_disponibles);
        setCandidats((prev) => prev.map((c) => (c.user_id === candidat.user_id ? { ...c, est_debloque: true, email: null } : c)));
        // Recharge la fiche pour récupérer email/téléphone/linkedin réellement débloqués.
        chargerCandidats();
        notifier.succes("Profil débloqué");
      } catch (err) {
        reportError("ECHEC_DEVERROUILLER_CANDIDAT", err);
        if (err.response?.status === 403 && err.response?.data?.code === "CREDITS_EPUISES") {
          notifier.erreur("Crédits épuisés", "Achetez un pack depuis la page Abonnements.");
        } else {
          notifier.echec("Déblocage impossible", err);
        }
      } finally {
        setDebloquageEnCours(null);
      }
    });
  };

  const handleToggleFavori = async (candidat, e) => {
    e.stopPropagation(); // Empêche le clic d'ouvrir le détail

    if (!candidat.user_id) {
      notifier.erreur("Modification des favoris impossible");
      return;
    }

    try {
      const result = await jobsService.toggleFavoriCV(candidat.user_id);

      // Mise à jour locale : on toggle is_favori dans la liste
      setCandidats((prev) =>
        prev.map((c) =>
          c.user_id === candidat.user_id
            ? { ...c, is_favori: result.is_favori }
            : c,
        ),
      );

      // Mise à jour du candidat sélectionné si c'est lui
      if (selectedCandidat?.user_id === candidat.user_id) {
        setSelectedCandidat({
          ...selectedCandidat,
          is_favori: result.is_favori,
        });
      }

      if (result.is_favori) {
        notifier.succes("Ajouté aux favoris");
      } else {
        notifier.succes("Retiré des favoris");
      }
    } catch (err) {
      notifier.echec("Mise à jour des favoris impossible", err);
      reportError("ECHEC_TOGGLE_FAVORI_CV", err);
    }
  };

  // Balayage vers la gauche : le profil quitte la liste (sans rien supprimer) jusqu'au rechargement.
  const handleIgnorer = (candidat) => {
    setIgnores((prev) => (prev.includes(candidat.user_id) ? prev : [...prev, candidat.user_id]));
    notifier.info("Profil masqué de la liste", "Il réapparaît au prochain rechargement.");
  };

  const handleOuvrirInvitation = (candidat, e) => {
    e.stopPropagation();
    setOffreInvitation("");
    setInviterCandidat(candidat);
  };

  const handleEnvoyerInvitation = async () => {
    if (!offreInvitation || !inviterCandidat) return;
    setEnvoiInvitation(true);
    try {
      await jobsService.inviterCandidatCVTheque(inviterCandidat.user_id, offreInvitation);
      notifier.succes("Invitation envoyée");
      setInviterCandidat(null);
    } catch (err) {
      notifier.echec("Envoi de l'invitation impossible", err);
      reportError("ECHEC_INVITER_CANDIDAT_CVTHEQUE", err);
    } finally {
      setEnvoiInvitation(false);
    }
  };

  const filtresActifs = [
    wilaya,
    specialite,
    diplome,
    experience,
    mobilite,
    disponibilite,
    langues,
    competencesFiltre,
    permis,
    vehicule,
    passeport,
    serviceMilitaire,
    niveauExperience,
    avecPhoto,
    avecCV,
    inscritRecent,
  ].filter(Boolean).length;

  return {
    // données
    candidats, loading, constants, offresActives, documentsPartages,
    creditsDisponibles, accesCoordonnees, rechercheAvancee, filtresExigence,
    // filtres (valeurs et setters regroupés pour le panneau de filtres)
    search, setSearch, tri, setTri, offreId, setOffreId, offreFiltresId, setOffreFiltresId,
    specialiteLibelle, setSpecialiteLibelle,
    filtres: {
      wilaya, specialite, diplome, experience, mobilite, disponibilite, langues,
      competencesFiltre, permis, vehicule, passeport, serviceMilitaire,
      niveauExperience, avecPhoto, avecCV, inscritRecent,
    },
    setters: {
      setWilaya, setSpecialite, setDiplome, setExperience, setMobilite,
      setDisponibilite, setLangues, setCompetencesFiltre, setPermis, setVehicule,
      setPasseport, setServiceMilitaire, setNiveauExperience, setAvecPhoto,
      setAvecCV, setInscritRecent,
    },
    filtresActifs,
    // pagination
    currentPage, setCurrentPage, totalPages, totalCandidats,
    // interface
    selectedCandidat, showFiltres, setShowFiltres, activeTab, setActiveTab,
    debloque, setDebloque, vue, setVue, detailOuvert, setDetailOuvert, ignores, setIgnores, handleIgnorer,
    showMatchingPanel, setShowMatchingPanel, openSections, toggleSection, detailRef,
    // consentement
    consentGiven, consentChecked, setConsentChecked, consentLoading,
    // invitation
    inviterCandidat, setInviterCandidat, offreInvitation, setOffreInvitation, envoiInvitation,
    debloquageEnCours,
    // actions
    handleSelectCandidat, handleAccepterConsentement, handleReset, handleResetFiltresListe,
    handleDeverrouillerCandidat, handleToggleFavori, handleOuvrirInvitation, handleEnvoyerInvitation,
  };
};
