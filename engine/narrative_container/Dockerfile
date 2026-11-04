FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY engine/narrative_container /app/engine/narrative_container
RUN mkdir -p /data
VOLUME ["/data"]
ENTRYPOINT ["python", "-m", "engine.narrative_container", "--db", "/data/narratives.sqlite"]
CMD ["init"]
