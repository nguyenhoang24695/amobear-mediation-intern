# User & Auth Module Implementation Guide

## Tổng quan

Đây là hướng dẫn triển khai User & Auth module dựa trên design document `docs/mediation-pro-backend-user-auth-design.md`.

## Đã hoàn thành

### ✅ 1. Domain Layer
- **Entities**: `Organization`, `User`, `Team`, `TeamMember`, `AppPermission`, `RefreshToken`, `UserInvitation`
- **Enums**: `UserRole`, `UserStatus`, `PermissionLevel`, `GranteeType`, `TeamRole`
- **DTOs**: 
  - Auth: `LoginRequestDto`, `AuthResponseDto`, `RefreshTokenRequestDto`, `ForgotPasswordRequestDto`, `ResetPasswordRequestDto`, `ChangePasswordRequestDto`
  - Users: `CreateUserRequestDto`, `UpdateUserRequestDto`, `UserFilterRequestDto`, `PagedResultDto`
  - Invitations: `InviteUserRequestDto`, `AcceptInvitationRequestDto`

### ✅ 2. Database Configuration
- Đã cập nhật `ApplicationDbContext` với các DbSet mới
- Đã cấu hình entity mappings cho tất cả tables

## Cần triển khai tiếp

### 1. Database Migration

Tạo migration cho các tables mới:

```bash
cd backend/MediationPro.Infrastructure
dotnet ef migrations add AddUserAuthTables --startup-project ../MediationPro.Api
dotnet ef database update --startup-project ../MediationPro.Api
```

### 2. Repositories

Tạo các repository interfaces và implementations:

**Interfaces cần tạo:**
- `IUserRepository`
- `IOrganizationRepository`
- `ITeamRepository`
- `IAppPermissionRepository`
- `IRefreshTokenRepository`
- `IUserInvitationRepository`

**Location**: `backend/MediationPro.Core/Interfaces/` và `backend/MediationPro.Infrastructure/Repositories/`

### 3. Services

#### 3.1 Password Hasher
Tạo service để hash và verify passwords (sử dụng BCrypt hoặc ASP.NET Identity PasswordHasher).

**Location**: `backend/MediationPro.Infrastructure/Services/PasswordHasher.cs`

#### 3.2 JWT Token Generator
Tạo service để generate và validate JWT tokens.

**Location**: `backend/MediationPro.Infrastructure/Services/JwtTokenService.cs`

**Cần cấu hình trong `appsettings.json`:**
```json
{
  "Jwt": {
    "Secret": "your-secret-key-min-256-bits",
    "Issuer": "MediationPro",
    "Audience": "MediationPro",
    "AccessTokenExpiryMinutes": 60,
    "RefreshTokenExpiryDays": 30
  }
}
```

#### 3.3 Auth Service
Implement `IAuthService` với các methods:
- `LoginAsync`
- `RefreshTokenAsync`
- `LogoutAsync`
- `LogoutAllDevicesAsync`
- `ValidateTokenAsync`
- `RequestPasswordResetAsync`
- `ResetPasswordAsync`
- `ChangePasswordAsync`

**Location**: `backend/MediationPro.Infrastructure/Services/AuthService.cs`

#### 3.4 User Service
Implement `IUserService` với các methods:
- `GetByIdAsync`
- `GetUsersAsync`
- `CreateUserAsync`
- `UpdateUserAsync`
- `DeactivateUserAsync`
- `ReactivateUserAsync`

**Location**: `backend/MediationPro.Infrastructure/Services/UserService.cs`

#### 3.5 Permission Service
Implement `IPermissionService` với các methods:
- `GetEffectivePermissionsAsync`
- `HasAppPermissionAsync`
- `CanAccessResourceAsync`
- `GrantAppPermissionAsync`
- `RevokeAppPermissionAsync`

**Location**: `backend/MediationPro.Infrastructure/Services/PermissionService.cs`

### 4. Controllers

#### 4.1 AuthController
```csharp
[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request) { ... }
    
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request) { ... }
    
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout() { ... }
    
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request) { ... }
    
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request) { ... }
    
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request) { ... }
    
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser() { ... }
}
```

