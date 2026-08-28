import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { FolderLock, Trash2, Upload, FileText, Lock } from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";

const INPUT_CLASS = `w-full px-4 py-3 rounded-xl text-base ${tw.inputColorsMuted}`;

const MesDocuments = () => {
  const [types, setTypes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeSelectionne, setTypeSelectionne] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesData, docsData] = await Promise.all([
          jobsService.getTypesDocuments(),
          jobsService.getMesDocuments(),
        ]);
        setTypes(typesData);
        setDocuments(docsData);
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
    <div className="space-y-6">
      <div>
        <h1 className={tw.pageTitleGrand}>Mes documents</h1>
        <p className={`${tw.bodyTextGrand} mt-0.5`}>
          Un espace privé pour vos diplômes, attestations et autres documents.
        </p>
      </div>

      <InfoBanner storageKey="mes_documents" title="Confidentialité">
        Ces documents sont strictement personnels : ils ne sont <strong>jamais visibles</strong> par les
        recruteurs, seulement par vous.
      </InfoBanner>

      <div className={`${tw.card} p-5`}>
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

      <div className={`${tw.card} rounded-2xl overflow-hidden`}>
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
              <div key={doc.id} className="flex justify-between items-center px-5 py-4 gap-3">
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
                    </p>
                  </div>
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${tw.deleteIconButton}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MesDocuments;
