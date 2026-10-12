"""Questionnaires de candidature : création, liste, détail."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Questionnaire, QuestionQuestionnaire, ReponseChoix
from .equipe import get_entreprise_for_user, get_membre_role
from ..serializers import QuestionnaireSerializer



class QuestionnaireListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_owner(self, request):
        """Retourne le propriétaire de l'entreprise (pour les questionnaires liés à l'owner)."""
        entreprise = get_entreprise_for_user(request.user)
        return entreprise.user if entreprise else None

    def get(self, request):
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Accès refusé.'}, status=403)
        questionnaires = Questionnaire.objects.filter(recruteur=owner)
        serializer = QuestionnaireSerializer(questionnaires, many=True)
        return Response(serializer.data)

    def post(self, request):
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Accès refusé.'}, status=403)
        entreprise = get_entreprise_for_user(request.user)
        if get_membre_role(request.user, entreprise) not in ('PROPRIETAIRE', 'ADMIN', 'UTILISATEUR'):
            return Response({'error': 'Accès refusé.'}, status=403)
        data = request.data
        questionnaire = Questionnaire.objects.create(recruteur=owner, titre=data.get('titre', 'Sans titre'))
        for i, q in enumerate(data.get('questions', [])):
            question = QuestionQuestionnaire.objects.create(
                questionnaire=questionnaire,
                texte=q.get('texte', ''),
                type_question=q.get('type_question', 'COURT'),
                requis=q.get('requis', False),
                disqualifiant=q.get('disqualifiant', False),
                ordre=i,
            )
            for choix in q.get('choix', []):
                if choix.get('texte'):
                    ReponseChoix.objects.create(question=question, texte=choix['texte'])
        return Response(QuestionnaireSerializer(questionnaire).data, status=201)


class QuestionnaireDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_owner(self, request):
        entreprise = get_entreprise_for_user(request.user)
        return entreprise.user if entreprise else None

    def get(self, request, pk):
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Introuvable.'}, status=404)
        try:
            q = Questionnaire.objects.get(pk=pk, recruteur=owner)
            return Response(QuestionnaireSerializer(q).data)
        except Questionnaire.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)

    def put(self, request, pk):
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Introuvable.'}, status=404)
        try:
            questionnaire = Questionnaire.objects.get(pk=pk, recruteur=owner)
        except Questionnaire.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        questionnaire.titre = request.data.get('titre', questionnaire.titre)
        questionnaire.save()
        questionnaire.questions.all().delete()
        for i, q in enumerate(request.data.get('questions', [])):
            question = QuestionQuestionnaire.objects.create(
                questionnaire=questionnaire,
                texte=q.get('texte', ''),
                type_question=q.get('type_question', 'COURT'),
                requis=q.get('requis', False),
                disqualifiant=q.get('disqualifiant', False),
                ordre=i,
            )
            for choix in q.get('choix', []):
                if choix.get('texte'):
                    ReponseChoix.objects.create(question=question, texte=choix['texte'])
        return Response(QuestionnaireSerializer(questionnaire).data)

    def delete(self, request, pk):
        owner = self._get_owner(request)
        if not owner:
            return Response({'error': 'Introuvable.'}, status=404)
        try:
            Questionnaire.objects.get(pk=pk, recruteur=owner).delete()
            return Response({'message': 'Supprimé.'})
        except Questionnaire.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