**Location**: `backend/MediationPro.Api/Controllers/AuthController.cs`

#### 4.2 UsersController
**Location**: `backend/MediationPro.Api/Controllers/UsersController.cs`

#### 4.3 TeamsController
**Location**: `backend/MediationPro.Api/Controllers/TeamsController.cs`

#### 4.4 PermissionsController
**Location**: `backend/MediationPro.Api/Controllers/PermissionsController.cs`

### 5. Middleware & Attributes

#### 5.1 JWT Authentication Middleware
**Location**: `backend/MediationPro.Api/Middleware/JwtAuthenticationMiddleware.cs`

#### 5.2 Authorization Attributes
- `RequireRoleAttribute`
- `RequireAppPermissionAttribute`

**Location**: `backend/MediationPro.Api/Attributes/`

### 6. Program.cs Configuration

Cần thêm vào `Program.cs`:

```csharp
// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => { ... });

// Add Authorization
builder.Services.AddAuthorization();

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
// ... other services

// Register Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
// ... other repositories
```

### 7. Frontend Integration

#### 7.1 Update API Client
Thêm auth services vào `frontend/lib/api/services.ts`:

```typescript
export const authApi = {
  login: async (email: string, password: string, organizationSlug?: string) => { ... },
  refreshToken: async (refreshToken: string) => { ... },
  logout: async () => { ... },
  getCurrentUser: async () => { ... },
  forgotPassword: async (email: string) => { ... },
  resetPassword: async (token: string, newPassword: string) => { ... },
  changePassword: async (currentPassword: string, newPassword: string) => { ... },
}
```

#### 7.2 Update Components
- `frontend/app/login/page.tsx` - Integrate với `authApi.login`
- `frontend/app/forgot-password/page.tsx` - Integrate với `authApi.forgotPassword`
- `frontend/app/reset-password/page.tsx` - Integrate với `authApi.resetPassword`
- `frontend/app/profile/page.tsx` - Integrate với `authApi.getCurrentUser` và `authApi.changePassword`

#### 7.3 Add Auth Context
Tạo React context để manage authentication state:

**Location**: `frontend/contexts/AuthContext.tsx`

## Thứ tự triển khai đề xuất

1. ✅ **Domain Layer** (Entities, Enums, DTOs) - Đã hoàn thành
2. ✅ **Database Configuration** (DbContext) - Đã hoàn thành
3. **Database Migration** - Tạo và chạy migration
4. **Repositories** - Tạo tất cả repositories
5. **Password Hasher & JWT Service** - Core services
6. **Auth Service** - Implement authentication logic
7. **Auth Controller** - Tạo API endpoints
8. **Test Login Flow** - Test login API
9. **Permission Service** - Implement permission logic
10. **User Service** - Implement user management
11. **Other Controllers** - Users, Teams, Permissions
12. **Frontend Integration** - Update frontend components
13. **Authorization Middleware** - Add JWT middleware và attributes

## Testing

### Test Login Flow
1. Tạo organization và user đầu tiên (có thể seed data)
2. Test login API: `POST /api/v1/auth/login`
3. Test refresh token: `POST /api/v1/auth/refresh`
4. Test get current user: `GET /api/v1/auth/me` (với Bearer token)

### Test Frontend
1. Start backend: `.\scripts\51-start-backend.ps1`
2. Start frontend: `cd frontend && pnpm dev`
3. Test login page tại `http://localhost:3000/login`

## Notes

- **Password Policy**: Implement password validation (min length, complexity, etc.)
- **Rate Limiting**: Add rate limiting cho login và password reset endpoints
- **Email Service**: Cần implement email service để gửi password reset và invitation emails
- **Audit Logging**: Implement audit logging cho các actions quan trọng (có thể dùng MongoDB)
- **CORS**: Đảm bảo CORS đã được cấu hình đúng cho frontend

## References

- Design Document: `docs/mediation-pro-backend-user-auth-design.md`
- API Documentation: Xem design document section 5
