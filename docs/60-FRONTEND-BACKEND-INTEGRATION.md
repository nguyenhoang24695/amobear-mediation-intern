# Frontend-Backend Integration Guide

Hướng dẫn tích hợp Frontend (Next.js) với Backend API (.NET Core 10.0).

## Cấu trúc API Client

### 1. API Client Layer

API client được tổ chức trong `frontend/lib/api/`:

- **`client.ts`**: Base API client với methods GET, POST, PUT, DELETE
- **`services.ts`**: Service classes cho từng domain (Structure, Performance, Dashboard)

### 2. TypeScript Types

Types được định nghĩa trong `frontend/types/api.ts`:

- `App`: App entity
- `MediationGroup`: Mediation Group entity
- `PerformanceData`: Performance data entity
- `PerformanceSummary`: Performance summary
- `PagedResponse<T>`: Paginated response
- `DashboardMetrics`: Dashboard metrics
- `TopApp`: Top app với revenue

### 3. React Hooks

Custom hook `useApi` trong `frontend/hooks/use-api.ts`:

```typescript
const { data, loading, error, refetch } = useApi(
  () => structureApi.getApps(),
  { enabled: true }
)
```

## Setup

### 1. Install Dependencies

```powershell
.\scripts\60-setup-frontend.ps1
```

Hoặc manual:

```bash
cd frontend
pnpm install
```

### 2. Configure Environment Variables

File `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Development:**
- `http://localhost:5000` (HTTP)
- `https://localhost:5001` (HTTPS)

**Production:**
- Cấu hình theo môi trường production

### 3. Start Backend API

```powershell
.\scripts\51-start-backend.ps1
```

Backend sẽ chạy trên:
- `http://localhost:5000`
- `https://localhost:5001`
- Swagger: `https://localhost:5001/swagger`

### 4. Start Frontend

```bash
cd frontend
pnpm dev
```

Frontend sẽ chạy trên:
- `http://localhost:3000`

## API Endpoints

### Structure APIs

#### Get Apps
```typescript
import { structureApi } from '@/lib/api/services'

const apps = await structureApi.getApps()
// hoặc với filter
const apps = await structureApi.getApps('pub-xxx')
```

**Endpoint:** `GET /api/Structure/apps?publisherId={publisherId}`

#### Get App by ID
```typescript
const app = await structureApi.getApp(1)
```

**Endpoint:** `GET /api/Structure/apps/{id}`

#### Get Mediation Groups
```typescript
const groups = await structureApi.getMediationGroups()
// hoặc với filters
const groups = await structureApi.getMediationGroups('pub-xxx', 'ANDROID', 'BANNER')
```

**Endpoint:** `GET /api/Structure/mediationgroups?publisherId={publisherId}&platform={platform}&adFormat={adFormat}`

### Performance APIs

#### Get Performance Data
```typescript
import { performanceApi } from '@/lib/api/services'

const data = await performanceApi.getPerformanceData({
  appId: 'app-xxx',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  page: 1,
  pageSize: 50,
})
```

**Endpoint:** `GET /api/PerformanceData?appId={appId}&startDate={startDate}&endDate={endDate}&page={page}&pageSize={pageSize}`

#### Get Performance Summary
```typescript
const summary = await performanceApi.getPerformanceSummary({
  publisherId: 'pub-xxx',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
})
```

**Endpoint:** `GET /api/PerformanceData/summary?publisherId={publisherId}&startDate={startDate}&endDate={endDate}`

### Dashboard APIs

#### Get Dashboard Metrics
```typescript
import { dashboardApi } from '@/lib/api/services'

const metrics = await dashboardApi.getMetrics()
// Returns: { revenueToday, averageEcpm, impressions, fillRate }
```

#### Get Top Apps
```typescript
const topApps = await dashboardApi.getTopApps(5)
```

## Sử dụng trong Components

### Example 1: Dashboard Metrics

```typescript
'use client'

import { useApi } from '@/hooks/use-api'
import { dashboardApi } from '@/lib/api/services'
import { Card, CardContent } from '@/components/ui/card'

export function MetricsRow() {
  const { data: metrics, loading, error } = useApi(
    () => dashboardApi.getMetrics()
  )

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!metrics) return null

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardContent>
          <p>Revenue Today</p>
          <p className="text-2xl font-bold">
            ${metrics.revenueToday.value.toFixed(2)}
          </p>
          <p className={metrics.revenueToday.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
            {metrics.revenueToday.change > 0 ? '+' : ''}
            {metrics.revenueToday.change.toFixed(1)}%
          </p>
        </CardContent>
      </Card>
      {/* ... other metrics */}
    </div>
  )
}
```

