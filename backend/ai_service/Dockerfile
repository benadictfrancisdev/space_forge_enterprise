FROM python:3.12-slim
WORKDIR /app
COPY ai_service/requirements.txt /app/ai_service/requirements.txt
RUN pip install --no-cache-dir -r /app/ai_service/requirements.txt
COPY ai_service /app/ai_service
ENV PYTHONPATH=/app
EXPOSE 8100
CMD ["uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8100"]
