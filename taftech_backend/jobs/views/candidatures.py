import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
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
from ..models import QuestionQuestionnaire, ReponseCandidat, ReponseExigence
from .equipe import get_entreprise_for_user, get_membre_role, _log
from ..throttles import WriteActionThrottle, PostulerRapideEmailThrottle, FileUploadThrottle

_ROLES_ACTION = ('PROPRIETAIRE', 'ADMIN', 'UTILISATEUR')
from ..serializers import (
    PostulerDTO, PostulerRapideDTO,
    MesCandidaturesDTO, CandidatureRecruteurDTO
)
from ..serializers.candidatures import ReponseExigenceSerializer
from ..serializers.profils import CompetenceCandidatSerializer
from ..matcher import calculer_score_matching, normaliser

User = get_user_model()


class PostulerAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    throttle_classes = [FileUploadThrottle]

    def post(self, request, offre_id):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Seuls les candidats peuvent postuler."}, status=status.HTTP_403_FORBIDDEN)
        # Exigence ANEM : le NIN est obligatoire pour postuler avec un compte (il n'est pas demandé à
        # l'inscription). La candidature rapide, sans compte, n'est pas concernée (limite consignée
        # dans docs/problemes-a-traiter.md).
        if not request.user.nin:
            return Response(
                {"error": "Votre NIN est obligatoire pour postuler.", "code": "NIN_REQUIS"},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas ou n'est plus active."}, status=status.HTTP_404_NOT_FOUND)
        if offre.est_cloturee:
            return Response({"error": "Cette offre est clôturée, elle n'accepte plus de candidatures."}, status=status.HTTP_400_BAD_REQUEST)
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
                "date_naissance": str(request.user.date_naissance) if request.user.date_naissance else None,
                "sexe": profil.sexe,
                "diplome": profil.diplome,
                "diplome_ref_libelle": profil.diplome_ref.libelle if profil.diplome_ref else None,
                "niveau_scolaire_ref_libelle": profil.niveau_scolaire_ref.libelle if profil.niveau_scolaire_ref else None,
                "metier": profil.metier.libelle if profil.metier else None,
                "metier_souhaite": profil.metier_souhaite.libelle if profil.metier_souhaite else None,
                "salaire_souhaite": profil.salaire_souhaite,
                "mobilite": profil.mobilite,
                "situation_actuelle": profil.situation_actuelle,
                "service_militaire": profil.service_militaire,
                "permis_conduire": profil.permis_conduire,
                "passeport_valide": profil.passeport_valide,
                "vehicule_personnel": profil.vehicule_personnel,
                "competences": profil.competences,
                "competences_detail": CompetenceCandidatSerializer(profil.competences_detail.all(), many=True).data,
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
                        "metier_libelle": exp.metier.libelle if exp.metier else None,
                        "date_debut": str(exp.date_debut),
                        "date_fin": str(exp.date_fin) if exp.date_fin else None,
                        "date_debut_precision": exp.date_debut_precision,
                        "date_fin_precision": exp.date_fin_precision,
                        "description": exp.description,
                    }
                    for exp in profil.experiences_detail.all()
                ],
                "formations": [
                    {
                        "diplome": f.diplome,
                        "diplome_ref_libelle": f.diplome_ref.libelle if f.diplome_ref else None,
                        "specialite_ref_libelle": f.specialite_ref.libelle if f.specialite_ref else None,
                        "statut": f.statut,
                        "etablissement": f.etablissement,
                        "date_debut": str(f.date_debut) if f.date_debut else None,
                        "date_fin": str(f.date_fin) if f.date_fin else None,
                        "date_debut_precision": f.date_debut_precision,
                        "date_fin_precision": f.date_fin_precision,
                        "description": f.description,
                    }
                    for f in profil.formations_detail.all()
                ],
            }
        except Exception as e:
            logger.warning("Erreur snapshot profil : %s", e)
            snapshot = None

        source_candidature = 'SITE'
        invitation_token = request.data.get('invitation_token')
        if invitation_token:
            from ..models import InvitationCVTheque
            invitation = InvitationCVTheque.objects.filter(
                token=invitation_token, candidat=request.user, offre=offre,
            ).first()
            if invitation and invitation.est_valide:
                source_candidature = 'CVTHEQUE'

        candidature = Candidature.objects.create(
            offre=offre,
            candidat=request.user,
            lettre_motivation=serializer.validated_data.get('lettre_motivation', ''),
            lettre_motivation_file=serializer.validated_data.get('lettre_motivation_file', None),
            score_matching=resultat_matching["total"] if resultat_matching["total"] is not None else 0,
            details_matching={
                "scores": resultat_matching["details"],
                "explications": resultat_matching["explications"],
                "highlights": resultat_matching["highlights"]
            },
            profil_snapshot=snapshot,
            statut='RECUE',
            source=source_candidature,
        )

        from .equipe import _log, _notifier_equipe
        nom_candidat_notif = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        _log(None, offre.entreprise, 'AUTRE', f"{nom_candidat_notif} a postulé sur « {offre.titre} »")
        _notifier_equipe(
            offre.entreprise, 'NOUVELLE_CANDIDATURE',
            f"Nouvelle candidature : {offre.titre}",
            f"{nom_candidat_notif} a postulé à « {offre.titre} ».",
            lien=f"/dashboard/offres/{offre.id}"
        )
        if resultat_matching["total"] >= 80.0:
            _notifier_equipe(
                offre.entreprise, 'CANDIDAT_RECOMMANDE',
                f"Candidat recommandé : {nom_candidat_notif}",
                f"{nom_candidat_notif} obtient un score IA de {int(resultat_matching['total'])}% sur « {offre.titre} ».",
                lien=f"/dashboard/offres/{offre.id}"
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
                        question = QuestionQuestionnaire.objects.get(id=int(question_id), questionnaire=offre.questionnaire)
                        reponse_texte = str(reponse_texte)[:2000]
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

        # S12 : réponses aux exigences impératives de l'offre (permis, habilitation...) — un
        # statut manquant/invalide retombe sur INCONNU (jamais une disqualification implicite,
        # "inconnu provoque une vérification, pas un rejet automatique"). Justificatif optionnel
        # transmis en multipart sous la clé `justificatif_exigence_<id>`.
        try:
            import json as _json
            reponses_exigences_raw = request.data.get('reponses_exigences')
            reponses_exigences = _json.loads(reponses_exigences_raw) if isinstance(reponses_exigences_raw, str) else (reponses_exigences_raw or [])
            exigence_ids = set(offre.exigences_imperatives.values_list('id', flat=True))
            statuts_valides = {c[0] for c in ReponseExigence.STATUT_CHOICES}
            for item in reponses_exigences:
                if not isinstance(item, dict):
                    continue
                exigence_id = item.get('exigence_id')
                try:
                    exigence_id = int(exigence_id)
                except (TypeError, ValueError):
                    continue
                if exigence_id not in exigence_ids:
                    continue
                statut = item.get('statut') if item.get('statut') in statuts_valides else 'INCONNU'
                ReponseExigence.objects.create(
                    candidature=candidature,
                    exigence_id=exigence_id,
                    statut=statut,
                    justificatif=request.FILES.get(f'justificatif_exigence_{exigence_id}'),
                )
            # Toute exigence de l'offre sans réponse du candidat reste tracée comme INCONNU —
            # jamais silencieusement absente, pour que le recruteur sache qu'il doit vérifier.
            repondues = set(reponses_exigences and [
                int(i['exigence_id']) for i in reponses_exigences if isinstance(i, dict) and str(i.get('exigence_id', '')).isdigit()
            ] or [])
            for exigence_id in exigence_ids - repondues:
                ReponseExigence.objects.get_or_create(candidature=candidature, exigence_id=exigence_id, defaults={'statut': 'INCONNU'})
        except Exception as e:
            logger.error("Erreur sauvegarde réponses exigences impératives : %s", e)

        # Email recruteur si score >= 80%
        email_employeur = offre.entreprise.user.email
        if email_employeur and resultat_matching['total'] >= 80.0:
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
                msg = EmailMultiAlternatives(sujet, texte, settings.DEFAULT_FROM_EMAIL, [email_employeur])
                msg.attach_alternative(html_body, 'text/html')
                msg.send(fail_silently=True)
            except Exception as e:
                logger.error("Erreur envoi email employeur : %s", e)

        return Response({"message": "Candidature envoyée avec succès !"}, status=status.HTTP_201_CREATED)


class PostulerRapideAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [WriteActionThrottle, PostulerRapideEmailThrottle]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas ou n'est plus active."}, status=status.HTTP_404_NOT_FOUND)
        if offre.est_cloturee:
            return Response({"error": "Cette offre est clôturée, elle n'accepte plus de candidatures."}, status=status.HTTP_400_BAD_REQUEST)
        email = (request.data.get('email_rapide') or '').strip()
        if Candidature.objects.filter(offre=offre, email_rapide__iexact=email).exists():
            return Response({"error": "Vous avez déjà postulé à cette offre avec cet email."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = PostulerRapideDTO(data=request.data)
        if serializer.is_valid():
            Candidature.objects.create(
                offre=offre,
                est_rapide=True,
                source='AUTRE',
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
            from .equipe import _log, _notifier_equipe
            prenom_rapide = serializer.validated_data.get('prenom_rapide', '') or ''
            nom_rapide = serializer.validated_data.get('nom_rapide', '') or ''
            nom_complet_rapide = f"{prenom_rapide} {nom_rapide}".strip() or "Un candidat"
            _log(None, offre.entreprise, 'AUTRE', f"{nom_complet_rapide} a postulé sur « {offre.titre} »")
            _notifier_equipe(
                offre.entreprise, 'NOUVELLE_CANDIDATURE',
                f"Nouvelle candidature : {offre.titre}",
                f"{nom_complet_rapide} a postulé (candidature rapide) à « {offre.titre} ».",
                lien=f"/dashboard/offres/{offre.id}"
            )
            return Response({"message": "Candidature rapide envoyée avec succès !"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MesCandidaturesPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class MesCandidaturesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        candidatures = Candidature.objects.select_related('offre__entreprise').filter(candidat=request.user).order_by('-date_maj', '-id')
        # Sans ?page : liste complète (le tableau de bord en tire ses compteurs).
        if 'page' not in request.query_params:
            serializer = MesCandidaturesDTO(candidatures, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        paginator = MesCandidaturesPagination()
        page = paginator.paginate_queryset(candidatures, request, view=self)
        serializer = MesCandidaturesDTO(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


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
                date_parsee = parse_datetime(date_entretien_str)
                # Le frontend envoie une heure locale sans offset ("2026-09-30T14:00") —
                # parse_datetime() renvoie alors un datetime naïf, que timezone.localtime()
                # (utilisé plus bas pour la notification) rejette avec ValueError. On le rend
                # conscient du fuseau avant stockage, comme partout ailleurs avec USE_TZ=True.
                if date_parsee and timezone.is_naive(date_parsee):
                    date_parsee = timezone.make_aware(date_parsee)
                candidature.date_entretien = date_parsee
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
                    msg = EmailMultiAlternatives(sujet, texte, settings.DEFAULT_FROM_EMAIL, [email_destinataire])
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
                            settings.DEFAULT_FROM_EMAIL,
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
                if candidature.date_entretien:
                    date_locale = timezone.localtime(candidature.date_entretien)
                    message_notif += f" Le {date_locale.strftime('%d/%m/%Y à %Hh%M')}."
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
            elif nouveau_statut == 'PRESELECTION':
                titre_notif = f"Vous êtes présélectionné(e) chez {nom_entreprise}"
                message_notif = f"Votre profil a été présélectionné pour {candidature.offre.titre}."
            if titre_notif:
                Notification.objects.create(
                    destinataire=candidature.candidat,
                    type_notif=type_n,
                    titre=titre_notif,
                    message=message_notif,
                    lien='/mes-candidatures',
                )

        entreprise = get_entreprise_for_user(request.user)
        if entreprise:
            nom_candidat = candidature.candidat.get_full_name() if candidature.candidat else 'Candidat rapide'
            phrases_statut = {
                'ENTRETIEN': f"programmé un entretien avec {nom_candidat} pour « {candidature.offre.titre} »",
                'RETENU': f"retenu la candidature de {nom_candidat} pour « {candidature.offre.titre} »",
                'REFUSE': f"refusé la candidature de {nom_candidat} pour « {candidature.offre.titre} »",
                'PRESELECTION': f"présélectionné {nom_candidat} pour « {candidature.offre.titre} »",
                'EN_COURS': f"mis en cours d'étude la candidature de {nom_candidat} pour « {candidature.offre.titre} »",
                'RECUE': f"remis en attente la candidature de {nom_candidat} pour « {candidature.offre.titre} »",
            }
            _log(request.user, entreprise, 'STATUT_CANDIDATURE',
                 phrases_statut.get(nouveau_statut, f"changé le statut de {nom_candidat} vers {nouveau_statut}"))

        return Response({"message": "Statut mis à jour !", "nouveau_statut": nouveau_statut}, status=status.HTTP_200_OK)


class MettreAJourReponseExigenceAPIView(APIView):
    """S12 — le recruteur vérifie manuellement une exigence impérative répondue INCONNU (ou
    corrige une réponse) et bascule son statut. Jamais un rejet automatique de la candidature :
    ceci ne fait que mettre à jour le statut de l'exigence elle-même, la décision finale sur la
    candidature reste un acte séparé du recruteur (changement de statut de la candidature)."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, candidature_id, exigence_id):
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=404)
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or candidature.offre.entreprise != entreprise:
            return Response({"error": "Vous n'avez pas l'autorisation de modifier cette candidature."}, status=403)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Accès refusé."}, status=403)
        try:
            reponse = ReponseExigence.objects.get(candidature=candidature, exigence_id=exigence_id)
        except ReponseExigence.DoesNotExist:
            return Response({"error": "Réponse à l'exigence introuvable."}, status=404)
        nouveau_statut = request.data.get('statut')
        statuts_valides = {c[0] for c in ReponseExigence.STATUT_CHOICES}
        if nouveau_statut not in statuts_valides:
            return Response({"error": "Statut invalide."}, status=400)
        reponse.statut = nouveau_statut
        if 'commentaire' in request.data:
            reponse.commentaire = str(request.data.get('commentaire') or '')[:2000]
        reponse.save(update_fields=['statut', 'commentaire', 'date_reponse'])
        _log(request.user, entreprise, 'AUTRE',
             f"Exigence « {reponse.exigence.label} » vérifiée pour {candidature.candidat_id or candidature.email_rapide} : {reponse.get_statut_display()}")
        return Response(ReponseExigenceSerializer(reponse, context={'request': request}).data, status=200)


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

    def delete(self, request, candidature_id):
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=status.HTTP_404_NOT_FOUND)
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or candidature.offre.entreprise != entreprise:
            return Response({"error": "Action non autorisée."}, status=status.HTTP_403_FORBIDDEN)
        if get_membre_role(request.user, entreprise) not in _ROLES_ACTION:
            return Response({"error": "Accès refusé."}, status=403)
        candidature.note_technique = None
        candidature.note_communication = None
        candidature.note_motivation = None
        candidature.note_experience = None
        candidature.note_globale = None
        candidature.commentaire_evaluation = ''
        candidature.save()
        nom_candidat = candidature.candidat.get_full_name() if candidature.candidat else 'Candidat rapide'
        _log(request.user, entreprise, 'EVALUER_CANDIDATURE', f"{nom_candidat} — {candidature.offre.titre} — évaluation supprimée")
        serializer = CandidatureRecruteurDTO(candidature)
        return Response({"message": "Évaluation supprimée.", "candidature": serializer.data}, status=status.HTTP_200_OK)


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
        if is_membre and not is_admin and not entreprise.est_approuvee:
            return Response({"error": "Entreprise non validée.", "code": "ENTREPRISE_NON_VALIDEE"}, status=status.HTTP_403_FORBIDDEN)
        shortlist = offre.candidatures.filter(
            est_rapide=False,
            score_matching__isnull=False
        ).order_by('-score_matching')[:5]
        serializer = CandidatureRecruteurDTO(shortlist, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CandidatureMarquerConsulteeAPIView(APIView):
    """Journalise "candidature consultée" dans le fil d'activité du candidat (dashboard
    candidat, session specs/important-features) — appelé par le frontend recruteur quand un
    recruteur ouvre le détail d'une candidature (fire-and-forget, pas d'action bloquante)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, candidature_id):
        try:
            candidature = Candidature.objects.select_related('offre__entreprise', 'candidat').get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=status.HTTP_404_NOT_FOUND)
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise or candidature.offre.entreprise != entreprise:
            return Response({"error": "Non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        if candidature.candidat and not candidature.est_rapide:
            from ..models import ActiviteProfil
            # Une seule entrée par (candidat, entreprise, candidature) — pas de spam si le
            # recruteur rouvre la même candidature plusieurs fois.
            ActiviteProfil.objects.get_or_create(
                candidat=candidature.candidat,
                entreprise=entreprise,
                candidature=candidature,
                type_activite='CANDIDATURE_CONSULTEE',
            )
        return Response({"message": "OK"}, status=status.HTTP_200_OK)