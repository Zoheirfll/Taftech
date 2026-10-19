import logging
from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import UserRateThrottle
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
import os
import time
import tempfile
from ..models import OffreEmploi, ProfilCandidat, Candidature
from ..serializers import OffreEmploiSerializer
from ..matcher import calculer_score_matching
from ..matching_cache import scores_offres_actives_pour_candidat
from ..cv_parser import parse_cv
from .equipe import get_entreprise_for_user, get_membre_role
from ..throttles import PublicReadThrottle, FileUploadThrottle
from ..ai_engine import FournisseurIASature, fournisseur_sature
from ..confidentialite_ia import (
    jeton_candidat, lignes_experiences, lignes_formations, nettoyer_champ,
)

User = get_user_model()

# Prompts par défaut — utilisés si l'admin n'a rien saisi dans AIConfig (jobs/models.py),
# ou en repli si le champ est vide. Éditables sans déploiement via le panel "Configuration IA".
DEFAULT_PROMPT_ANALYSE_CARRIERE = (
    'Tu es un conseiller carrière expert du marché algérien. '
    'Analyse ce profil de façon STRICTEMENT PERSONNALISÉE : base-toi précisément sur son titre, '
    'ses compétences, ses expériences et ses formations réels. '
    'Interdiction absolue de conseils génériques valables pour n\'importe quel profil — '
    'chaque section doit citer des éléments concrets tirés du profil analysé. '
    'Réponds UNIQUEMENT en français avec EXACTEMENT ces 5 sections : '
    '\n###MÉTIERS POSSIBLES###\n'
    '(3 à 5 métiers précis auxquels CE profil peut prétendre dès maintenant, cohérents avec son titre/ses compétences réels)'
    '\n###POINTS FORTS###\n'
    '(atouts concrets de ce profil, en t\'appuyant sur ses expériences, diplômes et compétences listés)'
    '\n###COMPÉTENCES MANQUANTES###\n'
    '(compétences précises qui lui manquent pour progresser dans SON métier, pas des généralités)'
    '\n###FORMATIONS RECOMMANDÉES###\n'
    '(formations ou certifications concrètes et reconnues, en lien direct avec les compétences manquantes identifiées)'
    '\n###ÉVOLUTION PROFESSIONNELLE###\n'
    '(2 à 3 pistes d\'évolution réalistes à moyen terme dans SON secteur, à partir de SA situation actuelle)'
    '\nPas de markdown, texte simple, phrases courtes et concrètes, jamais de généralités.'
)

DEFAULT_PROMPT_ANALYSE_RECRUTEUR = """Tu es un expert RH algérien. Analyse la compatibilité entre ce candidat et cette offre.
OFFRE : {offre_titre} | {entreprise} | {specialite} | {type_contrat} | {offre_wilaya}
CANDIDAT : {nom_candidat} | {titre_candidat} | {diplome} | {wilaya_candidat}
Compétences : {competences}
Expériences : {experiences}
Formations : {formations}
Score IA : {score}%

Réponds avec EXACTEMENT ces 3 sections :
###VERDICT###
###POINTS FORTS###
###RECOMMANDATION###
Pas de markdown, maximum 150 mots."""

DEFAULT_PROMPT_GENERATION_OFFRE = """Tu es un expert RH algérien. Génère le contenu d'une offre d'emploi professionnelle en français pour le marché algérien.

Poste : {titre}
Spécialité / Secteur : {specialite}
Diplôme requis : {diplome}
Expérience : {experience}
Type de contrat : {contrat}
Wilaya : {wilaya}

Pour les questions d'entretien, choisis le type le plus adapté à chaque question parmi : COURT (réponse texte courte), LONG (réponse texte développée), NUMERIQUE (un nombre, ex: années d'expérience), CHOIX_UNIQUE (QCM une seule bonne réponse), CHOIX_MULTIPLE (QCM plusieurs réponses possibles). Pour CHOIX_UNIQUE/CHOIX_MULTIPLE, fournis 3 à 5 options de réponse plausibles et réalistes pour ce poste précis (pas des options génériques "Oui/Non" sauf si vraiment pertinent).

Référentiel de compétences disponibles sur la plateforme : {competences_referentiel}
Pour le champ "competences_structurees", choisis EXCLUSIVEMENT des libellés présents mot pour mot dans ce référentiel (aucune invention, aucune reformulation) — si aucune compétence du référentiel ne correspond au poste, renvoie un tableau vide pour ce champ.

Génère EXACTEMENT ce format JSON (sans markdown, sans explication) :
{
  "description": "2-3 phrases présentant le contexte de ce poste et de l'entreprise.",
  "missions": "Liste de 4 à 6 missions concrètes, une par ligne, commençant par un tiret.",
  "profil_recherche": "Liste de 4 à 5 exigences du profil (formation, savoir-être), une par ligne, commençant par un tiret.",
  "competences": "Liste de 5 à 8 compétences techniques/outils concrets attendus pour ce poste précis, une par ligne, commençant par un tiret.",
  "competences_structurees": [
    {"label": "libellé EXACT tiré du référentiel fourni", "type_exigence": "OBLIGATOIRE|SOUHAITEE", "niveau_requis": "DEBUTANT|INTERMEDIAIRE|AVANCE|CONFIRME"}
  ],
  "questions_entretien": [
    {"texte": "Texte de la question", "type_question": "COURT|LONG|NUMERIQUE|CHOIX_UNIQUE|CHOIX_MULTIPLE", "choix": ["option 1", "option 2", "..."] }
  ]
}
Le champ "choix" ne doit contenir des valeurs que si type_question est CHOIX_UNIQUE ou CHOIX_MULTIPLE, sinon un tableau vide. Génère 4 à 6 questions au total, en variant les types (pas uniquement du texte libre). Pour "competences_structurees", propose 3 à 6 entrées maximum, avec un mélange raisonnable d'Obligatoire/Souhaitée."""


_MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
               'août', 'septembre', 'octobre', 'novembre', 'décembre']


def _date_precise(d, precision):
    """Affiche une date selon la précision réellement connue (« 2023 », « mars 2023 »
    ou « 12/03/2023 ») — jamais le 01/01 technique d'une année seule."""
    if not d:
        return ''
    if precision == 'ANNEE':
        return str(d.year)
    if precision == 'MOIS':
        return f"{_MOIS_LONGS[d.month - 1]} {d.year}"
    return d.strftime('%d/%m/%Y')


def _deviner_metier_experience(titre_poste, description=""):
    """Metier (référentiel v2) d'une expérience — repli déterministe (mots-clés) utilisé
    quand l'agent de classification dédié (metier_agent, RAG+Groq) n'a rien retourné pour
    cette expérience.

    Réutilise le scoring pondéré de `domaine_agent._candidats_pour_experience` (titre
    pesé plus fort que la description, mots génériques filtrés) plutôt que l'ancien
    `resoudre_metier_depuis_texte` (fréquence brute par `icontains`, sans pondération) —
    ce dernier produisait des métiers aberrants sur des intitulés RH réels ("Cheffe de
    Département Administration des Ressources Humaines" résolu en "Hygiène Sécurité
    Environnement industriels") car des mots courants comme "administration"/"gestion"
    noient le signal parmi des centaines d'appellations sans rapport une fois le titre
    et la description mélangés sans poids. Retourne un objet Metier ou None."""
    # Point 7 (12/10/2026) : le repli ne devine plus. Un classement « meilleur candidat »
    # rattachait « Gestionnaire RH » à « Assistant RH ». Seul un intitulé identique à une
    # appellation du référentiel est rattaché ; sinon le champ reste vide et le candidat
    # le renseigne lui-même.
    from ..referentiel_utils import resoudre_metier_depuis_texte
    return resoudre_metier_depuis_texte(titre_poste)


class GroqThrottle(UserRateThrottle):
    scope = 'groq'


class CVParserThrottle(UserRateThrottle):
    """Scope 'cv_parser' (10/h) — plus strict que le seau 'groq' partagé (20/h, réparti entre
    4 autres fonctionnalités) : parser un CV combine upload de fichier ET 1-2 appels Groq
    (extraction + agent classification domaine), donc plus coûteux qu'un simple appel IA."""
    scope = 'cv_parser'


class QuotaIAAffichageAPIView(APIView):
    """Lecture seule du quota IA courant pour une fonctionnalité (jour/mois restants) —
    jamais consommé ici (`verifier_quota_ia` n'écrit rien, seul `consommer_quota_ia` explicite
    dans chaque vue IA le fait). Sert à afficher le compteur AVANT le premier clic sur un
    bouton IA (\"Il vous reste X/Y aujourd'hui\") — synchronisé sur la même source que
    l'enforcement réel, jamais un nombre en dur côté frontend."""
    permission_classes = [IsAuthenticated]

    def get(self, request, fonction):
        from ..models import UtilisationIA
        if fonction not in dict(UtilisationIA.FONCTION_CHOICES):
            return Response({'error': 'Fonctionnalité inconnue.'}, status=404)
        from ..ia_quota import verifier_quota_ia
        ok, payload = verifier_quota_ia(request.user, fonction)
        payload['disponible'] = ok
        return Response(payload, status=200)


class OffresRecommandeesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    # Une offre recommandée doit rester une opportunité fraîche, pas n'importe quelle
    # offre à 100% de matching publiée il y a un an dans un catalogue qui grossit sans
    # cesse — sinon un nouveau candidat verrait resurgir des annonces obsolètes dès son
    # premier jour sur le site.
    RECOMMANDEES_FENETRE_JOURS = 7

    def get(self, request):
        if not hasattr(request.user, 'profil_candidat'):
            return Response([], status=status.HTTP_200_OK)

        offres_postulees_ids = set(
            Candidature.objects.filter(candidat=request.user).values_list('offre_id', flat=True)
        )
        scores = scores_offres_actives_pour_candidat(request.user)
        scores_map = dict(scores)
        candidates_ids = [oid for oid, total in scores if total >= 80 and oid not in offres_postulees_ids]
        if not candidates_ids:
            return Response([], status=status.HTTP_200_OK)

        seuil_date = timezone.now() - timedelta(days=self.RECOMMANDEES_FENETRE_JOURS)
        offres_map = {
            o.id: o for o in OffreEmploi.objects.filter(
                id__in=candidates_ids, date_publication__gte=seuil_date,
            ).select_related('entreprise')
        }
        top_ids = sorted(offres_map.keys(), key=lambda oid: scores_map[oid], reverse=True)[:10]
        if not top_ids:
            return Response([], status=status.HTTP_200_OK)

        offres_scorees = []
        for oid in top_ids:
            offre_data = OffreEmploiSerializer(offres_map[oid]).data
            offre_data['matching_score'] = scores_map[oid]
            offres_scorees.append(offre_data)
        return Response(offres_scorees, status=status.HTTP_200_OK)


def _journaliser_parsing(user, result, cv_name, debut, stats_metier=None, code_erreur=''):
    """Enregistre le parsing dans le journal de qualité (compteurs uniquement, jamais le contenu du CV).
    Ne doit JAMAIS faire échouer le parsing : toute erreur ici est avalée. Retourne l'id du journal."""
    try:
        from ..models import ParsingCV
        from ..cv_parser import PARSER_VERSION
        result = result or {}
        stats_metier = stats_metier or {'ia': 0, 'repli': 0, 'aucun': 0}
        formations = [f for f in result.get('formations', []) if isinstance(f, dict)]
        champs = ['nom_complet', 'telephone', 'titre_professionnel', 'bio', 'langues', 'competences']
        entree = ParsingCV.objects.create(
            user=user,
            duree_ms=int((time.monotonic() - debut) * 1000),
            succes=not code_erreur,
            code_erreur=code_erreur,
            version_parser=PARSER_VERSION,
            extension=os.path.splitext(cv_name or '')[1].lower().lstrip('.')[:6],
            nb_experiences=len(result.get('experiences') or []),
            nb_formations=len(formations),
            nb_competences=len(result.get('competences_niveaux') or {}),
            nb_langues=len([l for l in str(result.get('langues') or '').split(',') if l.strip()]),
            champs_vides=[c for c in champs if not result.get(c)],
            nb_exp_metier_ia=stats_metier['ia'],
            nb_exp_metier_repli=stats_metier['repli'],
            nb_exp_sans_metier=stats_metier['aucun'],
            nb_formations_sans_diplome_ref=sum(1 for f in formations if not f.get('diplome_ref')),
            source_competences=result.get('competences_source', ''),
        )
        return entree.id
    except Exception:
        logger.warning("Journal de parsing CV non enregistré", exc_info=True)
        return None


class ParserCVAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    # Aucun throttle avant cette session : le parsing déclenche 1-2 appels Groq (extraction
    # + agent de classification domaine) sans aucune limite au-delà du seau générique user
    # (1000/jour) — gap réel, même risque de coût/abus que les autres endpoints IA.
    # FileUploadThrottle (20/h) borne l'upload, CVParserThrottle (10/h, plus strict) borne le
    # coût Groq réel — le plus restrictif des deux s'applique.
    throttle_classes = [FileUploadThrottle, CVParserThrottle]

    def post(self, request):
        from ..models import AIConfig
        if not AIConfig.get_solo().parser_cv_actif:
            return Response({"error": "Le parser CV est temporairement désactivé par l'administrateur."}, status=503)

        from ..ia_quota import verifier_quota_ia, consommer_quota_ia, acquerir_verrou_ia, liberer_verrou_ia
        ok, quota_info = verifier_quota_ia(request.user, 'PARSER_CV')
        if not ok:
            return Response(quota_info, status=403)
        # Les validations du fichier passent AVANT le verrou et le décompte : un fichier invalide ne
        # consomme aucun quota, ne pose aucun verrou et ne laisse aucun contexte de demande dans le
        # thread (revue de sécurité du 19/10/2026 : ces retours anticipés sortaient du try/finally).
        cv_file = request.FILES.get('cv')
        if cv_file:
            if cv_file.size > 5 * 1024 * 1024:
                return Response({"error": "Fichier trop volumineux (max 5 Mo)."}, status=status.HTTP_400_BAD_REQUEST)
            cv_name = cv_file.name
            source_chunks = cv_file.chunks()
        else:
            # Aucun fichier envoyé → réutilise le CV déjà stocké sur le profil (évite
            # de redemander le fichier quand il est déjà téléversé).
            profil = getattr(request.user, 'profil_candidat', None)
            if not profil or not profil.cv_pdf:
                return Response({"error": "Aucun fichier reçu et aucun CV existant sur le profil."}, status=status.HTTP_400_BAD_REQUEST)
            cv_name = os.path.basename(profil.cv_pdf.name)
            source_chunks = None  # ouvert plus bas via profil.cv_pdf

        ext = os.path.splitext(cv_name)[1].lower()
        if ext not in ['.pdf', '.docx', '.doc']:
            return Response({"error": f"Format non supporté ({ext})."}, status=status.HTTP_400_BAD_REQUEST)

        if not acquerir_verrou_ia(request.user, 'PARSER_CV'):
            return Response({'error': 'Un traitement IA est déjà en cours pour ce compte.', 'code': 'IA_APPEL_EN_COURS'}, status=429)
        consommer_quota_ia(request.user, 'PARSER_CV')

        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        try:
            if cv_file:
                for chunk in source_chunks:
                    tmp_file.write(chunk)
            else:
                with profil.cv_pdf.open('rb') as f:
                    for chunk in f.chunks():
                        tmp_file.write(chunk)
            tmp_file.close()
            debut_parsing = time.monotonic()
            # Nom et prénom du compte : masqués dans le CV en plus de la détection automatique.
            result = parse_cv(
                tmp_file.name, cv_name,
                noms_connus=(request.user.first_name, request.user.last_name),
            )
            if result.get('success') is False:
                # Échec du parsing : journalisé (scanné vs IA indisponible/limite de débit), réponse inchangée.
                code = 'PDF_SCANNE' if 'scann' in str(result.get('error', '')).lower() else 'IA_INDISPONIBLE'
                # parse_cv avale les erreurs du fournisseur : le drapeau de saturation dit si le
                # refus vient du quota Groq (appel remboursé) plutôt que d'une vraie panne.
                if code == 'IA_INDISPONIBLE' and fournisseur_sature():
                    from ..ia_quota import rembourser_quota_ia
                    rembourser_quota_ia()
                    result['error'] = MESSAGE_FOURNISSEUR_SATURE
                    code = 'IA_FOURNISSEUR_SATURE'
                result['quota_ia'] = quota_info
                result['parsing_id'] = _journaliser_parsing(request.user, {}, cv_name, debut_parsing, code_erreur=code)
                return Response(result, status=status.HTTP_200_OK)
            experiences = result.get('experiences', [])
            from ..domaine_agent import classifier_metiers_experiences, SPECIALITE_INDEX
            from ..models import Metier
            classifications = classifier_metiers_experiences(
                experiences, titre_professionnel=result.get('titre_professionnel')
            )
            metiers_par_id = {
                m.id: m.libelle for m in Metier.objects.filter(pk__in=set(classifications.values()))
            }
            stats_metier = {'ia': 0, 'repli': 0, 'aucun': 0}
            for i, exp in enumerate(experiences):
                if not isinstance(exp, dict):
                    continue
                metier_id = classifications.get(i)
                if metier_id:
                    exp['metier'] = metier_id
                    exp['metier_libelle'] = metiers_par_id.get(metier_id)
                    stats_metier['ia'] += 1
                else:
                    metier = _deviner_metier_experience(exp.get('titre_poste'), exp.get('description'))
                    exp['metier'] = metier.id if metier else None
                    exp['metier_libelle'] = metier.libelle if metier else None
                    stats_metier['repli' if metier else 'aucun'] += 1
            if SPECIALITE_INDEX in classifications:
                result['metier'] = classifications[SPECIALITE_INDEX]
                result['metier_libelle'] = metiers_par_id.get(classifications[SPECIALITE_INDEX])

            from ..referentiel_utils import resoudre_diplome_et_specialite_depuis_texte
            for f in result.get('formations', []):
                if not isinstance(f, dict):
                    continue
                type_diplome, specialite = resoudre_diplome_et_specialite_depuis_texte(f.get('diplome'))
                f['diplome_ref'] = type_diplome.id if type_diplome else None
                f['diplome_ref_libelle'] = type_diplome.libelle if type_diplome else None
                f['specialite_ref'] = specialite.id if specialite else None
                f['specialite_ref_libelle'] = specialite.libelle if specialite else None
            result['quota_ia'] = quota_info
            result['parsing_id'] = _journaliser_parsing(
                request.user, result, cv_name, debut_parsing, stats_metier,
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            # Jamais le texte brut de l'exception dans la réponse : il peut venir du fournisseur IA
            # (clé, organisation, extrait de la requête). Le type d'erreur suffit au diagnostic.
            logger.error("Erreur parsing CV : %s", type(e).__name__)
            return Response(
                {"error": "Erreur lors de l'analyse du CV.", "code": "PARSING_ECHEC"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            liberer_verrou_ia(request.user, 'PARSER_CV')
            if os.path.exists(tmp_file.name):
                os.unlink(tmp_file.name)


MESSAGE_FOURNISSEUR_SATURE = "L'analyse IA est temporairement indisponible. Vous pouvez poursuivre manuellement."


def reponse_fournisseur_sature():
    """Réponse commune quand le fournisseur IA a refusé l'appel faute de quota (429) : l'appel de
    l'utilisateur est remboursé (il ne compte dans aucun quota) et le reste du site continue de
    fonctionner. À appeler dans le `except FournisseurIASature` d'une vue, avant `liberer_verrou_ia`."""
    from ..ia_quota import rembourser_quota_ia
    rembourser_quota_ia()
    return Response({'error': MESSAGE_FOURNISSEUR_SATURE, 'code': 'IA_FOURNISSEUR_SATURE'}, status=503)


def _appel_groq(messages, max_tokens=500, temperature=None, donnees_candidat=None):
    """Nom conservé pour compatibilité (nombreux appelants) même si l'appel réel passe par
    jobs.ai_engine (Groq ou Ollama selon AIConfig.provider), pas forcément Groq à proprement
    parler. Strip le markdown (**/##/*) — ne jamais utiliser pour un appel attendant du JSON en
    sortie, ça corromprait le format (voir GenererOffreIAAPIView qui appelle call_ai directement)."""
    from ..ai_engine import call_ai
    texte = call_ai(messages, max_tokens=max_tokens, temperature=temperature,
                    donnees_candidat=donnees_candidat)
    return texte.replace('**', '').replace('##', '').replace('*', '')


class AnalyseCarriereGroqAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [GroqThrottle]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({'error': 'Accès refusé.'}, status=403)
        from ..models import AIConfig
        ai_config = AIConfig.get_solo()
        if not ai_config.analyse_carriere_actif:
            return Response({'error': "L'analyse carrière IA est temporairement désactivée par l'administrateur."}, status=503)
        from ..ia_quota import verifier_quota_ia, consommer_quota_ia, acquerir_verrou_ia, liberer_verrou_ia
        try:
            profil = request.user.profil_candidat
        except Exception:
            return Response({'error': 'Profil introuvable.'}, status=404)

        # Texte construit par confidentialite_ia.construction : employeurs pseudonymisés, établissements
        # retirés, coordonnées masquées — le même texte est montré au candidat par l'aperçu.
        from ..confidentialite_ia.construction import texte_carriere
        from ..confidentialite_ia.empreinte import empreinte_ia
        profil_text = texte_carriere(profil)
        system_prompt = ai_config.analyse_carriere_prompt or DEFAULT_PROMPT_ANALYSE_CARRIERE
        empreinte = empreinte_ia(
            system_prompt, profil_text, ai_config.provider, ai_config.groq_model,
            ai_config.ollama_model, ai_config.analyse_carriere_max_tokens,
        )
        # Profil, prompt et modèle inchangés depuis la dernière analyse : on renvoie le résultat
        # stocké, sans appel IA ni décompte de quota (et même quota épuisé). `?regenerer=1` force
        # une nouvelle analyse, qui suit le chemin normal (quota, verrou, décompte).
        if (request.query_params.get('regenerer') != '1' and profil.derniere_analyse_carriere
                and profil.empreinte_analyse_carriere == empreinte):
            return Response({
                'analyse': profil.derniere_analyse_carriere, 'depuis_cache': True,
                'genere_le': profil.analyse_carriere_le.isoformat() if profil.analyse_carriere_le else None,
            })
        ok, quota_info = verifier_quota_ia(request.user, 'SUGGESTIONS_METIER')
        if not ok:
            return Response(quota_info, status=403)
        if not acquerir_verrou_ia(request.user, 'SUGGESTIONS_METIER'):
            return Response({'error': 'Un traitement IA est déjà en cours pour ce compte.', 'code': 'IA_APPEL_EN_COURS'}, status=429)
        consommer_quota_ia(request.user, 'SUGGESTIONS_METIER')
        try:
            analyse = _appel_groq([
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': f'Analyse ce profil :\n{profil_text}'}
            ], max_tokens=ai_config.analyse_carriere_max_tokens, donnees_candidat=profil_text)
            profil.derniere_analyse_carriere = analyse
            profil.analyse_carriere_le = timezone.now()
            profil.empreinte_analyse_carriere = empreinte
            profil.save(update_fields=['derniere_analyse_carriere', 'analyse_carriere_le', 'empreinte_analyse_carriere'])
            return Response({
                'analyse': analyse, 'quota_ia': quota_info,
                'genere_le': profil.analyse_carriere_le.isoformat(),
            })
        except FournisseurIASature:
            return reponse_fournisseur_sature()
        except Exception as e:
            logger.error("Erreur Groq carrière : %s (statut %s)", type(e).__name__, getattr(e, "status_code", "?"))
            return Response({'error': 'Service IA temporairement indisponible.'}, status=503)
        finally:
            liberer_verrou_ia(request.user, 'SUGGESTIONS_METIER')


class AnalyseGroqRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [GroqThrottle]

    def post(self, request, candidature_id):
        from ..models import AIConfig
        ai_config = AIConfig.get_solo()
        if not ai_config.analyse_recruteur_actif:
            return Response({'error': "L'analyse IA recruteur est temporairement désactivée par l'administrateur."}, status=503)
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({'error': 'Candidature introuvable.'}, status=404)

        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or candidature.offre.entreprise != entreprise:
            return Response({'error': 'Non autorisé.'}, status=403)
        # Contrôle par appartenance à l'entreprise et rôle d'équipe (et non `user.role`, qui
        # écartait à tort les membres d'équipe dont le compte est de type CANDIDAT). L'analyse
        # consomme le quota du palier : un membre « Invité » (lecture seule) ne peut pas la lancer.
        if get_membre_role(request.user, entreprise) not in ('UTILISATEUR', 'ADMIN', 'PROPRIETAIRE'):
            return Response({'error': 'Action non autorisée pour votre rôle.'}, status=403)

        from ..ia_quota import verifier_quota_ia, consommer_quota_ia, acquerir_verrou_ia, liberer_verrou_ia

        jeton = jeton_candidat()  # identifiant technique temporaire : le nom du candidat ne part jamais
        snapshot = candidature.profil_snapshot
        if snapshot:
            titre = snapshot.get('titre_professionnel', 'Non renseigné')
            diplome = snapshot.get('diplome', 'Non renseigné')
            competences = snapshot.get('competences', 'Non renseigné')
            wilaya = snapshot.get('wilaya', 'Non renseigné')
            experiences = snapshot.get('experiences', [])
            formations = snapshot.get('formations', [])
        elif candidature.candidat:
            try:
                profil = candidature.candidat.profil_candidat
                titre = profil.titre_professionnel or 'Non renseigné'
                diplome = profil.diplome or 'Non renseigné'
                competences = profil.competences or 'Non renseigné'
                wilaya = profil.wilaya or 'Non renseigné'
                experiences = [
                    {'titre_poste': e.titre_poste, 'entreprise': e.entreprise,
                     'date_debut': _date_precise(e.date_debut, e.date_debut_precision),
                     'date_fin': _date_precise(e.date_fin, e.date_fin_precision) or None}
                    for e in profil.experiences_detail.all()
                ]
                formations = [
                    {'diplome': f.diplome, 'etablissement': f.etablissement}
                    for f in profil.formations_detail.all()
                ]
            except Exception as e:
                return Response({'error': 'Pas de données candidat.'}, status=400)
        else:
            return Response({'error': 'Candidature rapide sans profil.'}, status=400)

        offre = candidature.offre
        titre, diplome, competences = nettoyer_champ(titre), nettoyer_champ(diplome), nettoyer_champ(competences)
        # Employeurs pseudonymisés (« Entreprise A »…) et établissements retirés : seuls le poste,
        # les dates, le diplôme et la spécialité sont transmis.
        exp_text = '\n'.join(f"- {ligne}" for ligne in lignes_experiences([
            {'titre_poste': e.get('titre_poste'), 'entreprise': e.get('entreprise'),
             'debut': e.get('date_debut', ''), 'fin': e.get('date_fin')}
            for e in experiences
        ])) or "Aucune"
        form_text = '\n'.join(f"- {ligne}" for ligne in lignes_formations(
            [{'diplome': f.get('diplome')} for f in formations]
        )) or "Aucune"

        prompt_source = ai_config.analyse_recruteur_prompt or DEFAULT_PROMPT_ANALYSE_RECRUTEUR
        prompt = (
            prompt_source
            .replace("{offre_titre}", str(offre.titre))
            .replace("{entreprise}", str(offre.entreprise.nom_entreprise))
            .replace("{specialite}", str(offre.metier.libelle if offre.metier else 'Non précisée'))
            .replace("{type_contrat}", str(offre.type_contrat))
            .replace("{offre_wilaya}", str(offre.wilaya))
            .replace("{nom_candidat}", jeton)
            .replace("{titre_candidat}", str(titre))
            .replace("{diplome}", str(diplome))
            .replace("{wilaya_candidat}", str(wilaya))
            .replace("{competences}", str(competences))
            .replace("{experiences}", exp_text)
            .replace("{formations}", form_text)
            .replace("{score}", str(candidature.score_matching))
        )

        donnees_candidat = '\n'.join([titre, diplome, competences, exp_text, form_text])
        # Le jeton est aléatoire à chaque appel : on le neutralise avant de hacher, sinon l'empreinte
        # changerait toujours. Prompt (offre, score, profil), modèle et longueur entrent dans le hash.
        from ..confidentialite_ia.empreinte import empreinte_ia
        empreinte = empreinte_ia(
            prompt.replace(jeton, "{CANDIDAT}"), ai_config.provider, ai_config.groq_model,
            ai_config.ollama_model, ai_config.analyse_recruteur_max_tokens,
        )
        regenerer = request.data.get('regenerer') in (True, 'true', 'True', '1', 1)
        # Analyse déjà faite sur les mêmes données : on la renvoie sans appel IA ni décompte du quota
        # du palier (lecture d'un résultat déjà obtenu, même palier expiré ou quota épuisé).
        if not regenerer and candidature.derniere_analyse_ia and candidature.empreinte_analyse_ia == empreinte:
            return Response({
                'analyse': candidature.derniere_analyse_ia, 'depuis_cache': True,
                'genere_le': candidature.analyse_ia_le.isoformat() if candidature.analyse_ia_le else None,
            })
        ok, quota_info = verifier_quota_ia(request.user, 'ANALYSE_RECRUTEUR')
        if not ok:
            return Response(quota_info, status=403)
        if not acquerir_verrou_ia(request.user, 'ANALYSE_RECRUTEUR'):
            return Response({'error': 'Un traitement IA est déjà en cours pour ce compte.', 'code': 'IA_APPEL_EN_COURS'}, status=429)
        consommer_quota_ia(request.user, 'ANALYSE_RECRUTEUR')
        try:
            analyse = _appel_groq(
                [{'role': 'user', 'content': prompt}],
                max_tokens=ai_config.analyse_recruteur_max_tokens,
                temperature=0.5,
                donnees_candidat=donnees_candidat,
            )
            # Rattachement local : le jeton n'existe que dans le prompt, la réponse stockée parle du candidat.
            analyse = analyse.replace(jeton, "le candidat")
            candidature.derniere_analyse_ia = analyse
            candidature.analyse_ia_le = timezone.now()
            candidature.empreinte_analyse_ia = empreinte
            candidature.save(update_fields=['derniere_analyse_ia', 'analyse_ia_le', 'empreinte_analyse_ia'])
            return Response({'analyse': analyse, 'quota_ia': quota_info})
        except FournisseurIASature:
            return reponse_fournisseur_sature()
        except Exception as e:
            logger.error("Erreur Groq recruteur : %s (statut %s)", type(e).__name__, getattr(e, "status_code", "?"))
            return Response({'error': 'Service IA temporairement indisponible.'}, status=503)
        finally:
            liberer_verrou_ia(request.user, 'ANALYSE_RECRUTEUR')


class GenererOffreIAAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [GroqThrottle]

    def post(self, request):
        from ..models import AIConfig
        ai_config = AIConfig.get_solo()
        if not ai_config.generation_offre_actif:
            return Response({'error': "La génération d'offre IA est temporairement désactivée par l'administrateur."}, status=503)
        # Quota IA — inclut la vérification palier actif (PALIER_INSUFFISANT si aucun
        # abonnement) et le quota jour/mois configuré sur le palier (voir jobs/ia_quota.py).
        from ..ia_quota import verifier_quota_ia, consommer_quota_ia, acquerir_verrou_ia, liberer_verrou_ia
        ok, quota_info = verifier_quota_ia(request.user, 'GENERATION_OFFRE')
        if not ok:
            return Response(quota_info, status=403)

        titre = request.data.get('titre', '').strip()
        metier_id = request.data.get('metier') or None
        diplome = request.data.get('diplome', '').strip()
        wilaya = request.data.get('wilaya', '').strip()
        experience = request.data.get('experience_requise', '').strip()
        contrat = request.data.get('type_contrat', '').strip()

        if not titre:
            return Response({'error': 'Le titre du poste est requis.'}, status=400)

        # Si le recruteur n'a saisi que le titre du poste (flux "génération rapide"),
        # on devine le métier via le référentiel v2 — même logique que le parser CV candidat.
        from ..models import Metier
        from ..referentiel_utils import resoudre_metier_depuis_texte
        metier_obj = Metier.objects.filter(pk=metier_id).first() if metier_id else None
        metier_resolu = None
        if not metier_obj:
            metier_resolu = resoudre_metier_depuis_texte(titre)
            metier_obj = metier_resolu
        specialite_libelle = metier_obj.libelle if metier_obj else 'Non précisée'

        from ..models import CompetenceReferentiel
        labels_referentiel = list(CompetenceReferentiel.objects.filter(actif=True).values_list('label', flat=True))
        labels_par_cle = {lbl.strip().lower(): lbl for lbl in labels_referentiel}

        prompt_source = ai_config.generation_offre_prompt or DEFAULT_PROMPT_GENERATION_OFFRE
        prompt = (
            prompt_source
            .replace("{titre}", titre)
            .replace("{specialite}", specialite_libelle)
            .replace("{diplome}", diplome or 'Non précisé')
            .replace("{experience}", experience or 'Non précisée')
            .replace("{contrat}", contrat or 'Non précisé')
            .replace("{wilaya}", wilaya or 'Non précisée')
            .replace("{competences_referentiel}", ", ".join(labels_referentiel) if labels_referentiel else "aucun référentiel disponible")
        )

        if not acquerir_verrou_ia(request.user, 'GENERATION_OFFRE'):
            return Response({'error': 'Un traitement IA est déjà en cours pour ce compte.', 'code': 'IA_APPEL_EN_COURS'}, status=429)
        consommer_quota_ia(request.user, 'GENERATION_OFFRE')
        try:
            import json as _json
            from ..ai_engine import call_ai
            # Appel direct à call_ai (pas _appel_groq) : ce dernier strip les **/##/* pour un
            # rendu markdown propre, ce qui corromprait le JSON strict attendu ici.
            # Un essai retente une fois : Groq échoue de temps en temps à produire un JSON
            # strictement valide (`json_validate_failed`) sur ce prompt riche (5 sections +
            # questions d'entretien typées) — déjà documenté comme un aléa connu du modèle
            # reasoning utilisé, pas une panne réelle du service la plupart du temps.
            data = None
            derniere_erreur = None
            for tentative in range(2):
                try:
                    raw = call_ai(
                        [{'role': 'user', 'content': prompt}],
                        max_tokens=ai_config.generation_offre_max_tokens,
                        temperature=0.6,
                        response_format={'type': 'json_object'},
                    )
                    data = _json.loads(raw)
                    break
                except Exception as e:
                    derniere_erreur = e
                    logger.warning("GenererOffreIA tentative %s échouée : %s", tentative + 1, type(e).__name__)
            if data is None:
                raise derniere_erreur
            questions_brutes = data.get('questions_entretien', [])
            if not isinstance(questions_brutes, list):
                questions_brutes = []

            TYPES_VALIDES = {'COURT', 'LONG', 'NUMERIQUE', 'CHOIX_UNIQUE', 'CHOIX_MULTIPLE'}
            questions = []
            for q in questions_brutes:
                if isinstance(q, str):
                    q = {'texte': q}
                if not isinstance(q, dict):
                    continue
                texte = str(q.get('texte', '')).strip()
                if not texte:
                    continue
                type_question = str(q.get('type_question', 'COURT')).strip().upper()
                if type_question not in TYPES_VALIDES:
                    type_question = 'COURT'
                choix = q.get('choix', [])
                choix = [str(c).strip() for c in choix if str(c).strip()] if isinstance(choix, list) else []
                choix = list(dict.fromkeys(choix))[:6]
                # Un QCM sans au moins 2 options réelles retombe sur une question texte simple.
                if type_question in ('CHOIX_UNIQUE', 'CHOIX_MULTIPLE') and len(choix) < 2:
                    type_question = 'COURT'
                    choix = []
                if type_question not in ('CHOIX_UNIQUE', 'CHOIX_MULTIPLE'):
                    choix = []
                questions.append({'texte': texte, 'type_question': type_question, 'choix': choix})

            # Compétences structurées : ne garder que les libellés existant réellement dans le
            # référentiel (comparaison insensible à la casse) — une hallucination de Groq (nom
            # inventé, absent du référentiel) est silencieusement écartée plutôt que créée à la
            # volée, cohérent avec la décision de piocher exclusivement dans le référentiel.
            from ..models import CompetenceOffre
            TYPES_EXIGENCE_VALIDES = {c[0] for c in CompetenceOffre.TYPE_EXIGENCE_CHOICES}
            NIVEAUX_VALIDES = {c[0] for c in CompetenceOffre.NIVEAU_CHOICES}
            competences_structurees_brutes = data.get('competences_structurees', [])
            if not isinstance(competences_structurees_brutes, list):
                competences_structurees_brutes = []
            competences_structurees = []
            vues = set()
            for c in competences_structurees_brutes:
                if not isinstance(c, dict):
                    continue
                label_brut = str(c.get('label', '')).strip().lower()
                label_reel = labels_par_cle.get(label_brut)
                if not label_reel or label_reel.lower() in vues:
                    continue
                vues.add(label_reel.lower())
                type_exigence = str(c.get('type_exigence', 'OBLIGATOIRE')).strip().upper()
                if type_exigence not in TYPES_EXIGENCE_VALIDES:
                    type_exigence = 'OBLIGATOIRE'
                niveau_requis = str(c.get('niveau_requis', '') or '').strip().upper() or None
                if niveau_requis not in NIVEAUX_VALIDES:
                    niveau_requis = None
                competences_structurees.append({'label': label_reel, 'type_exigence': type_exigence, 'niveau_requis': niveau_requis})

            return Response({
                'description': data.get('description', ''),
                'missions': data.get('missions', ''),
                'profil_recherche': data.get('profil_recherche', ''),
                'competences': data.get('competences', ''),
                'competences_requises': competences_structurees[:6],
                'questions_entretien': questions[:6],
                'metier_resolu': metier_resolu.id if metier_resolu else None,
                'metier_resolu_libelle': metier_resolu.libelle if metier_resolu else None,
                'quota_ia': quota_info,
            })
        except FournisseurIASature:
            return reponse_fournisseur_sature()
        except Exception as e:
            logger.error("Erreur GenererOffreIA : %s", type(e).__name__)
            return Response({'error': 'Service IA temporairement indisponible.'}, status=503)
        finally:
            liberer_verrou_ia(request.user, 'GENERATION_OFFRE')