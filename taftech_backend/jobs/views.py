from django.shortcuts import render
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from .models import OffreEmploi , Candidature, ProfilCandidat, ProfilEntreprise, ExperienceCandidat, FormationCandidat
from .models import WILAYAS_CHOICES, SECTEURS_CHOICES, DIPLOMES_CHOICES, NIVEAUX_EXPERIENCE, TYPES_CONTRAT
from .serializers import OffreEmploiSerializer, PostulerDTO, EntrepriseDashboardDetailSerializer, OffreEmploiCreateDTO, OffreDashboardDTO, ProfilCandidatDTO
from .serializers import  EntrepriseDashboardDetailSerializer, AdminUserSerializer
from .serializers import ExperienceSerializer, FormationSerializer
from .models import OffreSauvegardee, AlerteEmploi
from .serializers import OffreSauvegardeeSerializer, AlerteEmploiSerializer, ParametresNotificationsSerializer
User = get_user_model()
class JobListAPIView(APIView):
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
    Endpoint pour postuler à une offre.
    URL : /api/jobs/<id_offre>/postuler/
    """
    permission_classes = [IsAuthenticated] # Il faut être connecté pour postuler
    
    # 🔴 CORRECTION 1 : Le "traducteur" pour lire les fichiers PDF
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, offre_id):
        # On vérifie si l'offre existe
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas ou n'est plus active."}, status=status.HTTP_404_NOT_FOUND)

        # On vérifie si le candidat a déjà postulé
        if Candidature.objects.filter(offre=offre, candidat=request.user).exists():
            return Response({"error": "Vous avez déjà postulé à cette offre."}, status=status.HTTP_400_BAD_REQUEST)

        # On enregistre la candidature
        serializer = PostulerDTO(data=request.data)
        if serializer.is_valid():
            Candidature.objects.create(
                offre=offre,
                candidat=request.user,
                lettre_motivation=serializer.validated_data.get('lettre_motivation', ''),
                
                # 🔴 CORRECTION 2 : C'EST ICI QU'IL MANQUAIT LA LIGNE POUR SAUVER LE FICHIER !
                lettre_motivation_file=serializer.validated_data.get('lettre_motivation_file', None)
            )
            return Response({"message": "Candidature envoyée avec succès !"}, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class JobCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'profil_entreprise'):
            return Response(
                {"error": "Vous devez créer un profil entreprise d'abord."}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        if not request.user.profil_entreprise.est_approuvee:
            return Response(
                {"error": "Votre entreprise est en cours de vérification. Patience !"}, 
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
    """
    Endpoint pour qu'un recruteur modifie le statut d'une candidature.
    URL : /api/jobs/candidatures/<id_candidature>/statut/
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, candidature_id):
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=status.HTTP_404_NOT_FOUND)

        # SÉCURITÉ : On vérifie que c'est bien LE recruteur de CETTE offre qui essaie de modifier
        if not hasattr(request.user, 'profil_entreprise') or candidature.offre.entreprise != request.user.profil_entreprise:
            return Response({"error": "Vous n'avez pas l'autorisation de modifier cette candidature."}, status=status.HTTP_403_FORBIDDEN)

        # On récupère le nouveau statut envoyé par React
        nouveau_statut = request.data.get('statut')
        
        # On vérifie que le statut fait bien partie des choix autorisés
        statuts_valides = [choix[0] for choix in Candidature.STATUTS]
        if nouveau_statut not in statuts_valides:
            return Response({"error": "Statut invalide."}, status=status.HTTP_400_BAD_REQUEST)

        # On sauvegarde la modification
        candidature.statut = nouveau_statut
        candidature.save()
        
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
class AdminOffresListAPIView(APIView):
    """ Récupère TOUTES les offres pour le tableau de bord Admin """
    permission_classes = [IsAdminUser] # Sécurité : Seul le super-admin y a accès

    def get(self, request):
        # L'admin voit tout, trié par les plus récentes
        offres = OffreEmploi.objects.all().order_by('-date_publication')
        serializer = OffreEmploiSerializer(offres, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
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
    """ Récupère TOUTES les entreprises pour l'Admin """
    permission_classes = [IsAdminUser]

    def get(self, request):
        entreprises = ProfilEntreprise.objects.all()
        serializer = EntrepriseDashboardDetailSerializer(entreprises, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
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
        }
        return Response(stats, status=status.HTTP_200_OK)
class AdminUsersListAPIView(APIView):
    """ Liste de tous les utilisateurs inscrits """
    permission_classes = [IsAdminUser]

    def get(self, request):
        # On exclut le super-admin lui-même pour éviter qu'il ne se bloque par erreur
        users = User.objects.exclude(is_superuser=True).order_by('-date_joined')
        serializer = AdminUserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
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