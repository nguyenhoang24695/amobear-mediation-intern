import os
import time
import json
import traceback
import mysql.connector
from datetime import datetime
from dotenv import load_dotenv
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, MapType, StringType
from pyspark.sql.functions import col, lit, to_date, struct, expr, to_timestamp, to_json, datediff, from_json, explode, map_keys, udf
from pyspark.sql.functions import length, max as spark_max
from step2_export_and_remove_data_from_BQ_to_GCS import export_data, remove_data

start_code = datetime.now()
load_dotenv()
script_dir = os.path.dirname(os.path.abspath(__file__))
gcs_connector_path = os.path.abspath(os.path.join(script_dir, "..", "jar_file", "gcs-connector-hadoop3-2.2.13-shaded.jar"))
starrocks_connector_path = os.path.abspath(os.path.join(script_dir, "..", "jar_file", "starrocks-spark-connector-3.5_2.12-1.1.3.jar"))
mysql_connector_j_path = os.path.abspath(os.path.join(script_dir, "..", "jar_file", "mysql-connector-j-8.0.33.jar"))


##### STEP 1: CONFIG VÀ ĐỌC DỮ LIỆU VÀO SPARK DATAFRAME
def read_data_from_gcs(spark, app_name, transform_date):
    print(spark.sparkContext._jsc.sc().listJars())
    try:
        gcs_path = f"gs://{app_name}_bucket/{app_name}_{transform_date}/data_{transform_date}-*.parquet"
        print(f"Reading data from: {gcs_path}")
        first_df = spark.read.parquet(gcs_path)
        return first_df
    except:
        spark.stop()
        print("Lỗi dữ liệu -> Kết thúc SparkSession")
        return


##### STEP 2: BIẾN ĐỔI DỮ LIỆU
### STEP 2.1: Loại bỏ một params không cần thiết
def filter_valuable_data(spark, first_df):
    df_excluded = first_df.select("event_date", "event_timestamp", "event_name", "event_params",
                        "user_pseudo_id", "user_properties", "user_first_touch_timestamp",
                        "device", "geo", "app_info", "traffic_source", "event_value_in_usd")
    
    # Loại bỏ các bản ghi trùng lặp
    df_valuable = df_excluded.dropDuplicates()
    return df_valuable


### STEP 2.2: Biến đổi cấu trúc, kiểu dữ liệu của các trường dữ liệu user_properties, event_params, device, geo, app_version
def transform_device_geo_trafficsource(spark, df_valuable):
    # Đổi kiểu dữ liệu từ string sang timestamp
    df_transformed1 = df_valuable.withColumn("event_date", to_date("event_date", "yyyyMMdd"))

    # Chuyển kiểu dữ liệu của user_properties từ ARRAY sang JSON
    df_transformed1 = df_transformed1.withColumn(
        "user_properties_json",
        to_json(expr("map_from_entries(transform(user_properties, x -> struct(x.key, x.value)))"))
    )

    df_transformed1 = df_transformed1.drop("user_properties", "user_properties_arr")
    df_transformed1 = df_transformed1.withColumnRenamed("user_properties_json", "user_properties")

    # Chuyển kiểu dữ liệu của event_params từ ARRAY sang JSON
    df_transformed1 = df_transformed1.withColumn(
        "event_params_json",
        to_json(expr("map_from_entries(transform(event_params, x -> struct(x.key, x.value)))"))
    )

    df_transformed1 = df_transformed1.drop("event_params", "event_params_arr")
    df_transformed1 = df_transformed1.withColumnRenamed("event_params_json", "event_params")

    # Chỉ giữ lại 1 số sub_params trong param device
    df_transformed1 = df_transformed1.withColumn(
        "device",
        struct(
            col("device.advertising_id"),
            col("device.category"),
            col("device.language"),
            col("device.mobile_brand_name"),
            col("device.mobile_marketing_name"),
            col("device.mobile_model_name"),
            col("device.operating_system_version")
        )
    )

    # Chỉ giữ lại 1 số sub_params trong param geo
    df_transformed1 = df_transformed1.withColumn(
        "geo",
        struct(
            col("geo.city"),
            col("geo.country"),
            col("geo.sub_continent"),
            col("geo.continent")
        )
    )

    # Chỉ giữ lại sub_param version trong app_info và đổi tên thành app_version
    df_transformed1 = df_transformed1.withColumn(
        "app_version",
        col("app_info.version")
    )
    df_transformed1 = df_transformed1.drop("app_info")

    return df_transformed1


