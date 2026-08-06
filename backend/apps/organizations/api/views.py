from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.organizations.application.services import OrganizationService
from apps.organizations.infrastructure.models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ("id", "name", "slug", "status", "settings", "created_at", "updated_at")
        read_only_fields = ("id", "slug", "status", "settings", "created_at", "updated_at")


class OrganizationCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    slug = serializers.SlugField(max_length=64, required=False, allow_blank=True)


class OrganizationViewSet(viewsets.ViewSet):
    def list(self, request):
        orgs = OrganizationService().list_for_user(request.user)
        return paginate_and_serialize(request, orgs, OrganizationSerializer)

    def create(self, request):
        serializer = OrganizationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = OrganizationService().create(
            name=serializer.validated_data["name"],
            slug=serializer.validated_data.get("slug") or None,
            owner=request.user,
        )
        return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        org = OrganizationService().get_for_user(organization_id=pk, user=request.user)
        return Response(OrganizationSerializer(org).data)

    def partial_update(self, request, pk=None):
        name = request.data.get("name")
        org = OrganizationService().update(organization_id=pk, user=request.user, name=name)
        return Response(OrganizationSerializer(org).data)
