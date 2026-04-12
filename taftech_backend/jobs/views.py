from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import OffreEmploi
from .serializers import OffreEmploiSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .services import EntrepriseService
from .serializers import ProfilEntrepriseCreateDTO
from rest_framework.permissions import IsAuthenticated
from .models import Candidature, ProfilCandidat
from .serializers import PostulerDTO, EntrepriseDashboardDetailSerializer
from .serializers import OffreEmploiCreateDTO, OffreDashboardDTO, ProfilCandidatDTO, CandidatRegisterSerializer
from django.db.models import Q
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class JobListAPIView(APIView):
    def get(self, request):
        # 1. Tes filtres restent exactement pareils
        mot_cle = request.query_params.get('search', '')
        wilaya = request.query_params.get('wilaya', '')

        offres = OffreEmploi.objects.filter(est_active=True)

        if mot_cle:
            offres = offres.filter(
                Q(titre__icontains=mot_cle) | Q(missions__icontains=mot_cle)
            )
        
        if wilaya:
            offres = offres.filter(wilaya__icontains=wilaya)

        offres = offres.order_by('-date_publication')

        # --- NOUVEAU : Le découpage manuel en pages ---
        paginator = PageNumberPagination()
        paginator.page_size = 5 # On force 5 éléments par page
        
        # On découpe notre liste d'offres
        page = paginator.paginate_queryset(offres, request)
        
        # On traduit uniquement les offres de la page actuelle
        serializer = OffreEmploiSerializer(page, many=True)
        
        # On renvoie le bon format officiel (avec count, next, previous, results)
        return paginator.get_paginated_response(serializer.data)
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

# N'oublie pas d'importer ProfilCandidat et ProfilCandidatDTO en haut !

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

# Ajoute AllowAny en haut si ce n'est pas déjà fait : from rest_framework.permissions import IsAuthenticated, AllowAny

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
            offre = OffreEmploi.objects.get(id=offre_id, est_active=True)
            serializer = OffreEmploiSerializer(offre)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except OffreEmploi.DoesNotExist:
            return Response(
                {"error": "Cette offre n'existe pas ou n'est plus disponible."}, 
                status=status.HTTP_404_NOT_FOUND
            )

class CandidatRegisterAPIView(APIView):
    """ API pour l'inscription d'un Candidat (US 1.1) """
    permission_classes = [AllowAny] # Ouvert à tous

    def post(self, request):
        serializer = CandidatRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Compte candidat créé avec succès !"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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

class UpdateFullProfilRecruteurAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        # On vérifie si l'entreprise existe
        if not hasattr(user, 'profil_entreprise'):
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        
        profil = user.profil_entreprise
        data = request.data

        # --- PARTIE 1 : L'UTILISATEUR (RESPONSABLE) ---
        if 'first_name' in data: user.first_name = data['first_name']
        if 'last_name' in data: user.last_name = data['last_name']
        if 'email' in data: user.email = data['email']
        if 'telephone' in data: user.telephone = data['telephone']
        user.save()

        # --- PARTIE 2 : L'ENTREPRISE ---
        # On ignore volontairement 'nom_entreprise' et 'registre_commerce'
        if 'secteur_activite' in data: profil.secteur_activite = data['secteur_activite']
        if 'wilaya_siege' in data: profil.wilaya_siege = data['wilaya_siege']
        if 'description' in data: profil.description = data['description']
        profil.save()

        return Response({"message": "Toutes les informations ont été mises à jour !"}, status=status.HTTP_200_OK)