### STEP 2.2 (tiếp): Thêm một số cột dữ liệu mới
def create_some_columns(spark, df_transformed1):
    # Tạo cột install_date từ user_first_touch_timestamp (micros → date, khớp bản mẫu C#)
    df_transformed2 = df_transformed1.withColumn(
        "install_date",
        to_date(to_timestamp((col("user_first_touch_timestamp") / 1000000).cast("timestamp")))
    )

    # retention_day = (event_date - install_date).Days — dùng event_date cho khớp bản mẫu C# (FirebaseEventTransformer)
    df_transformed2 = df_transformed2.withColumn(
        "retention_day",
        datediff(col("event_date"), col("install_date"))
    )
    df_transformed2 = df_transformed2.drop("user_first_touch_timestamp")

    # Chuyển các cột về kiểu JSON
    df_transformed2 = df_transformed2.withColumn("device", to_json(col("device")))
    df_transformed2 = df_transformed2.withColumn("geo", to_json(col("geo")))
    df_transformed2 = df_transformed2.withColumn("traffic_source", to_json(col("traffic_source")))

    # Lấy df_transformed2
    df_transformed2 = df_transformed2.select("user_pseudo_id", "user_properties", "event_date", "event_timestamp", "install_date", "retention_day", "event_name", "event_params", "app_version", "device", "geo", "traffic_source", "event_value_in_usd")
    return df_transformed2


### STEP 2.3: Parse các trường: device, geo, traffic_source, user_properties, event_params
## Parse device
def parse_device(spark, df_transformed2):
    # 1. Định nghĩa schema cho cột device
    device_schema = StructType() \
        .add("advertising_id", StringType()) \
        .add("category", StringType()) \
        .add("language", StringType()) \
        .add("mobile_brand_name", StringType()) \
        .add("mobile_marketing_name", StringType()) \
        .add("mobile_model_name", StringType()) \
        .add("operating_system_version", StringType())

    # 2. Parse JSON sang struct mới
    df_parsed_device = df_transformed2.withColumn("device_json", from_json(col("device"), device_schema))

    # 3. Select tất cả các cột ban đầu + thêm các cột tách từ device
    df_parsed_device = df_parsed_device.select(
        "*",  # giữ lại toàn bộ các cột gốc
        col("device_json.advertising_id").alias("device.advertising_id"),
        col("device_json.category").alias("device.category"),
        col("device_json.language").alias("device.language"),
        col("device_json.mobile_brand_name").alias("device.mobile_brand_name"),
        col("device_json.mobile_marketing_name").alias("device.mobile_marketing_name"),
        col("device_json.mobile_model_name").alias("device.mobile_model_name"),
        col("device_json.operating_system_version").alias("device.OS_version")
    ).drop("device_json").drop("device")
    return df_parsed_device


## Parse geo
def parse_geo(spark, df_parsed_device):
    # 1. Định nghĩa schema cho cột geo
    geo_schema = StructType() \
        .add("city", StringType()) \
        .add("continent", StringType()) \
        .add("country", StringType()) \
        .add("sub_continent", StringType())

    # 2. Parse JSON trong cột geo thành struct mới
    df_parsed_geo = df_parsed_device.withColumn("geo_json", from_json(col("geo"), geo_schema))

    # 3. Chọn lại tất cả các cột ban đầu + thêm các cột con của geo
    df_parsed_geo = df_parsed_geo.select(
        "*",  # giữ tất cả các cột ban đầu
        col("geo_json.city").alias("geo.city"),
        col("geo_json.continent").alias("geo.continent"),
        col("geo_json.country").alias("geo.country"),
        col("geo_json.sub_continent").alias("geo.sub_continent")
    ).drop("geo_json").drop("geo")
    return df_parsed_geo


