from google.cloud import bigquery, storage
import os
import json

def export_data(app_name, export_date):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    key_path = os.path.join(script_dir, "..", "z_api_key", f"{app_name}.json")

    # Tạo client một lần cho cả BigQuery và GCS
    bq_client = bigquery.Client.from_service_account_json(key_path)
    gcs_client = storage.Client.from_service_account_json(key_path)

    bucket_name = f"{app_name}_bucket"
    prefix = f"{app_name}_{export_date}/"

    # Lấy thông tin project_name từ file key_service
    with open(key_path, "r") as f:
        info = json.load(f)
    project_name = info["project_id"]

    # Kiểm tra thư mục GCS đã có dữ liệu chưa
    blobs = list(gcs_client.list_blobs(bucket_name, prefix=prefix))
    if blobs:
        print(f"⏩ Dữ liệu app {app_name} ngày {export_date} đã tồn tại trong GCS. Bỏ qua.")
        return

    # Lấy thông tin của bigquery_table
    client = bigquery.Client.from_service_account_json(key_path)
    for dataset in client.list_datasets():
        if "analytics_" in dataset.dataset_id:
            bigquery_table = dataset.dataset_id
        break

    # Nếu chưa có -> tiến hành export
    table_ref = bigquery.DatasetReference(
        f"{project_name}", f"{bigquery_table}"
    ).table(f"events_intraday_{export_date}")

    destination_uri = f"gs://{bucket_name}/{prefix}data_{export_date}-*.parquet"

    extract_job = bq_client.extract_table(
        table_ref,
        destination_uris=destination_uri,
        location="US",
        job_config=bigquery.ExtractJobConfig(
            destination_format="PARQUET"
        )
    )

    extract_job.result()
    print(f"✅ Đã export dữ liệu app {app_name} ngày {export_date} đến {destination_uri} vào GCS")


def remove_data(app_name, remove_date):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    key_path = os.path.join(script_dir, "..", "z_api_key", f"{app_name}.json")

    # Tạo client một cho GCS
    gcs_client = storage.Client.from_service_account_json(key_path)
    bucket_name = f"{app_name}_bucket"
    prefix = f"{app_name}_{remove_date}/"

    # Kiểm tra dữ liệu đã tồn tại chưa
    blobs = list(gcs_client.list_blobs(bucket_name, prefix=prefix))
    if not blobs:
        print(f"🟢 Không có dữ liệu nào của app {app_name} ngày {remove_date} trong GCS.")
        return "No old data"

    # Xóa toàn bộ dữ liệu cũ
    print(f"⚠️ Phát hiện dữ liệu của app {app_name} ngày {remove_date}, tiến hành xóa...")
    deleted_count = 0
    for blob in blobs:
        try:
            blob.delete()
            deleted_count += 1
        except Exception as e:
            print(f"❌ Lỗi khi xóa {blob.name}: {e}")

    print(f"🗑️ Đã xóa {deleted_count}/{len(blobs)} file trong thư mục {bucket_name}/{prefix}.")

