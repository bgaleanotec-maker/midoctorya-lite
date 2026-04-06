FROM python:3.11-slim

# Security: create non-root user
RUN addgroup --system app && adduser --system --group app

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app . .

# Switch to non-root user
USER app

EXPOSE 8081

CMD ["gunicorn", "server_prod:app", "--bind", "0.0.0.0:8081", "--workers", "4", "--timeout", "120", "--access-logfile", "-"]
