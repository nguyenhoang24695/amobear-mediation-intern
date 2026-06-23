# Prompt - Lam cho function `create` cua s-meta-requests tu du de tao Meta campaign request

> Prompt cho agent thuc thi doc lap. Chi dong vao 2 backend controller (+ test). Khong doi frontend, DTO, migration. Khong cham TikTok.

## Muc tieu nghiep vu

Khi user da co function **`create`** tren screen `s-meta-requests` (+ duoc gan app va Meta ad account lien quan), user phai tao/submit duoc Meta campaign request ma KHONG bi chan boi cac quyen "an" khac.

Hien tai user bi chan boi 2 nhom gate ngoai y muon:

1. **App-level `Edit`**: luong tao/sua/submit dang yeu cau quyen `Edit` tren app, trong khi chi can `View`.
2. **Function `view` cua s-meta-requests**: toan bo endpoint reference (de render form) va vai endpoint read (edit draft, preview asset) dang check `view`. User chi co `create` -> form khong load duoc / 403.

Quyet dinh (da chot voi product owner):
- Ha nguong app tu **`Edit` -> `View`** cho luong tao/sua/submit.
- Cac endpoint read/reference cua luong tao request chap nhan **`view` HOAC `create`** (co `create` la dung duoc tron luong, khong can cap them `view`).
- **Giu nguyen** scoping Meta ad account (user chi thao tac duoc tren ad account duoc gan). KHONG noi rong.

Thang quyen app tang dan: `View < Marketing < Edit < Developer < Manage < Owner`.

## Pham vi file

- `backend/MediationPro.Api/Controllers/MetaCampaignRequestsController.cs`
- `backend/MediationPro.Api/Controllers/MetaReferenceController.cs`
- Test tuong ung trong `backend/MediationPro.Api.Tests` (neu co harness).

TikTok (`TikTokCampaignRequestsController`) KHONG gate theo app-permission -> bo qua.

---

## Phan 1 - Ha app `Edit` -> `View` (MetaCampaignRequestsController)

Cac diem dang yeu cau app `Edit`:

1. `CreateDraft` (~dong 117-119): `HasAppEditPermissionAsync(...)` -> doi sang `HasAppViewPermissionAsync(...)`.
2. `UpdateDraft` (~dong 184-186): `HasAppEditPermissionAsync(...)` -> doi sang `HasAppViewPermissionAsync(...)`.
3. Helper `HasRequestEditAccessAsync` (~dong 593-599): doi than ham dung `HasAppViewPermissionAsync` thay `HasAppEditPermissionAsync`. Helper nay duoc dung boi `UpdateDraft` (~175), `Validate` (~264), `Submit` (~286).

Sau doi, `HasRequestEditAccessAsync` trung logic `HasRequestViewAccessAsync`. Chon 1:
- **(Khuyen nghi) Gop**: xoa `HasRequestEditAccessAsync`, cho 3 caller goi thang `HasRequestViewAccessAsync`.
- Hoac giu ten rieng nhung doi than dung View + them comment.

Sau buoc nay, `HasAppEditPermissionAsync` (~dong 568-572) khong con caller -> **xoa** (search toan repo de chac chan khong con tham chieu).

Giu nguyen: cac check `binding == null` / `binding.IsActive` (BadRequest), va `HasMetaAdAccountAccessAsync` (van bat buoc).

---

## Phan 2 - Read/reference chap nhan `view` HOAC `create`

### 2a. MetaReferenceController

Hien controller chi co const `FnView = "view"` (~dong 22). Them const:
```csharp
private const string FnCreate = "create";
```
Them helper:
```csharp
private async Task<bool> HasMetaRequestReadAccessAsync(Guid userId)
    => await _permissionService.HasScreenFunctionAsync(userId, ScreenMetaRequests, FnView)
    || await _permissionService.HasScreenFunctionAsync(userId, ScreenMetaRequests, FnCreate);
```

Thay TAT CA cho dang:
```csharp
if (!await _permissionService.HasScreenFunctionAsync(userId.Value, ScreenMetaRequests, FnView))
    return Forbid();
```
thanh:
```csharp
if (!await HasMetaRequestReadAccessAsync(userId.Value))
    return Forbid();
```

Cac vi tri can doi (toan bo FnView trong file nay): ~dong 78, 110, 139, 173, 218, 265, 314, 354, 376, 398, 419, 440, 461, 490, 519, 551. (Bao gom ca create/update/delete country-group va create custom performance-goal event - deu thuoc be mat reference cua luong tao request.)

GIU NGUYEN cac check tai nguyen di kem trong cac endpoint nay:
- `HasMetaAdAccountAccessAsync(...)` (vd ~113, 498, 521): giu.
- `HasAppPermissionAsync(..., PermissionLevel.View)` (vd ~496): giu (da la View).

### 2b. MetaCampaignRequestsController - cac endpoint read ma man create dung