## Parse traffic_source
def parse_traffic_source(spark, df_parsed_geo):
    # 1. Định nghĩa schema cho traffic_source
    traffic_source_schema = StructType() \
        .add("medium", StringType()) \
        .add("name", StringType()) \
        .add("source", StringType())

    # 2. Parse cột traffic_source JSON thành struct
    df_parsed_traffic = df_parsed_geo.withColumn("traffic_source_json", from_json(col("traffic_source"), traffic_source_schema))

    # 3. Select tất cả cột hiện tại + thêm các cột con từ traffic_source
    df_parsed_traffic = df_parsed_traffic.select(
        "*",  # giữ lại tất cả các cột gốc
        col("traffic_source_json.medium").alias("traffic_source.medium"),
        col("traffic_source_json.name").alias("traffic_source.name"),
        col("traffic_source_json.source").alias("traffic_source.source")
    ).drop("traffic_source_json").drop("traffic_source")  # xóa cột tạm nếu không cần
    return df_parsed_traffic


## Parse user_properties
def parse_user_properties(spark, df_parsed_traffic):
    def flatten_user_params(json_str):
        try:
            obj = json.loads(json_str)
            result = {}
            for key, val in obj.items():
                # Ưu tiên các value chính
                for priority_field in ["string_value", "int_value", "float_value", "double_value"]:
                    if priority_field in val:
                        result[key] = str(val[priority_field])
                        break
            return result
        except:
            return {}
    # 0. UDF để flatten user_params → map(key -> value)
    flatten_user_params_udf = udf(flatten_user_params, MapType(StringType(), StringType()))

    # 1. Parse bằng UDF an toàn
    df_parsed_user_properties = df_parsed_traffic.withColumn("flat_user_params", flatten_user_params_udf(col("user_properties")))

    # 2. Lấy tất cả key trong toàn bộ tập
    keys_df = df_parsed_user_properties.select(explode(map_keys(col("flat_user_params"))).alias("key")).distinct()
    all_keys = [row["key"] for row in keys_df.collect()]

    # 3. Tạo các cột từ key
    for key in all_keys:
        df_parsed_user_properties = df_parsed_user_properties.withColumn(key, col("flat_user_params").getItem(key))

    df_parsed_user_properties = df_parsed_user_properties.drop("user_properties", "flat_user_params")
    return df_parsed_user_properties


## Parse event_params
def parse_params(spark, df_parsed_user_properties):
    def flatten_event_params(json_str):
        try:
            obj = json.loads(json_str)
            result = {}
            for key, val in obj.items():
                if isinstance(val, dict):
                    for priority_field in ["string_value", "int_value", "float_value", "double_value"]:
                        if priority_field in val:
                            result[key] = str(val[priority_field])
                            break
            return result
        except:
            return {}
    # 0. UDF để parse JSON và lấy giá trị "string_value", "int_value",...
    flatten_udf = udf(flatten_event_params, MapType(StringType(), StringType()))
    # 1. Parse bằng UDF an toàn
    df_parsed_params = df_parsed_user_properties.withColumn("flat_params", flatten_udf(col("event_params")))

    # 2. Lấy tất cả key trong toàn bộ tập
    keys_df = df_parsed_params.select(explode(map_keys(col("flat_params"))).alias("key")).distinct()
    all_keys = [row["key"] for row in keys_df.collect()]

    # 3. Tạo các cột từ key
    for key in all_keys:
        df_parsed_params = df_parsed_params.withColumn(key, col("flat_params").getItem(key))

    df_prestandardization = df_parsed_params.drop("event_params", "flat_params")
    return df_prestandardization


