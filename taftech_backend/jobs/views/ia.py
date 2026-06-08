from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model
from django.db.models import Q
import os
import random
import tempfile
import requests as req
from ..models import OffreEmploi, ProfilCandidat, Candidature, MetierReferentiel
from ..serializers import OffreEmploiSerializer, MetierReferentielSerializer
from ..matcher import calculer_score_matching
from ..cv_parser import parse_cv

User = get_user_model()


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
            if resultat['total'] >= 60:
                offre_data = OffreEmploiSerializer(offre).data
                offre_data['matching_score'] = resultat['total']
                offres_scorees.append(offre_data)
        offres_scorees.sort(key=lambda x: x['matching_score'], reverse=True)
        return Response(offres_scorees[:10], status=status.HTTP_200_OK)


class ParserCVAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
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
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Erreur parsing : {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(tmp_file.name):
                os.unlink(tmp_file.name)


class MetierReferentielAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        metiers = MetierReferentiel.objects.filter(est_actif=True)
        secteur = request.query_params.get('secteur')
        search = request.query_params.get('search')
        if secteur:
            metiers = metiers.filter(secteur=secteur)
        if search:
            metiers = metiers.filter(titre__icontains=search)
        return Response(MetierReferentielSerializer(metiers, many=True).data)


class MetierReferentielAdminAPIView(APIView):
    permission_classes = [IsAuthenticated]

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
                secteur=profil.specialite, est_actif=True
            ).exclude(titre=profil.titre_professionnel).values('id', 'titre', 'secteur', 'niveau_experience'))
            seed = hash(f"{request.user.id}_{profil.specialite or ''}")
            random.seed(seed)
            random.shuffle(metiers_qs)
            metiers = metiers_qs[:10]
        if len(metiers) < 5 and profil.titre_professionnel:
            q = Q()
            for mot in profil.titre_professionnel.strip().split():
                if len(mot) > 3:
                    q |= Q(titre__icontains=mot)
            metiers_extra = list(MetierReferentiel.objects.filter(
                q, est_actif=True
            ).exclude(titre=profil.titre_professionnel)[:10])
            metiers = metiers + metiers_extra
        return Response({
            'metiers': metiers[:10],
            'profil_titre': profil.titre_professionnel,
            'profil_secteur': profil.specialite,
        })


def _appel_groq(messages, max_tokens=500, temperature=0.7):
    groq_key = os.environ.get('GROQ_API_KEY', '')
    if not groq_key:
        raise Exception("GROQ_API_KEY non configurée.")
    response = req.post(
        'https://api.groq.com/openai/v1/chat/completions',
        headers={'Authorization': f'Bearer {groq_key}', 'Content-Type': 'application/json'},
        json={
            'model': 'llama-3.1-8b-instant',
            'messages': messages,
            'max_tokens': max_tokens,
            'temperature': temperature,
        },
        timeout=15
    )
    data = response.json()
    texte = data['choices'][0]['message']['content']
    return texte.replace('**', '').replace('##', '').replace('*', '')


class AnalyseCarriereGroqAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            profil = request.user.profil_candidat
        except Exception:
            return Response({'error': 'Profil introuvable.'}, status=404)

        experiences = [
            f"{e.titre_poste} chez {e.entreprise} ({e.date_debut} - {e.date_fin or 'présent'})"
            for e in profil.experiences_detail.all()
        ]
        formations = [f"{f.diplome} à {f.etablissement}" for f in profil.formations_detail.all()]

        profil_text = f"""
Titre : {profil.titre_professionnel or 'Non renseigné'}
Diplôme : {profil.diplome or 'Non renseigné'}
Spécialité : {profil.specialite or 'Non renseigné'}
Compétences : {profil.competences or 'Non renseigné'}
Expériences : {', '.join(experiences) if experiences else 'Aucune'}
Formations : {', '.join(formations) if formations else 'Aucune'}
Secteur souhaité : {profil.secteur_souhaite or 'Non renseigné'}
"""
        try:
            analyse = _appel_groq([
                {
                    'role': 'system',
                    'content': (
                        'Tu es un conseiller carrière expert du marché algérien. '
                        'Réponds UNIQUEMENT en français avec EXACTEMENT ces 3 sections : '
                        '\n###ÉVOLUTION POSSIBLE###\n'
                        '\n###COMPÉTENCES À ACQUÉRIR###\n'
                        '\n###CONSEIL PERSONNALISÉ###\n'
                        'Pas de markdown, texte simple.'
                    )
                },
                {'role': 'user', 'content': f'Analyse ce profil :\n{profil_text}'}
            ], max_tokens=500, temperature=0.7)
            return Response({'analyse': analyse})
        except Exception as e:
            print(f"Erreur Groq carrière : {e}")
            return Response({'error': 'Service IA temporairement indisponible.'}, status=503)


class AnalyseGroqRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, candidature_id):
        if request.user.role != 'RECRUTEUR':
            return Response({'error': 'Accès refusé.'}, status=403)
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({'error': 'Candidature introuvable.'}, status=404)

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

        prompt = f"""Tu es un expert RH algérien. Analyse la compatibilité entre ce candidat et cette offre.
OFFRE : {offre.titre} | {offre.entreprise.nom_entreprise} | {offre.specialite} | {offre.type_contrat} | {offre.wilaya}
CANDIDAT : {nom} | {titre} | {diplome} | {wilaya}
Compétences : {competences}
Expériences : {exp_text}
Formations : {form_text}
Score IA : {candidature.score_matching}%

Réponds avec EXACTEMENT ces 3 sections :
###VERDICT###
###POINTS FORTS###
###RECOMMANDATION###
Pas de markdown, maximum 150 mots."""

        try:
            analyse = _appel_groq(
                [{'role': 'user', 'content': prompt}],
                max_tokens=400,
                temperature=0.5
            )
            return Response({'analyse': analyse})
        except Exception as e:
            print(f"Erreur Groq recruteur : {e}")
            return Response({'error': 'Service IA temporairement indisponible.'}, status=503)