import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import UserRateThrottle
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
from django.db.models import Q, F
import os
import random
import tempfile
from ..models import OffreEmploi, ProfilCandidat, Candidature, MetierReferentiel
from ..serializers import OffreEmploiSerializer, MetierReferentielSerializer
from ..matcher import calculer_score_matching
from ..cv_parser import parse_cv, extract_specialite
from .equipe import get_entreprise_for_user
from ..throttles import PublicReadThrottle

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

Génère EXACTEMENT ce format JSON (sans markdown, sans explication) :
{
  "description": "2-3 phrases présentant le contexte de ce poste et de l'entreprise.",
  "missions": "Liste de 4 à 6 missions concrètes, une par ligne, commençant par un tiret.",
  "profil_recherche": "Liste de 4 à 5 exigences du profil (formation, savoir-être), une par ligne, commençant par un tiret.",
  "competences": "Liste de 5 à 8 compétences techniques/outils concrets attendus pour ce poste précis, une par ligne, commençant par un tiret.",
  "questions_entretien": [
    {"texte": "Texte de la question", "type_question": "COURT|LONG|NUMERIQUE|CHOIX_UNIQUE|CHOIX_MULTIPLE", "choix": ["option 1", "option 2", "..."] }
  ]
}
Le champ "choix" ne doit contenir des valeurs que si type_question est CHOIX_UNIQUE ou CHOIX_MULTIPLE, sinon un tableau vide. Génère 4 à 6 questions au total, en variant les types (pas uniquement du texte libre)."""


def _deviner_secteur_experience(titre_poste, description="", secteur_groq=""):
    """Code Domaine ANEM d'une expérience. Priorité au choix de Groq (déjà informé du
    métier réel via le CV entier) s'il est valide ; sinon repli sur le référentiel
    métiers par mots-clés, moins fiable sur des titres/descriptions génériques."""
    from ..models import Domaine
    if secteur_groq and Domaine.objects.filter(code=secteur_groq).exists():
        return secteur_groq
    from ..referentiel_utils import resoudre_domaine_depuis_texte
    return resoudre_domaine_depuis_texte(titre_poste, description)


class GroqThrottle(UserRateThrottle):
    scope = 'groq'


class OffresRecommandeesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'profil_candidat'):
            return Response([], status=status.HTTP_200_OK)
        offres_actives = OffreEmploi.objects.filter(
            est_active=True, statut_moderation='APPROUVEE', est_cloturee=False
        )
        offres_scorees = []
        for offre in offres_actives:
            resultat = calculer_score_matching(request.user, offre)
            if resultat['total'] >= 80:
                offre_data = OffreEmploiSerializer(offre).data
                offre_data['matching_score'] = resultat['total']
                offres_scorees.append(offre_data)
        offres_scorees.sort(key=lambda x: x['matching_score'], reverse=True)
        return Response(offres_scorees[:10], status=status.HTTP_200_OK)


class ParserCVAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        from ..models import AIConfig
        if not AIConfig.get_solo().parser_cv_actif:
            return Response({"error": "Le parser CV est temporairement désactivé par l'administrateur."}, status=503)
        cv_file = request.FILES.get('cv')
        if not cv_file:
            return Response({"error": "Aucun fichier reçu."}, status=status.HTTP_400_BAD_REQUEST)
        ext = os.path.splitext(cv_file.name)[1].lower()
        if ext not in ['.pdf', '.docx', '.doc']:
            return Response({"error": f"Format non supporté ({ext})."}, status=status.HTTP_400_BAD_REQUEST)
        if cv_file.size > 5 * 1024 * 1024:
            return Response({"error": "Fichier trop volumineux (max 5 Mo)."}, status=status.HTTP_400_BAD_REQUEST)
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        try:
            for chunk in cv_file.chunks():
                tmp_file.write(chunk)
            tmp_file.close()
            result = parse_cv(tmp_file.name, cv_file.name)
            experiences = result.get('experiences', [])
            from ..domaine_agent import classifier_domaines_experiences, SPECIALITE_INDEX
            classifications = classifier_domaines_experiences(
                experiences, titre_professionnel=result.get('titre_professionnel')
            )
            for i, exp in enumerate(experiences):
                if isinstance(exp, dict):
                    exp['secteur'] = classifications.get(i) or _deviner_secteur_experience(
                        exp.get('titre_poste'), exp.get('description'), exp.get('secteur')
                    )
            if SPECIALITE_INDEX in classifications:
                result['specialite'] = classifications[SPECIALITE_INDEX]
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Erreur parsing : {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(tmp_file.name):
                os.unlink(tmp_file.name)


class MetierReferentielAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicReadThrottle]

    def get(self, request):
        metiers = MetierReferentiel.objects.filter(est_actif=True)
        secteur = request.query_params.get('secteur')
        domaine = request.query_params.get('domaine')
        sous_domaine = request.query_params.get('sous_domaine')
        search = request.query_params.get('search')
        if secteur:
            metiers = metiers.filter(secteur_code=secteur)
        if domaine:
            metiers = metiers.filter(domaine__code=domaine)
        if sous_domaine:
            metiers = metiers.filter(sous_domaine_id=sous_domaine)
        if search:
            q = Q()
            for mot in search.strip().split():
                q &= Q(titre__icontains=mot)
            metiers = metiers.filter(q)
        return Response(MetierReferentielSerializer(metiers[:30], many=True).data)


class MetierReferentielAdminAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        from django.core.paginator import Paginator
        metiers = MetierReferentiel.objects.all()
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        if search:
            q = Q()
            for mot in search.strip().split():
                q &= Q(titre__icontains=mot)
            metiers = metiers.filter(q)
        paginator = Paginator(metiers, 20)
        page_obj = paginator.get_page(page)
        return Response({
            'results': MetierReferentielSerializer(page_obj.object_list, many=True).data,
            'count': paginator.count,
            'total_pages': paginator.num_pages,
        })

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        serializer = MetierReferentielSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            metier = MetierReferentiel.objects.get(pk=pk)
        except MetierReferentiel.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        serializer = MetierReferentielSerializer(metier, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            MetierReferentiel.objects.get(pk=pk).delete()
            return Response({'message': 'Supprimé.'})
        except MetierReferentiel.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)


class SuggestionsCarriereAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [GroqThrottle]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            profil = request.user.profil_candidat
        except Exception:
            return Response({'metiers': []})
        metiers = []
        if profil.specialite:
            metiers_qs = list(MetierReferentiel.objects.filter(
                domaine__code=profil.specialite, est_actif=True
            ).exclude(titre=profil.titre_professionnel).values(
                'id', 'titre', domaine_code=F('domaine__code'), domaine_label=F('domaine__libelle')
            ))
            seed = hash(f"{request.user.id}_{profil.specialite or ''}")
            random.seed(seed)
            random.shuffle(metiers_qs)
            metiers = metiers_qs[:20]
        if len(metiers) < 5 and profil.titre_professionnel:
            q = Q()
            for mot in profil.titre_professionnel.strip().split():
                if len(mot) > 3:
                    q |= Q(titre__icontains=mot)
            metiers_extra = list(MetierReferentiel.objects.filter(
                q, est_actif=True
            ).exclude(titre=profil.titre_professionnel).values('id', 'titre', 'domaine__code', 'domaine__libelle')[:20])
            metiers = metiers + metiers_extra
        from ..models import Domaine
        domaine_obj = Domaine.objects.filter(code=profil.specialite).first() if profil.specialite else None
        return Response({
            'metiers': metiers[:20],
            'profil_titre': profil.titre_professionnel,
            'profil_secteur': domaine_obj.libelle if domaine_obj else profil.specialite,
        })


def _appel_groq(messages, max_tokens=500, temperature=None):
    """Nom conservé pour compatibilité (nombreux appelants) même si l'appel réel passe par
    jobs.ai_engine (Groq ou Ollama selon AIConfig.provider), pas forcément Groq à proprement
    parler. Strip le markdown (**/##/*) — ne jamais utiliser pour un appel attendant du JSON en
    sortie, ça corromprait le format (voir GenererOffreIAAPIView qui appelle call_ai directement)."""
    from ..ai_engine import call_ai
    texte = call_ai(messages, max_tokens=max_tokens, temperature=temperature)
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
        try:
            profil = request.user.profil_candidat
        except Exception:
            return Response({'error': 'Profil introuvable.'}, status=404)

        experiences = [
            f"{e.titre_poste} chez {e.entreprise} ({e.date_debut} - {e.date_fin or 'présent'})"
            for e in profil.experiences_detail.all()
        ]
        formations = [f"{f.diplome} à {f.etablissement}" for f in profil.formations_detail.all()]

        from ..models import Domaine
        def _libelle_domaine(code):
            if not code:
                return None
            d = Domaine.objects.filter(code=code).first()
            return d.libelle if d else code

        profil_text = f"""
Titre : {profil.titre_professionnel or 'Non renseigné'}
Diplôme : {profil.diplome or 'Non renseigné'}
Spécialité : {_libelle_domaine(profil.specialite) or 'Non renseigné'}
Compétences : {profil.competences or 'Non renseigné'}
Expériences : {', '.join(experiences) if experiences else 'Aucune'}
Formations : {', '.join(formations) if formations else 'Aucune'}
Secteur souhaité : {_libelle_domaine(profil.secteur_souhaite) or 'Non renseigné'}
"""
        try:
            system_prompt = ai_config.analyse_carriere_prompt or DEFAULT_PROMPT_ANALYSE_CARRIERE
            analyse = _appel_groq([
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': f'Analyse ce profil :\n{profil_text}'}
            ], max_tokens=ai_config.analyse_carriere_max_tokens)
            return Response({'analyse': analyse})
        except Exception as e:
            logger.error("Erreur Groq carrière : %s", e)
            return Response({'error': 'Service IA temporairement indisponible.'}, status=503)


class AnalyseGroqRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [GroqThrottle]

    def post(self, request, candidature_id):
        if request.user.role != 'RECRUTEUR':
            return Response({'error': 'Accès refusé.'}, status=403)
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

        snapshot = candidature.profil_snapshot
        if snapshot:
            nom = f"{snapshot.get('last_name', '')} {snapshot.get('first_name', '')}"
            titre = snapshot.get('titre_professionnel', 'Non renseigné')
            diplome = snapshot.get('diplome', 'Non renseigné')
            competences = snapshot.get('competences', 'Non renseigné')
            wilaya = snapshot.get('wilaya', 'Non renseigné')
            experiences = snapshot.get('experiences', [])
            formations = snapshot.get('formations', [])
        elif candidature.candidat:
            try:
                profil = candidature.candidat.profil_candidat
                nom = f"{candidature.candidat.last_name} {candidature.candidat.first_name}"
                titre = profil.titre_professionnel or 'Non renseigné'
                diplome = profil.diplome or 'Non renseigné'
                competences = profil.competences or 'Non renseigné'
                wilaya = profil.wilaya or 'Non renseigné'
                experiences = [
                    {'titre_poste': e.titre_poste, 'entreprise': e.entreprise,
                     'date_debut': str(e.date_debut), 'date_fin': str(e.date_fin) if e.date_fin else None}
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
        exp_text = '\n'.join([
            f"- {e.get('titre_poste')} chez {e.get('entreprise')} ({e.get('date_debut', '')} - {e.get('date_fin') or 'présent'})"
            for e in experiences
        ]) or "Aucune"
        form_text = '\n'.join([
            f"- {f.get('diplome')} à {f.get('etablissement')}"
            for f in formations
        ]) or "Aucune"

        prompt_source = ai_config.analyse_recruteur_prompt or DEFAULT_PROMPT_ANALYSE_RECRUTEUR
        prompt = (
            prompt_source
            .replace("{offre_titre}", str(offre.titre))
            .replace("{entreprise}", str(offre.entreprise.nom_entreprise))
            .replace("{specialite}", str(offre.specialite))
            .replace("{type_contrat}", str(offre.type_contrat))
            .replace("{offre_wilaya}", str(offre.wilaya))
            .replace("{nom_candidat}", str(nom))
            .replace("{titre_candidat}", str(titre))
            .replace("{diplome}", str(diplome))
            .replace("{wilaya_candidat}", str(wilaya))
            .replace("{competences}", str(competences))
            .replace("{experiences}", exp_text)
            .replace("{formations}", form_text)
            .replace("{score}", str(candidature.score_matching))
        )

        try:
            analyse = _appel_groq(
                [{'role': 'user', 'content': prompt}],
                max_tokens=ai_config.analyse_recruteur_max_tokens,
                temperature=0.5
            )
            return Response({'analyse': analyse})
        except Exception as e:
            logger.error("Erreur Groq recruteur : %s", e)
            return Response({'error': 'Service IA temporairement indisponible.'}, status=503)


class GenererOffreIAAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [GroqThrottle]

    def post(self, request):
        from ..models import AIConfig
        ai_config = AIConfig.get_solo()
        if not ai_config.generation_offre_actif:
            return Response({'error': "La génération d'offre IA est temporairement désactivée par l'administrateur."}, status=503)
        # Vérification premium
        from .equipe import get_entreprise_for_user
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or not entreprise.est_premium_actif:
            return Response({'error': 'Fonctionnalité réservée aux comptes Premium.'}, status=403)

        titre = request.data.get('titre', '').strip()
        specialite = request.data.get('specialite', '').strip()
        diplome = request.data.get('diplome', '').strip()
        wilaya = request.data.get('wilaya', '').strip()
        experience = request.data.get('experience_requise', '').strip()
        contrat = request.data.get('type_contrat', '').strip()

        if not titre:
            return Response({'error': 'Le titre du poste est requis.'}, status=400)

        # `specialite` est un code Domaine ANEM (ex: "L18"), pas un texte lisible —
        # on le traduit en libellé avant de l'envoyer à l'IA (sinon le prompt contient
        # littéralement "Spécialité : L18", incompréhensible pour Groq). Si le recruteur
        # n'a saisi que le titre du poste (flux "génération rapide"), on devine la
        # spécialité via le référentiel métiers — même logique que le parser CV candidat.
        from ..models import Domaine
        from ..referentiel_utils import resoudre_domaine_depuis_texte
        specialite_resolue = specialite
        if not specialite_resolue:
            specialite_resolue = resoudre_domaine_depuis_texte(titre) or ''
        domaine_obj = Domaine.objects.filter(code=specialite_resolue).first() if specialite_resolue else None
        specialite_libelle = domaine_obj.libelle if domaine_obj else (specialite_resolue or 'Non précisée')

        prompt_source = ai_config.generation_offre_prompt or DEFAULT_PROMPT_GENERATION_OFFRE
        prompt = (
            prompt_source
            .replace("{titre}", titre)
            .replace("{specialite}", specialite_libelle)
            .replace("{diplome}", diplome or 'Non précisé')
            .replace("{experience}", experience or 'Non précisée')
            .replace("{contrat}", contrat or 'Non précisé')
            .replace("{wilaya}", wilaya or 'Non précisée')
        )

        try:
            import json as _json
            from ..ai_engine import call_ai
            # Appel direct à call_ai (pas _appel_groq) : ce dernier strip les **/##/* pour un
            # rendu markdown propre, ce qui corromprait le JSON strict attendu ici.
            raw = call_ai(
                [{'role': 'user', 'content': prompt}],
                max_tokens=ai_config.generation_offre_max_tokens,
                temperature=0.6,
                response_format={'type': 'json_object'},
            )
            data = _json.loads(raw)
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

            return Response({
                'description': data.get('description', ''),
                'missions': data.get('missions', ''),
                'profil_recherche': data.get('profil_recherche', ''),
                'competences': data.get('competences', ''),
                'questions_entretien': questions[:6],
                'specialite_resolue': specialite_resolue,
            })
        except Exception as e:
            logger.error("Erreur GenererOffreIA : %s", e)
            return Response({'error': 'Service IA temporairement indisponible.'}, status=503)