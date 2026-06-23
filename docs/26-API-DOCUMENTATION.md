# API Documentation

Tài liệu này mô tả tất cả các API endpoints có sẵn trong hệ thống Mediation Pro.

## Base URL

- **Development**: `http://localhost:5000` hoặc `https://localhost:5001`
- **Production**: (cấu hình theo môi trường)

## Authentication

Hiện tại hệ thống chưa có authentication. Tất cả endpoints đều public.

## API Endpoints

### 1. Waterfall Management APIs

#### GET `/api/WaterfallManagement/configuration/{mediationGroupId}`
Lấy cấu hình waterfall hiện tại từ AdMob.

**Parameters:**
- `mediationGroupId` (path): AdMob Mediation Group ID

**Response:**
```json
{
  "name": "accounts/pub-xxx/mediationGroups/xxx",
  "mediationGroupId": "xxx",
  "displayName": "Mediation Group Name",
  "mediationGroupLines": {
    "123": {
      "id": "123",
      "displayName": "AdMob $25",
      "adSourceId": "5450213213286189855",
      "cpmMode": "MANUAL",
      "cpmMicros": "25000000",
      "state": "ENABLED"
    }
  }
}
```

#### POST `/api/WaterfallManagement/update`
Apply waterfall changes vào AdMob.

**Request Body:**
```json
{
  "mediationGroupId": "accounts/pub-xxx/mediationGroups/xxx",
  "lines": [
    {
      "lineId": "-1",
      "displayName": "AdMob $28",
      "adSourceId": "5450213213286189855",
      "cpmMode": "MANUAL",
      "cpmMicros": 28000000,
      "state": "ENABLED"
    },
    {
      "lineId": "123",
      "cpmMicros": 30000000,
      "state": "ENABLED"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Waterfall updated successfully",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

#### POST `/api/WaterfallManagement/validate`
Validate waterfall update request trước khi apply.

**Request Body:** (giống như `/update`)

**Response:**
```json
{
  "isValid": true
}
```
hoặc
```json
{
  "isValid": false,
  "errorMessage": "AdSourceId is required for new line -1"
}
```

### 2. SoW Data APIs

#### GET `/api/SoWData`
Lấy SoW data với filter và pagination.

**Query Parameters:**
- `publisherId` (optional): Filter theo publisher ID
- `mediationGroupId` (optional): Filter theo mediation group ID
- `adSourceId` (optional): Filter theo ad source ID
- `startDate` (optional): Start date (format: YYYY-MM-DD)
- `endDate` (optional): End date (format: YYYY-MM-DD)
- `page` (default: 1): Page number
- `pageSize` (default: 50): Items per page

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "date": "2026-01-15T00:00:00Z",
      "publisherId": "pub-xxx",
      "mediationGroupId": "mg-xxx",
      "adSourceId": "5450213213286189855",
      "adSourceInstanceId": "instance-xxx",
      "sow": 0.35,
      "totalRevenueMicros": 5000000,
      "mediationGroupTotalRevenueMicros": 15000000,
      "totalImpressions": 10000,
      "avgEcpmMicros": 500000,
      "avgMatchRate": 0.85,
      "avgFillRate": 0.90
    }
  ],
  "page": 1,
  "pageSize": 50,
  "totalCount": 100,
  "totalPages": 2
}
```

#### GET `/api/SoWData/summary`
Lấy SoW summary theo mediation group.

**Query Parameters:**
- `publisherId` (optional): Filter theo publisher ID
- `date` (optional): Date (default: yesterday)

**Response:**
```json
[
  {
    "mediationGroupId": "mg-xxx",
    "publisherId": "pub-xxx",
    "totalRevenueMicros": 15000000,
    "totalImpressions": 30000,
    "avgEcpmMicros": 500000,
    "lineCount": 5,
    "topAdSources": [
      {
        "adSourceId": "5450213213286189855",
        "adSourceInstanceId": "instance-xxx",
        "sow": 0.35,
        "totalRevenueMicros": 5000000,
        "avgEcpmMicros": 500000
      }
    ]
  }
]
```

