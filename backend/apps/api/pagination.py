from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


def paginate_and_serialize(request, queryset, serializer_class, *, many=True) -> Response:
    """Apply StandardPagination to a ViewSet list queryset."""
    paginator = StandardPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        data = serializer_class(page, many=many).data
        return paginator.get_paginated_response(data)
    data = serializer_class(queryset, many=many).data
    return Response(data)