### Example 2: Apps List

```typescript
'use client'

import { useApi } from '@/hooks/use-api'
import { structureApi } from '@/lib/api/services'
import type { App } from '@/types/api'

export function AppsList() {
  const { data: apps, loading, error, refetch } = useApi(
    () => structureApi.getApps()
  )

  if (loading) return <div>Loading apps...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!apps || apps.length === 0) return <div>No apps found</div>

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      <ul>
        {apps.map((app) => (
          <li key={app.id}>
            {app.displayName || app.appId}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Example 3: Performance Data Table

```typescript
'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/use-api'
import { performanceApi } from '@/lib/api/services'
import type { PerformanceData } from '@/types/api'

export function PerformanceTable() {
  const [page, setPage] = useState(1)
  const { data, loading, error } = useApi(
    () => performanceApi.getPerformanceData({
      page,
      pageSize: 50,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    }),
    { enabled: true }
  )

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return null

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>App</th>
            <th>Revenue</th>
            <th>Impressions</th>
            <th>eCPM</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((item) => (
            <tr key={item.id}>
              <td>{new Date(item.date).toLocaleDateString()}</td>
              <td>{item.appId}</td>
              <td>${((item.revenueMicros || 0) / 1_000_000).toFixed(2)}</td>
              <td>{(item.impressions || 0).toLocaleString()}</td>
              <td>${((item.ecpmMicros || 0) / 1_000_000).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        Page {data.page} of {data.totalPages}
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>
          Previous
        </button>
        <button onClick={() => setPage(page + 1)} disabled={page >= data.totalPages}>
          Next
        </button>
      </div>
    </div>
  )
}
```

## Error Handling

API client tự động throw errors. Sử dụng try-catch hoặc error state từ `useApi`:

```typescript
const { data, error } = useApi(() => structureApi.getApps())

if (error) {
  // Handle error
  console.error('Failed to load apps:', error.message)
  // Show error message to user
}
```

## CORS Configuration

Backend cần cấu hình CORS để cho phép frontend gọi API:

**Backend/MediationPro.Api/Program.cs:**

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

app.UseCors("AllowFrontend");
```

## Testing API Connection

### 1. Test từ Browser Console

```javascript
fetch('http://localhost:5000/api/Structure/apps')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err))
```

### 2. Test từ Frontend Component

```typescript
'use client'

import { useEffect } from 'react'
import { structureApi } from '@/lib/api/services'

export function TestConnection() {
  useEffect(() => {
    structureApi.getApps()
      .then(apps => console.log('Apps:', apps))
      .catch(err => console.error('Error:', err))
  }, [])

  return <div>Check console for API response</div>
}
```

## Next Steps

1. **Update Components**: Thay thế mock data bằng real API calls
2. **Add Loading States**: Hiển thị loading indicators
3. **Add Error Handling**: Xử lý errors gracefully
4. **Add Caching**: Implement caching cho performance
5. **Add Pagination**: Implement pagination cho large datasets
6. **Add Filters**: Implement filtering và search
7. **Add Real-time Updates**: Implement polling hoặc WebSocket cho real-time data

## Troubleshooting

### CORS Error

**Error:** `Access to fetch at 'http://localhost:5000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution:** Cấu hình CORS trong backend (xem phần CORS Configuration)

### Connection Refused

**Error:** `Failed to fetch` hoặc `Network error`

**Solution:**
1. Kiểm tra backend đang chạy: `http://localhost:5000`
2. Kiểm tra `NEXT_PUBLIC_API_URL` trong `.env.local`
3. Kiểm tra firewall settings

### 404 Not Found

**Error:** `404 Not Found` khi gọi API

**Solution:**
1. Kiểm tra API endpoint path
2. Kiểm tra backend routes
3. Kiểm tra Swagger: `https://localhost:5001/swagger`

### Type Errors

**Error:** TypeScript type errors

**Solution:**
1. Kiểm tra types trong `frontend/types/api.ts`
2. Đảm bảo types match với backend entities
3. Run `pnpm build` để check types
