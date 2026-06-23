# 137 — Fix: Meta Campaign App Mapping — Fallback sang `paid_media_app_bindings`

## Tóm tắt vấn đề

Hệ thống hiện có **hai hệ thống mapping song song**:

| Hệ thống cũ (legacy) | Hệ thống mới (binding) |
|---|---|
| Bảng `meta_app_mappings` | Bảng `paid_media_app_bindings` + `store_app_identities` |
| Được dùng để resolve `app_row_id` cho campaign/adset/ad | Được tạo khi user resolve candidate qua `MetaAppMappingDiscoveryService` |

**Bug:** Khi một app chỉ tồn tại trong hệ thống mới (`paid_media_app_bindings`) mà **không** có record trong bảng cũ (`meta_app_mappings`), hàm `RefreshResolvedCampaignMappingsAsync` sẽ không thể resolve `app_row_id` → campaign và adset vẫn bị `app_row_id = null` → UI báo "không map được internal app".

### Ví dụ thực tế đã xác minh (qua SQL)

- **Campaign id=2153** (`Dramahot_Lucia_Global_12apr_Daughter-7 - Bản sao 1`)
- **Adset `meta_adset_id=120248331328130492`** có `promoted_object.application_id = 1860339881586327`, `object_store_url = http://play.google.com/store/apps/details?id=com.hotdrama.shortreels.movieapp`
- **`meta_app_mapping_candidates` id=205**: `review_status=resolved`, `resolution_type=update_mapping`, `resolved_app_row_id=388`
- **`paid_media_app_bindings` id=2951**: `external_app_id=1860339881586327` → `store_app_identities.app_row_id=388` (Dramahot: Reels & Drama)
- **`meta_app_mappings`**: **KHÔNG có record** cho `meta_application_id=1860339881586327`
- **Kết quả:** `adset.app_row_id = null`, `campaign.app_row_id = null`

---

## Phạm vi thay đổi cần implement

### File chính cần sửa

**`backend/MediationPro.Infrastructure/Services/MetaAds/MetaAppMappingDiscoveryService.cs`**

Hàm cần thay đổi: **`RefreshResolvedCampaignMappingsAsync`** (line ~1004)  
Hàm phụ trợ cần thêm: **`BuildBindingMappingIndexAsync`** (mới)  
Hàm cần cập nhật: **`BuildCampaignMappingIndex`** và **`ResolveCampaignAppRowId`**

---

## Yêu cầu kỹ thuật chi tiết

### 1. Cập nhật `RefreshResolvedCampaignMappingsAsync`

Hiện tại hàm chỉ load `meta_app_mappings`:

```csharp
var mappings = await _appMappingRepository.GetByOrganizationAsync(organizationId, cancellationToken);
var mappingIndex = BuildCampaignMappingIndex(mappings);
```

Cần **bổ sung thêm** một index thứ hai từ `paid_media_app_bindings`:

```csharp
var mappings = await _appMappingRepository.GetByOrganizationAsync(organizationId, cancellationToken);
var mappingIndex = BuildCampaignMappingIndex(mappings);

// Fallback: load bindings từ hệ thống mới
var bindingIndex = await BuildBindingMappingIndexAsync(organizationId, cancellationToken);
```

Và truyền `bindingIndex` vào các hàm resolve:

```csharp
var resolvedAppRowId = ResolveCampaignAppRowId(ParsePromotedObject(adSet.ConfigJson), mappingIndex, bindingIndex);
```

### 2. Thêm method `BuildBindingMappingIndexAsync`

Method này query `paid_media_app_bindings` join `store_app_identities`, build index theo:
- `external_app_id` (meta application id) → `app_row_id`

```csharp
private async Task<Dictionary<string, int>> BuildBindingMappingIndexAsync(
    Guid organizationId,
    CancellationToken cancellationToken)
{
    // Query: paid_media_app_bindings (network='meta', is_active=true)
    //   JOIN store_app_identities ON store_app_identity_id
    //   WHERE organization_id = organizationId
    //     AND store_app_identities.app_row_id IS NOT NULL
    // Build Dictionary<string, int>: external_app_id → app_row_id
    // Key: external_app_id (trim, case-sensitive)
    // Value: app_row_id
    // Nếu có nhiều binding trỏ cùng external_app_id nhưng khác app_row_id → bỏ qua (ambiguous)
}
```

