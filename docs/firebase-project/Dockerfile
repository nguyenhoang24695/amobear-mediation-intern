FROM python:3.10-slim

# Install Java (required for PySpark) and Cron
RUN apt-get update && \
    apt-get install -y openjdk-21-jre-headless cron procps && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME - will work on both amd64 and arm64
RUN ARCH=$(dpkg --print-architecture) && \
    echo "export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-${ARCH}" >> /etc/environment && \
    ln -sf /usr/lib/jvm/java-21-openjdk-${ARCH} /usr/lib/jvm/default-java
# Fallback ENV for non-shell processes  
ENV JAVA_HOME=/usr/lib/jvm/default-java

WORKDIR /app

# Copy requirements and install dependencies
COPY setup/requirements.txt /app/setup/requirements.txt
RUN pip install --no-cache-dir -r /app/setup/requirements.txt

# Copy the rest of the application
COPY . /app

# Setup Cron - auto-fix Windows line endings
COPY crontab /etc/cron.d/my-cron-job
RUN sed -i 's/\r$//' /etc/cron.d/my-cron-job && \
    chmod 0644 /etc/cron.d/my-cron-job && \
    crontab /etc/cron.d/my-cron-job && \
    touch /var/log/cron.log

# Set timezone to Vietnam (since user speaks Vietnamese)
ENV TZ=Asia/Ho_Chi_Minh
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Run cron in foreground
CMD ["sh", "-c", "touch /var/log/cron.log && cron && tail -f /var/log/cron.log"]
