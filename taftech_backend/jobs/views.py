from django.shortcuts import render
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils.dateparse import parse_datetime
from django.conf import settings

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from .models import OffreEmploi , Candidature, ProfilCandidat, ProfilEntreprise, ExperienceCandidat, FormationCandidat, Notification
from .models import WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES, NIVEAUX_EXPERIENCE, TYPES_CONTRAT
from .serializers import OffreEmploiSerializer, PostulerDTO, EntrepriseDashboardDetailSerializer, OffreEmploiCreateDTO, OffreDashboardDTO, ProfilCandidatDTO
from .serializers import  EntrepriseDashboardDetailSerializer, AdminUserSerializer
from .serializers import ExperienceSerializer, FormationSerializer
from .models import OffreSauvegardee, AlerteEmploi
from .serializers import OffreSauvegardeeSerializer, AlerteEmploiSerializer, ParametresNotificationsSerializer
from .serializers import EntreprisePublicSerializer
from .serializers import PostulerRapideDTO,  NotificationSerializer
from .matcher import calculer_score_matching
User = get_user_model()
class JobListAPIView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        # 1. On récupère TOUS les filtres envoyés par ton nouveau React
        mot_cle = request.query_params.get('search', '')
        wilaya = request.query_params.get('wilaya', '')
        commune = request.query_params.get('commune', '')
        diplome = request.query_params.get('diplome', '')
        specialite = request.query_params.get('specialite', '')
        experience = request.query_params.get('experience', '')
        contrat = request.query_params.get('contrat', '')

        # 2. On prend toutes les offres actives
        offres = OffreEmploi.objects.filter(est_active=True, statut_moderation='APPROUVEE', est_cloturee=False)

        # 3. On applique chaque filtre (seulement si l'utilisateur a écrit quelque chose)
        if mot_cle:
            offres = offres.filter(
                Q(titre__icontains=mot_cle) | Q(missions__icontains=mot_cle)
            )
        if wilaya:
            offres = offres.filter(wilaya__icontains=wilaya)
        if commune:
            offres = offres.filter(commune__icontains=commune)
        if diplome:
            offres = offres.filter(diplome__icontains=diplome)
        if specialite:
            offres = offres.filter(specialite__icontains=specialite)
        if experience:
            # Recherche exacte pour les menus déroulants
            offres = offres.filter(experience_requise=experience) 
        if contrat:
            offres = offres.filter(type_contrat=contrat)

        # 4. Le tri et la pagination (inchangés, ton code était bon)
        offres = offres.order_by('-date_publication')
        
        paginator = PageNumberPagination()
        paginator.page_size = 5 
        
        page = paginator.paginate_queryset(offres, request)
        serializer = OffreEmploiSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
