FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HF Spaces injects PORT=7860; the shell form lets ${PORT:-7860} expand.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
