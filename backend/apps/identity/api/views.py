from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.throttling import AuthExchangeThrottle, AuthRefreshThrottle
from apps.identity.application.services import AuthService
from apps.identity.application.sessions import SessionService
from apps.identity.infrastructure.models import AuthSession, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "display_name", "status", "created_at")
        read_only_fields = fields


class SessionSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = AuthSession
        fields = (
            "id",
            "device_label",
            "user_agent",
            "ip_address",
            "expires_at",
            "last_seen_at",
            "revoked_at",
            "created_at",
            "is_active",
            "is_current",
        )
        read_only_fields = fields

    def get_is_current(self, obj):
        current = self.context.get("current_session_id")
        return str(obj.id) == str(current) if current else False


def _token_payload(result: dict) -> dict:
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": result["token_type"],
        "expires_in": result["expires_in"],
        "session_id": result["session_id"],
        "user": UserSerializer(result["user"]).data,
    }


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ExchangeTokenView(APIView):
    """Exchange Firebase/dev identity token for SpaceForge access + refresh JWTs."""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthExchangeThrottle]

    def post(self, request):
        token = request.data.get("token") or request.data.get("id_token")
        if not token:
            return Response(
                {"error": {"code": "validation_error", "message": "token is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = AuthService().exchange(identity_token=token, request=request)
        return Response(_token_payload(result))


class RefreshTokenView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthRefreshThrottle]

    def post(self, request):
        refresh = request.data.get("refresh_token") or request.data.get("refresh")
        if not refresh:
            return Response(
                {"error": {"code": "validation_error", "message": "refresh_token is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = AuthService().refresh(refresh_token=refresh, request=request)
        return Response(_token_payload(result))


class LogoutView(APIView):
    def post(self, request):
        sid = getattr(request, "auth_session_id", None)
        if not sid and isinstance(request.auth, dict):
            sid = request.auth.get("sid")
        if not sid:
            # Legacy identity-bearer tokens have no session — treat as no-op success
            return Response({"revoked": False, "reason": "no_session"})
        AuthService().sessions.logout_current(user=request.user, session_id=sid)
        return Response({"revoked": True})


class LogoutAllView(APIView):
    def post(self, request):
        count = AuthService().sessions.logout_all(user=request.user)
        return Response({"revoked_sessions": count})


class SessionListView(APIView):
    def get(self, request):
        sessions = SessionService().list_sessions(user=request.user)
        current = getattr(request, "auth_session_id", None)
        return Response(
            SessionSerializer(
                sessions, many=True, context={"current_session_id": current}
            ).data
        )
