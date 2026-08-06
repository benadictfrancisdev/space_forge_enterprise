from rest_framework import serializers, status, viewsets
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.notifications.application.services import NotificationService
from apps.notifications.infrastructure.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "organization_id",
            "channel",
            "status",
            "title",
            "body",
            "payload",
            "sent_at",
            "read_at",
            "created_at",
        )
        read_only_fields = fields


class NotificationCreateSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    title = serializers.CharField(max_length=255)
    body = serializers.CharField(required=False, allow_blank=True, default="")
    channel = serializers.ChoiceField(
        choices=Notification.Channel.choices,
        required=False,
        default=Notification.Channel.IN_APP,
    )


class NotificationViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        notes = NotificationService().list_for_user(
            user=request.user, organization_id=organization_id
        )
        return paginate_and_serialize(request, notes, NotificationSerializer)

    def create(self, request):
        serializer = NotificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = NotificationService().send(
            organization_id=serializer.validated_data["organization_id"],
            user=request.user,
            title=serializer.validated_data["title"],
            body=serializer.validated_data.get("body", ""),
            channel=serializer.validated_data.get("channel", Notification.Channel.IN_APP),
        )
        return Response(NotificationSerializer(note).data, status=status.HTTP_201_CREATED)
