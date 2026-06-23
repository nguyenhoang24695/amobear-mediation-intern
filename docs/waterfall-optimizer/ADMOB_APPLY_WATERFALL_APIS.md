# AdMob APIs để Apply Waterfall Recommendations (tham chiếu Dolphin 2.0)

Tài liệu này tham chiếu code mẫu trong `docs/Dolphin 2.0` và liệt kê các API AdMob dùng để **áp dụng** danh sách recommendation lên AdMob Waterfall: **xóa** item REMOVE, **thêm mới** item suggested, **cập nhật** floor (INCREASE/KEEP đổi floor).

---

## 1. API chính: PATCH Mediation Group (thêm / sửa / xóa dòng waterfall)

**Endpoint:**  
`PATCH https://admob.googleapis.com/v1alpha/{accountName}/mediationGroups/{mediationGroupId}?updateMask={mask}`

**Request body:**  
```json
{
  "mediationGroupLines": {
    "<identifier1>": { "state": "REMOVED" },
    "<identifier2>": { "displayName": "...", "adSourceId": "...", "cpmMode": "MANUAL", "state": "ENABLED", "cpmMicros": "...", "adUnitMappings": { ... } },
    ...
  }
}
```

- **accountName**: dạng `accounts/pub-xxxxx`
- **mediationGroupId**: ID mediation group (ví dụ từ `mediation_group_id` trong DB)
- **updateMask**: danh sách trường cần cập nhật, cách nhau bằng dấu phẩy. Ví dụ:
  - Xóa 1 dòng: `mediationGroupLines["<id>"].state`
  - Thêm 1 dòng mới: `mediationGroupLines["-1"]` (identifier tạm cho line mới)
  - Sửa 1 dòng (thay floor): Dolphin 2.0 dùng chiến lược “đánh REMOVED line cũ + thêm line mới” với mask: `mediationGroupLines["<id>"].state,mediationGroupLines["-50"]`

**Tham chiếu code Dolphin 2.0:**
- `AdMobAPI.ts`: `patchMediationGroup(accountName, mediationGroupId, mask, mediationGroupLines)`
- `Builder.ts`: `patchMediationGroup` – build `identifierSetupPairs` và `combinedMaskList` từ `newCalls`, `editCalls`, `deleteCalls`

---

## 2. Xóa item (REMOVE / DELETE)

Item recommendation có **Action = "REMOVE"** → cần đánh dấu dòng tương ứng trên AdMob là xóa (không còn trong waterfall).

**Cách làm:**
- Gửi **PATCH** mediation group với:
  - **updateMask**: `mediationGroupLines["<lineId>"].state`
  - **mediationGroupLines**: `{ "<lineId>": { "state": "REMOVED" } }`

**lineId** ở đây là **identifier** của dòng trong `mediation_group_lines` hiện tại (từ `mediationGroupLinesJson` / API AdMob), thường là key trong object `mediationGroupLines` (ví dụ `"-1"`, `"-2"`, hoặc id từ AdMob).

**Tham chiếu Dolphin 2.0:**
- `Helper.buildPatchArrays` → `deleteCalls` → `deleteMappingsToPatch = deleteCalls.map(d => ({ identifier: d.originalLine.id }))`
- `Builder.patchMediationGroup` → `deleteCallsToBePatched`: mask `mediationGroupLines["${identifier}"].state`, setup `{ [identifier]: { state: "REMOVED" } }`

---

## 3. Thêm mới item (suggested / ADD LAYER / ADD HIGHER)

Item **mới** (chưa có trên AdMob, ví dụ `lineId.startsWith("suggested_")`) cần:
1. **Tạo ad unit** trên network (nếu là AdMob Network: dùng batch create waterfall ad units).
2. **Tạo ad unit mapping** (map ad unit đó vào ad unit chính).
3. **Patch mediation group** thêm 1 dòng mới với identifier tạm (ví dụ `"-1"`, `"-2"`).

### 3.1. AdMob Network – Tạo waterfall ad unit (nếu dùng AdMob Network)

**Endpoint:**  
`POST https://admob.googleapis.com/v1alpha/{accountName}/adMobNetworkWaterfallAdUnits:batchCreate`

**Request body:**  
```json
{
  "requests": [
    {
      "adMobNetworkWaterfallAdUnit": {
        "appId": "ca-app-pub-xxxxx/yyyyy",
        "displayName": "Suggested: $1.20 (ADD LAYER)",
        "format": "INTERSTITIAL",
        "adTypes": ["RICH_MEDIA", "VIDEO"],
        "cpmFloorSettings": {
          "globalFloorMicros": "1200000"
        }
      }
    }
  ]
}
```

**Tham chiếu:** `AdMobAPI.batchCreateAdMobNetworkWaterfallAdUnits(accountName, appIds, format, calls, networkOptions)`.

### 3.2. Map ad unit vào ad unit chính

**Endpoint:**  
`POST https://admob.googleapis.com/v1alpha/{accountName}/adUnitMappings:batchCreate`

**Request body:**  
```json
{
  "requests": [
    {
      "parent": "accounts/pub-xxxxx/adUnits/12345",
      "adUnitMapping": {
        "adapterId": "...",
        "displayName": "AdMob $1.20",
        "adUnitConfigurations": { "<adapterConfigMetadataId>": "<placement_or_id>" }
      }
    }
  ]
}
```

**Tham chiếu:** `AdMobAPI.batchCreateAdUnitMappings`, `Builder.mapUnits`.

### 3.3. Thêm dòng mới vào mediation group

Sau khi đã có ad unit và mapping, PATCH mediation group với **một identifier mới** (ví dụ `"-1"`):

