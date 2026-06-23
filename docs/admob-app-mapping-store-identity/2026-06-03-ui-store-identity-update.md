# 2026-06-03 Update - AdMob App Mapping UI theo Store Identity

Tai lieu nay ghi lai thay doi moi cua man hinh `AdMob App Mappings` so voi tai lieu Phase 1 cu trong cung thu muc. Agent khac khi tiep tuc phan nay nen coi file nay la ghi chu cap nhat hanh vi hien tai cua UI/frontend.

## 1. Nguyen tac moi

- Man hinh khong con hieu "1 row = 1 binding" hoac "1 row = 1 `apps.id`".
- Man hinh hien tai hieu "1 row = 1 Store Identity".
- Store Identity key tren FE:
  - Android: `platform + normalizedStoreIdentifier/packageName`.
  - iOS: `platform + appStoreId/bundleId/normalizedStoreIdentifier`.
- Nhieu AdMob App ID khac account nhung cung package/store id phai nam chung mot row.
- Truong hop DB co nhieu row trong bang `apps` cung store id la du lieu lich su/hop le tam thoi; UI khong bat user resolve ngay bang cach tach row.

Vi du:

```text
com.aiart.artgenerator.photoeditor.aiimage
  - ca-app-pub-9820030150756925~4549284982
  - ca-app-pub-6659040215544459~5617982121
```

Hai binding tren phai hien thi thanh mot row, voi 2 item trong cot `AdMob Bindings`.

## 2. Mapping data model hien tai

Backend/API chua doi contract trong update nay. Source of truth van la:

- `store_app_identities`: dai dien package/store identity.
- `paid_media_app_bindings`: dai dien binding theo network/account/external app id.
- `paid_media_app_bindings.store_app_identity_id`: FK toi store identity.
- `paid_media_app_bindings.app_row_id`: FK toi `apps.id`, hien van duoc backend set de giu backward compatibility.
- `store_app_identities.app_row_id`: app canonical cua store identity, hien backend co the dong bo cung `app_row_id` khi save binding.

Luu y nghiep vu:

- Ve UI, app link nen duoc hieu theo Store Identity/package.
- Binding chi nen duoc xem la AdMob external app id theo AdMob account.
- `app_row_id` tren binding va `app_row_id` tren store identity dang co tinh chat trung lap ve nghiep vu. Chua xoa/doi schema trong slice nay de tranh breaking change.

## 3. UI list behavior

File chinh:

```text
frontend/components/admob-ads/app-mappings/app-mappings-content.tsx
```

Helper chinh:

```text
buildAdmobAppMappingGroups(mappings, apps, accountMap)
```

Quy tac group:

1. Uu tien key `store:${platform}:${normalizedStoreIdentifier}`.
2. Neu khong co store identity thi fallback `app:${appRowId}`.
3. Neu khong co ca store identity lan app row thi fallback `unmapped:${mapping.id}`.

View-model group co the chua nhieu `appRowIds` va nhieu binding. Khong duoc assume mot group chi co mot `appRowId`.

Cot `App`:

- Khong hien text `No linked app` nua.
- Neu group co nhieu app id lien quan, hien compact text dang `N linked app IDs`.

Cot `AdMob Bindings`:

- Hien moi binding gom: On/Off, account name, AdMob App ID.
- Nhieu binding trong cung group phai hien tren cung row.

## 4. Status moi

Tai lieu Phase 1 cu co noi `Active`; UI hien tai da doi thanh `Mapped`.

Status hien tai:

```text
Mapped   = group co 1 binding hop le va binding dang active
Mixed    = group co hon 1 binding, bat ke On/Off mix nhu the nao
Inactive = group co 1 binding va binding dang off
Unmapped = group khong co app link va khong co store identity
```

Filter status phai dung cung logic tren. Dac biet:

- Filter `Mixed` phai tra ve cac group co `bindings.length > 1`.
- `Mixed` khong con nghia la "vua co active vua co inactive".

Nut `Enable all` / `Disable all` khong duoc suy luan bang label status; phai tinh truc tiep tu `binding.isActive`:

```text
Enable all  khi tat ca bindings dang off
Disable all khi co it nhat mot binding dang on
```

## 5. Drawer edit/create behavior moi

Drawer khong con chon `Linked Internal App` rieng nua.

Moi binding chi cho user chon:

1. `AdMob Account`.
2. `AdMob App` thuoc account da chon.

Quan trong:

- Phai chon AdMob account truoc thi moi duoc chon app.
- App list lay tu endpoint san co:

```http
GET /api/v1/data-accounts/admob/{accountId}/apps
```

Frontend API:

```text
dataAccountsApi.getApps(accountId)
```

App picker dung pattern giong filter app o:

```text
frontend/components/mediation/mediation-groups-page-content.tsx
```

Cu the:

- Dung `Popover + Command`, khong dung `Select` text-only.
- Co search theo app name, app ID, store identity.
- Option hien icon/avatar, ten app, platform, AdMob App ID rut gon, store identity.
- `AdMob Account` va `AdMob App` phai nam tren 2 row rieng de tranh text dai bi chong UI.

Sau khi chon AdMob App, cac thong tin app/store chi hien read-only. Khong cho nhap tay cac field sau trong drawer:

```text
externalAppId
externalAppName
platform
packageName
bundleId
appStoreId
```

## 6. Payload save hien tai

Khi user chon AdMob App, FE map app vao hidden form/payload:

```text
externalAppId   = selectedApp.appId
externalAppName = selectedApp.displayName || selectedApp.name
appRowId        = selectedApp.id
platform        = selectedApp.platform
```

Store identity field:

```text
Android: packageName = selectedApp.appStoreId
iOS:     appStoreId  = selectedApp.appStoreId
```

Save van goi endpoints cu:

```http
POST /api/v1/admob-accounts/store-app-mappings
PUT  /api/v1/admob-accounts/store-app-mappings/{id}
```

Backend hien tai se tiep tuc update/upsert ca `store_app_identity_id`, `store_app_identities.app_row_id`, va `paid_media_app_bindings.app_row_id` theo flow hien co.

## 7. Validate truoc khi save

Tat ca binding visible trong cung drawer phai cung Store Identity.

Rule:

```text
Android: platform = ANDROID va lowercase(trim(packageName/appStoreId)) giong nhau
iOS:     platform = IOS va trim(appStoreId/bundleId) giong nhau
```

Neu co binding khac OS/store id, chan save voi message:

```text
All AdMob bindings in one mapping must belong to the same store identity.
```

Moi binding visible cung phai co:

```text
admobAccountId
appRowId
externalAppId
```

## 8. Tests can duy tri

File test:

```text
frontend/components/admob-ads/app-mappings/app-mappings-content.test.tsx
```

Nhung case quan trong:

- 2 mappings khac `appRowId` nhung cung `normalizedStoreIdentifier` phai thanh 1 group.
- Group nhieu binding co status `mixed` va filter `Mixed` phai ra group do.
- Single active binding co status `mapped`.
- Binding chua co store/app identity van la row `unmapped` rieng.
- Chon Android app tao payload co `packageName = appStoreId`.
- Chon iOS app tao payload co `appStoreId`.
- Validate pass khi 2 apps khac account nhung cung platform + store id.
- Validate fail khi 2 apps khac store id/OS.
- Render table khong chua text `No linked app`.

Lenh validate targeted:

```powershell
cd frontend
.\node_modules\.bin\vitest.cmd run components/admob-ads/app-mappings/app-mappings-content.test.tsx
```

## 9. Viec khong doi trong update nay

- Khong doi DB schema.
- Khong doi API contract.
- Khong merge/xoa duplicate rows trong bang `apps`.
- Khong xoa `paid_media_app_bindings.app_row_id` du no trung lap nghiep vu voi app link cua store identity.
- Khong thay doi permission/package migration.

Neu can lam sach model sau nay, nen thiet ke slice rieng de quy dinh ro field canonical giua `store_app_identities.app_row_id` va `paid_media_app_bindings.app_row_id`.
