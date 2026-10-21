// Carte "Informations personnelles" : photo, identité, badges (service militaire, permis...) et contacts.
import { Pencil, Camera, User, Phone, Mail, Check, Minus, Award, Briefcase } from "lucide-react";
import { tw } from "../../../theme";
import { MetierProposeBadge } from "../../../Components/MetierProposeBadge";
import { candidatFichierUrl } from "../../../utils/mediaUrl";
import { formatDureeMois } from "../../../utils/cvDates";
import { SECTION_CLASS, SECTION_TITLE, EDIT_BTN } from "./profilUi";

const SectionInfosPerso = ({ profil, constants, stats, formatText, photoQuickInputRef, handlePhotoChange, setShowInfoForm }) => (
          <div className={SECTION_CLASS}>
            <div className="flex justify-between items-start mb-5">
              <h2 className={SECTION_TITLE}>Informations personnelles</h2>
              <button onClick={() => setShowInfoForm(true)} className={EDIT_BTN}>
                <Pencil size={12} /> Modifier
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-5">
              <div className="relative shrink-0">
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden ${tw.photoPlaceholder}`}>
                  {profil.photo_profil ? (
                    <img
                      src={candidatFichierUrl(profil.user_id, "photo")}
                      alt="Profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={30} className={tw.textMuted} />
                  )}
                </div>
                <label
                  className={`absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${tw.photoUploadButton}`}
                  aria-label="Changer la photo de profil"
                >
                  <Camera size={13} className={tw.textOnDark} />
                  <input
                    ref={photoQuickInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </label>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className={`text-xl font-extrabold ${tw.textStrong}`}>
                  {profil.first_name} {profil.last_name}
                </h3>
                <p className={`text-sm ${tw.textMuted} mt-0.5`}>
                  {profil.wilaya ? (profil.wilaya.split(" - ")[1] || profil.wilaya) : "Wilaya non renseignée"}
                  {profil.commune ? ` · ${profil.commune}` : ""}
                </p>
                <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                  {profil.diplome_ref_libelle
                    || profil.niveau_scolaire_ref_libelle
                    || constants.diplomes.find(d => d.value === profil.diplome)?.label
                    || formatText(profil.diplome)}
                  {(profil.metier_appellation_libelle || profil.metier_libelle) && <> {" · "}{profil.metier_appellation_libelle || profil.metier_libelle}</>}
                  {!(profil.metier_appellation_libelle || profil.metier_libelle) && profil.metier_propose && <> {" · "}{profil.metier_propose.libelle}</>}
                </p>
                {!(profil.metier_appellation_libelle || profil.metier_libelle) && profil.metier_propose && (
                  <div className="mt-1 flex justify-center md:justify-start">
                    <MetierProposeBadge propose={profil.metier_propose} />
                  </div>
                )}
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-2">
                  {profil.niveau_experience && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${tw.bgPrimarySoft} ${tw.textPrimaryStrong}`}>
                      <Award size={10} /> {formatText(profil.niveau_experience)}
                    </span>
                  )}
                  {stats.experienceMois > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700">
                      <Briefcase size={10} /> {formatDureeMois(stats.experienceMois)} d'expérience
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={`flex flex-wrap gap-2 py-3 border-t ${tw.borderSubtle} mb-4`}>
              {[
                {
                  label: profil.service_militaire
                    ? `Service militaire · ${formatText(profil.service_militaire)}`
                    : "Service militaire",
                  active: !!profil.service_militaire,
                },
                { label: "Permis de conduire", active: profil.permis_conduire },
                { label: "Passeport valide", active: profil.passeport_valide },
              ].map(({ label, active }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${active ? tw.toggleChipActive : tw.toggleChipInactive}`}
                >
                  {active ? <Check size={11} /> : <Minus size={11} />} {label}
                </span>
              ))}
            </div>
            <div className={`flex flex-wrap gap-4 text-sm ${tw.textMuted700}`}>
              <span className="flex items-center gap-1.5"><Phone size={13} className={tw.textMuted} /> {profil.telephone || "Non renseigné"}</span>
              <span className="flex items-center gap-1.5"><Mail size={13} className={tw.textMuted} /> {profil.email}</span>
            </div>
          </div>
);

export default SectionInfosPerso;
