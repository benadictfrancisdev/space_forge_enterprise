from __future__ import annotations

from apps.events.infrastructure.models import OutboxEvent


class EventService:
    """Transactional outbox publisher — workers drain pending events."""

    def publish(
        self,
        *,
        event_type: str,
        payload: dict,
        organization_id=None,
        actor_id=None,
    ) -> OutboxEvent:
        return OutboxEvent.objects.create(
            event_type=event_type,
            payload=payload,
            organization_id=organization_id,
            actor_id=actor_id,
        )
