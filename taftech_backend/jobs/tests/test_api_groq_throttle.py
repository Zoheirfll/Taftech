from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()


@override_settings(
    DEFAULT_THROTTLE_CLASSES=['rest_framework.throttling.UserRateThrottle'],
    DEFAULT_THROTTLE_RATES={'user': '1000/day', 'groq': '3/hour'},
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
)
class GroqThrottleTest(APITestCase):
    def setUp(self):
        self.candidat = User.objects.create_user(
            username='candidat_throttle', email='throttle@test.com',
            password='pass1234', role='CANDIDAT'
        )
        self.client.force_authenticate(user=self.candidat)

    def test_groq_throttle_bloque_apres_limite(self):
        url = reverse('analyse-carriere')
        for _ in range(3):
            self.client.get(url)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 429)