#### GET `/api/SoWData/{id}`
Lấy SoW data theo ID.

### 3. Alert APIs

#### GET `/api/Alerts/results`
Lấy alert results với filter và pagination.

**Query Parameters:**
- `ruleId` (optional): Filter theo rule ID
- `publisherId` (optional): Filter theo publisher ID
- `status` (optional): Filter theo status (PENDING, SENT, FAILED, RESOLVED, ACKNOWLEDGED)
- `severity` (optional): Filter theo severity (CRITICAL, HIGH, MEDIUM, LOW)
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `page` (default: 1)
- `pageSize` (default: 50)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "alertRuleId": 1,
      "alertType": "REVENUE_DROP",
      "severity": "HIGH",
      "message": "Revenue dropped 15.5%...",
      "publisherId": "pub-xxx",
      "value": 15.5,
      "threshold": 10.0,
      "status": "SENT",
      "triggeredAt": "2026-01-15T10:30:00Z",
      "sentAt": "2026-01-15T10:30:05Z"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "totalCount": 100,
  "totalPages": 2
}
```

#### GET `/api/Alerts/results/{id}`
Lấy alert result chi tiết bao gồm history và notification logs.

**Response:**
```json
{
  "alert": {
    "id": 1,
    "alertRuleId": 1,
    "alertType": "REVENUE_DROP",
    "severity": "HIGH",
    "message": "...",
    "status": "SENT",
    "triggeredAt": "2026-01-15T10:30:00Z"
  },
  "history": [
    {
      "id": 1,
      "alertResultId": 1,
      "action": "CREATED",
      "actionAt": "2026-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "alertResultId": 1,
      "action": "STATUS_CHANGED",
      "previousStatus": "PENDING",
      "newStatus": "SENT",
      "actionAt": "2026-01-15T10:30:05Z"
    }
  ],
  "notificationLogs": [
    {
      "id": 1,
      "alertResultId": 1,
      "channel": "TELEGRAM",
      "recipient": "revenue_alerts",
      "status": "SUCCESS",
      "sentAt": "2026-01-15T10:30:05Z"
    }
  ]
}
```

#### POST `/api/Alerts/results/{id}/acknowledge`
Acknowledge alert.

**Request Body:**
```json
{
  "acknowledgedBy": "user@example.com",
  "comment": "Acknowledged by user"
}
```

### 4. Jobs Test APIs

#### POST `/api/v1/jobs-test/admob-sync/date-range`
Chạy tay AdMob performance sync theo khoảng ngày. Hỗ trợ scope toàn bộ apps của publisher hoặc chỉ 1 app cụ thể.

**Query Parameters:**
- `startDate` (required): Start date, format `yyyy-MM-dd`
- `endDate` (required): End date, format `yyyy-MM-dd`
- `appId` (optional): AdMob App ID, ví dụ `ca-app-pub-9820030150756925~7426410906`

**Behavior:**
- Không truyền `appId`: chạy như job cũ, sync toàn bộ apps thuộc publisher được resolve từ AdMob account.
- Có truyền `appId`: chỉ request report với dimension filter `APP = appId`; dùng cho debug/backfill hẹp khi cần `AD_SOURCE_INSTANCE` cho 1 app.
- Khi chạy theo `appId`, job **không xóa raw MinIO toàn cục theo date range**, vì raw path hiện chỉ partition theo `date/table`, không partition theo app.

**Example:**
```http
POST /api/v1/jobs-test/admob-sync/date-range?startDate=2026-02-03&endDate=2026-03-03&appId=ca-app-pub-9820030150756925~7426410906
```

**Notes:**
- Endpoint chỉ khả dụng trong Development hoặc khi `JobsTest:AllowRun = true`.
- Sau khi sync xong, dữ liệu `bronze.mediation_table.ad_source_instance_id` có thể dùng để verify waterfall line metrics ở màn Mediation Group detail.

#### POST `/api/Alerts/results/{id}/resolve`
Resolve alert.

**Request Body:**
```json
{
  "resolvedBy": "user@example.com",
  "comment": "Issue resolved"
}
```

#### GET `/api/Alerts/results/statistics`
Lấy alert statistics.

**Query Parameters:**
- `startDate` (optional)
- `endDate` (optional)

**Response:**
```json
{
  "total": 150,
  "byStatus": [
    { "status": "SENT", "count": 100 },
    { "status": "PENDING", "count": 30 },
    { "status": "RESOLVED", "count": 20 }
  ],
  "bySeverity": [
    { "severity": "HIGH", "count": 50 },
    { "severity": "MEDIUM", "count": 70 },
    { "severity": "LOW", "count": 30 }
  ],
  "byType": [
    { "alertType": "REVENUE_DROP", "count": 40 },
    { "alertType": "ECPM_DROP", "count": 35 }
  ]
}
```

#### GET `/api/Alerts/rules`
Lấy tất cả alert rules.

**Query Parameters:**
- `isEnabled` (optional): Filter theo enabled/disabled

**Response:**
```json
[
  {
    "id": 1,
    "name": "REV-001",
    "description": "Daily Revenue Drop",
    "ruleType": "REVENUE_DROP",
    "severity": "HIGH",
    "thresholdValue": -10.0,
    "isEnabled": true,
    "cooldownMinutes": 240
  }
]
```

#### GET `/api/Alerts/rules/{id}`
Lấy alert rule theo ID.

#### POST `/api/Alerts/rules`
Tạo alert rule mới.

#### PUT `/api/Alerts/rules/{id}`
Update alert rule.

#### DELETE `/api/Alerts/rules/{id}`
Xóa alert rule.

#### PATCH `/api/Alerts/rules/{id}/toggle`
Toggle enabled/disabled cho alert rule.

### 4. Performance Data APIs

#### GET `/api/PerformanceData`
Lấy performance data với filter và pagination.

**Query Parameters:**
- `publisherId` (optional)
- `appId` (optional)
- `mediationGroupId` (optional)
- `adSourceId` (optional)
- `startDate` (optional)
- `endDate` (optional)
- `page` (default: 1)
- `pageSize` (default: 50)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "date": "2026-01-15T00:00:00Z",
      "publisherId": "pub-xxx",
      "mediationGroupId": "mg-xxx",
      "adSourceId": "5450213213286189855",
      "revenueMicros": 5000000,
      "impressions": 10000,
      "ecpmMicros": 500000,
      "matchRate": 0.85,
      "fillRate": 0.90
    }
  ],
  "page": 1,
  "pageSize": 50,
  "totalCount": 1000,
  "totalPages": 20
}
```

