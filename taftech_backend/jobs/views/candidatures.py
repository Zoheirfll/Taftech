import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

logger = logging.getLogger(__name__)
from django.contrib.auth import get_user_model
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from ..models import OffreEmploi, Candidature, Notification, EquipeActionLog
from ..models import QuestionQuestionnaire, ReponseCandidat
from .equipe import get_entreprise_for_user, get_membre_role, _log

_ROLES_ACTION = ('PROPRIETAIRE', 'ADMIN', 'UTILISATEUR')
from ..serializers import (
    PostulerDTO, PostulerRapideDTO,
    MesCandidaturesDTO, CandidatureRecruteurDTO
)
from ..matcher import calculer_score_matching, normaliser

User = get_user_model()


class PostulerAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, offre_id):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Seuls les candidats peuvent postuler."}, status=status.HTTP_403_FORBIDDEN)
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas ou n'est plus active."}, status=status.HTTP_404_NOT_FOUND)
        if Candidature.objects.filter(offre=offre, candidat=request.user).exists():
            return Response({"error": "Vous avez déjà postulé à cette offre."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = PostulerDTO(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        resultat_matching = calculer_score_matching(request.user, offre)

        try:
            profil = request.user.profil_candidat
            snapshot = {
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "email": request.user.email,
                "telephone": request.user.telephone,
                "titre_professionnel": profil.titre_professionnel,
                "wilaya": profil.wilaya,
                "commune": profil.commune,
                "adresse": profil.adresse,
                "diplome": profil.diplome,
                "specialite": profil.specialite,
                "competences": profil.competences,
                "langues": profil.langues,
                "cv_pdf": profil.cv_pdf.url if profil.cv_pdf else None,
                "photo_profil": profil.photo_profil.url if profil.photo_profil else None,
                "bio": profil.bio if hasattr(profil, 'bio') else None,
                "linkedin": profil.linkedin if hasattr(profil, 'linkedin') else None,
                "github": profil.github if hasattr(profil, 'github') else None,
                "experiences": [
                    {
                        "titre_poste": exp.titre_poste,
                        "entreprise": exp.entreprise,
                        "secteur": exp.secteur,
                        "date_debut": str(exp.date_debut),
                        "date_fin": str(exp.date_fin) if exp.date_fin else None,
                        "description": exp.description,
                    }
                    for exp in profil.experiences_detail.all()
                ],
                "formations": [
                    {
                        "diplome": f.diplome,
                        "etablissement": f.etablissement,
                        "date_debut": str(f.date_debut),
                        "date_fin": str(f.date_fin) if f.date_fin else None,
                        "description": f.description,
                    }
                    for f in profil.formations_detail.all()
                ],
            }
        except Exception as e:
            logger.warning("Erreur snapshot profil : %s", e)
            snapshot = None

        candidature = Candidature.objects.create(
            offre=offre,
            candidat=request.user,
            lettre_motivation=serializer.validated_data.get('lettre_motivation', ''),
            lettre_motivation_file=serializer.validated_data.get('lettre_motivation_file', None),
            score_matching=resultat_matching["total"],
            details_matching={
                "scores": resultat_matching["details"],
                "explications": resultat_matching["explications"],
                "highlights": resultat_matching["highlights"]
            },
            profil_snapshot=snapshot,
            statut='RECUE'
        )

        # Réponses questionnaire + détection disqualification
        reponses_raw = request.data.get('reponses', None)
        if reponses_raw and offre.questionnaire:
            try:
                import json
                reponses_dict = json.loads(reponses_raw) if isinstance(reponses_raw, str) else reponses_raw
                disqualifie = False
                for question_id, reponse_texte in reponses_dict.items():
                    try:
                        question = QuestionQuestionnaire.objects.get(id=int(question_id))
                        ReponseCandidat.objects.create(
                            candidature=candidature,
                            question=question,
                            reponse=reponse_texte
                        )
                        # Question disqualifiante : vérifie que la réponse correspond au choix attendu
                        if question.disqualifiant:
                            choix_correct = question.choix.filter(est_correct=True).first()
                            if choix_correct and normaliser(reponse_texte) != normaliser(choix_correct.texte):
                                disqualifie = True
                    except QuestionQuestionnaire.DoesNotExist:
                        pass
                # Si disqualifié : score → 0, flag dans details_matching
                if disqualifie:
                    dm = candidature.details_matching or {}
                    dm["disqualifie"] = True
                    dm.setdefault("flags", []).append("Réponse disqualifiante au questionnaire.")
                    candidature.score_matching = 0
                    candidature.details_matching = dm
                    candidature.save(update_fields=["score_matching", "details_matching"])
            except Exception as e:
                logger.error("Erreur sauvegarde réponses : %s", e)

        # Email recruteur si score >= 70%
        email_employeur = offre.entreprise.user.email
        if email_employeur and resultat_matching['total'] >= 70.0:
            nom_candidat = f"{request.user.first_name} {request.user.last_name}"
            sujet = f"⭐ Top Profil détecté pour : {offre.titre}"
            ctx = {
                'nom_entreprise': offre.entreprise.nom_entreprise,
                'nom_candidat': nom_candidat,
                'titre_offre': offre.titre,
                'score': int(resultat_matching['total']),
                'annee': timezone.now().year,
            }
            html_body = render_to_string('emails/top_profil.html', ctx)
            texte = (
                f"Bonjour {offre.entreprise.nom_entreprise},\n\n"
                f"Un candidat très pertinent ({nom_candidat}) vient de postuler à '{offre.titre}'.\n"
                f"Score IA : {resultat_matching['total']}%.\n\nL'équipe TafTech."
            )
            try:
                msg = EmailMultiAlternatives(sujet, texte, settings.EMAIL_HOST_USER, [email_employeur])
                msg.attach_alternative(html_body, 'text/html')
                msg.send(fail_silently=True)
            except Exception as e:
                logger.error("Erreur envoi email employeur : %s", e)

        return Response({"message": "Candidature envoyée avec succès !"}, status=status.HTTP_201_CREATED)


class PostulerRapideAPIView(APIView):
    permission_classes = [AllowAny]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas ou n'est plus active."}, status=status.HTTP_404_NOT_FOUND)
        email = request.data.get('email_rapide')
        if Candidature.objects.filter(offre=offre, email_rapide=email).exists():
            return Response({"error": "Vous avez déjà postulé à cette offre avec cet email."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = PostulerRapideDTO(data=request.data)
        if serializer.is_valid():
            Candidature.objects.create(
                offre=offre,
                est_rapide=True,
                nom_rapide=serializer.validated_data.get('nom_rapide'),
                prenom_rapide=serializer.validated_data.get('prenom_rapide'),
                email_rapide=serializer.validated_data.get('email_rapide'),
                telephone_rapide=serializer.validated_data.get('telephone_rapide'),
                cv_rapide=serializer.validated_data.get('cv_rapide'),
                lettre_motivation=serializer.validated_data.get('lettre_motivation', ''),
                score_matching=0,
                details_matching={"message": "Candidature rapide, pas d'analyse IA disponible."},
                statut='RECUE'
            )
            return Response({"message": "Candidature rapide envoyée avec succès !"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MesCandidaturesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        candidatures = Candidature.objects.select_related('offre__entreprise').filter(candidat=request.user).order_by('-date_postulation')
        serializer = MesCandidaturesDTO(candidatures, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UpdateCandidatureStatusAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, candidature_id):
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=status.HTTP_404_NOT_FOUND)
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or candidature.offre.entreprise != entreprise:
            return Response({"error": "Vous n'avez pas l'autorisation de modifier cette candidature."}, status=status.HTTP_403_FORBIDDEN)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Accès refusé."}, status=403)
        nouveau_statut = request.data.get('statut')
        statuts_valides = [choix[0] for choix in Candidature.STATUTS]
        if nouveau_statut not in statuts_valides:
            return Response({"error": "Statut invalide."}, status=status.HTTP_400_BAD_REQUEST)

        candidature.statut = nouveau_statut
        nom_entreprise = candidature.offre.entreprise.nom_entreprise

        if nouveau_statut == 'ENTRETIEN':
            date_entretien_str = request.data.get('date_entretien')
            message_custom = request.data.get('message_entretien', '')
            if date_entretien_str:
                candidature.date_entretien = parse_datetime(date_entretien_str)
            email_destinataire = candidature.candidat.email if candidature.candidat else candidature.email_rapide
            nom_candidat = candidature.candidat.first_name if candidature.candidat else candidature.prenom_rapide
            if email_destinataire:
                sujet = f"Convocation à un entretien - {nom_entreprise}"
                date_formatee = date_entretien_str.replace('T', ' à ') if date_entretien_str else None
                ctx = {
                    'prenom': nom_candidat,
                    'nom_entreprise': nom_entreprise,
                    'titre_offre': candidature.offre.titre,
                    'date_entretien': date_formatee,
                    'message_custom': message_custom,
                    'annee': timezone.now().year,
                }
                html_body = render_to_string('emails/entretien.html', ctx)
                texte = f"Bonjour {nom_candidat},\n\n{nom_entreprise} vous convie à un entretien pour {candidature.offre.titre}."
                if date_formatee:
                    texte += f"\nDate : {date_formatee}"
                if message_custom:
                    texte += f"\nMessage : {message_custom}"
                texte += f"\n\nCordialement,\n{nom_entreprise} (via TafTech)"
                try:
                    msg = EmailMultiAlternatives(sujet, texte, settings.EMAIL_HOST_USER, [email_destinataire])
                    msg.attach_alternative(html_body, 'text/html')
                    msg.send(fail_silently=True)
                except Exception as e:
                    logger.error("Erreur envoi email entretien : %s", e)
            candidature.message_entretien = message_custom

        if nouveau_statut == "REFUSE":
            try:
                profil_entreprise = candidature.offre.entreprise
                if getattr(profil_entreprise, 'email_refus_auto', False):
                    prenom = candidature.candidat.first_name if candidature.candidat else candidature.prenom_rapide or "Candidat"
                    email_candidat = candidature.candidat.email if candidature.candidat else candidature.email_rapide or ""
                    if email_candidat:
                        message_template = profil_entreprise.message_refus_auto or ""
                        message_final = message_template.replace("{prenom}", prenom)
                        message_final = message_final.replace("{titre_offre}", candidature.offre.titre or "ce poste")
                        message_final = message_final.replace("{nom_entreprise}", profil_entreprise.nom_entreprise or "notre entreprise")
                        ctx = {
                            'prenom': prenom,
                            'titre_offre': candidature.offre.titre or "ce poste",
                            'nom_entreprise': profil_entreprise.nom_entreprise or "notre entreprise",
                            'message': message_final,
                            'annee': timezone.now().year,
                        }
                        html_body = render_to_string('emails/refus.html', ctx)
                        msg = EmailMultiAlternatives(
                            f"Réponse à votre candidature — {candidature.offre.titre}",
                            message_final,
                            settings.EMAIL_HOST_USER,
                            [email_candidat],
                        )
                        msg.attach_alternative(html_body, 'text/html')
                        msg.send(fail_silently=False)
            except Exception as e:
                logger.error("Erreur envoi email refus : %s", e)

        candidature.save()

        # Notification inbox
        if candidature.candidat:
            titre_notif = ""
            type_n = 'INFO'
            message_notif = ""
            if nouveau_statut == 'ENTRETIEN':
                type_n = 'ENTRETIEN'
                titre_notif = f"Entretien programmé chez {nom_entreprise}"
                message_notif = f"Vous avez été convié à un entretien pour {candidature.offre.titre}."
            elif nouveau_statut == 'RETENU':
                type_n = 'RETENU'
                titre_notif = f"🎉 Félicitations ! Vous êtes retenu chez {nom_entreprise}"
                message_notif = f"{nom_entreprise} a validé votre profil pour {candidature.offre.titre}."
            elif nouveau_statut == 'REFUSE':
                type_n = 'REFUS'
                titre_notif = f"Candidature non retenue - {nom_entreprise}"
                message_notif = f"{nom_entreprise} n'a pas retenu votre candidature pour {candidature.offre.titre}."
            elif nouveau_statut == 'EN_COURS':
                titre_notif = f"Candidature en cours d'étude - {nom_entreprise}"
                message_notif = f"Votre candidature pour {candidature.offre.titre} est en cours d'examen."
            if titre_notif:
                Notification.objects.create(
                    destinataire=candidature.candidat,
                    type_notif=type_n,
                    titre=titre_notif,
                    message=message_notif
                )

        entreprise = get_entreprise_for_user(request.user)
        if entreprise:
            nom_candidat = candidature.candidat.get_full_name() if candidature.candidat else 'Candidat rapide'
            _log(request.user, entreprise, 'STATUT_CANDIDATURE',
                 f"{nom_candidat} — {candidature.offre.titre} → {nouveau_statut}")

        return Response({"message": "Statut mis à jour !", "nouveau_statut": nouveau_statut}, status=status.HTTP_200_OK)


class DeleteCandidatureAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, candidature_id):
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=status.HTTP_404_NOT_FOUND)
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or candidature.offre.entreprise != entreprise:
            return Response({"error": "Non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Accès refusé."}, status=403)
        candidature.delete()
        return Response({"message": "Candidature supprimée."}, status=status.HTTP_204_NO_CONTENT)


class EvaluerCandidatureAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, candidature_id):
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=status.HTTP_404_NOT_FOUND)
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or candidature.offre.entreprise != entreprise:
            return Response({"error": "Action non autorisée."}, status=status.HTTP_403_FORBIDDEN)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Accès refusé."}, status=403)
        try:
            n_tech = int(request.data.get('note_technique', 0))
            n_comm = int(request.data.get('note_communication', 0))
            n_mot = int(request.data.get('note_motivation', 0))
            n_exp = int(request.data.get('note_experience', 0))
        except ValueError:
            return Response({"error": "Les notes doivent être des nombres."}, status=status.HTTP_400_BAD_REQUEST)
        candidature.note_technique = n_tech
        candidature.note_communication = n_comm
        candidature.note_motivation = n_mot
        candidature.note_experience = n_exp
        candidature.commentaire_evaluation = request.data.get('commentaire_evaluation', '')
        candidature.note_globale = n_tech + n_comm + n_mot + n_exp
        candidature.save()
        entreprise = get_entreprise_for_user(request.user)
        if entreprise:
            nom_candidat = candidature.candidat.get_full_name() if candidature.candidat else 'Candidat rapide'
            _log(request.user, entreprise, 'EVALUER_CANDIDATURE',
                 f"{nom_candidat} — {candidature.offre.titre} — note {candidature.note_globale}/20")
        serializer = CandidatureRecruteurDTO(candidature)
        return Response({"message": "Évaluation enregistrée !", "candidature": serializer.data}, status=status.HTTP_200_OK)


class Top5CandidatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)
        entreprise = get_entreprise_for_user(request.user)
        is_membre = entreprise and offre.entreprise == entreprise
        is_admin = request.user.is_superuser or request.user.role == 'ADMIN'
        if not (is_membre or is_admin):
            return Response({"error": "Non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        shortlist = offre.candidatures.filter(
            est_rapide=False,
            score_matching__isnull=False
        ).order_by('-score_matching')[:5]
        serializer = CandidatureRecruteurDTO(shortlist, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)