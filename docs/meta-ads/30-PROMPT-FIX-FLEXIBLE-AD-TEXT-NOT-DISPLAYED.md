# Task: Fix — UI chi tiết campaign Meta không hiển thị Primary text / Headline cho ad "flexible"

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh & triệu chứng
Repo: `D:\Project\Amobear.Mediation.Tools` (.NET 8 backend + Next.js frontend).

Màn chi tiết campaign Meta (`/meta-ads/campaigns/{id}`) KHÔNG hiển thị Primary text và
Headline của các ad tạo theo định dạng **Advantage+ / flexible** (tạo qua field
`creative_asset_groups_spec`). Ô headline hiện "-", primary text trống.

Đã điều tra xong — đây là lỗi BACKEND (FE chỉ render thứ BE trả xuống, không cần sửa FE).
Text mà người dùng nhập đi vào `creative_asset_groups_spec` ở **cấp AD** (mảng
`groups[].texts[]` với `text_type = primary_text | headline`), KHÔNG nằm trong
`object_story_spec`. Nhưng pipeline sync chỉ đọc `object_story_spec`.

### Bằng chứng từ DB (Postgres, qua MCP postgres nếu cần kiểm chứng)
- `meta_campaigns.id = 1848` → `meta_campaign_id = 120244677265700765`,
  ad account row 364 = `act_1679090066790569`, integration id 1.
- Creative đã sync `meta_creatives.id = 14893` có `config_json` với
  `body=null, title=null, object_story_spec.link_data.message=null, name=null`.
- `meta_ads.id = 21595` config_json chỉ có keys: id,name,adset,status,campaign,creative,
  updated_time,effective_status — KHÔNG có `creative_asset_groups_spec`.

## 3 điểm đứt gãy (đã xác định)

### ① Graph query không request field chứa text
File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignSyncService.cs`
dòng 22-23:
```csharp
private const string AdFields = "id,name,status,effective_status,updated_time,adset{id,name},campaign{id},creative{id,name,object_story_spec,object_type,effective_object_story_id,status}";
private const string ReducedAdFields = "id,name,status,effective_status,updated_time,adset{id,name},campaign{id},creative{id,name,object_story_spec,object_type,effective_object_story_id}";
```
→ Thiếu `asset_feed_spec` (trong creative) và `creative_asset_groups_spec` (cấp ad).

### ② DTO sync không model field text + config_json bị mất data khi serialize
Cùng file, class `CreativeItem` (dòng ~1433-1464): chỉ có `body`, `title`,
`object_story_spec`. Và tại 3 chỗ upsert creative (dòng ~368-383, ~535-547, ~684-699)
config_json được tạo bằng `JsonSerializer.Serialize(adItem.Creative, MetaValueNormalizer.JsonOptions)`
— serialize DTO ĐÃ parse, nên field nào không có property trong DTO sẽ bị drop.

### ③ Mapping detail chỉ đọc từ object_story_spec
File: `backend/MediationPro.Api/Controllers/MetaCampaignsController.cs`
- `ToCreativeSummaryDto` (dòng ~999-1031), dòng 1013-1014:
```csharp
Headline = FirstNonEmpty(snapshot?.Title, linkData?.Name),
Message  = FirstNonEmpty(snapshot?.Body,  linkData?.Message),
```
- `CreativeSnapshot` (dòng ~1467-1489) cũng chỉ model body/title/object_story_spec.
- `ParseCreativeSnapshot` (dòng ~1158) deserialize config_json → CreativeSnapshot.
- Helper `FirstNonEmpty(params string?[])` ở dòng ~1125.

FE (KHÔNG sửa): `frontend/components/meta-ads/campaigns/campaign-detail-content.tsx`
dòng 530/559/652 render `item.message` / `item.headline ?? "-"` từ DTO trên.

## BƯỚC 0 — BẮT BUỘC: xác minh field nào Meta thực sự trả về
Trước khi code, chạy curl để biết text nằm ở `creative_asset_groups_spec` (cấp ad) hay
được mirror vào `creative.asset_feed_spec`. Lấy access token thật: token lưu MÃ HÓA trong
`meta_integrations.access_token_encrypted` (id=1) — KHÔNG giải mã qua SQL. Nhờ người chạy
task cung cấp token, hoặc dùng endpoint/tool backend nếu có. Graph version = `v24.0`.

Ad flexible mới người dùng vừa tạo: `120244680792760765`.
```bash
curl -G "https://graph.facebook.com/v24.0/120244680792760765" \
  --data-urlencode "fields=name,creative_asset_groups_spec{groups{texts}},creative{id,asset_feed_spec{bodies,titles,descriptions},object_story_spec{link_data{message,name}}}" \
  --data-urlencode "access_token=$ACCESS_TOKEN"
