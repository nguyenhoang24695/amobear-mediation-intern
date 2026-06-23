# Prompt: Sua Meta campaign sync de lay Advantage+ Creative fields

## Vai tro

Ban la coding agent lam viec doc lap trong repo `Amobear.Mediation.Tools`. Hay uu tien tra loi/tom tat bang tieng Viet. Doc `AGENTS.md` truoc khi lam. Khong commit secrets, khong bypass branch protection/CI.

## Muc tieu

Sua luong **Meta campaign sync** de lay va luu lai field `degrees_of_freedom_spec` cua ad creative tu Meta Graph API, nham phuc vu hien thi **Advantage+ Creative** tren Request Detail/Campaign Detail.

Hien tai luc create creative he thong da gui `degrees_of_freedom_spec`, va test truc tiep Graph API theo creative id da xac nhan Meta co tra ve field nay. Tuy nhien job sync campaign dang khong lay field do, nen `meta_creatives.config_json` bi thieu thong tin Advantage+ Creative.

## Bang chung/vi du response Meta Graph API

Khi goi truc tiep creative id voi fields `id,name,degrees_of_freedom_spec,object_story_spec`, Meta tra ve du lieu dang:

```json
{
  "id": "999421219340636",
  "name": "FILE_RECOVERY_RECOVER_PHOTO_GLOBAL_MEDIA_v1 ...",
  "degrees_of_freedom_spec": {
    "creative_features_spec": {
      "advantage_plus_creative": { "enroll_status": "OPT_IN" },
      "image_touchups": { "enroll_status": "OPT_IN" },
      "music_generation": { "enroll_status": "OPT_IN" },
      "text_optimizations": { "enroll_status": "OPT_IN" },
      "image_animation": { "enroll_status": "OPT_IN" },
      "add_text_overlay": { "enroll_status": "OPT_IN" },
      "inline_comment": { "enroll_status": "OPT_IN" },
      "standard_enhancements": { "enroll_status": "OPT_IN" }
    }
  },
  "object_story_spec": {
    "page_id": "1071506532720994",
    "link_data": {
      "link": "http://play.google.com/store/apps/details?id=com.filerecovery.recoverphoto.restorefiles.pro",
      "image_hash": "03d17a75ac8fb952ceaf99c169eb63f0",
      "call_to_action": {
        "type": "LEARN_MORE",
        "value": {
          "link": "http://play.google.com/store/apps/details?id=com.filerecovery.recoverphoto.restorefiles.pro"
        }
      }
    }
  }
}
```

Meta co the tra ve rat nhieu feature ngoai cac feature UI dang support. Sync phai preserve raw data de khong mat thong tin.

## Boi canh ky thuat