**Query EF Core tham khảo:**

```csharp
var bindings = await _dbContext.PaidMediaAppBindings
    .AsNoTracking()
    .Where(b => b.OrganizationId == organizationId
             && b.Network == StoreAppIdentityService.NetworkMeta
             && b.IsActive
             && b.StoreAppIdentity != null
             && b.StoreAppIdentity.AppRowId != null)
    .Select(b => new { b.ExternalAppId, AppRowId = b.StoreAppIdentity!.AppRowId!.Value })
    .ToListAsync(cancellationToken);

return bindings
    .GroupBy(b => b.ExternalAppId.Trim(), StringComparer.Ordinal)
    .Where(g => g.Select(x => x.AppRowId).Distinct().Count() == 1) // chỉ lấy khi unambiguous
    .ToDictionary(g => g.Key, g => g.First().AppRowId, StringComparer.Ordinal);
```

### 3. Cập nhật `ResolveCampaignAppRowId`

Thêm tham số `bindingIndex` và dùng làm fallback:

```csharp
private static int? ResolveCampaignAppRowId(
    MetaPromotedObject? promotedObject,
    CampaignMappingIndex mappingIndex,
    IReadOnlyDictionary<string, int> bindingIndex) // THÊM tham số này
{
    var metaApplicationId = promotedObject?.ApplicationId?.Trim();
    if (string.IsNullOrWhiteSpace(metaApplicationId))
        return null;

    // --- Logic hiện tại (giữ nguyên, ưu tiên hệ thống cũ) ---
    var normalizedStore = MetaAppMappingDiscoveryNormalizer.NormalizeStore(promotedObject?.ObjectStoreUrl);
    if (!string.IsNullOrWhiteSpace(normalizedStore.NormalizedStoreIdentifier))
    {
        var exactKey = BuildCampaignExactMappingKey(metaApplicationId, normalizedStore.NormalizedStoreIdentifier);
        if (mappingIndex.ByExactKey.TryGetValue(exactKey, out var exactMatches))
        {
            var exactAppRowIds = exactMatches.Select(mapping => mapping.AppRowId).Distinct().ToList();
            if (exactAppRowIds.Count == 1)
                return exactAppRowIds[0];
        }
    }

    if (mappingIndex.ByMetaApplicationId.TryGetValue(metaApplicationId, out var appMatches))
    {
        var appRowIds = appMatches.Select(mapping => mapping.AppRowId).Distinct().ToList();
        if (appRowIds.Count == 1)
            return appRowIds[0];
    }

    // --- THÊM: Fallback sang paid_media_app_bindings ---
    if (bindingIndex.TryGetValue(metaApplicationId, out var bindingAppRowId))
        return bindingAppRowId;

    return null;
}
```

### 4. Navigation property cần thiết

Kiểm tra xem `_dbContext.PaidMediaAppBindings` đã có navigation property `.StoreAppIdentity` chưa trong `ApplicationDbContext.cs`. Nếu chưa, cần Include/ThenInclude hoặc dùng explicit join.

> **Gợi ý:** Tham khảo hàm `UpsertSyntheticBindingAsync` trong cùng file, nơi đã dùng `_dbContext.PaidMediaAppBindings.Include(b => b.StoreAppIdentity)`.

---

## Các file liên quan cần tham khảo (KHÔNG sửa trừ khi cần thiết)

