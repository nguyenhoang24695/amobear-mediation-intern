import os
import pymysql
import numpy as np
from dotenv import load_dotenv

def load_data_to_admob_table(df, table_name):
    load_dotenv()
    df = df.replace({np.nan: None})

    # Kết nối tới StarRocks
    conn = pymysql.connect(
        host=os.getenv("MKT_HOST_DB"),
        port=int(os.getenv("MKT_PORT_DB")),
        user=os.getenv("MKT_USER_DB"),
        password=os.getenv("MKT_PASSWD_DB"),
        database=os.getenv("ADMOB_DB")
    )
    cursor = conn.cursor()

    # Lấy danh sách cột
    columns = df.columns.tolist()
    cols_str = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))

    # Với Primary Key Table, INSERT chính là UPSERT
    insert_sql = f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})"

    # Chuyển DataFrame thành list tuple
    data = [tuple(x) for x in df.to_numpy()]

    # Thực thi
    cursor.executemany(insert_sql, data)
    conn.commit()
    cursor.close()
    conn.close()
    print(f"Đã UPSERT {len(data)} dòng vào bảng {table_name}")
