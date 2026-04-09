from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import OffreEmploi
from .serializers import OffreEmploiSerializer
from rest_framework.permissions import IsAuthenticated
from .services import EntrepriseService
from .serializers import ProfilEntrepriseCreateDTO
from rest_framework.permissions import IsAuthenticated
from .models import Candidature, ProfilCandidat
from .serializers import PostulerDTO
from .serializers import OffreEmploiCreateDTO, OffreDashboardDTO, ProfilCandidatDTO
from django.db.models import Q
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class JobListAPIView(APIView):
    """
    Endpoint pour lister toutes les offres d'emploi actives.
    URL : /api/jobs/
    """
    def get(self, request):
        # 1. On récupère les filtres envoyés dans l'URL (ex: ?search=dev&wilaya=oran)
        mot_cle = request.query_params.get('search', '')
        wilaya = request.query_params.get('wilaya', '')

        # 2. On prend toutes les offres actives de base
        offres = OffreEmploi.objects.filter(est_active=True)

        # 3. S'il y a un mot clé, on cherche dans le titre OU dans les missions
        if mot_cle:
            offres = offres.filter(
                Q(titre__icontains=mot_cle) | Q(missions__icontains=mot_cle)
            )
        
        # 4. S'il y a une wilaya, on filtre par wilaya
        if wilaya:
            offres = offres.filter(wilaya__icontains=wilaya)

        # 5. On trie du plus récent au plus ancien et on renvoie
        offres = offres.order_by('-date_publication')
        serializer = OffreEmploiSerializer(offres, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ProfilEntrepriseCreateAPIView(APIView):
    """
    Endpoint pour qu'un utilisateur enregistré devienne Recruteur.
    URL : /api/jobs/entreprise/creer/
    """
    permission_classes = [IsAuthenticated] # Sécurité : il faut être connecté

    def post(self, request):
        serializer = ProfilEntrepriseCreateDTO(data=request.data)
        if serializer.is_valid():
            try:
                profil = EntrepriseService.creer_profil(request.user, serializer.validated_data)
                return Response(
                    {"message": f"Entreprise {profil.nom_entreprise} enregistrée avec succès."},
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PostulerAPIView(APIView):
    """
    Endpoint pour postuler à une offre.
    URL : /api/jobs/<id_offre>/postuler/
    """
    permission_classes = [IsAuthenticated] # Il faut être connecté pour postuler

    def post(self, request, offre_id):
        # On vérifie si l'offre existe
        try:
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Cette offre n'existe pas ou n'est plus active."}, status=status.HTTP_404_NOT_FOUND)

        # On vérifie si le candidat a déjà postulé (grâce au unique_together du modèle, mais c'est plus propre de le faire ici)
        if Candidature.objects.filter(offre=offre, candidat=request.user).exists():
            return Response({"error": "Vous avez déjà postulé à cette offre."}, status=status.HTTP_400_BAD_REQUEST)

        # On enregistre la candidature
        serializer = PostulerDTO(data=request.data)
        if serializer.is_valid():
            Candidature.objects.create(
                offre=offre,
                candidat=request.user,
                lettre_motivation=serializer.validated_data.get('lettre_motivation', '')
            )
            return Response({"message": "Candidature envoyée avec succès !"}, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class JobCreateAPIView(APIView):
    """
    Endpoint pour publier une nouvelle offre d'emploi.
    URL : /api/jobs/creer/
    """
    permission_classes = [IsAuthenticated] # Sécurité

    def post(self, request):
        # 1. Le Vigile vérifie : Cet utilisateur a-t-il une entreprise ?
        if not hasattr(request.user, 'profil_entreprise'):
            return Response(
                {"error": "Vous devez d'abord créer un profil entreprise pour publier une offre."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. On lit les données envoyées par React
        serializer = OffreEmploiCreateDTO(data=request.data)
        
        # 3. Si tout est valide, on sauvegarde !
        if serializer.is_valid():
            # LA MAGIE EST ICI : On force l'entreprise à être celle de l'utilisateur connecté
            serializer.save(entreprise=request.user.profil_entreprise)
            return Response(
                {"message": "Offre d'emploi publiée avec succès !"}, 
                status=status.HTTP_201_CREATED
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DashboardRecruteurAPIView(APIView):
    """
    Endpoint pour le tableau de bord du recruteur.
    Retourne ses offres et les candidatures associées.
    URL : /api/jobs/dashboard/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # On vérifie s'il a bien une entreprise
        if not hasattr(request.user, 'profil_entreprise'):
            return Response(
                {"error": "Vous n'avez pas de profil entreprise."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # On récupère uniquement les offres de SON entreprise
        offres = OffreEmploi.objects.filter(
            entreprise=request.user.profil_entreprise
        ).order_by('-date_publication')
        
        serializer = OffreDashboardDTO(offres, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
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

# N'oublie pas d'importer ProfilCandidat et ProfilCandidatDTO en haut !

class ProfilCandidatAPIView(APIView):
    """
    Endpoint pour que le candidat consulte et mette à jour son profil (et son CV).
    URL : /api/jobs/profil/
    """
    permission_classes = [IsAuthenticated]
    # NOUVEAU : On dit à cette vue d'accepter les fichiers
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        # On récupère le profil du candidat connecté (ou on le crée s'il n'existe pas encore)
        profil, created = ProfilCandidat.objects.get_or_create(user=request.user)
        serializer = ProfilCandidatDTO(profil)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        profil, created = ProfilCandidat.objects.get_or_create(user=request.user)
        
        # On met à jour avec les données reçues (qui peuvent contenir un fichier 'cv_pdf')
        # partial=True permet de ne mettre à jour que certains champs sans obligation de tout renseigner
        serializer = ProfilCandidatDTO(profil, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Profil mis à jour avec succès !", 
                "profil": serializer.data
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)