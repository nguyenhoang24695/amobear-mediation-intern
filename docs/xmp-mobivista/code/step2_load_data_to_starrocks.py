import os
import pymysql
import numpy as np
from dotenv import load_dotenv


def load_data_to_xmp_table(df):
    load_dotenv()
    
    # Kiểm tra DataFrame rỗng
    if df.empty:
        print("⚠️ DataFrame is empty. Skipping database insertion.")
        return

    df = df.replace({np.nan: None})
    
    print(f"🔄 Loading {len(df)} records to StarRocks...")

    # Kết nối tới StarRocks
    try:
        conn = pymysql.connect(
            host=os.getenv("MKT_HOST_DB"),
            port=int(os.getenv("MKT_PORT_DB")),
            user=os.getenv("MKT_USER_DB"),
            password=os.getenv("MKT_PASSWD_DB"),
            database=os.getenv("XMP_DB")
        )
        cursor = conn.cursor()
        
        print(f"✅ Connected to StarRocks: {os.getenv('MKT_HOST_DB')}:{os.getenv('MKT_PORT_DB')}")

        # Lấy danh sách cột
        columns = df.columns.tolist()
        cols_str = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))

        # Với Primary Key Table, INSERT chính là UPSERT
        insert_sql = f"INSERT INTO xmp_table ({cols_str}) VALUES ({placeholders})"

        # Chuyển DataFrame thành list tuple
        data = [tuple(x) for x in df.to_numpy()]

        # Thực thi
        cursor.executemany(insert_sql, data)
        conn.commit()
        cursor.close()
        conn.close()
        print(f"✅ Đã UPSERT {len(data)} dòng vào bảng xmp_table")
        
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        raise
