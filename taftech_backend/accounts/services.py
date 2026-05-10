from typing import Dict, Any
from django.db import transaction
from .models import CustomUser

class UserService:
    @staticmethod
    @transaction.atomic
    def create_candidat(validated_data: Dict[str, Any]) -> CustomUser:
        # On extrait le password
        password = validated_data.pop('password')
        
        # CORRECTIF : On utilise le manager .objects.create_user
        # C'est la méthode qui a fonctionné dans ton Shell.
        # Elle gère proprement l'injection du NIN, du Téléphone et le hashage du password.
        user = CustomUser.objects.create_user(
            role='CANDIDAT',
            password=password,
            **validated_data
        )
        
        # Note: create_user gère déjà le set_password, 
        # donc pas besoin de le refaire manuellement.
        
        return user