| File | Vai trò |
|---|---|
| [`MetaAppMappingDiscoveryService.cs`](../backend/MediationPro.Infrastructure/Services/MetaAds/MetaAppMappingDiscoveryService.cs) | **File chính cần sửa** — lines 1004–1090 và 1350–1408 |
| [`MetaAppMappingDiscoveryNormalizer.cs`](../backend/MediationPro.Infrastructure/Services/MetaAds/MetaAppMappingDiscoveryNormalizer.cs) | Normalizer dùng chung — `NormalizeStore`, constants |
| [`IMetaAppMappingRepository.cs`](../backend/MediationPro.Core/Interfaces/IMetaAppMappingRepository.cs) | Interface của repo cũ — KHÔNG sửa |
| [`PaidMediaAppBinding.cs`](../backend/MediationPro.Core/Entities/PaidMediaAppBinding.cs) | Entity hệ thống mới |
| [`StoreAppIdentity.cs`](../backend/MediationPro.Core/Entities/StoreAppIdentity.cs) | Entity identity — có `AppRowId` |
| [`StoreAppIdentityService.cs`](../backend/MediationPro.Infrastructure/Services/StoreAppIdentityService.cs) | Có constant `NetworkMeta = "meta"` |
| [`ApplicationDbContext.cs`](../backend/MediationPro.Infrastructure/Data/ApplicationDbContext.cs) | DbContext — kiểm tra DbSet và navigation |

---

## Behavior kỳ vọng sau fix

1. Khi `RefreshResolvedCampaignMappingsAsync` chạy:
   - Load `meta_app_mappings` (primary) → `CampaignMappingIndex`
   - Load `paid_media_app_bindings` active có `app_row_id != null` → `bindingIndex` (fallback)
2. Khi resolve adset `application_id=1860339881586327`:
   - Không tìm thấy trong `CampaignMappingIndex` → fallback sang `bindingIndex`
   - Tìm thấy `app_row_id=388` → set `adset.app_row_id = 388`
3. Campaign lấy `app_row_id` từ adset → `campaign.app_row_id = 388`
4. UI hiển thị đúng: campaign 2153 mapped với "Dramahot: Reels & Drama"

---

## Ràng buộc và lưu ý

- **Ưu tiên hệ thống cũ:** Nếu `meta_app_mappings` đã có record → KHÔNG dùng binding fallback (tránh overwrite).
- **Chỉ fallback khi unambiguous:** Nếu binding index có >1 `app_row_id` cho cùng `external_app_id` → bỏ qua (return `null`).
- **Không thay đổi signature công khai:** Method `RefreshResolvedCampaignMappingsAsync` là `private` → ok thay đổi internal.
- **Không migration DB:** Không cần thêm bảng hay column mới.
- **Performance:** `BuildBindingMappingIndexAsync` chỉ chạy 1 lần per `RefreshResolvedCampaignMappingsAsync` call — chấp nhận được.
- **Logging:** Thêm log tương tự các log hiện có:  
  `"Meta app mapping binding fallback index built. bindings_loaded={BindingsLoaded}, unambiguous_keys={UnambiguousKeys}, duration_ms={DurationMs}"`

---

## Verification

Sau khi implement, verify bằng cách:

1. **Unit test:** Thêm test case vào file test hiện có cho `MetaAppMappingDiscoveryService`:
   - Scenario: adset có `application_id` chỉ tồn tại trong `paid_media_app_bindings` (không có trong `meta_app_mappings`) → `app_row_id` được resolve đúng.
   - Scenario: `meta_app_mappings` có record → binding fallback không được dùng.

2. **SQL verify (sau khi chạy job):**

```sql
-- Kiểm tra adset và campaign đã được resolve
SELECT mc.id, mc.name, mc.app_row_id, a.display_name as campaign_app
FROM meta_campaigns mc
LEFT JOIN apps a ON a.id = mc.app_row_id
WHERE mc.id = 2153;

SELECT mas.id, mas.name, mas.app_row_id, a.display_name as adset_app
FROM meta_adsets mas
LEFT JOIN apps a ON a.id = mas.app_row_id
WHERE mas.meta_campaign_row_id = 2153;
```

Kỳ vọng: cả hai đều có `app_row_id = 388`, `display_name = 'Dramahot: Reels & Drama'`.

---

## Liên quan

- Bug phát hiện ngày 2026-06-18 qua SQL investigation với campaign id=2153.
- `meta_app_mapping_candidates` id=205: `resolution_type=update_mapping` — đây là resolution type gây ra bug (binding được update nhưng `meta_app_mappings` không được tạo mới).
- Xem thêm doc tổng thể về Meta mapping: tham khảo các file trong `docs/` liên quan đến Meta Ads.
