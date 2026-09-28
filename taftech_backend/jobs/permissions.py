from rest_framework.permissions import IsAdminUser


class IsAdminRole(IsAdminUser):
    """IsAdminUser (is_staff) ne suffit pas seul : un compte staff Django sans
    `role='ADMIN'` (ex. créé via `create_superuser` sans ce champ, ou un futur rôle
    staff non-admin) ne doit pas accéder aux vues du panel admin. Certaines vues de
    jobs/views/admin.py vérifiaient déjà `request.user.role != 'ADMIN'` en dur dans
    leur corps (AdminMarcheAPIView) — cette permission centralise le même contrôle
    pour toutes les vues admin, avant même d'entrer dans la méthode."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'role', None) == 'ADMIN'
