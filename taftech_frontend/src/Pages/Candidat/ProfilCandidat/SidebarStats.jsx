// Colonne latérale : statistiques "En bref" calculées depuis les données du profil.
import { Briefcase, GraduationCap, Building2, Languages as LanguagesIcon } from "lucide-react";
import { tw } from "../../../theme";
import { formatDureeMois } from "../../../utils/cvDates";
import { SIDEBAR_SECTION_CLASS, SIDEBAR_TITLE } from "./profilUi";

const SidebarStats = ({ stats }) => (
          <div className={SIDEBAR_SECTION_CLASS}>
            <p className={`${SIDEBAR_TITLE} mb-3`}>En bref</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${tw.prefCardSoft}`}>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Briefcase size={15} />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tw.textStrong}`}>
                    {formatDureeMois(stats.experienceMois)}
                  </p>
                  <p className={`text-[10px] ${tw.textMuted} truncate`}>Expérience</p>
                </div>
              </div>
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${tw.prefCardSoft}`}>
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Building2 size={15} />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tw.textStrong}`}>{stats.nbEntreprises}</p>
                  <p className={`text-[10px] ${tw.textMuted} truncate`}>Entreprises</p>
                </div>
              </div>
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${tw.prefCardSoft}`}>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <GraduationCap size={15} />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tw.textStrong}`}>{stats.nbFormations}</p>
                  <p className={`text-[10px] ${tw.textMuted} truncate`}>Formations</p>
                </div>
              </div>
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${tw.prefCardSoft}`}>
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <LanguagesIcon size={15} />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tw.textStrong}`}>{stats.nbLangues}</p>
                  <p className={`text-[10px] ${tw.textMuted} truncate`}>Langues</p>
                </div>
              </div>
            </div>
          </div>
);

export default SidebarStats;
