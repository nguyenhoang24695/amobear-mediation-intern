import requests
import json

# ---------------------------  Get TABLE 1 admob_table report  ---------------------------
# Bảng này không lấy dữ liệu country
def get_admob_table_report(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 6 dimensions
            "dimensions": ["DATE", "AD_UNIT", "APP",
                           "FORMAT", "PLATFORM", "APP_VERSION_NAME"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 1 success")
    return data


# ---------------------------  Get TABLE 2 mkt_table report  ---------------------------
# Lấy các thông tin: date, app_name, country, ad_source, app_version_name
def get_mkt_table_report(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 6 dimensions
            "dimensions": ["DATE", "APP", "COUNTRY", "APP_VERSION_NAME", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 2 success")
    return data


# ---------------------------  Get TABLE 3 mediation_table report  ---------------------------
# Lấy các thông tin date, app_name, country, ad_source, ad_unit (filter theo 5 châu lục, HOẶC top 25 country)

### 01. IN-PK
def get_mediation_table_report_IN_PK(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['IN', 'PK']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 02. US-BR
def get_mediation_table_report_US_BR(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['US', 'BR']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 03. ID-PH
def get_mediation_table_report_ID_PH(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['ID', 'PH']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 04. DZ-MX
def get_mediation_table_report_DZ_MX(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['DZ', 'MX']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 05. SA-ZA
def get_mediation_table_report_SA_ZA(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['SA', 'ZA']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 06. TR-EG
def get_mediation_table_report_TR_EG(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['TR', 'EG']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 07. MA-DE
def get_mediation_table_report_MA_DE(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['MA', 'DE']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 08. IQ-BD
def get_mediation_table_report_IQ_BD(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['IQ', 'BD']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 09. VN-FR
def get_mediation_table_report_VN_FR(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['VN', 'FR']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 10. CA-CO
def get_mediation_table_report_CA_CO(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['CA', 'CO']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data


### 11. JP-KR
def get_mediation_table_report_JP_KR(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['JP', 'KR']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data



### 1. AFRICAS ---------------------------
def get_mediation_table_report_aficas(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'EH', 'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'IO', 'KE', 'KM', 'LR', 'LS', 'LY', 'MG', 'ML', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SC', 'SD', 'SH', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TF', 'TG', 'TN', 'TZ', 'UG', 'YT', 'ZM', 'ZW']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data

### 2. AMERICAS ---------------------------
def get_mediation_table_report_americas(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['AG', 'AI', 'AR', 'AW', 'BB', 'BL', 'BM', 'BO', 'BQ', 'BS', 'BZ', 'CL', 'CR', 'CW', 'DM', 'DO', 'EC', 'FK', 'GD', 'GF', 'GL', 'GP', 'GS', 'GT', 'GY', 'HN', 'HT', 'JM', 'KN', 'KY', 'LC', 'MF', 'MQ', 'MS', 'NI', 'PA', 'PE', 'PM', 'PR', 'PY', 'SR', 'SV', 'SX', 'TC', 'TT', 'UY', 'VC', 'VE', 'VG', 'VI']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data

### 3. ASIA ---------------------------
def get_mediation_table_report_asia(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['AE', 'AF', 'AM', 'AZ', 'BH', 'BN', 'BT', 'CN', 'CY', 'GE', 'HK', 'IL', 'JO', 'KG', 'KH', 'KW', 'KZ', 'LA', 'LB', 'LK', 'MM', 'MN', 'MO', 'MV', 'MY', 'NP', 'OM', 'PS', 'QA', 'SG', 'TH', 'TJ', 'TL', 'TM', 'TW', 'UZ', 'YE']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data

### 4. EUROPE ---------------------------
def get_mediation_table_report_europe(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CZ', 'DK', 'EE', 'ES', 'FI', 'FO', 'GB', 'GG', 'GI', 'GR', 'HR', 'HU', 'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SJ', 'SK', 'SM', 'UA', 'VA', 'XK']
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data

### 5. OCEANIA ---------------------------
def get_mediation_table_report_oceania(access_token, publisher_id, date, sort_type):
    url = f"https://admob.googleapis.com/v1/accounts/{publisher_id}/mediationReport:generate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    body = {
        "reportSpec": {
            "dateRange": {
                "startDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]},
                "endDate": {"year": date[:4], "month": date[4:6], "day": date[6:8]}
            },
            # 8 dimensions
            "dimensions": ["DATE", "AD_SOURCE", "AD_UNIT", "MEDIATION_GROUP", "APP", "COUNTRY", "FORMAT", "PLATFORM"],
            # 7 metrics
            "metrics": ["AD_REQUESTS", "CLICKS", "ESTIMATED_EARNINGS", "IMPRESSIONS",
                        "MATCHED_REQUESTS", "MATCH_RATE", "OBSERVED_ECPM"],
            # Filter data theo country
            "dimensionFilters": [
                {
                    "dimension": "COUNTRY",
                    "matchesAny": {
                        "values": ['AQ', 'AS', 'AU', 'CC', 'CK', 'CX', 'FJ', 'FM', 'GU', 'KI', 'MH', 'MP', 'NC', 'NF', 'NR', 'NU', 'NZ', 'PF', 'PG', 'PN', 'PW', 'SB', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'] + ["CU", "SY", "IR", "ZZ"]
                    }
                }
            ],
            "sortConditions": [
                {
                    "order": f"{sort_type}",
                    "metric": "ESTIMATED_EARNINGS"
                }
            ]
        }
    }
    response = requests.post(url, headers=headers, data=json.dumps(body))
    data = response.json()
    print("Read data table 3 success")
    return data
