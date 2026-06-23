# Frontend Quick Start Guide

Hướng dẫn nhanh để bắt đầu tích hợp Frontend với Backend API.

## Bước 1: Setup Frontend

```powershell
# Chạy setup script tự động
.\scripts\60-setup-frontend.ps1
```

Script này sẽ:
- ✅ Kiểm tra và cài đặt pnpm (nếu chưa có)
- ✅ Install dependencies (`pnpm install`)
- ✅ Tạo `.env.local` với API URL mặc định

## Bước 2: Start Backend API

```powershell
# Start backend API
.\scripts\51-start-backend.ps1
```

Backend sẽ chạy trên:
- `http://localhost:5000` (HTTP)
- `https://localhost:5001` (HTTPS)
- Swagger: `https://localhost:5001/swagger`

## Bước 3: Start Frontend

```bash
cd frontend
pnpm dev
```

Frontend sẽ chạy trên:
- `http://localhost:3000`

## Bước 4: Test API Connection

Mở browser console tại `http://localhost:3000` và chạy:

```javascript
fetch('http://localhost:5000/api/Structure/apps')
  .then(res => res.json())
  .then(data => console.log('Apps:', data))
  .catch(err => console.error('Error:', err))
```

Nếu thấy danh sách apps, API connection đã hoạt động! ✅

## Cấu trúc Files

```
frontend/
├── lib/
│   └── api/
│       ├── client.ts          # Base API client
│       └── services.ts        # API services (Structure, Performance, Dashboard)
├── types/
│   └── api.ts                 # TypeScript types
├── hooks/
│   └── use-api.ts             # React hook cho API calls
└── .env.local                  # Environment variables
```

## Sử dụng trong Components

### Example: Load Apps List

```typescript
'use client'

import { useApi } from '@/hooks/use-api'
import { structureApi } from '@/lib/api/services'

export function AppsList() {
  const { data: apps, loading, error } = useApi(
    () => structureApi.getApps()
  )

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!apps) return null

  return (
    <ul>
      {apps.map((app) => (
        <li key={app.id}>{app.displayName || app.appId}</li>
      ))}
    </ul>
  )
}
```

### Example: Load Dashboard Metrics

```typescript
'use client'

import { useApi } from '@/hooks/use-api'
import { dashboardApi } from '@/lib/api/services'

export function DashboardMetrics() {
  const { data: metrics, loading, error } = useApi(
    () => dashboardApi.getMetrics()
  )

  if (loading) return <div>Loading metrics...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!metrics) return null

  return (
    <div>
      <p>Revenue Today: ${metrics.revenueToday.value.toFixed(2)}</p>
      <p>Average eCPM: ${metrics.averageEcpm.value.toFixed(2)}</p>
      <p>Impressions: {metrics.impressions.value.toLocaleString()}</p>
      <p>Fill Rate: {metrics.fillRate.value.toFixed(1)}%</p>
    </div>
  )
}
```

## API Services Available

### Structure API
```typescript
import { structureApi } from '@/lib/api/services'

// Get all apps
const apps = await structureApi.getApps()
const apps = await structureApi.getApps('pub-xxx') // with filter

// Get app by ID
const app = await structureApi.getApp(1)

// Get mediation groups
const groups = await structureApi.getMediationGroups()
```

### Performance API
```typescript
import { performanceApi } from '@/lib/api/services'

// Get performance data
const data = await performanceApi.getPerformanceData({
  appId: 'app-xxx',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  page: 1,
  pageSize: 50,
})

// Get performance summary
const summary = await performanceApi.getPerformanceSummary({
  publisherId: 'pub-xxx',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
})
```

### Dashboard API
```typescript
import { dashboardApi } from '@/lib/api/services'

// Get dashboard metrics
const metrics = await dashboardApi.getMetrics()

// Get top apps
const topApps = await dashboardApi.getTopApps(5)
```

## Troubleshooting

### CORS Error

**Error:** `Access to fetch at 'http://localhost:5000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution:** Backend đã cấu hình CORS `AllowAll`, nếu vẫn lỗi, kiểm tra:
1. Backend đang chạy: `http://localhost:5000`
2. Restart backend nếu cần

### Connection Refused

**Error:** `Failed to fetch` hoặc `Network error`

**Solution:**
1. Kiểm tra backend đang chạy: `http://localhost:5000`
2. Kiểm tra `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:5000`
3. Restart frontend: `pnpm dev`

### 404 Not Found

**Error:** `404 Not Found` khi gọi API

**Solution:**
1. Kiểm tra API endpoint path
2. Kiểm tra Swagger: `https://localhost:5001/swagger`
3. Đảm bảo backend đã chạy migrations

## Next Steps

1. **Update Components**: Thay thế mock data bằng real API calls
   - `components/dashboard/metrics-row.tsx`
   - `components/dashboard/top-apps.tsx`
   - `components/apps/apps-page-content.tsx`

2. **Add Error Handling**: Xử lý errors gracefully

3. **Add Loading States**: Hiển thị loading indicators

4. **Add Caching**: Implement caching cho performance

Xem chi tiết tại: `docs/60-FRONTEND-BACKEND-INTEGRATION.md`
