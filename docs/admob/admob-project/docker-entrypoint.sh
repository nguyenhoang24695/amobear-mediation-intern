#!/bin/bash
set -e

# Tạo log files
mkdir -p /app/logs
touch /app/logs/cron_mini_batch.log
touch /app/logs/last_3_day_job.log
touch /var/log/cron.log

echo "Thiết lập cron jobs..."

# Tạo file .env từ environment variables cho python dotenv
cat > /app/.env << 'ENVEOF'
STARROCKS_FE_HOST=${STARROCKS_FE_HOST}
STARROCKS_FE_PORT=${STARROCKS_FE_PORT}
STARROCKS_BE_HOST=${STARROCKS_BE_HOST}
STARROCKS_BE_PORT=${STARROCKS_BE_PORT}
MKT_HOST_DB=${MKT_HOST_DB}
MKT_USER_DB=${MKT_USER_DB}
MKT_PASSWD_DB=${MKT_PASSWD_DB}
MKT_PORT_DB=${MKT_PORT_DB}
MKT_JDBC_PORT=${MKT_JDBC_PORT}
MKT_HTTP_PORT=${MKT_HTTP_PORT}
MKT_FIREBASE_DB=${MKT_FIREBASE_DB}
ADMOB_DB=${ADMOB_DB}
XMP_DB=${XMP_DB}
ADMOB_LIST_TOKENS=${ADMOB_LIST_TOKENS}
ADMOB_DICT_PUBLISHER_ID=${ADMOB_DICT_PUBLISHER_ID}
XMP_CLIENT_ID=${XMP_CLIENT_ID}
XMP_CLIENT_SECRET=${XMP_CLIENT_SECRET}
LIST_AFRICA_CODES=${LIST_AFRICA_CODES}
LIST_AMERICAS_CODES=${LIST_AMERICAS_CODES}
LIST_ASIA_CODES=${LIST_ASIA_CODES}
LIST_EUROPE_CODES=${LIST_EUROPE_CODES}
LIST_OCEANIA_CODES=${LIST_OCEANIA_CODES}
ENVEOF

# Thay thế variables
sed -i "s|\${STARROCKS_FE_HOST}|${STARROCKS_FE_HOST}|g" /app/.env
sed -i "s|\${STARROCKS_FE_PORT}|${STARROCKS_FE_PORT}|g" /app/.env
sed -i "s|\${STARROCKS_BE_HOST}|${STARROCKS_BE_HOST}|g" /app/.env
sed -i "s|\${STARROCKS_BE_PORT}|${STARROCKS_BE_PORT}|g" /app/.env
sed -i "s|\${MKT_HOST_DB}|${MKT_HOST_DB}|g" /app/.env
sed -i "s|\${MKT_USER_DB}|${MKT_USER_DB}|g" /app/.env
sed -i "s|\${MKT_PASSWD_DB}|${MKT_PASSWD_DB}|g" /app/.env
sed -i "s|\${MKT_PORT_DB}|${MKT_PORT_DB}|g" /app/.env
sed -i "s|\${MKT_JDBC_PORT}|${MKT_JDBC_PORT}|g" /app/.env
sed -i "s|\${MKT_HTTP_PORT}|${MKT_HTTP_PORT}|g" /app/.env
sed -i "s|\${MKT_FIREBASE_DB}|${MKT_FIREBASE_DB}|g" /app/.env
sed -i "s|\${ADMOB_DB}|${ADMOB_DB}|g" /app/.env
sed -i "s|\${XMP_DB}|${XMP_DB}|g" /app/.env
sed -i "s|\${ADMOB_LIST_TOKENS}|${ADMOB_LIST_TOKENS}|g" /app/.env
sed -i "s|\${ADMOB_DICT_PUBLISHER_ID}|${ADMOB_DICT_PUBLISHER_ID}|g" /app/.env
sed -i "s|\${XMP_CLIENT_ID}|${XMP_CLIENT_ID}|g" /app/.env
sed -i "s|\${XMP_CLIENT_SECRET}|${XMP_CLIENT_SECRET}|g" /app/.env
sed -i "s|\${LIST_AFRICA_CODES}|${LIST_AFRICA_CODES}|g" /app/.env
sed -i "s|\${LIST_AMERICAS_CODES}|${LIST_AMERICAS_CODES}|g" /app/.env
sed -i "s|\${LIST_ASIA_CODES}|${LIST_ASIA_CODES}|g" /app/.env
sed -i "s|\${LIST_EUROPE_CODES}|${LIST_EUROPE_CODES}|g" /app/.env
sed -i "s|\${LIST_OCEANIA_CODES}|${LIST_OCEANIA_CODES}|g" /app/.env

