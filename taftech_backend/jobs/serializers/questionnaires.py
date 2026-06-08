from rest_framework import serializers
from ..models import Questionnaire, QuestionQuestionnaire, ReponseChoix, ReponseCandidat


class ReponseChoixSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReponseChoix
        fields = ['id', 'texte']


class QuestionQuestionnaireSerializer(serializers.ModelSerializer):
    choix = ReponseChoixSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionQuestionnaire
        fields = ['id', 'texte', 'type_question', 'requis', 'disqualifiant', 'ordre', 'choix']


class QuestionnaireSerializer(serializers.ModelSerializer):
    questions = QuestionQuestionnaireSerializer(many=True, read_only=True)

    class Meta:
        model = Questionnaire
        fields = ['id', 'titre', 'date_creation', 'questions']
        read_only_fields = ['date_creation']


class ReponseCandidatSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReponseCandidat
        fields = ['id', 'question', 'reponse']