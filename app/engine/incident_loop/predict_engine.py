"""AI forecasting engine for incident blast-radius prediction."""
from __future__ import annotations

from app.infrastructure.ai_gateway.models import GatewayRequest
from app.infrastructure.ai_gateway.router import AIGateway


class PredictEngine:
    """Generate PREDICT.md documents via the tiered AI gateway."""

    def __init__(self, ai_gateway: AIGateway) -> None:
        self._ai_gateway = ai_gateway

    async def generate_prediction(self, cause_md: str, tier: int) -> str:
        prompt = f"Analyze this cause document and predict the blast radius: \n{cause_md}"
        request = GatewayRequest(
            prompt=prompt,
            tier=tier,
            task_type="incident_predict",
        )
        response = await self._ai_gateway.route_request(request)
        return response.content
