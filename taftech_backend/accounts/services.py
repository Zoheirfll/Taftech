from typing import Dict, Any
from django.db import transaction
from .models import CustomUser

class UserService:
    """
    Couche Service gérant la logique métier des utilisateurs.
    Toute manipulation complexe de la base de données doit se faire ici.
    """
    
    @staticmethod
    @transaction.atomic  # Assure que si une erreur survient, rien n'est sauvegardé à moitié
    def create_candidat(validated_data: Dict[str, Any]) -> CustomUser:
        # On extrait le mot de passe pour le traiter séparément
        password = validated_data.pop('password')
        
        # On instancie l'utilisateur en forçant le rôle CANDIDAT
        user = CustomUser(
            role='CANDIDAT',
            **validated_data
        )
        
        # Cette méthode native de Django est cruciale : elle crypte le mot de passe
        user.set_password(password)
        user.save()
        
        return user