# Authentication Flow Documentation

## Overview
Hệ thống authentication đã được cải thiện để:
1. Tránh gọi API liên tục khi unauthorized
2. Check authentication ở đầu mỗi page
3. Tự động redirect về login khi token hết hạn

## Components

### 1. AuthGuard Component
**Location**: `frontend/components/auth/auth-guard.tsx`

Component này:
- Check token trong localStorage
- Verify token với API `/api/v1/auth/me`
- Sử dụng `sessionStorage` flag để tránh multiple simultaneous checks
- Redirect về login nếu unauthorized
- Hiển thị loading state trong khi check

**Usage**:
```tsx
import { AuthGuard } from "@/components/auth/auth-guard"

export default function MyPage() {
  return (
    <AuthGuard>
      {/* Your page content */}
    </AuthGuard>
  )
}
```

### 2. ProtectedRoute Component
**Location**: `frontend/components/auth/protected-route.tsx`

Wrapper component sử dụng `AuthGuard` internally. Được sử dụng bởi `AuthProvider` để wrap tất cả protected routes.

### 3. API Client
**Location**: `frontend/lib/api/client.ts`

Đã được cập nhật để:
- Handle 401 responses
- Clear auth data khi 401
- Redirect về login (chỉ một lần) khi 401
- Sử dụng global flag `isRedirecting` để tránh multiple redirects

### 4. useAuthCheck Hook
**Location**: `frontend/hooks/use-auth-check.ts`

Hook để check authentication trong components:
```tsx
import { useAuthCheck } from "@/hooks/use-auth-check"

export default function MyPage() {
  const { isChecking, isValid, hasChecked } = useAuthCheck()
  
  if (isChecking) return <Loading />
  if (!isValid) return null
  
  return <YourContent />
}
```

## Flow

1. **Page Load**:
   - `AuthGuard` được mount
   - Check token trong localStorage
   - Nếu có token, gọi `/api/v1/auth/me` để verify
   - Nếu 401/403, clear auth và redirect về login
   - Nếu success, render children

2. **API Call với 401**:
   - API client detect 401 response
   - Clear auth data từ localStorage
   - Set `isRedirecting` flag
   - Redirect về login (chỉ một lần)
   - Các API calls khác sẽ không trigger redirect nữa

3. **Prevent Infinite Loops**:
   - `sessionStorage` flag để prevent multiple simultaneous auth checks
   - Global `isRedirecting` flag trong API client
   - Check `window.location.pathname` trước khi redirect

## Best Practices

1. **Wrap protected pages với AuthGuard**:
   ```tsx
   export default function DashboardPage() {
     return (
       <AuthGuard>
         <DashboardContent />
       </AuthGuard>
     )
   }
   ```

2. **Don't manually check auth trong components**:
   - AuthGuard đã handle việc này
   - Chỉ cần wrap page với AuthGuard

3. **Handle errors gracefully**:
   - Network errors không trigger redirect
   - Chỉ 401/403 mới redirect về login

## Testing

Để test authentication flow:
1. Login vào app
2. Mở DevTools → Application → Local Storage
3. Xóa `accessToken`
4. Refresh page hoặc navigate
5. Should redirect về login page
6. Không nên có infinite API calls
