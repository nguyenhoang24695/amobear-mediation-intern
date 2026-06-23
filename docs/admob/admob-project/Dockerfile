FROM python:3.10-slim

WORKDIR /app

# Cài đặt system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    cron \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy và cài đặt Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY code/ ./code/
COPY tmp/ ./tmp/
COPY z_key/ ./z_key/

# Tạo thư mục logs
RUN mkdir -p /app/logs

# Thiết lập timezone
ENV TZ=Asia/Ho_Chi_Minh
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy entrypoint script
COPY docker-entrypoint.sh /entrypoint.sh
COPY run-with-env.sh /usr/local/bin/run-with-env.sh

# Convert line endings và set permissions
RUN sed -i 's/\r$//' /entrypoint.sh /usr/local/bin/run-with-env.sh && \
    chmod +x /entrypoint.sh /usr/local/bin/run-with-env.sh

ENTRYPOINT ["/entrypoint.sh"]