#### GET `/api/PerformanceData/summary`
Lấy performance summary.

**Query Parameters:**
- `publisherId` (optional)
- `startDate` (optional)
- `endDate` (optional, default: last 7 days)

**Response:**
```json
[
  {
    "publisherId": "pub-xxx",
    "totalRevenueMicros": 50000000,
    "totalImpressions": 100000,
    "avgEcpmMicros": 500000,
    "avgMatchRate": 0.85,
    "avgFillRate": 0.90,
    "dateRange": {
      "startDate": "2026-01-08T00:00:00Z",
      "endDate": "2026-01-15T00:00:00Z"
    }
  }
]
```

#### GET `/api/PerformanceData/{id}`
Lấy performance data theo ID.

### 5. Structure APIs

#### GET `/api/Structure/apps`
Lấy tất cả apps (có metrics từ cache dashboard).

**Query Parameters:**
- `publisherId` (optional) — lọc theo publisher AdMob
- `approval_state` (optional) — lọc trạng thái duyệt:
  - không truyền → chỉ `APPROVED` (mặc định, dùng aggregate cache nếu có)
  - `all` → không lọc `approval_state`
  - giá trị khác → danh sách phân tách bằng dấu phẩy, ví dụ `APPROVED,ACTION_REQUIRED`

**Response:**
```json
[
  {
    "id": 1,
    "name": "accounts/pub-xxx/apps/app-xxx",
    "appId": "app-xxx",
    "displayName": "My App",
    "platform": "ANDROID",
    "approvalState": "APPROVED",
    "publisherId": "pub-xxx"
  }
]
```

