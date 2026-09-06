import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { profilService } from "../../Services/profilService";
import { reportError } from "../../utils/errorReporter";
import { candidatFichierUrl } from "../../utils/mediaUrl";
import { FolderLock, Trash2, Upload, FileText, Lock, ShieldCheck, Share2, X, Building2 } from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";

const INPUT_CLASS = `w-full px-4 py-3 rounded-xl text-base ${tw.inputColorsMuted}`;

const MesDocuments = () => {
  const [types, setTypes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [profil, setProfil] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [typeSelectionne, setTypeSelectionne] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [togglingVisibilite, setTogglingVisibilite] = useState(false);
  const [partageOuvertId, setPartageOuvertId] = useState(null);
  const [entreprisesEligibles, setEntreprisesEligibles] = useState([]);
  const [loadingEntreprises, setLoadingEntreprises] = useState(false);
  const fileInputRef = useRef(null);
  const cvInputRef = useRef(null);

  const refetchProfil = async () => {
    const profilData = await profilService.getProfil();
    setProfil(profilData);
    return profilData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesData, docsData] = await Promise.all([
          jobsService.getTypesDocuments(),
          jobsService.getMesDocuments(),
        ]);
        setTypes(typesData);
        setDocuments(docsData);
        await refetchProfil();
        if (typesData.length > 0) setTypeSelectionne(String(typesData[0].id));
      } catch (error) {
        toast.error(apiErrMsg(error, "Erreur lors du chargement."));
        reportError("ECHEC_CHARGEMENT_MES_DOCUMENTS", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCVSelected = async (e) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setUploadingCV(true);
    try {
      const formData = new FormData();
      formData.append("cv_pdf", fichier);
      // updateProfil() renvoie {message, profil} — on refetch plutôt que d'utiliser
      // directement la réponse, même pattern que ProfilCandidat/useProfilCandidat.js.
      await profilService.updateProfil(formData);
      await refetchProfil();
      toast.success("CV mis à jour !");
    } catch (error) {
      reportError("ECHEC_UPLOAD_CV_MES_DOCUMENTS", error);
      toast.error(apiErrMsg(error, "Impossible d'envoyer ce CV."));
    } finally {
      setUploadingCV(false);
      if (cvInputRef.current) cvInputRef.current.value = "";
    }
  };

  const handleDeleteCV = () => {
    confirmToast("Supprimer votre CV professionnel ?", async () => {
      try {
        const formData = new FormData();
        formData.append("remove_cv_pdf", "true");
        await profilService.updateProfil(formData);
        await refetchProfil();
        toast.success("CV supprimé.");
      } catch (error) {
        toast.error(apiErrMsg(error, "Erreur lors de la suppression."));
        reportError("ECHEC_SUPPRESSION_CV_MES_DOCUMENTS", error);
      }
    });
  };

  const handleToggleVisibilite = async () => {
    setTogglingVisibilite(true);
    try {
      const formData = new FormData();
      formData.append("visible_cvtheque", (!profil.visible_cvtheque).toString());
      await profilService.updateProfil(formData);
      const updated = await refetchProfil();
      toast.success(updated.visible_cvtheque ? "Déblocage réactivé." : "Déblocage désactivé.");
    } catch (error) {
      toast.error(apiErrMsg(error, "Erreur lors de la mise à jour."));
      reportError("ECHEC_TOGGLE_VISIBLE_CVTHEQUE", error);
    } finally {
      setTogglingVisibilite(false);
    }
  };

  const handleOuvrirPartage = async (docId) => {
    if (partageOuvertId === docId) {
      setPartageOuvertId(null);
      return;
    }
    setPartageOuvertId(docId);
    setLoadingEntreprises(true);
    try {
      const data = await jobsService.getEntreprisesEligiblesPartage(docId);
      setEntreprisesEligibles(data);
    } catch (error) {
      toast.error(apiErrMsg(error, "Impossible de charger les entreprises."));
      reportError("ECHEC_ENTREPRISES_ELIGIBLES", error);
    } finally {
      setLoadingEntreprises(false);
    }
  };

  const handleTogglePartage = async (docId, entrepriseId, dejaPartage) => {
    try {
      if (dejaPartage) {
        await jobsService.revoquerPartageDocument(docId, entrepriseId);
      } else {
        await jobsService.partagerDocument(docId, entrepriseId);
      }
      setEntreprisesEligibles((prev) =>
        prev.map((e) => (e.id === entrepriseId ? { ...e, deja_partage: !dejaPartage } : e))
      );
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id !== docId) return d;
          const entreprise = entreprisesEligibles.find((e) => e.id === entrepriseId);
          const partagesActuels = d.partages || [];
          return {
            ...d,
            partages: dejaPartage
              ? partagesActuels.filter((p) => p.entreprise_id !== entrepriseId)
              : [...partagesActuels, { entreprise_id: entrepriseId, nom_entreprise: entreprise?.nom_entreprise }],
          };
        })
      );
      toast.success(dejaPartage ? "Partage révoqué." : "Document partagé.");
    } catch (error) {
      toast.error(apiErrMsg(error, "Erreur lors du partage."));
      reportError("ECHEC_TOGGLE_PARTAGE_DOCUMENT", error);
    }
  };

  const handleFileSelected = async (e) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setUploading(true);
    try {
      const created = await jobsService.uploaderDocument(fichier, typeSelectionne || null, fichier.name);
      setDocuments((prev) => [created, ...prev]);
      toast.success("Document ajouté !");
    } catch (error) {
      reportError("ECHEC_UPLOAD_DOCUMENT_UI", error);
      toast.error(apiErrMsg(error, "Impossible d'ajouter ce document."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id) => {
    confirmToast("Supprimer ce document ?", async () => {
      try {
        await jobsService.supprimerDocument(id);
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        toast.success("Document supprimé.");
      } catch (error) {
        toast.error(apiErrMsg(error, "Erreur lors de la suppression."));
        reportError("ECHEC_SUPPRESSION_DOCUMENT_UI", error);
      }
    });
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.borderPrimary}`}></div>
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className={tw.pageTitleGrand}>Mes documents</h1>
        <p className={`${tw.bodyTextGrand} mt-0.5`}>
          Votre CV professionnel et vos documents privés.
        </p>
      </div>

      {/* ── CV professionnel — visible via la CVthèque selon vos paramètres ── */}
      <div>
        <h2 className={`text-sm font-bold ${tw.textStrong} mb-2 flex items-center gap-1.5`}>
          <ShieldCheck size={16} className={tw.textPrimary} /> CV professionnel
        </h2>
        <InfoBanner storageKey="mes_documents_cv" title="Visibilité">
          Ce CV est celui utilisé pour vos candidatures. Il est visible par les recruteurs
          <strong> selon vos paramètres de confidentialité</strong> (déblocage via la CVthèque).
        </InfoBanner>
        <div className={`${tw.card} p-5 mt-3 flex flex-col sm:flex-row sm:items-center gap-3`}>
          {profil?.cv_pdf ? (
            <a
              href={candidatFichierUrl(profil.user_id, "cv")}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <FileText size={18} className={`shrink-0 ${tw.textPrimary}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${tw.textStrong} truncate`}>CV professionnel</p>
                <p className={`text-xs ${tw.textMuted700} mt-0.5`}>Cliquer pour ouvrir</p>
              </div>
            </a>
          ) : (
            <p className={`text-sm ${tw.textMuted700} flex-1`}>Aucun CV pour l'instant.</p>
          )}
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              disabled={uploadingCV}
              onClick={() => cvInputRef.current?.click()}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50`}
            >
              <Upload size={16} /> {uploadingCV ? "Envoi..." : profil?.cv_pdf ? "Remplacer" : "Ajouter"}
            </button>
            {profil?.cv_pdf && (
              <button
                onClick={handleDeleteCV}
                className={`p-2.5 rounded-xl transition-colors shrink-0 ${tw.deleteIconButton}`}
              >
                <Trash2 size={15} />
              </button>
            )}
            <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleCVSelected} />
          </div>
        </div>

        {profil && (
          <div className={`${tw.card} p-4 mt-3 flex items-center justify-between gap-3`}>
            <div>
              <p className={`text-sm font-semibold ${tw.textStrong}`}>Déblocage par les recruteurs</p>
              <p className={`text-xs ${tw.textMuted700} mt-0.5`}>
                {profil.visible_cvtheque
                  ? "Un recruteur peut débloquer vos coordonnées/CV via un crédit CVthèque."
                  : "Aucun recruteur ne peut débloquer vos coordonnées/CV pour l'instant."}
              </p>
            </div>
            <button
              type="button"
              disabled={togglingVisibilite}
              onClick={handleToggleVisibilite}
              aria-label="Activer ou désactiver le déblocage CVthèque"
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                profil.visible_cvtheque ? tw.bgPrimarySolid : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  profil.visible_cvtheque ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* ── Documents privés — jamais visibles par les recruteurs sans autorisation ── */}
      <div>
        <h2 className={`text-sm font-bold ${tw.textStrong} mb-2 flex items-center gap-1.5`}>
          <Lock size={16} className={tw.textMuted700} /> Documents privés
        </h2>
        <InfoBanner storageKey="mes_documents" title="Confidentialité">
          Diplômes, attestations, certificats, pièces justificatives et autres documents : strictement
          personnels, <strong>jamais visibles</strong> par les recruteurs sans votre autorisation.
        </InfoBanner>

        <div className={`${tw.card} p-5 mt-3`}>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Type de document</label>
              <select className={INPUT_CLASS} value={typeSelectionne} onChange={(e) => setTypeSelectionne(e.target.value)}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-center gap-2 px-4 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50`}
            >
              <Upload size={16} /> {uploading ? "Envoi..." : "Ajouter un fichier"}
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
          </div>
        </div>

        <div className={`${tw.card} rounded-2xl overflow-hidden mt-3`}>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${tw.emptyStateIconCircle}`}>
                <FolderLock size={24} />
              </div>
              <h3 className={`text-sm font-semibold ${tw.textStrong} mb-1`}>Aucun document</h3>
              <p className={`text-xs ${tw.textMuted700} max-w-xs`}>
                Ajoutez vos diplômes, attestations ou certificats.
              </p>
            </div>
          ) : (
            <div className={`divide-y ${tw.divideBase}`}>
              {documents.map((doc) => (
                <div key={doc.id} className="px-5 py-4">
                  <div className="flex justify-between items-center gap-3">
                    <a
                      href={doc.fichier_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <FileText size={18} className={`shrink-0 ${tw.textPrimary}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${tw.textStrong} truncate`}>
                          {doc.nom_personnalise || doc.type_document || "Document"}
                        </p>
                        <p className={`text-xs ${tw.textMuted700} mt-0.5 flex items-center gap-1`}>
                          <Lock size={10} /> {doc.type_document || "Autre"}
                          {doc.partages?.length > 0 && (
                            <span className="ml-1 flex items-center gap-1 text-emerald-600">
                              · <Share2 size={10} /> Partagé avec {doc.partages.length}
                            </span>
                          )}
                        </p>
                      </div>
                    </a>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOuvrirPartage(doc.id)}
                        title="Partager avec une entreprise"
                        className={`p-1.5 rounded-lg transition-colors ${tw.iconButton || "hover:bg-slate-100"}`}
                      >
                        {partageOuvertId === doc.id ? <X size={15} /> : <Share2 size={15} />}
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className={`p-1.5 rounded-lg transition-colors ${tw.deleteIconButton}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {partageOuvertId === doc.id && (
                    <div className={`mt-3 p-3 rounded-xl ${tw.surfaceMuted || "bg-slate-50"} border ${tw.borderBase || "border-slate-200"}`}>
                      <p className={`text-xs font-semibold ${tw.textMuted700} mb-2`}>
                        Partager avec une entreprise avec qui vous avez déjà un lien (candidature envoyée ou profil débloqué)
                      </p>
                      {loadingEntreprises ? (
                        <p className={`text-xs ${tw.textMuted700}`}>Chargement...</p>
                      ) : entreprisesEligibles.length === 0 ? (
                        <p className={`text-xs ${tw.textMuted700}`}>
                          Aucune entreprise éligible pour l'instant — postulez ou faites débloquer votre profil d'abord.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {entreprisesEligibles.map((e) => (
                            <div key={e.id} className="flex items-center justify-between gap-2">
                              <span className={`text-sm ${tw.textStrong} flex items-center gap-1.5 min-w-0 truncate`}>
                                <Building2 size={13} className={tw.textMuted700} /> {e.nom_entreprise}
                              </span>
                              <button
                                onClick={() => handleTogglePartage(doc.id, e.id, e.deja_partage)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
                                  e.deja_partage
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                    : `${tw.textOnDark} ${tw.bgPrimarySolidHover}`
                                }`}
                              >
                                {e.deja_partage ? "Partagé ✓" : "Partager"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MesDocuments;