Man create con goi cac read endpoint sau (edit draft + preview asset), dang check `view`:
- `GetRequestById` (~dong 88-99, check FnView ~92): edit mode load draft.
- `GetAsset` (~dong 437-442, check FnView ~441): preview asset.
- `GetAssetContent` (~dong 452-457, check FnView ~456): tai noi dung asset.

Them helper tuong tu trong controller nay (da co san const `FnView` ~24 va `FnCreate` ~25):
```csharp
private async Task<bool> HasMetaRequestReadAccessAsync(Guid userId)
    => await _permissionService.HasScreenFunctionAsync(userId, ScreenMetaRequests, FnView)
    || await _permissionService.HasScreenFunctionAsync(userId, ScreenMetaRequests, FnCreate);
```
Va doi rieng 3 endpoint tren tu `HasScreenFunctionAsync(userId, ScreenMetaRequests, FnView)` sang `HasMetaRequestReadAccessAsync(userId)`. Cac check resource sau do (`HasRequestViewAccessAsync`) GIU nguyen.

KHONG doi `GetRequests` (~dong 69-73, list screen) - day la man danh sach rieng, giu `view`.

---

## Phan 3 - Gate `Edit` thu hai trong validation service (BAT BUOC)

Day la gate gay loi `{"isValid": false, "errors": ["User does not have edit permission for the linked app."]}` khi submit. Controller da ha xuong View nhung validation service van check Edit.

File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignValidationService.cs`

Trong `ValidateAsync` (~dong 148-155) - duoc goi boi `CreateDraft`, `Validate`, va `Submit` (qua `ValidateDraftAsync` -> `ValidateAsync`):

Hien tai:
```csharp
var hasPermission = await _permissionService.HasAppPermissionAsync(userId, linkedApp.AppId, PermissionLevel.Edit);
if (!hasPermission)
    errors.Add("User does not have edit permission for the linked app.");
```
Doi thanh `View` + sua thong bao loi cho khop:
```csharp
var hasPermission = await _permissionService.HasAppPermissionAsync(userId, linkedApp.AppId, PermissionLevel.View);
if (!hasPermission)
    errors.Add("User does not have access to the linked app.");
```

KHONG dong vao cac `PermissionLevel.Edit` trong `MetaAppMappingDiscoveryService.cs` (~dong 964, 2015) - do la luong auto-create mapping cua discovery job, khac nghiep vu, giu nguyen.

---

## Tong ket trang thai sau khi sua

User co function **`create`** tren `s-meta-requests` + duoc gan **app (>= View)** + duoc gan **Meta ad account** se:
- Load duoc form (reference chap nhan view-or-create).
- Tao/sua/validate/submit/upload asset duoc (app chi can View).
- Van bi chan dung muc neu thieu app View hoac thieu quyen ad account (scoping giu nguyen).

## Rang buoc

- KHONG noi rong quyen ad account.
- KHONG doi approve/reject/execute/retry (da dung View + function key rieng).
- KHONG doi frontend, DTO, migration.
- Giu cac check `binding == null` / `IsActive`.

## Verification

1. Build:
   ```powershell
   dotnet build backend/MediationPro.Api/MediationPro.Api.csproj
   ```
   (Neu khoa DLL: them `-p:BaseOutputPath=obj\check\`.)

2. Test (neu co harness mock `IPermissionService` cho controller): them cho `MetaCampaignRequestsController` va `MetaReferenceController`:
   - User co **chi `create`** (khong `view`) + app View + ad account: `GetCreateCampaignReference` tra **200**, `CreateDraft` **201**, `Submit` **200**, `GetRequestById`/`GetAsset` **200**.
   - User co app **`View`** (khong `Edit`): `CreateDraft`/`Submit` khong con 403.
   - User KHONG co ca `view` lan `create` tren `s-meta-requests`: reference + read tra **403**.
   - User thieu quyen ad account: cac endpoint co check account van **403**.
   - User khong co quyen app: van **403**.
   Neu chua co harness, ghi ro va chuyen verify thu cong.

3. Verify thu cong tren dev (tai hien case that):
   - User `hoangnv@amobear.vn` (role `custom_e8aa0ff3`): app `ca-app-pub-9820030150756925~3109987870` muc `View`, co quyen meta ad account 364.
   - Truoc fix: submit voi `paidMediaAppBindingId=268`, `metaAdAccountId=364` -> 403.
   - Sau fix: form load + tao + submit thanh cong.
   - Thu nghiem bo bot function `view` cua role (chi de `create`) -> form van load duoc (nho view-or-create).

## Ghi chu

- `EffectivePermissions` co cache (`permissions:effective:user:{id}`); doi quyen DB co the can doi TTL hoac re-login khi verify thu cong. Thay doi code nay khong lien quan cache.
- Co the thay 2 helper `HasMetaRequestReadAccessAsync` (o 2 controller) bang 1 method dung chung tren `IPermissionService` (vd `HasAnyScreenFunctionAsync(userId, screenKey, params string[] functionKeys)`) neu muon gon - tuy chon, khong bat buoc.
