"""
WSGI config for engineerhub project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'engineerhub.settings')

application = get_wsgi_application() 