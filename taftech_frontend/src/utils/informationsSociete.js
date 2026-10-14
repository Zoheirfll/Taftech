// Informations société (correction client n°21) : une seule source, l'API `informations-societe`
// (modifiable depuis l'admin). Un champ vide n'est jamais affiché : aucune fausse valeur de test.
import { useEffect, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { jobsService } from "../Services/jobsService";

// Tant que les informations ne sont pas chargées, ou si l'appel échoue, tout est vide donc masqué.
const INFORMATIONS_VIDES = {};

export const useInformationsSociete = () => {
  const [infos, setInfos] = useState(INFORMATIONS_VIDES);

  useEffect(() => {
    let actif = true;
    jobsService
      .getInformationsSociete()
      .then((data) => {
        if (actif) setInfos(data || INFORMATIONS_VIDES);
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, []);

  return infos;
};

const chiffresEtPlus = (valeur) => String(valeur || "").replace(/[^\d+]/g, "");

// Lignes « E-mail / Adresse / Téléphone » : seules celles renseignées sont renvoyées.
export const contactsDepuis = (infos) =>
  [
    { label: "E-mail", value: infos.email_contact, href: infos.email_contact ? `mailto:${infos.email_contact}` : null, icon: Mail },
    { label: "Adresse", value: infos.adresse, href: null, icon: MapPin },
    { label: "Téléphone", value: infos.telephone, href: infos.telephone ? `tel:${chiffresEtPlus(infos.telephone)}` : null, icon: Phone },
  ].filter((c) => c.value);

// Réseaux sociaux : seuls ceux renseignés sont renvoyés (les liens sont validés http(s) par le serveur).
export const reseauxDepuis = (infos) =>
  [
    { name: "Facebook", href: infos.facebook_url },
    { name: "Instagram", href: infos.instagram_url },
    { name: "LinkedIn", href: infos.linkedin_url },
    { name: "WhatsApp", href: infos.whatsapp ? `https://wa.me/${infos.whatsapp}` : "" },
  ].filter((r) => r.href);
