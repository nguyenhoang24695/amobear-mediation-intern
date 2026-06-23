import os
import json
import traceback
from dotenv import load_dotenv
import datetime
from datetime import datetime
from step1_get_access_token import get_token
from step2_read_data import get_admob_table_report, get_mkt_table_report, get_mediation_table_report_aficas, get_mediation_table_report_americas, get_mediation_table_report_asia, get_mediation_table_report_europe, get_mediation_table_report_oceania
from step2_read_data import get_mediation_table_report_CA_CO
from step2_read_data import get_mediation_table_report_DZ_MX
from step2_read_data import get_mediation_table_report_ID_PH
from step2_read_data import get_mediation_table_report_IN_PK
from step2_read_data import get_mediation_table_report_IQ_BD
from step2_read_data import get_mediation_table_report_JP_KR
from step2_read_data import get_mediation_table_report_MA_DE
from step2_read_data import get_mediation_table_report_SA_ZA
from step2_read_data import get_mediation_table_report_TR_EG
from step2_read_data import get_mediation_table_report_US_BR
from step2_read_data import get_mediation_table_report_VN_FR
from step3_transform_data import transform_admob_table_data, transform_mkt_table_data, transform_mediation_table_data
from step4_load_data_to_starrocks import load_data_to_admob_table

load_dotenv()

# Định nghĩa thông tin token, list_app_id, ad_format
list_tokens = json.loads(os.getenv("ADMOB_LIST_TOKENS"))
dict_publisher_id = json.loads(os.getenv("ADMOB_DICT_PUBLISHER_ID"))

sort_types = ["DESCENDING", "ASCENDING"]

# Chọn khoảng ngày để xử lý dữ liệu
year = 2025
month = 11
start_date = 1
end_date = 6

print(f"Bắt đầu chạy code lúc: {datetime.now()}")
for date in range(end_date, start_date-1, -1):
    date = f"{year}{month:02d}{date:02d}"
    print(f"--------------------------------- START PROCESS DATA {date} ---------------------------------")
    for token_name in list_tokens:
        access_token = get_token(token_name)
        publisher_id = dict_publisher_id[token_name]

        ##### -------------------------  Pipeline table 1  -------------------------
        start_time = datetime.now()
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 1 - admob_table - {sort_type}: " + date)
                data = get_admob_table_report(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_admob_table_data(data)
                load_data_to_admob_table(final_df, "admob_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()
        end_time = datetime.now()
        print("-------------------------------------------------------------------")
        print(f"Thời gian xử lý dữ liệu data table 1 ngày {date} là: {end_time - start_time}")
        print("-------------------------------------------------------------------")

        ##### -------------------------  Pipeline table 2  -------------------------
        start_time = datetime.now()
        for sort_type in sort_types:
            print("-------------------------------------------------------------------")
            print(f"Processing data table 2 - mkt_table - {sort_type}: " + date)
            try:
                data = get_mkt_table_report(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mkt_table_data(data)
                load_data_to_admob_table(final_df, "mkt_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()
        end_time = datetime.now()
        print("-------------------------------------------------------------------")
        print(f"Thời gian xử lý dữ liệu data table 2 ngày {date} là: {end_time - start_time}")
        print("-------------------------------------------------------------------")

        ##### -------------------------  Pipeline table 3  -------------------------
        start_time = datetime.now()
        ### 1. Processing africas data
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - africas continent - {sort_type}: " + date)
                data = get_mediation_table_report_aficas(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        
        ### 2. Processing americas data
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - americas continent - {sort_type}: " + date)
                data = get_mediation_table_report_americas(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()
        ### 3. Processing asia data
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - asia continent - {sort_type}: " + date)
                data = get_mediation_table_report_asia(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()
        ### 4. Processing europe data
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - europe continent - {sort_type}: " + date)
                data = get_mediation_table_report_europe(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()
        ### 5. Processing oceania data
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - oceania continent - {sort_type}: " + date)
                data = get_mediation_table_report_oceania(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_CA_CO
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country CA-CO - {sort_type}: " + date)
                data = get_mediation_table_report_CA_CO(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_DZ_MX
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country DZ-MX - {sort_type}: " + date)
                data = get_mediation_table_report_DZ_MX(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_ID_PH
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country ID-PH - {sort_type}: " + date)
                data = get_mediation_table_report_ID_PH(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_IN_PK
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country IN-PK - {sort_type}: " + date)
                data = get_mediation_table_report_IN_PK(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_IQ_BD
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country IQ-BD - {sort_type}: " + date)
                data = get_mediation_table_report_IQ_BD(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_JP_KR
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country JP-KR - {sort_type}: " + date)
                data = get_mediation_table_report_JP_KR(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_MA_DE
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country MA-DE - {sort_type}: " + date)
                data = get_mediation_table_report_MA_DE(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_SA_ZA
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country SA-ZA - {sort_type}: " + date)
                data = get_mediation_table_report_SA_ZA(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_TR_EG
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country TR-EG - {sort_type}: " + date)
                data = get_mediation_table_report_TR_EG(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_US_BR
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country US-BR - {sort_type}: " + date)
                data = get_mediation_table_report_US_BR(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()

        ### Processing top countries - get_mediation_table_report_VN_FR
        for sort_type in sort_types:
            try:
                print("-------------------------------------------------------------------")
                print(f"Processing data table 3 - mediation_table - country VN-FR - {sort_type}: " + date)
                data = get_mediation_table_report_VN_FR(access_token, publisher_id, date, sort_type)
                len_data = len(data)
                print("================================================================>>>>>>>>>>>>>>>>>>>>>>>>>", len_data)
                if len(data) == 1:
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("------------------ CÓ LỖI ------------------")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    print("/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/`/``")
                    continue
                if len_data <= 2:
                    continue
                final_df = transform_mediation_table_data(data)
                load_data_to_admob_table(final_df, "mediation_table")
                if len_data < 100000:
                    print("Không đạt giới hạn 100k bản ghi => BREAK")
                    break
            except:
                print("❌ Error occurred:")
                traceback.print_exc()
    end_time = datetime.now()
    print("-------------------------------------------------------------------")
    print(f"Thời gian xử lý dữ liệu data table 3 ngày {date} là: {end_time - start_time}")
    print("-------------------------------------------------------------------")
