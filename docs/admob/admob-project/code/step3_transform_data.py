import numpy as np
import pandas as pd
import hashlib

# Mục đích của hash key là hash các cột làm PRIMARY KEY để nó có độ dài không vượt quá 128 byte
def make_admob_hash_key(row):
    key_str = (
        str(row["date"]) +
        str(row["ad_unit_id"]) +
        str(row["app_id"]) +
        str(row["format"]) +
        str(row["platform"]) +
        str(row["app_version_name"])
    )
    return hashlib.md5(key_str.encode()).hexdigest()

def make_mkt_hash_key(row):
    key_str = (
        str(row["date"]) +
        str(row["app_id"]) +
        str(row["country"]) +
        str(row["format"]) +
        str(row["platform"]) +
        str(row["app_version_name"])
    )
    return hashlib.md5(key_str.encode()).hexdigest()
def make_mediation_hash_key(row):
    key_str = (
        str(row["date"]) +
        str(row['ad_source_id']) +
        str(row["ad_unit_id"]) +
        str(row["mediation_group_id"]) +
        str(row["app_id"]) +
        str(row["country"]) +
        str(row["format"]) +
        str(row["platform"])
    )
    return hashlib.md5(key_str.encode()).hexdigest()

# ---------------------------  Transform TABLE 1 admob_table data  ---------------------------
def transform_admob_table_data(datas):
    # Khai báo lists
    date, ad_unit_name, ad_unit_id, app_name, app_id = [], [], [], [], []
    format_, platform, app_version_name = [], [], []

    ad_requests, clicks, estimated_earnings, impressions = [], [], [], []
    matched_requests, match_rate, observed_ecpm = [], [], []

    # Lưu dữ liệu
    for data in datas:
        try:
            metric = data["row"]["metricValues"]
            dimension = data["row"]["dimensionValues"]

            # Dimensions
            date.append(dimension.get("DATE", {}).get("value"))
            ad_unit_name.append(dimension.get("AD_UNIT", {}).get("displayLabel"))
            ad_unit_id.append(dimension.get("AD_UNIT", {}).get("value"))
            app_name.append(dimension.get("APP", {}).get("displayLabel"))
            app_id.append(dimension.get("APP", {}).get("value"))

            format_.append(dimension.get("FORMAT", {}).get("value"))
            platform.append(dimension.get("PLATFORM", {}).get("value"))
            app_version_name.append(dimension.get("APP_VERSION_NAME", {}).get("value"))

            # Metrics
            ad_requests.append(metric.get("AD_REQUESTS", {}).get("integerValue"))
            clicks.append(metric.get("CLICKS", {}).get("integerValue"))
            estimated_earnings.append(metric.get("ESTIMATED_EARNINGS", {}).get("microsValue"))
            impressions.append(metric.get("IMPRESSIONS", {}).get("integerValue"))
            matched_requests.append(metric.get("MATCHED_REQUESTS", {}).get("integerValue"))
            match_rate.append(metric.get("MATCH_RATE", {}).get("doubleValue"))
            observed_ecpm.append(metric.get("OBSERVED_ECPM", {}).get("microsValue"))

        except:
            continue

    # Tạo DataFrame
    df = pd.DataFrame({
        "date": date,
        "ad_unit_name": ad_unit_name,
        "ad_unit_id": ad_unit_id,
        "app_id": app_id,
        "format": format_,
        "app_version_name": app_version_name,
        "app_name": app_name,
        "platform": platform,
        "ad_requests": ad_requests,
        "clicks": clicks,
        "estimated_earnings": estimated_earnings,
        "impressions": impressions,
        "matched_requests": matched_requests,
        "match_rate": match_rate,
        "observed_ecpm": observed_ecpm
    })

    # Chia estimated_earnings, observed_ecpm cho 10**6
    df["estimated_earnings"] = pd.to_numeric(df["estimated_earnings"], errors="coerce") / 10**6
    df["observed_ecpm"] = pd.to_numeric(df["observed_ecpm"], errors="coerce") / 10**6
    
    # Tính, và thêm cột show rate
    df["impressions"] = pd.to_numeric(df["impressions"], errors="coerce")
    df["matched_requests"] = pd.to_numeric(df["matched_requests"], errors="coerce")
    df["show_rate"] = df["impressions"] / df["matched_requests"].replace(0, np.nan)

    # Thêm cột hash_key
    df["hash_key"] = df.apply(make_admob_hash_key, axis=1)
    cols = ["hash_key"] + [c for c in df.columns if c != "hash_key"]
    df = df[cols]
    transformed_df = df.round(6)

    print("Transform success")
    return transformed_df


