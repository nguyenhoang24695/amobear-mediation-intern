-- Repair: thêm meta_app_mapping cho app 69 (iOS, application_id=811994235281627)
-- Lý do: app này bind qua PaidMediaAppBinding (StoreAppIdentityService) nên KHÔNG có trong
-- meta_app_mappings. Sync resolve app_row_id chỉ từ bảng này -> resolve fail -> trước fix
-- non-destructive thì sync xóa app_row_id của campaign. Thêm mapping để sync resolve được = 69.
-- Idempotent: chạy lại nhiều lần an toàn.
INSERT INTO meta_app_mappings (organization_id, app_row_id, meta_application_id, object_store_url, is_active, created_at, updated_at)
SELECT 'b70ad07f-03fa-4d8e-a760-55b72e202e46'::uuid, 69, '811994235281627',
       'http://itunes.apple.com/app/id6761796770', true, now(), now()
WHERE NOT EXISTS (
    SELECT 1 FROM meta_app_mappings
    WHERE organization_id = 'b70ad07f-03fa-4d8e-a760-55b72e202e46'::uuid
      AND meta_application_id = '811994235281627'
);