## Chuẩn hóa lại dữ liệu giữa DataFrame với DWH
def alter_table_and_df_standardization(spark, conn, starrocks_config, df_prestandardization):
    # Query trong StarRocks để lấy các cột dữ liệu
    cursor = conn.cursor()
    cursor.execute(f"DESCRIBE {starrocks_config['table']}")
    existing_columns = [row[0] for row in cursor.fetchall()]

    # So sánh với df_prestandardization để xác định các cột còn thiếu
    df_columns = set(df_prestandardization.columns)             # Danh sách các cột trong DataFrame
    starrocks_columns = set(existing_columns)                   # Danh sách các cột trong StarRocks DWH
    missing_columns = sorted(df_columns - starrocks_columns)    # Danh sách các cột còn thiếu
    print(f"Các cột còn thiếu ({len(missing_columns)}): {missing_columns}")

    # Sinh lệnh ALTER TABLE
    if missing_columns:
        alter_sql = f"""
        ALTER TABLE {starrocks_config['database']}.{starrocks_config['table']}
        {', '.join([f'ADD COLUMN `{col}` VARCHAR(256)' for col in missing_columns])};
        """

        # Kết nối và thực thi ALTER
        try:
            cursor.execute(alter_sql)
            conn.commit()
            print("✅ ALTER TABLE thành công.")
        except Exception as e:
            print("❌ Lỗi khi ALTER TABLE:", e)

    # Kiểm tra các trường dữ liệu mới
    print(f"Số cột trong DataFrame: {len(df_columns)}")
    cursor.execute(f"DESCRIBE {starrocks_config['table']}")
    newest_columns = [row[0] for row in cursor.fetchall()]
    print(f"Số cột trong StarRocks: {len(newest_columns)}")

    # Chuẩn hóa lại dữ liệu trong df_prestandardization trước khi bắn vào StarRocks (Đảm bảo mọi cột trong starrocks đều có trong df)
    for col_name in newest_columns:
        if col_name not in df_columns:
            df_prestandardization = df_prestandardization.withColumn(col_name, lit(None).cast(StringType()))
    return df_prestandardization


##### STEP 3: XÓA DỮ LIỆU CỦA NGÀY ĐANG KÉO TRƯỚC KHI INSERT
# Xóa dữ liệu của ngày cụ thể từ StarRocks
def delete_data_by_date(conn, app_name, delete_date):
    """Xóa dữ liệu trong bảng StarRocks cho ngày cụ thể
    
    Args:
        conn: MySQL connection object
        app_name: Tên bảng (app)
        delete_date: Ngày cần xóa dữ liệu, format 'yyyyMMdd'
    """
    try:
        # Convert delete_date từ 'yyyyMMdd' sang 'yyyy-MM-dd' format
        formatted_date = datetime.strptime(delete_date, '%Y%m%d').strftime('%Y-%m-%d')
        
        cursor = conn.cursor()
        delete_sql = f"DELETE FROM {app_name} WHERE event_date = '{formatted_date}'"
        
        print(f"Đang xóa dữ liệu ngày {formatted_date} từ bảng {app_name}...")
        cursor.execute(delete_sql)
        conn.commit()
        
        rows_affected = cursor.rowcount
        print(f"✅ Đã xóa {rows_affected} bản ghi của ngày {formatted_date}")
        
        cursor.close()
        return True
    except Exception as e:
        print(f"❌ Lỗi khi xóa dữ liệu ngày {delete_date}: {e}")
        traceback.print_exc()
        return False