# ---------------------------  Transform TABLE 2 mkt_table data  ---------------------------
def transform_mkt_table_data(datas):
    # Khai báo lists
    date, app_name, app_id, country, format_, platform, app_version_name = [], [], [], [], [], [], []

    ad_requests, clicks, estimated_earnings, impressions = [], [], [], []
    matched_requests, match_rate, observed_ecpm = [], [], []

    # Lưu dữ liệu
    for data in datas:
        try:
            metric = data["row"]["metricValues"]
            dimension = data["row"]["dimensionValues"]

            # Dimensions
            date.append(dimension.get("DATE", {}).get("value"))
            app_name.append(dimension.get("APP", {}).get("displayLabel"))
            app_id.append(dimension.get("APP", {}).get("value"))
            country.append(dimension.get("COUNTRY", {}).get("value"))

            format_.append(dimension.get("FORMAT", {}).get("value"))
            platform.append(dimension.get("PLATFORM", {}).get("value"))
            app_version_name.append(dimension.get("APP_VERSION_NAME", {}).get("value"))

            # Metrics
            ad_requests.append(metric.get("AD_REQUESTS", {}).get("integerValue"))
            clicks.append(metric.get("CLICKS", {}).get("integerValue"))
            estimated_earnings.append(metric.get("ESTIMATED_EARNINGS", {}).get("microsValue"))
            impressions.append(metric.get("IMPRESSIONS", {}).get("integerValue"))
            matched_requests.append(metric.get("MATCHED_REQUESTS", {}).get("integerValue"))
            match_rate.append(metric.get("MATCH_RATE", {}).get("doubleValue"))
            observed_ecpm.append(metric.get("OBSERVED_ECPM", {}).get("microsValue"))

        except:
            continue

    # Tạo DataFrame
    df = pd.DataFrame({
        "date": date,
        "app_id": app_id,
        "country": country,
        "app_version_name": app_version_name,
        "app_name": app_name,
        "format": format_,
        "platform": platform,
        "ad_requests": ad_requests,
        "clicks": clicks,
        "estimated_earnings": estimated_earnings,
        "impressions": impressions,
        "matched_requests": matched_requests,
        "match_rate": match_rate,
        "observed_ecpm": observed_ecpm
    })

    # Chia estimated_earnings, observed_ecpm cho 10**6
    df["estimated_earnings"] = pd.to_numeric(df["estimated_earnings"], errors="coerce") / 10**6
    df["observed_ecpm"] = pd.to_numeric(df["observed_ecpm"], errors="coerce") / 10**6
    
    # Tính, và thêm cột show rate
    df["impressions"] = pd.to_numeric(df["impressions"], errors="coerce")
    df["matched_requests"] = pd.to_numeric(df["matched_requests"], errors="coerce")
    df["show_rate"] = df["impressions"] / df["matched_requests"].replace(0, np.nan)

    # Thêm cột hash_key
    df["hash_key"] = df.apply(make_mkt_hash_key, axis=1)
    cols = ["hash_key"] + [c for c in df.columns if c != "hash_key"]
    df = df[cols]
    transformed_df = df.round(6)

    print("Transform success")
    return transformed_df



