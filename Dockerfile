FROM python:3.14-slim

WORKDIR /app

COPY Backend/requirements.txt ./Backend/
RUN pip install --no-cache-dir -r Backend/requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "Backend/main.py"]