#### GET `/api/Structure/apps/{id}`
Lấy app theo ID.

#### GET `/api/Structure/adunits`
Lấy tất cả ad units.

**Query Parameters:**
- `publisherId` (optional)
- `appId` (optional): AdMob App ID (string)

**Response:**
```json
[
  {
    "id": 1,
    "name": "accounts/pub-xxx/adUnits/adunit-xxx",
    "adUnitId": "adunit-xxx",
    "displayName": "Banner Ad Unit",
    "adFormat": "BANNER",
    "appId": 1,
    "publisherId": "pub-xxx"
  }
]
```

#### GET `/api/Structure/adunits/{id}`
Lấy ad unit theo ID.

#### GET `/api/Structure/mediationgroups`
Lấy tất cả mediation groups.

**Query Parameters:**
- `publisherId` (optional)
- `platform` (optional): ANDROID, IOS
- `adFormat` (optional): BANNER, INTERSTITIAL, REWARDED, etc.

**Response:**
```json
[
  {
    "id": 1,
    "name": "accounts/pub-xxx/mediationGroups/mg-xxx",
    "mediationGroupId": "mg-xxx",
    "displayName": "Mediation Group Name",
    "platform": "ANDROID",
    "adFormat": "BANNER",
    "state": "ACTIVE",
    "publisherId": "pub-xxx"
  }
]
```

#### GET `/api/Structure/mediationgroups/{id}`
Lấy mediation group theo ID.

#### GET `/api/Structure/mediationgroups/admob/{mediationGroupId}`
Lấy mediation group theo AdMob ID (string).

## Error Responses

Tất cả endpoints trả về error với format:

```json
{
  "error": "Error message",
  "message": "Detailed error message (optional)"
}
```

**HTTP Status Codes:**
- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Pagination

Tất cả endpoints hỗ trợ pagination trả về format:

```json
{
  "data": [...],
  "page": 1,
  "pageSize": 50,
  "totalCount": 100,
  "totalPages": 2
}
```

## Date Formats

- **Query Parameters**: `YYYY-MM-DD` (ví dụ: `2026-01-15`)
- **Response**: ISO 8601 format (ví dụ: `2026-01-15T10:30:00Z`)

## Examples

### Update Waterfall

```bash
curl -X POST http://localhost:5000/api/WaterfallManagement/update \
  -H "Content-Type: application/json" \
  -d '{
    "mediationGroupId": "accounts/pub-xxx/mediationGroups/xxx",
    "lines": [
      {
        "lineId": "-1",
        "displayName": "AdMob $28",
        "adSourceId": "5450213213286189855",
        "cpmMode": "MANUAL",
        "cpmMicros": 28000000,
        "state": "ENABLED"
      }
    ]
  }'
```

### Get SoW Data

```bash
curl "http://localhost:5000/api/SoWData?publisherId=pub-xxx&startDate=2026-01-01&endDate=2026-01-15&page=1&pageSize=50"
```

### Get Alert Results

```bash
curl "http://localhost:5000/api/Alerts/results?status=SENT&severity=HIGH&page=1&pageSize=50"
```

### Acknowledge Alert

```bash
curl -X POST http://localhost:5000/api/Alerts/results/1/acknowledge \
  -H "Content-Type: application/json" \
  -d '{
    "acknowledgedBy": "user@example.com",
    "comment": "Acknowledged"
  }'
```