# ---------------------------  Transform TABLE 3 mediation_table data  ---------------------------
def transform_mediation_table_data(datas):
    # Khai báo lists
    date, ad_source_name, ad_source_id, ad_unit_name, ad_unit_id, app_name, app_id, country = [], [], [], [], [], [], [], []
    format_, platform, mediation_group_name, mediation_group_id = [], [], [], []
    
    ad_requests, clicks, estimated_earnings, impressions = [], [], [], []
    matched_requests, match_rate, observed_ecpm = [], [], []

    # Lưu dữ liệu
    for data in datas:
        try:
            metric = data["row"]["metricValues"]
            dimension = data["row"]["dimensionValues"]

            # Dimensions
            date.append(dimension.get("DATE", {}).get("value"))
            ad_source_name.append(dimension.get("AD_SOURCE", {}).get("displayLabel"))
            ad_source_id.append(dimension.get("AD_SOURCE", {}).get("value"))
            mediation_group_name.append(dimension.get("MEDIATION_GROUP", {}).get("displayLabel"))
            mediation_group_id.append(dimension.get("MEDIATION_GROUP", {}).get("value"))
            ad_unit_name.append(dimension.get("AD_UNIT", {}).get("displayLabel"))
            ad_unit_id.append(dimension.get("AD_UNIT", {}).get("value"))
            app_name.append(dimension.get("APP", {}).get("displayLabel"))
            app_id.append(dimension.get("APP", {}).get("value"))
            country.append(dimension.get("COUNTRY", {}).get("value"))
            format_.append(dimension.get("FORMAT", {}).get("value"))
            platform.append(dimension.get("PLATFORM", {}).get("value"))

            # Metrics
            ad_requests.append(metric.get("AD_REQUESTS", {}).get("integerValue"))
            clicks.append(metric.get("CLICKS", {}).get("integerValue"))
            estimated_earnings.append(metric.get("ESTIMATED_EARNINGS", {}).get("microsValue"))
            impressions.append(metric.get("IMPRESSIONS", {}).get("integerValue"))
            matched_requests.append(metric.get("MATCHED_REQUESTS", {}).get("integerValue"))
            match_rate.append(metric.get("MATCH_RATE", {}).get("doubleValue"))
            observed_ecpm.append(metric.get("OBSERVED_ECPM", {}).get("microsValue"))

        except:
            continue

    # Tạo DataFrame
    df = pd.DataFrame({
        "date": date,
        "ad_unit_name": ad_unit_name,
        "ad_unit_id": ad_unit_id,
        "app_id": app_id,
        "country": country,
        "ad_source_name": ad_source_name,
        "ad_source_id": ad_source_id,
        "mediation_group_name": mediation_group_name,
        "mediation_group_id": mediation_group_id,
        "app_name": app_name,
        "format": format_,
        "platform": platform,
        "ad_requests": ad_requests,
        "clicks": clicks,
        "estimated_earnings": estimated_earnings,
        "impressions": impressions,
        "matched_requests": matched_requests,
        "match_rate": match_rate,
        "observed_ecpm": observed_ecpm
    })

    # Chia estimated_earnings, observed_ecpm cho 10**6
    df["estimated_earnings"] = pd.to_numeric(df["estimated_earnings"], errors="coerce") / 10**6
    df["observed_ecpm"] = pd.to_numeric(df["observed_ecpm"], errors="coerce") / 10**6
    
    # Tính, và thêm cột show rate
    df["impressions"] = pd.to_numeric(df["impressions"], errors="coerce")
    df["matched_requests"] = pd.to_numeric(df["matched_requests"], errors="coerce")
    df["show_rate"] = df["impressions"] / df["matched_requests"].replace(0, np.nan)

    # Thêm cột hash_key
    df["hash_key"] = df.apply(make_mediation_hash_key, axis=1)
    cols = ["hash_key"] + [c for c in df.columns if c != "hash_key"]
    df = df[cols]
    transformed_df = df.round(6)

    print("Transform success")
    return transformed_df
