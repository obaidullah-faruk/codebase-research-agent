from django.urls import path
from .views import SessionListCreateView, SessionDetailView, SessionCancelView

urlpatterns = [
    path("sessions/", SessionListCreateView.as_view(), name="session-list-create"),
    path("sessions/<uuid:pk>/", SessionDetailView.as_view(), name="session-detail"),
    path("sessions/<uuid:pk>/cancel/", SessionCancelView.as_view(), name="session-cancel"),
]