- Service sync hien tai: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignSyncService.cs`.
- Field constants hien tai dang nam gan dau file:
  - `AdFields`
  - `ReducedAdFields`
- Hien tai creative fields trong sync dang co dang:

```csharp
creative{id,name,object_story_spec,object_type,effective_object_story_id,status,asset_feed_spec{...}}
```

nhung chua co `degrees_of_freedom_spec`.

- `BuildCreativeConfigJson(adItem)` serialize `CreativeItem` vao `MetaCreative.ConfigJson`.
- `CreativeItem` hien chua co property `DegreesOfFreedomSpec`, nen neu Graph API tra ve field nay cung se bi drop khi deserialize typed DTO.
- Duplicate readiness service da co field query rieng voi `degrees_of_freedom_spec`; can giu tuong thich logic do.

## Pham vi can implement

### 1. Them field vao Meta sync Graph API query

Cap nhat ca `AdFields` va `ReducedAdFields` trong `MetaCampaignSyncService.cs` de request them:

```text
degrees_of_freedom_spec
```

Vi du creative field nen co dang:

```text
creative{id,name,object_story_spec,object_type,effective_object_story_id,status,degrees_of_freedom_spec,asset_feed_spec{bodies{text},titles{text},descriptions{text}}}
```

Yeu cau:

- Them vao ca full fields va reduced fields neu reduced fields van fetch creative.
- Khong lam mat cac field existing.
- Neu Graph API bao reduce data, fallback reduced fields van nen giu `degrees_of_freedom_spec` vi field nay can cho detail UI.

### 2. Preserve raw `degrees_of_freedom_spec` trong CreativeItem

Them property vao `CreativeItem`:

```csharp
[JsonPropertyName("degrees_of_freedom_spec")]
public JsonElement? DegreesOfFreedomSpec { get; set; }
```

Hoac tao typed DTO neu repo da co type phu hop. Uu tien `JsonElement?` de preserve toan bo feature Meta tra ve, vi response co nhieu key ngoai UI support nhu:

- `standard_enhancements`
- `adapt_to_placement`
- `audio`
- `image_auto_crop`
- `video_auto_crop`
- va nhieu field khac.

Yeu cau quan trong:

- Khong chi map cac field UI support; phai preserve full raw `creative_features_spec` khi luu `ConfigJson`.
- `BuildCreativeConfigJson(adItem)` khong duoc drop field nay.
- Output `meta_creatives.config_json` sau sync phai co `degrees_of_freedom_spec` neu Graph API tra ve.

### 3. Ensure Campaign Detail/Request Detail doc UI doc duoc data

Neu prompt `32a`/`32b` da them UI doc `degreesOfFreedomSpec` camelCase tu request DTO, thi can dam bao UI campaign detail co the doc them raw snake_case tu `MetaCreative.ConfigJson`:

- `degrees_of_freedom_spec.creative_features_spec.*.enroll_status`

Neu component summary da co normalizer snake_case -> camelCase thi chi can confirm.

Neu chua co, them helper normalize o frontend/shared Meta Ads UI:

- `degrees_of_freedom_spec` -> `degreesOfFreedomSpec`
- `creative_features_spec` -> `creativeFeaturesSpec`
- `enroll_status` -> `enrollStatus`

Khong bat buoc hien tat ca raw Meta features trong UI. UI chi can hien cac feature san pham support, nhung data raw phai duoc luu de debug/mo rong sau.

### 4. Backward compatibility

- Campaign/creative cu khong co `degrees_of_freedom_spec` khong crash.
- Neu Meta khong tra field cho mot creative, sync van thanh cong va luu config nhu cu.
- Khong thay doi create/execute payload.
- Khong them logic tao `standard_enhancements` cho request moi.

## Validation/edge cases

- `degrees_of_freedom_spec` co the co nhieu feature khong nam trong DTO UI; preserve raw.
- `standard_enhancements` co the duoc Meta return `OPT_IN` ke ca request moi dung individual enhancements. Day la data sync tu Meta, khong phai minh gui tao moi.
- `object_story_spec.call_to_action.value` co the khac nhau giua create payload va sync response tuy fields/Meta normalization; khong sua trong scope nay.
- Neu full `AdFields` bi Meta bao response qua lon, reduced fields van phai chay binh thuong.

## Testing/verification

Chay it nhat:

```powershell
dotnet build backend\MediationPro.Api\MediationPro.Api.csproj --no-restore -v minimal /m:1
```

Neu co test phu hop, them/cap nhat focused test cho:

- Deserialize `CreativeItem` co `degrees_of_freedom_spec` khong bi drop.
- `BuildCreativeConfigJson` serialize lai `degrees_of_freedom_spec` vao JSON.
- Campaign detail normalizer/render doc duoc snake_case raw config neu co frontend helper.

Manual smoke:

1. Chay sync campaign cho account/campaign co creative id da test.
2. Query DB:

```sql
SELECT external_creative_id, config_json -> 'degrees_of_freedom_spec' AS degrees_of_freedom_spec
FROM meta_creatives
WHERE external_creative_id = '999421219340636';
```

3. Xac nhan JSON co `creative_features_spec.advantage_plus_creative.enroll_status = OPT_IN`.
4. Mo Campaign Detail va xac nhan Advantage+ Creative hien dung.

## Acceptance criteria

- Meta campaign sync request Graph API co lay `degrees_of_freedom_spec` cho creative.
- `meta_creatives.config_json` preserve full raw `degrees_of_freedom_spec` tu Meta.
- Campaign Detail UI co the hien Advantage+ Creative sau khi sync lai campaign.
- Sync khong crash voi creative khong co field nay.
- Khong thay doi create/edit/execute behavior ngoai viec sync/hien thi data.

## Final response mong doi tu agent implement

Tom tat ngan bang tieng Viet:

- Da them `degrees_of_freedom_spec` vao sync fields o dau.
- Da preserve raw field trong `CreativeItem`/`ConfigJson` nhu the nao.
- Da cap nhat UI normalizer/detail neu can.
- Da chay build/test gi, ket qua ra sao.
- Neu chua verify duoc bang Meta API/live sync, dua SQL/manual steps de user verify.