##### STEP 4: GỌI CÁC HÀM TRANSFORM VÀ LOAD DỮ LIỆU VÀO STARROCKS
def transform_and_load(app_name, transform_date):
    time1 = datetime.now()

        # CLEANUP CODE ĐẶT Ở ĐÂY
    try:
        from pyspark import SparkContext
        from pyspark.sql import SparkSession as SS
        # Try to stop active SparkSession
        active_session = SS.getActiveSession()
        if active_session:
            active_session.stop()
            print(f":white_check_mark: Stopped previous SparkSession for {app_name}", flush=True)
        # Also try to stop SparkContext directly
        try:
            sc = SparkContext._active_spark_context
            if sc:
                sc.stop()
                print(f":white_check_mark: Stopped active SparkContext for {app_name}", flush=True)
        except:
            pass
        # Wait for cleanup
        import time as time_lib
        time_lib.sleep(3)
        print(f":arrows_counterclockwise: Cleaned contexts, ready for {app_name}", flush=True)
    except Exception as e:
        print(f":warning: Context cleanup: {e}", flush=True)

    key_path = os.path.join(script_dir, "..", "z_api_key", f"{app_name}.json")
    # Khởi tạo Spark
    spark = SparkSession.builder \
        .appName("Transform Data") \
        .master("local[64]") \
        .config("spark.driver.memory", "32g") \
        .config("spark.executor.memory", "64g") \
        .config("spark.executor.cores", "8") \
        .config("spark.driver.maxResultSize", "16g") \
        .config("spark.memory.fraction", "0.7") \
        .config("spark.sql.json.maxStringLength", "1073741824") \
        .config("spark.sql.files.maxPartitionBytes", 256 * 1024 * 1024) \
        .config("spark.hadoop.fs.gs.inputstream.buffer.size", "1048576") \
        .config("spark.sql.parquet.filterPushdown", "true") \
        .config("spark.jars", f"{gcs_connector_path},{starrocks_connector_path},{mysql_connector_j_path}") \
        .config("spark.hadoop.google.cloud.auth.service.account.enable", "true") \
        .config("spark.hadoop.google.cloud.auth.service.account.json.keyfile", key_path) \
        .config("spark.hadoop.fs.gs.impl", "com.google.cloud.hadoop.fs.gcs.GoogleHadoopFileSystem") \
        .config("spark.hadoop.fs.AbstractFileSystem.gs.impl", "com.google.cloud.hadoop.fs.gcs.GoogleHadoopFS") \
        .getOrCreate()
    
    # Cấu hình StarRocks
    starrocks_config = {
        "host": os.getenv("MKT_HOST_DB"),
        "jdbc_port": int(os.getenv("MKT_JDBC_PORT")),
        "http_port": int(os.getenv("MKT_HTTP_PORT")),
        "database": os.getenv("MKT_FIREBASE_DB"),
        "table": f"{app_name}",
        "user": os.getenv("MKT_USER_DB"),
        "password": os.getenv("MKT_PASSWD_DB")
    }

    # Kết nối JDBC tới FE
    conn = mysql.connector.connect(
        host=starrocks_config["host"],
        port=starrocks_config["jdbc_port"],
        user=starrocks_config["user"],
        password=starrocks_config["password"],
        database=starrocks_config["database"]
    )

    # Pipeline
    time2 = datetime.now()
    print(f"Thời gian khởi tạo Spark là: {time2-time1}")

    # Xóa và kéo dữ liệu từ BigQuery vào GCS
    res_remove = remove_data(app_name, transform_date)
    try:
        export_data(app_name, transform_date)
    except:
        spark.stop()
        print("Lỗi export dữ liệu -> Kết thúc SparkSession")
        return
    time3 = datetime.now()
    print(f"Thời gian remove và export dữ liệu vào GCS là: {time3-time2}")

    first_df = read_data_from_gcs(spark, app_name, transform_date)
    time4 = datetime.now()
    print(f"Thời gian đọc dữ liệu từ GCS là: {time4-time3}")

    df_valuable = filter_valuable_data(spark, first_df)
    time5 = datetime.now()
    print(f"Thời gian xử lý filter_valuable_data là: {time5-time4}")

    df_transformed1 = transform_device_geo_trafficsource(spark, df_valuable)
    time6 = datetime.now()
    print(f"Thời gian xử lý transform_device_geo_trafficsource là: {time6-time5}")

    df_transformed2 = create_some_columns(spark, df_transformed1)
    time7 = datetime.now()
    print(f"Thời gian xử lý create_some_columns là: {time7-time6}")

    df_parsed_device = parse_device(spark, df_transformed2)
    time8 = datetime.now()
    print(f"Thời gian xử lý parse_device là: {time8-time7}")

    df_parsed_geo = parse_geo(spark, df_parsed_device)
    time9 = datetime.now()
    print(f"Thời gian xử lý parse_geo là: {time9-time8}")

    df_parsed_traffic = parse_traffic_source(spark, df_parsed_geo)
    time10 = datetime.now()
    print(f"Thời gian xử lý parse_traffic_source là: {time10-time9}")

    df_parsed_user_properties = parse_user_properties(spark, df_parsed_traffic)
    time11 = datetime.now()
    print(f"Thời gian xử lý df_parse_user_properties là: {time11-time10}")

    df_prestandardization = parse_params(spark, df_parsed_user_properties)
    time12 = datetime.now()
    print(f"Thời gian xử lý parse_params là: {time12-time11}")

    df_final = alter_table_and_df_standardization(spark, conn, starrocks_config, df_prestandardization)
    time13 = datetime.now()
    print(f"Thời gian xử lý alter_table_and_df_standardization là: {time13-time12}")
    df_final = df_final.dropDuplicates()

    # Xóa dữ liệu của ngày này trong StarRocks trước khi insert
    if res_remove != "No old data":
        try:
            delete_success = delete_data_by_date(conn, app_name, transform_date)
            if delete_success:
                print(f"✅ Đã xóa dữ liệu cũ của ngày {transform_date}, sẵn sàng insert dữ liệu mới")
            else:
                print(f"⚠️ Không thể xóa dữ liệu cũ, vẫn tiếp tục insert")
        except Exception as e:
            print(f"!!! LỖI khi xóa dữ liệu {app_name} ngày {transform_date}: {e}", flush=True)
            traceback.print_exc()


    # Số hàng và cột của Spark DF
    num_rows = df_final.count()
    print("Số hàng của Spark DF là:", num_rows)
    time14 = datetime.now()
    print(f"Thời gian đếm số hàng trong Spark DF là: {time14-time13}")
    if num_rows == 0:
        print("Số bản ghi của df_final bằng 0 -> Dừng")
        spark.stop()
        return

    num_cols = len(df_final.columns)
    time15 = datetime.now()
    print(f"Thời gian đếm số cột trong Spark DF là: {time15-time14}")
    print(f"Số hàng và số cột trong Spark DF là: {num_rows} x {num_cols}")

    #Load dữ liệu vào StarRocks
    try:
        df_final.write \
            .format("starrocks") \
            .option("starrocks.write.properties.format", "json") \
            .option("starrocks.fe.http.url", f"http://{starrocks_config['host']}:{starrocks_config['http_port']}") \
            .option("starrocks.fe.jdbc.url", f"jdbc:mysql://{starrocks_config['host']}:{starrocks_config['jdbc_port']}") \
            .option("starrocks.table.identifier", f"{starrocks_config['database']}.{starrocks_config['table']}") \
            .option("user", starrocks_config["user"]) \
            .option("password", starrocks_config["password"]) \
            .option("starrocks.write.mode", "append") \
            .option("sink.buffer.flush.max.rows", "10000") \
            .option("sink.buffer.flush.interval.ms", "5000") \
            .option("sink.buffer.size", str(64 * 1024 * 1024)) \
            .mode("append") \
            .save()
        print("✅ Load data to StarRocks successfully")

    except Exception as e:
        print("Lỗi ghi dữ liệu vào StarRocks:", e)
        raise
    
    time16 = datetime.now()
    print(f"Thời gian load dữ liệu vào StarRocks là: {time16-time15}")