echo "✓ Đã tạo file .env với environment variables"

# Tạo crontab file
cat > /etc/cron.d/admob-cron << 'EOF'
# AdMob Platform Cron Jobs
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin

# Chạy mini batch mỗi 30 phút để ETL dữ liệu ngày hiện tại
*/30 * * * * cd /app && /usr/local/bin/python /app/code/z_main_mini_batch.py >> /app/logs/cron_mini_batch.log 2>&1

# Chạy last 3 days vào 2h sáng mỗi ngày để ETL dữ liệu 3 ngày gần nhất
0 2 * * * cd /app && /usr/local/bin/python /app/code/z_main_last_3_day.py >> /app/logs/last_3_day_job.log 2>&1

EOF

# Set permissions và apply crontab
chmod 0644 /etc/cron.d/admob-cron
crontab /etc/cron.d/admob-cron

# Khởi động cron service
service cron start
echo "✓ Cron service đã khởi động"

# Chờ StarRocks sẵn sàng
echo "Đang chờ StarRocks khởi động..."
while ! nc -z ${MKT_HOST_DB} ${MKT_PORT_DB}; do
  sleep 5
done
echo "✓ StarRocks đã sẵn sàng"

# Khởi tạo database (chạy một lần khi container start)
echo "Khởi tạo database..."
python << 'PYEOF'
import os
import pymysql
import time

# Đợi thêm để đảm bảo BE node đã được thêm vào cluster
time.sleep(15)

try:
    conn = pymysql.connect(
        host=os.getenv('MKT_HOST_DB'),
        port=int(os.getenv('MKT_PORT_DB')),
        user=os.getenv('MKT_USER_DB'),
        password=os.getenv('MKT_PASSWD_DB'),
        charset='utf8mb4'
    )
    cursor = conn.cursor()

    # Tạo database nếu chưa có
    admob_db = os.getenv('ADMOB_DB')
    cursor.execute(f'CREATE DATABASE IF NOT EXISTS {admob_db}')
    cursor.execute(f'USE {admob_db}')

    # Tạo bảng admob_table nếu chưa có
    with open('/app/tmp/admob_table.sql', 'r') as f:
        sql = f.read()
        cursor.execute(sql)

    conn.commit()
    cursor.close()
    conn.close()
    print('✓ Database và bảng đã được khởi tạo thành công!')
except Exception as e:
    print(f'⚠ Lỗi khởi tạo database: {e}')
    print('Database có thể đã tồn tại hoặc sẽ được tạo tự động khi chạy ETL.')
PYEOF

echo ""
echo "========================================="
echo "  AdMob Platform đã khởi động thành công"
echo "========================================="
echo "Cron jobs:"
echo "  - Mini batch: mỗi 30 phút"
echo "  - Last 3 days: 2h sáng mỗi ngày"
echo ""
echo "Logs:"
echo "  - /app/logs/cron_mini_batch.log"
echo "  - /app/logs/last_3_day_job.log"
echo "========================================="
echo ""

# Theo dõi logs
tail -f /app/logs/*.log /var/log/cron.log 2>/dev/null &

# Giữ container chạy
exec tail -f /dev/null