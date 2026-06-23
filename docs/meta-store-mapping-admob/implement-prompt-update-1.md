# Prompt - Update dot 1 cho man Meta Store Mappings

> Prompt nay danh cho agent thuc thi sau khi man `/meta-ads/app-mappings` da duoc lam lai thanh bang group theo store identity, hien thi trang thai mapped/unmapped voi AdMob. Chi dong vao frontend, khong doi backend/DTO/job.

File duy nhat can sua:

- `frontend/components/meta-ads/app-mappings/app-mappings-content.tsx`

Pattern tham chieu:

- `frontend/components/admob-ads/app-mappings/app-mappings-content.tsx`

## Context hien co

Moi dong bang la mot `MetaAppMappingGroup` group theo store identity. Trong file da co cac du lieu sau:

- `group.app`, `group.appLabel`, `group.platform`, `group.storeIdentifier`, `group.status` (`"mapped" | "unmapped"`), `group.admobAccountCount`.
- `group.primaryMapping` / `mapping`: Meta store binding chinh cua group.
- `group.admobBindings: MetaAppMappingAdmobBindingDto[]`, da dedupe va sort. Moi binding co `bindingId`, `admobAccountId`, `admobAccountName`, `appRowId`, `appId`, `appDisplayName`, `externalAppId`, `isActive`.
- `appByRowId`: `Map<app.id, App>`; `App` co `iconUri`, `appId`, `platform`, `appStoreId`, `displayName`, `name`.

## Change 1 - Link AdMob App ID sang store public, khong link ten app

### Cot App

Ten app trong cot **App** khong duoc la link. Render ten app bang text thuong:

- Dung `<p>` truncate.
- Khong dung `<Link>` o ten app.
- Khong them hover style cho ten app.

Dong AdMob App ID ben duoi ten app phai la link. Tuy nhien dich den uu tien la public store, khong phai trang noi bo:

1. Neu co store URL tu Meta mapping, dung URL do:
   - `mapping.objectStoreUrl`
   - `mapping.storeUrlOverride`
2. Neu khong co URL truc tiep, tu build bang `group.platform + group.storeIdentifier`:
   - Android: `https://play.google.com/store/apps/details?id={package}`
   - iOS: `https://apps.apple.com/app/id{appStoreId}`
3. Neu khong build duoc store URL, fallback ve internal route `/apps/{appId}`.

Text hien thi cua link phai khop dich den:

- Neu link ra Play Store/App Store, hien thi chinh store URL, khong hien thi AdMob App ID.
- Neu fallback ve internal route `/apps/{appId}`, moi hien thi AdMob App ID.

External store link phai mo tab moi:

```tsx
<a href={storeUrl} target="_blank" rel="noreferrer">...</a>
```

Internal fallback van dung Next `Link`:

```tsx
<Link href={`/apps/${encodeURIComponent(appId)}`}>...</Link>
```

`appId` hien thi ben duoi ten app = `group.app?.appId ?? mapping.appId`.

### Cot AdMob Mapping

Cot **AdMob Mapping** giu hanh vi cu. Khong doi `binding.externalAppId` thanh store URL o cot nay.

Moi `binding.externalAppId`:

- Text hien thi van la `binding.externalAppId` (AdMob App ID).
- Link den internal app detail: `/apps/{binding.appId ?? binding.externalAppId}`.
- Dung Next `Link`, khong dung external `<a>` cho cot nay.

Class link giu compact, vi du:

- Main App ID: `block max-w-[240px] truncate font-mono text-[11px] text-slate-400 hover:text-blue-600 hover:underline`
- Binding App ID: `truncate font-mono text-blue-700 hover:underline`

## Change 2 - Anh app cho dong mapped

Cot **App** phai co avatar/icon ben trai khoi ten app.

Nguon anh uu tien:

```ts
const firstAdmobBinding = group.admobBindings[0]
const mappedIconUri = firstAdmobBinding?.appRowId ? appByRowId.get(firstAdmobBinding.appRowId)?.iconUri : undefined
const appIconUri = mappedIconUri ?? group.app?.iconUri ?? undefined
```

Render:

- Neu co `appIconUri`, dung `<img className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover" />`.
- Neu khong co icon, fallback thanh o vuong chu cai dau cua `group.appLabel`.
- Layout cot App: `[avatar] [ten app text thuong + AdMob App ID link]`, boc trong `flex min-w-0 items-center gap-3`.

## Change 3 - Bo cot Enabled tren bang chinh

Chi bo cot Enabled/Switch trong bang chinh, khong bo toggle Enabled trong drawer Add/Edit.

Can lam:

- Xoa `<TableHead>Enabled</TableHead>`.
- Xoa `<TableCell>` chua `<Switch checked={mapping.isActive} ... />` trong row table.
- Doi `colSpan` cac row loading/error/empty tu `9` thanh `8`.
- Giu lai dropdown item Disable/Enable va cac bien/handler lien quan:
  - `handleToggleActive`
  - `canDisableEnable`
  - `rowActionLoadingId`
  - `Power`
  - `Switch` import, vi drawer van dung Switch.

## Helper goi y

Co the them helper frontend thuan UI:

```ts
function isHttpUrl(value?: string | null) {
  return /^https?:\/\//i.test(value?.trim() ?? "")
}

function buildStoreUrl(platform?: string | null, storeIdentifier?: string | null) {
  const id = storeIdentifier?.trim()
  if (!id) return null

  switch (normalizePlatform(platform)) {
    case "ANDROID":
      return `https://play.google.com/store/apps/details?id=${encodeURIComponent(id)}`
    case "IOS": {
      const appStoreId = id.replace(/\D/g, "")
      return appStoreId ? `https://apps.apple.com/app/id${appStoreId}` : null
    }
    default:
      return null
  }
}
```

## Rang buoc

- Khong doi backend, DTO, API client, type.
- Khong migration.
- Khong dong vao discovery job/service/candidate backend.
- Khong dong vao nghiep vu AdMob mapping.
- File component la tracked file, chi sua bang patch, khong xoa file.

## Verification

Chay trong `frontend`:

```powershell
pnpm test
npx.cmd tsc --noEmit --incremental false --pretty false
```

Luu y: neu repo khong co script `pnpm typecheck`, dung lenh `npx.cmd tsc ...` thay the va bao ro neu typecheck fail boi loi cu ngoai module Meta.

Manual check `/meta-ads/app-mappings`:

- Cot App co icon/avatar.
- Ten app khong con la link.
- Dong AdMob App ID ben duoi ten app click ra Play Store/App Store neu co store identity; neu khong co thi fallback ve `/apps/{appId}`.
- Cot AdMob Mapping: moi AdMob App ID van hien thi AdMob App ID va click ve internal app detail `/apps/{binding.appId ?? binding.externalAppId}`.
- Khong con cot Enabled/Switch tren bang chinh.
- Drawer Add/Edit van con toggle Enabled va van luu binh thuong.