class PostulerAPIView(APIView):
    """
    Endpoint pour postuler à une offre avec un compte.
    URL : /api/jobs/<id_offre>/postuler/
    """
    permission_classes = [IsAuthenticated] 
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas ou n'est plus active."}, status=status.HTTP_404_NOT_FOUND)

        if Candidature.objects.filter(offre=offre, candidat=request.user).exists():
            return Response({"error": "Vous avez déjà postulé à cette offre."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PostulerDTO(data=request.data)
        if serializer.is_valid():
            
            # L'algo renvoie le score IA
            resultat_matching = calculer_score_matching(request.user, offre)

            Candidature.objects.create(
                offre=offre,
                candidat=request.user,
                lettre_motivation=serializer.validated_data.get('lettre_motivation', ''),
                lettre_motivation_file=serializer.validated_data.get('lettre_motivation_file', None),
                score_matching=resultat_matching["total"],
                details_matching=resultat_matching["details"],
                statut='RECUE' 
            )

            # ==========================================
            # 👇 NOUVEAU : ENVOI DE L'EMAIL AU RECRUTEUR 👇
            # ==========================================
            email_employeur = offre.entreprise.user.email
            if email_employeur:
                nom_candidat = f"{request.user.first_name} {request.user.last_name}"
                sujet = f"Nouvelle candidature pour : {offre.titre}"
                
                message = f"Bonjour {offre.entreprise.nom_entreprise},\n\n"
                message += f"Un nouveau candidat ({nom_candidat}) vient de postuler à votre offre '{offre.titre}'.\n"
                message += f"🤖 L'IA de TafTech a analysé son profil et lui a attribué un score de correspondance de {resultat_matching['total']}%.\n\n"
                message += "Connectez-vous à votre tableau de bord TafTech pour examiner son dossier complet.\n\n"
                message += "L'équipe TafTech."
                
                try:
                    send_mail(
                        subject=sujet, 
                        message=message, 
                        from_email=settings.EMAIL_HOST_USER, 
                        recipient_list=[email_employeur], 
                        fail_silently=True
                    )
                except Exception as e:
                    print(f"Erreur envoi email employeur : {e}")

            return Response({"message": "Candidature envoyée avec succès !"}, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class JobCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Vérifie si le profil existe
        if not hasattr(request.user, 'profil_entreprise'):
            return Response({"error": "Profil entreprise inexistant."}, status=403)
            
        # 2. Vérifie si l'entreprise est approuvée par l'admin
        if not request.user.profil_entreprise.est_approuvee:
            return Response(
                {"error": "Votre entreprise doit être validée par TafTech avant de publier."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # LA SEULE LIGNE QUI CHANGE EST CELLE-CI :
        serializer = OffreEmploiCreateDTO(data=request.data)
        
        if serializer.is_valid():
            serializer.save(entreprise=request.user.profil_entreprise)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class DashboardRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'profil_entreprise'):
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)

        entreprise = request.user.profil_entreprise
        offres = OffreEmploi.objects.filter(entreprise=entreprise).order_by('-date_publication')
        
        # On utilise le nouveau serializer qui contient first_name, email, etc.
        entreprise_serializer = EntrepriseDashboardDetailSerializer(entreprise)
        offres_serializer = OffreDashboardDTO(offres, many=True)
        
        data = {
            "entreprise": entreprise_serializer.data, # Contient maintenant TOUTES les infos
            "offres": offres_serializer.data
        }
        
        return Response(data, status=status.HTTP_200_OK)
class UpdateCandidatureStatusAPIView(APIView):
    """ Endpoint pour qu'un recruteur modifie le statut d'une candidature. """
    permission_classes = [IsAuthenticated]

    def patch(self, request, candidature_id):
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=status.HTTP_404_NOT_FOUND)

        if not hasattr(request.user, 'profil_entreprise') or candidature.offre.entreprise != request.user.profil_entreprise:
            return Response({"error": "Vous n'avez pas l'autorisation de modifier cette candidature."}, status=status.HTTP_403_FORBIDDEN)

        nouveau_statut = request.data.get('statut')
        statuts_valides = [choix[0] for choix in Candidature.STATUTS]
        if nouveau_statut not in statuts_valides:
            return Response({"error": "Statut invalide."}, status=status.HTTP_400_BAD_REQUEST)

        candidature.statut = nouveau_statut
        nom_entreprise = candidature.offre.entreprise.nom_entreprise

        # ==========================================
        # GESTION DE L'ENTRETIEN & EMAIL (3ème personne)
        # ==========================================
        if nouveau_statut == 'ENTRETIEN':
            date_entretien_str = request.data.get('date_entretien')
            message_custom = request.data.get('message_entretien', '')

            if date_entretien_str:
                candidature.date_entretien = parse_datetime(date_entretien_str)

            email_destinataire = candidature.candidat.email if candidature.candidat else candidature.email_rapide
            nom_candidat = candidature.candidat.first_name if candidature.candidat else candidature.prenom_rapide

            if email_destinataire:
                sujet = f"Convocation à un entretien - {nom_entreprise}"
                corps_email = f"Bonjour {nom_candidat},\n\n"
                corps_email += f"L'entreprise {nom_entreprise} a été vivement intéressée par votre profil concernant le poste de {candidature.offre.titre}.\n"
                corps_email += f"Elle a le plaisir de vous convier à un entretien afin d'échanger plus en détail sur votre candidature.\n\n"
                corps_email += f"Voici les informations concernant votre rendez-vous :\n"
                if date_entretien_str:
                    date_formattee = date_entretien_str.replace('T', ' à ')
                    corps_email += f"📅 Date et heure : {date_formattee}\n"
                if message_custom:
                    corps_email += f"💬 Message de l'entreprise :\n{message_custom}\n"
                corps_email += f"\nNous vous souhaitons une excellente préparation pour cet échange.\n\nCordialement,\nLe service recrutement de {nom_entreprise}\n(Via la plateforme TafTech)"

                try:
                    send_mail(subject=sujet, message=corps_email, from_email=settings.EMAIL_HOST_USER, recipient_list=[email_destinataire], fail_silently=True)
                except Exception as e:
                    print(f"Erreur envoi email : {e}")
            
            candidature.message_entretien = message_custom

        candidature.save()

        # ==========================================
        # 👇 NOUVEAU : CRÉATION DE LA NOTIFICATION (INBOX) 👇
        # ==========================================
        if candidature.candidat: # On ne notifie que les candidats qui ont un compte
            titre_notif = ""
            message_notif = ""
            type_n = 'INFO'

            if nouveau_statut == 'ENTRETIEN':
                type_n = 'ENTRETIEN'
                titre_notif = f"Entretien programmé chez {nom_entreprise}"
                message_notif = f"Vous avez été convié à un entretien pour le poste de {candidature.offre.titre}.\n"
                if candidature.date_entretien:
                    message_notif += f"📅 Prévu le : {candidature.date_entretien.strftime('%d/%m/%Y à %H:%M')}\n"
                if candidature.message_entretien:
                    message_notif += f"💬 Message : {candidature.message_entretien}"
            elif nouveau_statut == 'RETENU':
                type_n = 'RETENU'
                titre_notif = f"🎉 Félicitations ! Vous êtes retenu chez {nom_entreprise}"
                message_notif = f"L'entreprise {nom_entreprise} a validé votre profil pour le poste de {candidature.offre.titre}."
            elif nouveau_statut == 'REFUSE':
                type_n = 'REFUS'
                titre_notif = f"Candidature non retenue - {nom_entreprise}"
                message_notif = f"Malheureusement, {nom_entreprise} n'a pas retenu votre candidature pour le poste de {candidature.offre.titre}."
            elif nouveau_statut == 'EN_COURS':
                titre_notif = f"Candidature en cours d'étude - {nom_entreprise}"
                message_notif = f"Votre candidature pour {candidature.offre.titre} est actuellement en cours d'examen."

            if titre_notif:
                Notification.objects.create(
                    destinataire=candidature.candidat,
                    type_notif=type_n,
                    titre=titre_notif,
                    message=message_notif
                )

        return Response({"message": "Statut mis à jour avec succès !", "nouveau_statut": nouveau_statut}, status=status.HTTP_200_OK)
class ProfilCandidatAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        profil, created = ProfilCandidat.objects.get_or_create(user=request.user)
        serializer = ProfilCandidatDTO(profil)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        # On récupère les deux objets à mettre à jour
        profil, created = ProfilCandidat.objects.get_or_create(user=request.user)
        user = request.user

        # --- LOGIQUE DE SAUVEGARDE MANUELLE DES INFOS USER ---
        # On intercepte le NIN et le Téléphone envoyés par React
        nin = request.data.get('nin')
        telephone = request.data.get('telephone')

        if nin is not None:
            user.nin = nin
        if telephone is not None:
            user.telephone = telephone
        
        # On sauvegarde les changements dans la table CustomUser
        user.save()
        # ----------------------------------------------------

        # On procède à la mise à jour du reste (diplôme, compétences, CV...)
        serializer = ProfilCandidatDTO(profil, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Profil et identité mis à jour avec succès !", 
                "profil": serializer.data
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class JobDetailAPIView(APIView):
    """
    Endpoint pour afficher les détails d'une seule offre.
    URL : /api/jobs/<id_offre>/
    """
    # On laisse la page visible même sans être connecté
    permission_classes = [AllowAny] 

    def get(self, request, offre_id):
        try:
            # On cherche l'offre avec cet ID, et on s'assure qu'elle est active
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True, est_cloturee=False)
            serializer = OffreEmploiSerializer(offre)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except OffreEmploi.DoesNotExist:
            return Response(
                {"error": "Cette offre n'existe pas ou n'est plus disponible."}, 
                status=status.HTTP_404_NOT_FOUND
            )
class MesCandidaturesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # On cherche toutes les candidatures où le candidat est l'utilisateur connecté
        candidatures = Candidature.objects.filter(candidat=request.user).order_by('-date_postulation')
        
        # On utilise notre nouveau DTO (import local pour être sûr)
        from .serializers import MesCandidaturesDTO
        serializer = MesCandidaturesDTO(candidatures, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
class UpdateProfilEntrepriseAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        if not hasattr(request.user, 'profil_entreprise'):
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        
        profil = request.user.profil_entreprise
        data = request.data

        # ON NE PREND QUE LES CHAMPS AUTORISÉS À LA MODIFICATION
        # Le nom et le RC ne sont jamais récupérés ici
        if 'secteur_activite' in data:
            profil.secteur_activite = data['secteur_activite']
        if 'wilaya_siege' in data:
            profil.wilaya_siege = data['wilaya_siege']
        if 'description' in data:
            profil.description = data['description']

        profil.save()
        
        return Response({
            "message": "Informations mises à jour avec succès.",
            "description": profil.description,
            "wilaya_siege": profil.wilaya_siege,
            "secteur_activite": profil.secteur_activite
        }, status=status.HTTP_200_OK)

class AdminPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100
class AdminOffresListAPIView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        search = request.query_params.get('search', '')
        offres = OffreEmploi.objects.all().order_by('-date_publication')
        if search:
            offres = offres.filter(
                Q(titre__icontains=search) | Q(entreprise__nom_entreprise__icontains=search)
            )
        paginator = AdminPagination()
        result_page = paginator.paginate_queryset(offres, request)
        serializer = OffreEmploiSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
class AdminOffreModerateAPIView(APIView):
    """ Permet à l'Admin d'approuver, rejeter ou corriger une offre """
    permission_classes = [IsAdminUser]

    def patch(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)

        # On utilise partial=True pour permettre à l'admin de ne modifier que quelques champs (ex: juste le statut, ou juste corriger une faute dans le titre)
        serializer = OffreEmploiSerializer(offre, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Offre modifiée et modérée avec succès !", 
                "offre": serializer.data
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class AdminEntreprisesListAPIView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        search = request.query_params.get('search', '')
        entreprises = ProfilEntreprise.objects.all().order_by('-id')
        if search:
            entreprises = entreprises.filter(
                Q(nom_entreprise__icontains=search) | Q(registre_commerce__icontains=search)
            )
        paginator = AdminPagination()
        result_page = paginator.paginate_queryset(entreprises, request)
        serializer = EntrepriseDashboardDetailSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
class AdminEntrepriseModerateAPIView(APIView):
    """ Permet d'approuver ou de suspendre une entreprise """
    permission_classes = [IsAdminUser]

    def patch(self, request, entreprise_id):
        try:
            entreprise = ProfilEntreprise.objects.get(id=entreprise_id)
        except ProfilEntreprise.DoesNotExist:
            return Response({"error": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)

        # On modifie juste le champ 'est_approuvee'
        serializer = EntrepriseDashboardDetailSerializer(entreprise, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Statut de l'entreprise mis à jour !"}, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class AdminStatsAPIView(APIView):
    """ Renvoie les statistiques globales de la plateforme """
    permission_classes = [IsAdminUser]

    def get(self, request):
        stats = {
            "total_offres": OffreEmploi.objects.count(),
            "offres_attente": OffreEmploi.objects.filter(statut_moderation='EN_ATTENTE').count(),
            "total_entreprises": ProfilEntreprise.objects.count(),
            "entreprises_attente": ProfilEntreprise.objects.filter(est_approuvee=False).count(),
            "total_candidats": User.objects.filter(role='CANDIDAT').count(),
            "total_recruteurs": User.objects.filter(role='RECRUTEUR').count(),
            "total_recrutements": Candidature.objects.filter(statut='RETENU').count(),
        }
        return Response(stats, status=status.HTTP_200_OK)
class AdminUsersListAPIView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        search = request.query_params.get('search', '')
        users = User.objects.exclude(is_superuser=True).order_by('-date_joined')
        if search:
            users = users.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(email__icontains=search)
            )
        paginator = AdminPagination()
        result_page = paginator.paginate_queryset(users, request)
        serializer = AdminUserSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
class AdminUserModerateAPIView(APIView):
    """ Permet de bloquer (is_active=False) ou débloquer un utilisateur """
    permission_classes = [IsAdminUser]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            # On inverse son statut d'activité
            user.is_active = not user.is_active
            user.save()
            statut = "débloqué" if user.is_active else "bloqué"
            return Response({"message": f"Utilisateur {statut} avec succès !"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)
class ConstantsAPIView(APIView):
    """
    Renvoie toutes les listes standardisées pour alimenter les menus déroulants React.
    """
    permission_classes = [AllowAny] # Ouvert à tous, même sans être connecté

    def get(self, request):
        # On formate directement pour la bibliothèque "react-select"
        # Elle a besoin d'un format exact : { "value": "ID", "label": "Texte affiché" }
        data = {
            "wilayas": [{"value": item[0], "label": item[1]} for item in WILAYAS_CHOICES],
            "secteurs": [{"value": item[0], "label": item[1]} for item in SECTEURS_CHOICES],
            "diplomes": [{"value": item[0], "label": item[1]} for item in DIPLOMES_CHOICES],
            "experiences": [{"value": item[0], "label": item[1]} for item in NIVEAUX_EXPERIENCE],
            "contrats": [{"value": item[0], "label": item[1]} for item in TYPES_CONTRAT],
        }
        return Response(data, status=status.HTTP_200_OK)
class ExperienceAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # On relie automatiquement l'expérience au profil du candidat connecté
        profil = request.user.profil_candidat
        serializer = ExperienceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profil=profil)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class ExperienceDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            # Sécurité : On s'assure que l'expérience appartient bien au candidat connecté !
            experience = ExperienceCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
        except ExperienceCandidat.DoesNotExist:
            return Response({"error": "Expérience introuvable."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = ExperienceSerializer(experience, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            experience = ExperienceCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
            experience.delete()
            return Response({"message": "Expérience supprimée."}, status=status.HTTP_204_NO_CONTENT)
        except ExperienceCandidat.DoesNotExist:
            return Response({"error": "Expérience introuvable."}, status=status.HTTP_404_NOT_FOUND)
class FormationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profil = request.user.profil_candidat
        serializer = FormationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profil=profil)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class FormationDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            formation = FormationCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
        except FormationCandidat.DoesNotExist:
            return Response({"error": "Formation introuvable."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = FormationSerializer(formation, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            formation = FormationCandidat.objects.get(pk=pk, profil=request.user.profil_candidat)
            formation.delete()
            return Response({"message": "Formation supprimée."}, status=status.HTTP_204_NO_CONTENT)
        except FormationCandidat.DoesNotExist:
            return Response({"error": "Formation introuvable."}, status=status.HTTP_404_NOT_FOUND)
class CloturerOffreAPIView(APIView):
    """ Permet au recruteur de clôturer son offre """
    permission_classes = [IsAuthenticated]

    def patch(self, request, offre_id):
        try:
            # On cherche l'offre
            offre = OffreEmploi.objects.get(id=offre_id)
            
            # SÉCURITÉ : On vérifie que l'offre appartient bien au 'user' du 'ProfilEntreprise'
            if offre.entreprise.user != request.user: 
                return Response({"error": "Vous n'êtes pas autorisé à modifier cette offre."}, status=status.HTTP_403_FORBIDDEN)

            # On la clôture et on sauvegarde
            offre.est_cloturee = True
            offre.save()
            return Response({"message": "Offre clôturée avec succès."}, status=status.HTTP_200_OK)
            
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)
class DeleteCandidatureAPIView(APIView):
    """ Permet au recruteur de supprimer définitivement une can-didature refusée """
    permission_classes = [IsAuthenticated]

    def delete(self, request, candidature_id):
        try:
            candidature = Candidature.objects.get(id=candidature_id)
            
            # SÉCURITÉ : On vérifie que la candidature est liée à une offre du 'user'
            if candidature.offre.entreprise.user != request.user:
                return Response({"error": "Vous n'êtes pas autorisé à supprimer cette candidature."}, status=status.HTTP_403_FORBIDDEN)

            candidature.delete()
            return Response({"message": "Candidature supprimée avec succès."}, status=status.HTTP_204_NO_CONTENT)
            
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=status.HTTP_404_NOT_FOUND)
class OffreSauvegardeeListCreateAPIView(APIView):
    """ Gère la liste des favoris et l'ajout d'une offre aux favoris """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        favoris = OffreSauvegardee.objects.filter(candidat=request.user)
        serializer = OffreSauvegardeeSerializer(favoris, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        offre_id = request.data.get('offre')
        
        # Vérification si l'offre existe
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas."}, status=status.HTTP_404_NOT_FOUND)

        # Vérification si déjà en favoris
        if OffreSauvegardee.objects.filter(candidat=request.user, offre=offre).exists():
            return Response({"error": "Cette offre est déjà dans vos favoris."}, status=status.HTTP_400_BAD_REQUEST)

        # Création du favori
        favori = OffreSauvegardee.objects.create(candidat=request.user, offre=offre)
        serializer = OffreSauvegardeeSerializer(favori)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OffreSauvegardeeDeleteAPIView(APIView):
    """ Supprime une offre des favoris """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            favori = OffreSauvegardee.objects.get(id=pk, candidat=request.user)
            favori.delete()
            return Response({"message": "Offre retirée des favoris."}, status=status.HTTP_204_NO_CONTENT)
        except OffreSauvegardee.DoesNotExist:
            return Response({"error": "Favori introuvable."}, status=status.HTTP_404_NOT_FOUND)


class AlerteEmploiListCreateAPIView(APIView):
    """ Gère la liste des alertes et la création d'une nouvelle alerte """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        alertes = AlerteEmploi.objects.filter(candidat=request.user)
        serializer = AlerteEmploiSerializer(alertes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AlerteEmploiSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(candidat=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AlerteEmploiDetailAPIView(APIView):
    """ Modifie (activer/désactiver) ou supprime une alerte """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        # On utilise patch pour pouvoir modifier juste 'est_active' sans envoyer tout le reste
        try:
            alerte = AlerteEmploi.objects.get(id=pk, candidat=request.user)
        except AlerteEmploi.DoesNotExist:
            return Response({"error": "Alerte introuvable."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AlerteEmploiSerializer(alerte, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            alerte = AlerteEmploi.objects.get(id=pk, candidat=request.user)
            alerte.delete()
            return Response({"message": "Alerte supprimée."}, status=status.HTTP_204_NO_CONTENT)
        except AlerteEmploi.DoesNotExist:
            return Response({"error": "Alerte introuvable."}, status=status.HTTP_404_NOT_FOUND)


class ParametresNotificationsAPIView(APIView):
    """ Récupère et met à jour uniquement les 3 cases de notifications du profil """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profil = request.user.profil_candidat
        serializer = ParametresNotificationsSerializer(profil)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        profil = request.user.profil_candidat
        serializer = ParametresNotificationsSerializer(profil, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EntrepriseDetailAPIView(APIView):
    """
    Endpoint public pour consulter le profil d'une entreprise et ses offres.
    URL : /api/jobs/entreprises/<id>/
    """
    permission_classes = [AllowAny] # Accessible à tous (visiteurs, candidats)

    def get(self, request, entreprise_id):
        try:
            # On ne montre que les entreprises qui ont été approuvées par l'Admin
            entreprise = ProfilEntreprise.objects.get(id=entreprise_id, est_approuvee=True)
            serializer = EntreprisePublicSerializer(entreprise)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except ProfilEntreprise.DoesNotExist:
            return Response(
                {"error": "Entreprise introuvable ou en cours de validation."}, 
                status=status.HTTP_404_NOT_FOUND
            )

class PublicStatsAPIView(APIView):
    """ Renvoie les statistiques publiques pour la page d'accueil """
    permission_classes = [AllowAny]

    def get(self, request):
        stats = {
            # On compte uniquement les offres en ligne et les entreprises approuvées
            "total_offres": OffreEmploi.objects.filter(est_active=True, statut_moderation='APPROUVEE', est_cloturee=False).count(),
            "total_entreprises": ProfilEntreprise.objects.filter(est_approuvee=True).count(),
            "total_candidats": User.objects.filter(role='CANDIDAT', is_active=True).count(),
            "total_recrutements": Candidature.objects.filter(statut='RETENU').count(),
        }
        return Response(stats, status=status.HTTP_200_OK)

class PostulerRapideAPIView(APIView):
    """
    Endpoint pour la postulation rapide (sans compte).
    URL : /api/jobs/<id_offre>/postuler-rapide/
    """
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
            nom_rapide = serializer.validated_data.get('nom_rapide')
            prenom_rapide = serializer.validated_data.get('prenom_rapide')

            Candidature.objects.create(
                offre=offre,
                est_rapide=True,
                nom_rapide=nom_rapide,
                prenom_rapide=prenom_rapide,
                email_rapide=serializer.validated_data.get('email_rapide'),
                telephone_rapide=serializer.validated_data.get('telephone_rapide'),
                cv_rapide=serializer.validated_data.get('cv_rapide'),
                lettre_motivation=serializer.validated_data.get('lettre_motivation', ''),
                score_matching=0, 
                details_matching={"message": "Candidature rapide, pas d'analyse IA disponible."},
                statut='RECUE' 
            )

            # ==========================================
            # 👇 NOUVEAU : ENVOI DE L'EMAIL AU RECRUTEUR 👇
            # ==========================================
            email_employeur = offre.entreprise.user.email
            if email_employeur:
                sujet = f"Nouvelle Candidature Express pour : {offre.titre}"
                
                message = f"Bonjour {offre.entreprise.nom_entreprise},\n\n"
                message += f"Un candidat ({nom_rapide} {prenom_rapide}) vient de postuler via la fonction 'Postulation Rapide' à votre offre '{offre.titre}'.\n"
                message += "S'agissant d'une candidature sans compte, l'analyse IA n'est pas disponible pour ce profil.\n\n"
                message += "Connectez-vous à votre tableau de bord TafTech pour consulter son CV PDF.\n\n"
                message += "L'équipe TafTech."
                
                try:
                    send_mail(
                        subject=sujet, 
                        message=message, 
                        from_email=settings.EMAIL_HOST_USER, 
                        recipient_list=[email_employeur], 
                        fail_silently=True
                    )
                except Exception as e:
                    print(f"Erreur envoi email employeur : {e}")

            return Response({"message": "Candidature rapide envoyée avec succès !"}, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OffresRecommandeesAPIView(APIView):
    """
    Scanne toutes les offres actives et retourne les "Top Matchs" pour le candidat connecté.
    URL: /api/jobs/recommandations/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'profil_candidat'):
            return Response([], status=status.HTTP_200_OK)
            
        # Prendre toutes les offres en ligne
        offres_actives = OffreEmploi.objects.filter(est_active=True, statut_moderation='APPROUVEE', est_cloturee=False)
        
        offres_scorees = []
        for offre in offres_actives:
            # On utilise le même algorithme que le recruteur !
            resultat = calculer_score_matching(request.user, offre)
            
            # On ne garde que les offres "Intéressantes" (>= 60%)
            if resultat['total'] >= 60:
                offre_data = OffreEmploiSerializer(offre).data
                offre_data['matching_score'] = resultat['total']  # On injecte le score
                offres_scorees.append(offre_data)
                
        # On trie les offres de la meilleure à la moins bonne
        offres_scorees.sort(key=lambda x: x['matching_score'], reverse=True)
        
        # On renvoie le Top 10 pour ne pas surcharger la page
        return Response(offres_scorees[:10], status=status.HTTP_200_OK)

class NotificationListAPIView(APIView):
    """ Récupère la boîte de réception du candidat """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # On ne récupère que les notifs de l'utilisateur connecté
        notifs = Notification.objects.filter(destinataire=request.user)
        serializer = NotificationSerializer(notifs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class MarkNotificationReadAPIView(APIView):
    """ Marque un message comme 'lu' """
    permission_classes = [IsAuthenticated]

    def patch(self, request, notif_id):
        try:
            notif = Notification.objects.get(id=notif_id, destinataire=request.user)
            notif.lue = True
            notif.save()
            return Response({"message": "Message marqué comme lu."}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"error": "Message introuvable."}, status=status.HTTP_404_NOT_FOUND)

class AdminBroadcastEmailAPIView(APIView):
    """
    Permet à l'administrateur d'envoyer un email massif (Newsletter ou Offre Exclusive)
    aux candidats ayant accepté ces notifications.
    """
    permission_classes = [IsAdminUser] # Sécurité absolue

    def post(self, request):
        sujet = request.data.get('sujet')
        message = request.data.get('message')
        type_envoi = request.data.get('type_envoi') # 'NEWSLETTER' ou 'EXCLUSIF'

        if not sujet or not message or type_envoi not in ['NEWSLETTER', 'EXCLUSIF']:
            return Response({"error": "Sujet, message et type d'envoi valides sont requis."}, status=status.HTTP_400_BAD_REQUEST)

        # On cible les candidats selon leur préférence
        if type_envoi == 'NEWSLETTER':
            profils = ProfilCandidat.objects.filter(notif_newsletter=True)
        else:
            profils = ProfilCandidat.objects.filter(notif_offres_exclusives=True)

        liste_emails = [profil.user.email for profil in profils if profil.user.email]

        if not liste_emails:
            return Response({"message": "Aucun candidat n'est abonné à cette liste."}, status=status.HTTP_200_OK)

        # On envoie l'email en masse
        try:
            # En Django, on peut utiliser recipient_list, mais pour éviter que les candidats
            # voient les adresses des autres, on utilise send_mass_mail ou une boucle (bcc).
            # On le fait proprement pour cacher les destinataires :
            from django.core.mail import EmailMessage
            
            email = EmailMessage(
                subject=sujet,
                body=message,
                from_email=settings.EMAIL_HOST_USER,
                to=[settings.EMAIL_HOST_USER], # L'admin s'envoie l'email à lui-même...
                bcc=liste_emails # ...et met tous les candidats en copie cachée
            )
            email.send(fail_silently=False)
            
            return Response({
                "message": f"Succès : Email '{type_envoi}' envoyé en copie cachée à {len(liste_emails)} candidat(s) !"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": f"Erreur lors de l'envoi : {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)