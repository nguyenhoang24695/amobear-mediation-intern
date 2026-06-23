#!/bin/bash
set -e

echo "🚀 Khởi động XMP Platform..."

# Tạo thư mục logs nếu chưa có
mkdir -p /app/logs

# Thiết lập cron jobs
echo "⏰ Thiết lập cron jobs..."

# Tạo crontab file
cat > /tmp/crontab << 'EOF'
# Set PATH for cron to find python3
PATH=/usr/local/bin:/usr/bin:/bin

# XMP Mini Batch - chạy mỗi 30 phút
*/30 * * * * /usr/local/bin/run-with-env.sh /usr/local/bin/python3 /app/code/z_main_mini_batch.py >> /app/logs/xmp_cron_mini_batch.log 2>&1

# XMP Last 10 Days - chạy mỗi ngày lúc 6h sáng
0 6 * * * /usr/local/bin/run-with-env.sh /usr/local/bin/python3 /app/code/z_main_last_10_day.py >> /app/logs/xmp_last_10_day_job.log 2>&1
EOF

# Load crontab
crontab /tmp/crontab

# Khởi động cron daemon
echo "🕒 Khởi động cron daemon..."
service cron start

# Hiển thị cron jobs đã được thiết lập
echo "📋 Cron jobs đã thiết lập:"
crontab -l

# Biến để track kết nối StarRocks
connected=false

# Kiểm tra và tự động setup database
if [ ! -z "$MKT_HOST_DB" ]; then
    echo "🔍 Kiểm tra kết nối tới StarRocks..."
    echo "Host: $MKT_HOST_DB:$MKT_PORT_DB"
    
    # Đợi StarRocks sẵn sàng (tối đa 10 giây)
    timeout=10
    while [ $timeout -gt 0 ]; do
        if nc -z $MKT_HOST_DB $MKT_PORT_DB 2>/dev/null; then
            echo "✅ Kết nối StarRocks thành công!"
            connected=true
            break
        fi
        echo "⏳ Đợi StarRocks... ($timeout giây)"
        sleep 1
        timeout=$((timeout - 1))
    done
    
    if [ "$connected" = false ]; then
        echo "⚠️  Không kết nối được StarRocks ngay lúc này"
        echo "💡 Container sẽ tiếp tục chạy - cron jobs sẽ thử kết nối khi chạy"
    else
        # Tự động tạo database và table
        echo "🗄️ Tự động thiết lập database và table..."
        
        # Tạo database
        echo "📊 Tạo database $XMP_DB..."
        mysql --skip-ssl -h $MKT_HOST_DB -P $MKT_PORT_DB -u $MKT_USER_DB -p$MKT_PASSWD_DB -e "CREATE DATABASE IF NOT EXISTS $XMP_DB;" 2>/dev/null && echo "✅ Database đã sẵn sàng!" || echo "⚠️ Database đã tồn tại"
        
        # Tạo table từ file SQL gốc 
        echo "📋 Tạo table xmp_table..."
        
        # Sử dụng cú pháp StarRocks đúng với SSL disabled
        mysql --skip-ssl -h $MKT_HOST_DB -P $MKT_PORT_DB -u $MKT_USER_DB -p$MKT_PASSWD_DB $XMP_DB -e "CREATE TABLE IF NOT EXISTS xmp_table (hash_key VARCHAR(32) NOT NULL, account_id VARCHAR(255), account_name VARCHAR(255), date DATE, module VARCHAR(100), os VARCHAR(50), product_id VARCHAR(255), product_name VARCHAR(255), store_package_id VARCHAR(255), timezone VARCHAR(100), currency VARCHAR(10), cost DECIMAL(18, 6), xmp_cost DECIMAL(18, 6)) DUPLICATE KEY (hash_key) PROPERTIES ('replication_num' = '1');" 2>&1
        
        # Kiểm tra kết quả
        if mysql --skip-ssl -h $MKT_HOST_DB -P $MKT_PORT_DB -u $MKT_USER_DB -p$MKT_PASSWD_DB $XMP_DB -e "SHOW TABLES LIKE 'xmp_table';" 2>/dev/null | grep -q "xmp_table"; then
            echo "✅ Table xmp_table đã sẵn sàng!"
        else
            echo "❌ Không thể tạo table xmp_table"
        fi
        
        echo "🎉 Database setup hoàn tất!"
    fi
fi

echo "🎉 XMP Platform đã sẵn sàng!"
echo "📊 Logs sẽ được lưu tại /app/logs/"
echo "🔄 Cron jobs đang chạy trong nền..."

# Giữ container chạy và hiển thị logs
tail -f /app/logs/*.log 2>/dev/null &

# Chạy một lần để test (nếu connect được StarRocks)
if [ "$connected" = true ]; then
    echo "🧪 Chạy test mini batch..."
    /usr/local/bin/run-with-env.sh /usr/local/bin/python3 /app/code/z_main_mini_batch.py
else
    echo "⏭️  Bỏ qua test - cron jobs sẽ chạy theo lịch"
fi

# Giữ container alive
while true; do
    sleep 300  # Sleep 5 phút
    echo "$(date): XMP Platform đang chạy..."
done