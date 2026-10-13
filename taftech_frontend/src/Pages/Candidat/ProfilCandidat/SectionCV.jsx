// Carte "Mon CV" : titre, fichier CV, remplissage IA, bio et liens LinkedIn/GitHub.
import { Pencil, Trash2, Plus, Sparkles, ExternalLink, FileText, AlertCircle } from "lucide-react";
import { confirmToast } from "../../../utils/confirmToast";
import { tw } from "../../../theme";
import { candidatFichierUrl } from "../../../utils/mediaUrl";
import { SECTION_CLASS, SECTION_TITLE, EDIT_BTN } from "./profilUi";

const SectionCV = ({ profil, cvQuickInputRef, setShowCVForm, setShowOnboardingModal, setShowLinksForm, handleDeleteCV }) => (
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <h2 className={SECTION_TITLE}>Mon CV</h2>
                <p className={`text-sm font-semibold ${tw.textPrimary} mt-1`}>
                  {profil.titre_professionnel || "Titre à définir"}
                </p>
                {profil.cv_pdf ? (
                  <div className={`flex items-center gap-2.5 mt-3 p-3 rounded-xl border min-w-0 ${tw.bgSuccessSoft} border-emerald-200`}>
                    <a
                      href={candidatFichierUrl(profil.user_id, "cv")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 min-w-0 flex-1 group"
                    >
                      <FileText size={18} className={`${tw.textSuccess} shrink-0`} />
                      <span className={`text-sm font-medium truncate flex-1 ${tw.textSuccess}`}>
                        {profil.cv_pdf.split("/").pop()}
                      </span>
                      <ExternalLink size={14} className={`${tw.textSuccess} shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`} />
                    </a>
                    <button
                      type="button"
                      onClick={() => confirmToast("Supprimer votre CV actuel ?", handleDeleteCV)}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                      aria-label="Supprimer le CV"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => cvQuickInputRef.current?.click()}
                    className={`w-full flex items-center gap-2.5 mt-3 p-3 rounded-xl border transition-colors cursor-pointer hover:brightness-95 ${tw.bgWarningSoft} border-amber-200`}
                  >
                    <AlertCircle size={18} className={`${tw.textWarning} shrink-0`} />
                    <span className={`text-sm font-medium ${tw.textWarning} text-left flex-1`}>
                      Aucun fichier joint — cliquez pour téléverser votre CV
                    </span>
                  </button>
                )}
              </div>
              <button onClick={() => setShowCVForm(true)} className={EDIT_BTN}>
                <Pencil size={12} /> Modifier
              </button>
            </div>
            <div className={`border-t ${tw.borderSubtle} pt-4 mt-4`}>
              <button
                onClick={() => setShowOnboardingModal(true)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl ${tw.bannerGradientPrimary} ${tw.textOnDark} shadow-md hover:shadow-lg transition-shadow group`}
              >
                <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Remplissage automatique par IA</p>
                  <p className="text-xs text-white/80 mt-0.5">
                    Analysez votre CV et remplissez votre profil en quelques secondes
                  </p>
                </div>
              </button>
            </div>
            {(profil.bio || profil.linkedin || profil.github) && (
              <div className={`mt-4 pt-4 border-t ${tw.borderSubtle} space-y-3`}>
                {profil.bio && (
                  <p className={`text-sm leading-relaxed p-3 rounded-lg italic ${tw.bioQuoteBox}`}>
                    "{profil.bio}"
                  </p>
                )}
                <div className="flex gap-2">
                  {profil.linkedin && (
                    <a
                      href={profil.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tw.linkedinPill}`}
                    >
                      <ExternalLink size={13} /> LinkedIn
                    </a>
                  )}
                  {profil.github && (
                    <a
                      href={profil.github}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tw.githubPill}`}
                    >
                      <ExternalLink size={13} /> GitHub
                    </a>
                  )}
                  <button
                    onClick={() => setShowLinksForm(true)}
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tw.editButtonOutline}`}
                  >
                    <Pencil size={12} /> Modifier
                  </button>
                </div>
              </div>
            )}
            {!profil.bio && !profil.linkedin && !profil.github && (
              <div className={`mt-3 pt-3 border-t ${tw.borderSubtle}`}>
                <button
                  onClick={() => setShowLinksForm(true)}
                  className={`flex items-center gap-1.5 text-xs font-medium ${tw.linkPrimaryUnderline}`}
                >
                  <Plus size={12} /> Ajouter bio / LinkedIn / GitHub
                </button>
              </div>
            )}
          </div>
);

export default SectionCV;