- **updateMask**: `mediationGroupLines["-1"]`
- **mediationGroupLines**:  
  `{ "-1": { "displayName": "...", "adSourceId": "admob", "cpmMode": "MANUAL", "state": "ENABLED", "cpmMicros": "1200000", "adUnitMappings": { "ca-app-pub-xxx/unitId": "accounts/pub-xxx/adUnits/..." } } }`

**Tham chiếu:** `Builder.patchMediationGroup` → `newCallsToBePatched`, mask `mediationGroupLines["-1"]`, v.v.

---

## 4. Cập nhật floor (INCREASE 10% / 20%, hoặc chỉnh tay)

Dolphin 2.0 **không** dùng API “update tại chỗ” một field `cpmMicros` của line. Luồng chuẩn:
1. Đánh dấu **line cũ** là `state: "REMOVED"`.
2. Thêm **line mới** (identifier khác, ví dụ `-50`) với floor mới và cùng `adSourceId` / mapping tương ứng.

**API:** Cùng PATCH mediation group với:
- mask gồm: `mediationGroupLines["<id_cũ>"].state` và `mediationGroupLines["-50"]`
- body:  
  - `mediationGroupLines["<id_cũ>"] = { state: "REMOVED" }`  
  - `mediationGroupLines["-50"] = { displayName, adSourceId, cpmMode: "MANUAL", state: "ENABLED", cpmMicros: "<micros_mới>", adUnitMappings }`

**Tham chiếu:** `Builder.patchMediationGroup` → `editCallsToBePatched`.

Nếu backend của bạn chỉ cần **cập nhật floor** cho AdMob Network (không đổi ad unit khác), có thể dùng:

**Endpoint:**  
`POST https://admob.googleapis.com/v1alpha/{accountName}/adMobNetworkWaterfallAdUnits:batchUpdate`

**Request body:**  
```json
{
  "requests": [
    {
      "adMobNetworkWaterfallAdUnit": {
        "name": "accounts/pub-xxx/adMobNetworkWaterfallAdUnits/yyy",
        "displayName": "Inter 1.20",
        "cpmFloorSettings": {
          "globalFloorMicros": 1200000
        }
      }
    }
  ],
  "updateMask": "displayName,cpmFloorSettings"
}
```

**Tham chiếu:** `AdMobAPI.batchUpdateAdMobNetworkWaterfallAdUnits(accountName, calls)` – mỗi `call` có `cpm`, `displayName`, `batchUpdateNames` (resource names của ad unit cần update).

---

## 5. Luồng Apply tổng thể (gợi ý cho backend MediationPro)

1. **Chuẩn bị input** từ recommendation response:
   - **REMOVE**: danh sách `{ lineId }` (identifier trong mediation group hiện tại).
   - **Thêm mới**: danh sách `{ adSourceId, displayName, floorMicros }` (và appId/format nếu tạo ad unit).
   - **Sửa floor**: danh sách `{ lineId, newFloorMicros, displayName }` (hoặc resourceName nếu dùng batchUpdate AdMob Network).

2. **Xóa:**
   - Gọi **PATCH** mediation group với từng (hoặc gộp mask) `mediationGroupLines["<lineId>"].state` và `mediationGroupLines["<lineId>"] = { state: "REMOVED" }`.

3. **Thêm mới:**
   - Nếu AdMob Network: gọi **batchCreate** adMobNetworkWaterfallAdUnits → **batchCreate** adUnitMappings → **PATCH** mediation group thêm line với identifier tạm và `adUnitMappings` đã có.
   - Network khác: tạo unit qua provider tương ứng (Dolphin: `Builder.createUnits` → `mapUnits` → patch).

4. **Cập nhật floor:**
   - Cách 1 (giống Dolphin): REMOVED line cũ + thêm line mới với floor mới (cùng adSourceId/mapping).
   - Cách 2 (chỉ AdMob Network): lấy `name` (resource name) của ad unit từ line hiện tại, gọi **batchUpdate** adMobNetworkWaterfallAdUnits với `cpmFloorSettings.globalFloorMicros` mới.

5. **Thứ tự khuyến nghị:** Xử lý **delete** trước (hoặc gộp trong cùng một PATCH), rồi **create/map**, cuối cùng **update** hoặc **patch line mới** để tránh rác và đúng thứ tự waterfall.

---

## 6. Tóm tắt endpoint

| Hành động | Endpoint | Ghi chú |
|-----------|----------|--------|
| **Xóa dòng** | `PATCH .../mediationGroups/{mediationGroupId}?updateMask=mediationGroupLines["<id>"].state` | Body: `{ mediationGroupLines: { "<id>": { state: "REMOVED" } } }` |
| **Thêm dòng** | `PATCH .../mediationGroups/{mediationGroupId}?updateMask=mediationGroupLines["-1"]` | Body: `{ mediationGroupLines: { "-1": { displayName, adSourceId, cpmMode, state, cpmMicros, adUnitMappings } } }`; trước đó cần tạo ad unit + mapping nếu mới |
| **Cập nhật floor (AdMob Network)** | `POST .../adMobNetworkWaterfallAdUnits:batchUpdate` | Body: requests với `name`, `displayName`, `cpmFloorSettings.globalFloorMicros` |
| **Tạo ad unit (AdMob Network)** | `POST .../adMobNetworkWaterfallAdUnits:batchCreate` | Body: requests với `appId`, `displayName`, `format`, `cpmFloorSettings` |
| **Tạo mapping** | `POST .../adUnitMappings:batchCreate` | Body: requests với `parent`, `adUnitMapping` |

**Lưu ý:** Cần OAuth2 token với scope `https://www.googleapis.com/auth/admob.monetization` (và có thể `admob.readonly`) khi gọi các API trên. Dolphin 2.0 dùng `AdMobAPI.setTokenProvider(getAccessToken)` và gửi `Authorization: Bearer <token>`.