```
Ghi nhận field nào chứa text → implement parse khớp field đó. (Giả thuyết: text ở
`creative_asset_groups_spec.groups[].texts[]`; `asset_feed_spec` có thể trống.)

## Yêu cầu implement (Phương án A — tối thiểu, ưu tiên hiển thị được ngay)

Mục tiêu: với fallback order **object_story_spec → asset_feed_spec → creative_asset_groups_spec**,
detail trả về Headline/Message đúng cho ad flexible.

1. **Mở rộng Graph query** (MetaCampaignSyncService.cs dòng 22-23): thêm vào creative
   `asset_feed_spec{bodies{text},titles{text},descriptions{text}}` và thêm field cấp ad
   `creative_asset_groups_spec{groups{texts{text,text_type}}}`. Cập nhật cả `AdFields` lẫn
   `ReducedAdFields`. Lưu ý `creative_asset_groups_spec` là sibling của `creative` trong ad,
   không lồng trong creative.

2. **Model DTO sync**:
   - Thêm property `CreativeAssetGroupsSpec` (kiểu mới) vào `AdItem` (class chứa `Creative`).
   - Thêm `AssetFeedSpec` vào `CreativeItem`.
   - Tạo các sub-DTO tối thiểu cho `groups[].texts[]` (`text`, `text_type`) và
     `asset_feed_spec.bodies/titles/descriptions` (mỗi item có `text`).

3. **Persist text vào creative config_json** (để mapping detail hiện có đọc được, vì
   `ToCreativeSummaryDto` đọc từ `MetaCreative.ConfigJson`): tại các chỗ upsert creative,
   trước khi serialize, gộp text trích từ `adItem.CreativeAssetGroupsSpec` và/hoặc
   `creative.asset_feed_spec` vào object được serialize. Quy ước map:
   `text_type=primary_text` → Body/Message; `text_type=headline` → Title/Headline
   (lấy phần tử đầu tiên nếu nhiều biến thể). Giữ config_json vẫn deserialize được thành
   `CreativeSnapshot` (xem bước 4). Lưu ý kiến trúc: asset groups thuộc ad, nhưng các ad
   flexible ở flow này là 1 creative ↔ 1 ad nên gắn vào creative chấp nhận được (ghi chú
   limitation này trong code comment hoặc PR description).

4. **Mở rộng mapping detail** (MetaCampaignsController.cs):
   - Thêm vào `CreativeSnapshot` các field tương ứng (`asset_feed_spec`, và/hoặc field text
     đã fold ở bước 3) sao cho `ParseCreativeSnapshot` đọc lại được.
   - Sửa `ToCreativeSummaryDto` dòng 1013-1014: mở rộng `FirstNonEmpty(...)` theo đúng thứ tự
     fallback object_story_spec → asset_feed_spec → creative_asset_groups_spec cho cả
     `Headline` và `Message` (và `Description` nếu có).

## Verify (bắt buộc trước khi báo xong)
1. Build:
   ```powershell
   dotnet build backend/MediationPro.sln
   ```
   Nếu API đang chạy khóa DLL, build ra thư mục riêng: thêm `-p:BaseOutputPath=obj\check\`.
   (Lưu ý: `TreatWarningsAsErrors=false` toàn bộ csproj — warning nullable không làm vỡ build.)
2. Test backend liên quan:
   ```powershell
   dotnet test backend/MediationPro.sln -c Release
   ```
   Kiểm tra/cập nhật test sync nếu có (tìm file `MetaCampaignSyncServiceTests` /
   `MetaCampaignExecutionServiceTests`). Thêm 1 unit test: config_json kiểu asset-group
   (texts có primary_text + headline, object_story_spec rỗng) → `ToCreativeSummaryDto`
   trả đúng Message/Headline.
3. E2E thủ công: sync lại campaign 1848 (hoặc ad flexible), mở `/meta-ads/campaigns/1848`,
   xác nhận Primary text & Headline hiển thị (không còn "-").

## Phạm vi & ràng buộc
- KHÔNG sửa FE (`campaign-detail-content.tsx`) — data đúng là FE tự hiện.
- KHÔNG động vào flow tạo ad (`MetaCampaignExecutionService`) — chỉ sửa SYNC + DETAIL mapping.
- Tuân thủ convention C#: PascalCase public, `_camelCase` private field, `JsonPropertyName`
  snake_case khớp Graph API. Dùng `MetaValueNormalizer.JsonOptions` khi (de)serialize.
- KHÔNG commit/push trừ khi người dùng yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
Build + test pass; sau khi sync, endpoint detail (`GET /api/v1/meta-campaigns/{id}/...`
qua `ToDetailDto`) trả `Headline`/`Message` != null cho ad flexible; UI hiển thị đúng;
có unit test bao trường hợp asset-group.
