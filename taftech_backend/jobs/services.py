from .models import ProfilEntreprise
from django.db import transaction

class EntrepriseService:
    @staticmethod
    @transaction.atomic
    def creer_profil(user, data):
        """
        Crée le profil entreprise et met à jour le rôle de l'utilisateur.
        """
        # 1. On crée le profil lié à l'utilisateur
        profil = ProfilEntreprise.objects.create(user=user, **data)
        
        # 2. On s'assure que l'utilisateur a bien le rôle RECRUTEUR
        if user.role != 'RECRUTEUR':
            user.role = 'RECRUTEUR'
            user.save()
            
        return profil