from django.apps import AppConfig


class JobsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'jobs'

    def ready(self):
        # Optimisation des images envoyées (taille, compression, EXIF) : voir jobs/image_utils.py.
        from django.db.models.signals import pre_save
        from .image_utils import optimiser_images_avant_sauvegarde
        pre_save.connect(optimiser_images_avant_sauvegarde, dispatch_uid='jobs_optimiser_images')
