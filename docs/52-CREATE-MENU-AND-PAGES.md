# Create Menu and Pages - Tạo Menu và Pages

## Tổng quan

Đã tạo menu và các pages cơ bản cho Mediation Pro Portal với các mục:
- **Dashboard** - Trang thống kê tổng quan các apps
- **Apps** - Trang quản lý và xem chi tiết từng App
- **Mediation Groups** - Trang quản lý Mediation Groups theo từng App
- **Reports** - Trang báo cáo chi tiết từ AdMob API

## Files đã tạo/cập nhật

### 1. Menu Configuration

**File:** `frontend/src/MediationProPortal.Blazor/Menus/MediationProPortalMenus.cs`

Đã thêm các menu constants:
- `Dashboard`
- `Apps`
- `MediationGroups`
- `Reports`

**File:** `frontend/src/MediationProPortal.Blazor/Menus/MediationProPortalMenuContributor.cs`

Đã thêm các menu items vào main menu với:
- Icons (FontAwesome)
- Routes
- Order

### 2. Localization

**File:** `frontend/src/MediationProPortal.Domain.Shared/Localization/MediationProPortal/en.json`

Đã thêm localization strings:
- `Menu:Dashboard`
- `Menu:Apps`
- `Menu:MediationGroups`
- `Menu:Reports`

### 3. Pages

**File:** `frontend/src/MediationProPortal.Blazor/Components/Pages/Dashboard.razor`
- Route: `/dashboard`
- Hiển thị tổng quan các apps từ AdMob

**File:** `frontend/src/MediationProPortal.Blazor/Components/Pages/Apps.razor`
- Routes: `/apps`, `/apps/{AppId}`
- Hiển thị danh sách apps và chi tiết từng app

**File:** `frontend/src/MediationProPortal.Blazor/Components/Pages/MediationGroups.razor`
- Routes: `/mediation-groups`, `/mediation-groups/{AppId}`
- Hiển thị mediation groups theo từng app

**File:** `frontend/src/MediationProPortal.Blazor/Components/Pages/Reports.razor`
- Route: `/reports`
- Hiển thị các báo cáo chi tiết

## Backend APIs có sẵn

### AdMob API Controller
- `GET /api/AdMobApi/accounts` - List accounts
- `GET /api/AdMobApi/accounts/{accountName}/apps` - List apps
- `GET /api/AdMobApi/accounts/{accountName}/mediationGroups` - List mediation groups
- `POST /api/AdMobApi/accounts/{accountName}/mediationReport/generate` - Generate report

### Structure Controller
- `GET /api/Structure/apps` - Get all apps from database
- `GET /api/Structure/apps/{id}` - Get app by ID
- `GET /api/Structure/mediationGroups` - Get all mediation groups
- `GET /api/Structure/mediationGroups/{id}` - Get mediation group by ID

### Performance Data Controller
- `GET /api/PerformanceData` - Get performance data with filters

### SoW Data Controller
- `GET /api/SoWData` - Get Share of Wallet data

## Next Steps - Implementation

### 1. Dashboard Page

Cần implement:
- [ ] Call API: `GET /api/Structure/apps` để lấy danh sách apps
- [ ] Hiển thị statistics cards (Total Apps, Total Revenue, etc.)
- [ ] Hiển thị apps list với basic info
- [ ] Add charts/graphs cho visualization

**API Example:**
```csharp
// In Dashboard.razor.cs or service
var response = await HttpClient.GetFromJsonAsync<List<App>>("https://localhost:5001/api/Structure/apps");
```

### 2. Apps Page

Cần implement:
- [ ] Call API: `GET /api/Structure/apps` để lấy danh sách
- [ ] Hiển thị apps trong table/cards
- [ ] Click vào app để xem chi tiết: `GET /api/Structure/apps/{id}`
- [ ] Hiển thị app details (name, platform, ad units, etc.)

**Routes:**
- `/apps` - List view
- `/apps/{id}` - Detail view

### 3. Mediation Groups Page

Cần implement:
- [ ] Call API: `GET /api/Structure/mediationGroups` hoặc filter by app
- [ ] Hiển thị mediation groups list
- [ ] Filter by App ID
- [ ] Click để xem chi tiết mediation group

**Routes:**
- `/mediation-groups` - List view
- `/mediation-groups/{appId}` - Filtered by app

### 4. Reports Page

Cần implement:
- [ ] Call API: `GET /api/PerformanceData` với filters
- [ ] Call API: `GET /api/SoWData` với filters
- [ ] Generate mediation report: `POST /api/AdMobApi/accounts/{accountName}/mediationReport/generate`
- [ ] Hiển thị reports với charts (Chart.js, Blazorise Charts, etc.)
- [ ] Date range picker
- [ ] Export to CSV/Excel

## Backend API Base URL

Cần cấu hình backend API URL trong `appsettings.json`:

```json
{
  "BackendApi": {
    "BaseUrl": "https://localhost:5001"
  }
}
```

Sau đó inject vào service hoặc component:

```csharp
@inject IConfiguration Configuration

var baseUrl = Configuration["BackendApi:BaseUrl"];
var apiUrl = $"{baseUrl}/api/Structure/apps";
```

## UI Components

Có thể sử dụng:
- **Blazorise** - Đã được cài đặt (Bootstrap 5 components)
- **Chart.js** - Cho charts/graphs
- **DataTables** - Cho tables (đã có trong libs)

## Testing

1. Start Backend: `.\scripts\51-start-backend.ps1`
2. Start Frontend: `.\scripts\52-start-frontend.ps1`
3. Login với admin credentials
4. Kiểm tra menu items xuất hiện
5. Click vào từng menu item để verify routing

## Notes

- Tất cả pages hiện tại là placeholder, cần implement logic và UI
- Cần tạo services để call backend APIs
- Cần handle authentication/authorization khi call APIs
- Cần error handling và loading states
