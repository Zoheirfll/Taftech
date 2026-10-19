"""Aperçu exact des données transmises à l'IA (exigence de l'employeur, 17/10/2026). N'appelle
jamais l'IA et ne consomme aucun quota : le texte renvoyé est calculé par les mêmes fonctions
que celles qui construisent l'envoi réel (nettoyage déterministe)."""
import os
import tempfile

from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from ..confidentialite_ia import LIBELLES_CATEGORIES, ModeleNerIndisponible, nettoyer_texte
from ..confidentialite_ia.construction import texte_carriere, texte_conseils
from ..cv_parser.extraction import extract_text
from ..cv_parser.parser import LONGUEUR_MAX_PARSER

TAILLE_MAX_CV = 5 * 1024 * 1024
EXTENSIONS = ('.pdf', '.docx', '.doc')
FONCTIONS = ('PARSER_CV', 'ANALYSE_CARRIERE', 'CONSEILS_DASHBOARD')


class ApercuIAThrottle(UserRateThrottle):
    scope = 'apercu_ia'


def _reponse(fonction, texte, categories):
    return Response({
        'fonction': fonction,
        'texte': texte,
        'categories': dict(categories),
        'libelles': {c: LIBELLES_CATEGORIES.get(c, c) for c in categories},
    })


def _erreur(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'error': message}, status=code)


class ApercuDonneesIAAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    throttle_classes = [ApercuIAThrottle]

    def post(self, request):
        user = request.user
        if user.role != 'CANDIDAT':
            return _erreur('Réservé aux candidats.', status.HTTP_403_FORBIDDEN)
        fonction = request.data.get('fonction')
        if fonction not in FONCTIONS:
            return _erreur('Fonction inconnue.')
        profil = getattr(user, 'profil_candidat', None)
        if profil is None:
            return _erreur('Profil introuvable.', status.HTTP_404_NOT_FOUND)
        if fonction == 'ANALYSE_CARRIERE':
            return _reponse(fonction, texte_carriere(profil), {})
        if fonction == 'CONSEILS_DASHBOARD':
            return _reponse(fonction, texte_conseils(user, profil), {})
        return self._apercu_cv(request, profil)

    def _apercu_cv(self, request, profil):
        user = request.user
        cv_file = request.FILES.get('cv')
        if cv_file:
            if cv_file.size > TAILLE_MAX_CV:
                return _erreur('Fichier trop volumineux (max 5 Mo).')
            nom = cv_file.name
        elif profil.cv_pdf:
            nom = os.path.basename(profil.cv_pdf.name)
        else:
            return _erreur('Aucun CV à analyser.')
        extension = os.path.splitext(nom)[1].lower()
        if extension not in EXTENSIONS:
            return _erreur(f'Format non supporté ({extension}).')

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
        try:
            if cv_file:
                for morceau in cv_file.chunks():
                    tmp.write(morceau)
            else:
                with profil.cv_pdf.open('rb') as f:
                    for morceau in f.chunks():
                        tmp.write(morceau)
            tmp.close()
            texte = extract_text(tmp.name, nom)
        finally:
            tmp.close()
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)
        if not texte or len(texte.strip()) < 50:
            return _erreur("Impossible d'extraire du texte. Le PDF est peut-être scanné (image).")
        try:
            resultat = nettoyer_texte(texte, noms_connus=(user.first_name, user.last_name))
        except ModeleNerIndisponible:
            return _erreur("Le service de confidentialité est momentanément indisponible.",
                           status.HTTP_503_SERVICE_UNAVAILABLE)
        return _reponse('PARSER_CV', resultat.texte[:LONGUEUR_MAX_PARSER], resultat.categories)
