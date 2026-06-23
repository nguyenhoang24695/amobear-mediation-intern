# Mediation Pro - User & Auth Module Backend Design

## 1. Tổng quan

### 1.1 Mục tiêu
- Xác thực người dùng (Authentication)
- Phân quyền theo Role (Authorization)
- Phân quyền theo App (App-level Access Control)
- Quản trị người dùng và team

### 1.2 Tech Stack
- Framework: .NET Core 10
- Database: PostgreSQL (primary), MongoDB (audit logs)
- Cache: Redis
- Queue: RabbitMQ
- Auth: JWT + Refresh Token

### 1.3 Nguyên tắc thiết kế
- Stateless Authentication với JWT
- Role-Based Access Control (RBAC) + Resource-Based Access Control
- Multi-tenant friendly (hỗ trợ nhiều team/organization)
- Audit trail cho mọi thay đổi quan trọng

---

## 2. Database Schema (PostgreSQL)

### 2.1 ERD Overview

```
Organizations (1) ──── (N) Users
      │
      │ (1)
      │
      └──── (N) Teams ──── (N:M) ──── Users (TeamMembers)
                │
                │ (1)
                │
                └──── (N) AppPermissions ──── (N) Apps
```

### 2.2 Tables

#### 2.2.1 Organizations
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
```

#### 2.2.2 Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    must_change_password BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT uq_users_email_org UNIQUE (email, organization_id),
    CONSTRAINT chk_users_role CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer')),
    CONSTRAINT chk_users_status CHECK (status IN ('active', 'inactive', 'invited', 'locked'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_status ON users(status);
```

#### 2.2.3 Teams
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT uq_teams_name_org UNIQUE (name, organization_id)
);

CREATE INDEX idx_teams_organization ON teams(organization_id);
```

#### 2.2.4 Team Members
```sql
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_team_members UNIQUE (team_id, user_id),
    CONSTRAINT chk_team_role CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
```

#### 2.2.5 App Permissions
```sql
CREATE TABLE app_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    grantee_type VARCHAR(20) NOT NULL,
    grantee_id UUID NOT NULL,
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view',
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_grantee_type CHECK (grantee_type IN ('user', 'team')),
    CONSTRAINT chk_permission_level CHECK (permission_level IN ('view', 'edit', 'manage', 'owner')),
    CONSTRAINT uq_app_permission UNIQUE (app_id, grantee_type, grantee_id)
);

CREATE INDEX idx_app_permissions_app ON app_permissions(app_id);
CREATE INDEX idx_app_permissions_grantee ON app_permissions(grantee_type, grantee_id);
```

#### 2.2.6 Refresh Tokens
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(500),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

#### 2.2.7 User Invitations
```sql
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    team_ids UUID[] DEFAULT '{}',
    app_permissions JSONB DEFAULT '[]',
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_invitation_email_org UNIQUE (email, organization_id)
);

CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_token ON user_invitations(token_hash);
```

#### 2.2.8 Audit Logs (MongoDB Collection)
```javascript
// Collection: audit_logs
{
    _id: ObjectId,
    organization_id: UUID,
    user_id: UUID,
    action: String, // 'user.login', 'user.create', 'permission.grant', etc.
    resource_type: String, // 'user', 'team', 'app', 'permission'
    resource_id: UUID,
    changes: {
        before: Object,
        after: Object
    },
    metadata: {
        ip_address: String,
        user_agent: String,
        request_id: String
    },
    created_at: ISODate
}

// Indexes
db.audit_logs.createIndex({ organization_id: 1, created_at: -1 });
db.audit_logs.createIndex({ user_id: 1, created_at: -1 });
db.audit_logs.createIndex({ resource_type: 1, resource_id: 1 });
db.audit_logs.createIndex({ action: 1 });
```

---

## 3. Domain Models

### 3.1 Enums

```csharp
public enum UserRole
{
    SuperAdmin,  // Full system access
    Admin,       // Organization admin
    Editor,      // Can edit apps, mediation
    Viewer       // Read-only access
}

public enum UserStatus
{
    Active,
    Inactive,
    Invited,
    Locked
}

public enum TeamRole
{
    Owner,
    Admin,
    Member
}

public enum PermissionLevel
{
    View,    // Read-only
    Edit,    // Can modify settings
    Manage,  // Can manage permissions
    Owner    // Full control
}

public enum GranteeType
{
    User,
    Team
}
```

### 3.2 Permission Hierarchy

```
SuperAdmin > Admin > Editor > Viewer

Permission Level Hierarchy:
Owner > Manage > Edit > View

Effective Permission = MAX(UserRole, AppPermission)
```

### 3.3 Entity Classes

```csharp
public class User : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public string Email { get; set; }
    public string PasswordHash { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string AvatarUrl { get; set; }
    public string Phone { get; set; }
    public UserRole Role { get; set; }
    public UserStatus Status { get; set; }
    public bool EmailVerified { get; set; }
    public DateTime? EmailVerifiedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string LastLoginIp { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockedUntil { get; set; }
    public DateTime? PasswordChangedAt { get; set; }
    public bool MustChangePassword { get; set; }
    public Dictionary<string, object> Settings { get; set; }
    
    // Navigation
    public Organization Organization { get; set; }
    public ICollection<TeamMember> TeamMemberships { get; set; }
    public ICollection<AppPermission> DirectPermissions { get; set; }
}

public class AppPermission : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid AppId { get; set; }
    public GranteeType GranteeType { get; set; }
    public Guid GranteeId { get; set; } // UserId or TeamId
    public PermissionLevel PermissionLevel { get; set; }
    public DateTime GrantedAt { get; set; }
    public Guid? GrantedBy { get; set; }
    public DateTime? ExpiresAt { get; set; }
    
    // Navigation
    public App App { get; set; }
    public User GrantedByUser { get; set; }
}
```

---

## 4. Services

### 4.1 Authentication Service

```csharp
public interface IAuthService
{
    Task<AuthResult> LoginAsync(LoginRequest request);
    Task<AuthResult> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(Guid userId, string refreshToken);
    Task LogoutAllDevicesAsync(Guid userId);
    Task<bool> ValidateTokenAsync(string token);
    Task<PasswordResetResult> RequestPasswordResetAsync(string email);
    Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
}

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtGenerator;
    private readonly IRedisCache _cache;
    private readonly IAuditLogger _auditLogger;
    private readonly AuthSettings _settings;

    public async Task<AuthResult> LoginAsync(LoginRequest request)
    {
        // 1. Find user by email
        var user = await _userRepository.GetByEmailAsync(request.Email, request.OrganizationSlug);
        if (user == null)
            return AuthResult.Failed("Invalid credentials");

        // 2. Check account status
        if (user.Status == UserStatus.Locked)
        {
            if (user.LockedUntil > DateTime.UtcNow)
                return AuthResult.Failed($"Account locked until {user.LockedUntil}");
            
            // Unlock if time passed
            await _userRepository.UnlockAsync(user.Id);
        }

        if (user.Status != UserStatus.Active)
            return AuthResult.Failed("Account is not active");

        // 3. Verify password
        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            await HandleFailedLoginAsync(user);
            return AuthResult.Failed("Invalid credentials");
        }

        // 4. Generate tokens
        var accessToken = _jwtGenerator.GenerateAccessToken(user);
        var refreshToken = await GenerateRefreshTokenAsync(user, request.DeviceInfo, request.IpAddress);

        // 5. Update last login
        await _userRepository.UpdateLastLoginAsync(user.Id, request.IpAddress);

        // 6. Cache user permissions
        await CacheUserPermissionsAsync(user.Id);

        // 7. Audit log
        await _auditLogger.LogAsync(new AuditLog
        {
            UserId = user.Id,
            Action = "user.login",
            ResourceType = "user",
            ResourceId = user.Id,
            Metadata = new { IpAddress = request.IpAddress, DeviceInfo = request.DeviceInfo }
        });

        return AuthResult.Success(accessToken, refreshToken, user);
    }

    private async Task HandleFailedLoginAsync(User user)
    {
        user.FailedLoginAttempts++;
        
        if (user.FailedLoginAttempts >= _settings.MaxFailedAttempts)
        {
            user.Status = UserStatus.Locked;
            user.LockedUntil = DateTime.UtcNow.AddMinutes(_settings.LockoutDurationMinutes);
        }
        
        await _userRepository.UpdateAsync(user);
    }

    private async Task CacheUserPermissionsAsync(Guid userId)
    {
        var permissions = await _permissionService.GetEffectivePermissionsAsync(userId);
        var cacheKey = $"user_permissions:{userId}";
        await _cache.SetAsync(cacheKey, permissions, TimeSpan.FromMinutes(15));
    }
}
```

### 4.2 Permission Service

```csharp
public interface IPermissionService
{
    Task<EffectivePermissions> GetEffectivePermissionsAsync(Guid userId);
    Task<bool> HasAppPermissionAsync(Guid userId, Guid appId, PermissionLevel requiredLevel);
    Task<bool> CanAccessResourceAsync(Guid userId, string resourceType, Guid resourceId, string action);
    Task GrantAppPermissionAsync(GrantPermissionRequest request);
    Task RevokeAppPermissionAsync(Guid permissionId);
    Task<List<AppPermissionDto>> GetAppPermissionsAsync(Guid appId);
    Task<List<AppWithPermissionDto>> GetUserAccessibleAppsAsync(Guid userId);
}

public class PermissionService : IPermissionService
{
    public async Task<EffectivePermissions> GetEffectivePermissionsAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdWithTeamsAsync(userId);
        
        // 1. Get direct user permissions
        var directPermissions = await _permissionRepository.GetByUserAsync(userId);
        
        // 2. Get team-based permissions
        var teamIds = user.TeamMemberships.Select(tm => tm.TeamId).ToList();
        var teamPermissions = await _permissionRepository.GetByTeamsAsync(teamIds);
        
        // 3. Merge permissions (take highest level for each app)
        var effectivePermissions = new Dictionary<Guid, PermissionLevel>();
        
        foreach (var perm in directPermissions.Concat(teamPermissions))
        {
            if (!effectivePermissions.ContainsKey(perm.AppId) ||
                perm.PermissionLevel > effectivePermissions[perm.AppId])
            {
                effectivePermissions[perm.AppId] = perm.PermissionLevel;
            }
        }
        
        // 4. Apply role-based overrides
        // Admin/SuperAdmin gets access to all apps in their organization
        if (user.Role >= UserRole.Admin)
        {
            var allApps = await _appRepository.GetByOrganizationAsync(user.OrganizationId);
            foreach (var app in allApps)
            {
                effectivePermissions[app.Id] = PermissionLevel.Owner;
            }
        }
        
        return new EffectivePermissions
        {
            UserId = userId,
            UserRole = user.Role,
            AppPermissions = effectivePermissions,
            TeamMemberships = user.TeamMemberships.ToDictionary(tm => tm.TeamId, tm => tm.Role)
        };
    }

    public async Task<bool> HasAppPermissionAsync(Guid userId, Guid appId, PermissionLevel requiredLevel)
    {
        // Try cache first
        var cacheKey = $"user_permissions:{userId}";
        var cached = await _cache.GetAsync<EffectivePermissions>(cacheKey);
        
        if (cached == null)
        {
            cached = await GetEffectivePermissionsAsync(userId);
            await _cache.SetAsync(cacheKey, cached, TimeSpan.FromMinutes(15));
        }
        
        // SuperAdmin/Admin has access to everything
        if (cached.UserRole >= UserRole.Admin)
            return true;
        
        // Check app-specific permission
        if (cached.AppPermissions.TryGetValue(appId, out var level))
            return level >= requiredLevel;
        
        return false;
    }

    public async Task<bool> CanAccessResourceAsync(Guid userId, string resourceType, Guid resourceId, string action)
    {
        // Map resource to app
        var appId = await GetAppIdForResourceAsync(resourceType, resourceId);
        if (appId == null) return false;
        
        // Map action to required permission level
        var requiredLevel = action switch
        {
            "view" => PermissionLevel.View,
            "edit" => PermissionLevel.Edit,
            "delete" => PermissionLevel.Manage,
            "manage_permissions" => PermissionLevel.Owner,
            _ => PermissionLevel.View
        };
        
        return await HasAppPermissionAsync(userId, appId.Value, requiredLevel);
    }

    private async Task<Guid?> GetAppIdForResourceAsync(string resourceType, Guid resourceId)
    {
        return resourceType switch
        {
            "app" => resourceId,
            "adunit" => (await _adUnitRepository.GetByIdAsync(resourceId))?.AppId,
            "mediationgroup" => (await _mediationGroupRepository.GetByIdAsync(resourceId))?.AppId,
            "abtest" => (await _abTestRepository.GetByIdAsync(resourceId))?.MediationGroup?.AppId,
            _ => null
        };
    }
}
```

### 4.3 User Service

```csharp
public interface IUserService
{
    Task<UserDto> GetByIdAsync(Guid id);
    Task<PagedResult<UserDto>> GetUsersAsync(UserFilterRequest filter);
    Task<UserDto> CreateUserAsync(CreateUserRequest request);
    Task<UserDto> UpdateUserAsync(Guid id, UpdateUserRequest request);
    Task DeactivateUserAsync(Guid id);
    Task ReactivateUserAsync(Guid id);
    Task<InvitationDto> InviteUserAsync(InviteUserRequest request);
    Task<UserDto> AcceptInvitationAsync(AcceptInvitationRequest request);
    Task ResendInvitationAsync(Guid invitationId);
    Task CancelInvitationAsync(Guid invitationId);
}

public class UserService : IUserService
{
    public async Task<UserDto> CreateUserAsync(CreateUserRequest request)
    {
        // 1. Validate email uniqueness
        var existing = await _userRepository.GetByEmailAsync(request.Email, request.OrganizationId);
        if (existing != null)
            throw new BusinessException("Email already exists in this organization");

        // 2. Create user
        var user = new User
        {
            OrganizationId = request.OrganizationId,
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = _passwordHasher.Hash(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = request.Role,
            Status = UserStatus.Active,
            MustChangePassword = request.MustChangePassword,
            CreatedBy = _currentUser.Id
        };

        await _userRepository.AddAsync(user);

        // 3. Add to teams if specified
        if (request.TeamIds?.Any() == true)
        {
            foreach (var teamId in request.TeamIds)
            {
                await _teamMemberRepository.AddAsync(new TeamMember
                {
                    TeamId = teamId,
                    UserId = user.Id,
                    Role = TeamRole.Member
                });
            }
        }

        // 4. Grant app permissions if specified
        if (request.AppPermissions?.Any() == true)
        {
            foreach (var perm in request.AppPermissions)
            {
                await _permissionService.GrantAppPermissionAsync(new GrantPermissionRequest
                {
                    AppId = perm.AppId,
                    GranteeType = GranteeType.User,
                    GranteeId = user.Id,
                    PermissionLevel = perm.Level
                });
            }
        }

        // 5. Audit log
        await _auditLogger.LogAsync(new AuditLog
        {
            UserId = _currentUser.Id,
            Action = "user.create",
            ResourceType = "user",
            ResourceId = user.Id,
            Changes = new { After = user }
        });

        // 6. Send welcome email
        await _emailService.SendWelcomeEmailAsync(user);

        return _mapper.Map<UserDto>(user);
    }

    public async Task<InvitationDto> InviteUserAsync(InviteUserRequest request)
    {
        // 1. Check if user already exists
        var existing = await _userRepository.GetByEmailAsync(request.Email, _currentUser.OrganizationId);
        if (existing != null)
            throw new BusinessException("User already exists in this organization");

        // 2. Check for existing pending invitation
        var existingInvite = await _invitationRepository.GetPendingByEmailAsync(
            request.Email, _currentUser.OrganizationId);
        if (existingInvite != null)
            throw new BusinessException("Invitation already sent to this email");

        // 3. Create invitation
        var token = GenerateSecureToken();
        var invitation = new UserInvitation
        {
            OrganizationId = _currentUser.OrganizationId,
            Email = request.Email.ToLowerInvariant(),
            Role = request.Role,
            TeamIds = request.TeamIds?.ToArray() ?? Array.Empty<Guid>(),
            AppPermissions = JsonSerializer.Serialize(request.AppPermissions),
            TokenHash = _passwordHasher.Hash(token),
            InvitedBy = _currentUser.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        await _invitationRepository.AddAsync(invitation);

        // 4. Send invitation email
        await _emailService.SendInvitationEmailAsync(invitation, token);

        // 5. Audit log
        await _auditLogger.LogAsync(new AuditLog
        {
            UserId = _currentUser.Id,
            Action = "user.invite",
            ResourceType = "invitation",
            ResourceId = invitation.Id,
            Changes = new { After = invitation }
        });

        return _mapper.Map<InvitationDto>(invitation);
    }

    public async Task<UserDto> AcceptInvitationAsync(AcceptInvitationRequest request)
    {
        // 1. Find and validate invitation
        var invitation = await _invitationRepository.GetByTokenAsync(request.Token);
        if (invitation == null || invitation.ExpiresAt < DateTime.UtcNow)
            throw new BusinessException("Invalid or expired invitation");

        if (invitation.AcceptedAt != null)
            throw new BusinessException("Invitation already accepted");

        // 2. Create user from invitation
        var user = new User
        {
            OrganizationId = invitation.OrganizationId,
            Email = invitation.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = invitation.Role,
            Status = UserStatus.Active,
            EmailVerified = true,
            EmailVerifiedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);

        // 3. Add to teams
        foreach (var teamId in invitation.TeamIds)
        {
            await _teamMemberRepository.AddAsync(new TeamMember
            {
                TeamId = teamId,
                UserId = user.Id,
                Role = TeamRole.Member
            });
        }

        // 4. Grant app permissions
        var appPermissions = JsonSerializer.Deserialize<List<AppPermissionInput>>(invitation.AppPermissions);
        foreach (var perm in appPermissions)
        {
            await _permissionService.GrantAppPermissionAsync(new GrantPermissionRequest
            {
                AppId = perm.AppId,
                GranteeType = GranteeType.User,
                GranteeId = user.Id,
                PermissionLevel = perm.Level
            });
        }

        // 5. Mark invitation as accepted
        invitation.AcceptedAt = DateTime.UtcNow;
        await _invitationRepository.UpdateAsync(invitation);

        return _mapper.Map<UserDto>(user);
    }
}
```

---

## 5. API Endpoints

### 5.1 Authentication APIs

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/change-password
GET    /api/v1/auth/me
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "password123",
    "organizationSlug": "Amobear",
    "deviceInfo": "Chrome on Windows"
}

Response 200:
{
    "success": true,
    "data": {
        "accessToken": "eyJhbG...",
        "refreshToken": "dGhpcy...",
        "expiresIn": 3600,
        "tokenType": "Bearer",
        "user": {
            "id": "uuid",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe",
            "role": "admin",
            "avatarUrl": "https://...",
            "organization": {
                "id": "uuid",
                "name": "Amobear Inc",
                "slug": "Amobear"
            }
        }
    }
}

Response 401:
{
    "success": false,
    "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password"
    }
}

Response 423:
{
    "success": false,
    "error": {
        "code": "ACCOUNT_LOCKED",
        "message": "Account locked until 2026-01-18T10:30:00Z"
    }
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer {accessToken}

Response 200:
{
    "success": true,
    "data": {
        "id": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "admin",
        "avatarUrl": "https://...",
        "emailVerified": true,
        "organization": {
            "id": "uuid",
            "name": "Amobear Inc",
            "slug": "Amobear"
        },
        "teams": [
            {
                "id": "uuid",
                "name": "Mobile Team",
                "role": "admin"
            }
        ],
        "permissions": {
            "apps": {
                "app-uuid-1": "owner",
                "app-uuid-2": "edit",
                "app-uuid-3": "view"
            }
        }
    }
}
```

### 5.2 User Management APIs

```
GET    /api/v1/users
GET    /api/v1/users/{id}
POST   /api/v1/users
PUT    /api/v1/users/{id}
DELETE /api/v1/users/{id}
POST   /api/v1/users/{id}/deactivate
POST   /api/v1/users/{id}/reactivate
POST   /api/v1/users/{id}/reset-password
```

#### List Users
```http
GET /api/v1/users?page=1&pageSize=20&search=john&role=admin&status=active&teamId=uuid
Authorization: Bearer {accessToken}

Response 200:
{
    "success": true,
    "data": {
        "items": [
            {
                "id": "uuid",
                "email": "john@example.com",
                "firstName": "John",
                "lastName": "Doe",
                "role": "admin",
                "status": "active",
                "avatarUrl": "https://...",
                "lastLoginAt": "2026-01-17T10:30:00Z",
                "teams": [
                    { "id": "uuid", "name": "Mobile Team" }
                ],
                "createdAt": "2025-06-01T00:00:00Z"
            }
        ],
        "total": 45,
        "page": 1,
        "pageSize": 20,
        "totalPages": 3
    }
}
```

#### Create User
```http
POST /api/v1/users
Authorization: Bearer {accessToken}
Content-Type: application/json

{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "editor",
    "teamIds": ["team-uuid-1", "team-uuid-2"],
    "appPermissions": [
        { "appId": "app-uuid-1", "level": "edit" },
        { "appId": "app-uuid-2", "level": "view" }
    ],
    "mustChangePassword": true,
    "sendWelcomeEmail": true
}

Response 201:
{
    "success": true,
    "data": {
        "id": "uuid",
        "email": "newuser@example.com",
        ...
    }
}
```

### 5.3 Invitation APIs

```
GET    /api/v1/invitations
POST   /api/v1/invitations
GET    /api/v1/invitations/{id}
DELETE /api/v1/invitations/{id}
POST   /api/v1/invitations/{id}/resend
POST   /api/v1/invitations/accept
GET    /api/v1/invitations/validate/{token}
```

#### Invite User
```http
POST /api/v1/invitations
Authorization: Bearer {accessToken}
Content-Type: application/json

{
    "email": "invited@example.com",
    "role": "editor",
    "teamIds": ["team-uuid"],
    "appPermissions": [
        { "appId": "app-uuid", "level": "edit" }
    ],
    "message": "Welcome to our team!"
}

Response 201:
{
    "success": true,
    "data": {
        "id": "uuid",
        "email": "invited@example.com",
        "role": "editor",
        "status": "pending",
        "expiresAt": "2026-01-24T10:30:00Z",
        "invitedBy": {
            "id": "uuid",
            "name": "John Doe"
        }
    }
}
```

#### Accept Invitation
```http
POST /api/v1/invitations/accept
Content-Type: application/json

{
    "token": "invitation-token",
    "password": "NewSecurePass123!",
    "firstName": "Jane",
    "lastName": "Smith"
}

Response 200:
{
    "success": true,
    "data": {
        "accessToken": "eyJhbG...",
        "refreshToken": "dGhpcy...",
        "user": { ... }
    }
}
```

### 5.4 Team APIs

```
GET    /api/v1/teams
POST   /api/v1/teams
GET    /api/v1/teams/{id}
PUT    /api/v1/teams/{id}
DELETE /api/v1/teams/{id}
GET    /api/v1/teams/{id}/members
POST   /api/v1/teams/{id}/members
DELETE /api/v1/teams/{id}/members/{userId}
PUT    /api/v1/teams/{id}/members/{userId}/role
```

#### Create Team
```http
POST /api/v1/teams
Authorization: Bearer {accessToken}
Content-Type: application/json

{
    "name": "Mobile Team",
    "description": "Team responsible for mobile apps",
    "memberIds": ["user-uuid-1", "user-uuid-2"]
}
```

#### Add Team Member
```http
POST /api/v1/teams/{teamId}/members
Authorization: Bearer {accessToken}
Content-Type: application/json

{
    "userId": "user-uuid",
    "role": "member"
}
```

### 5.5 Permission APIs

```
GET    /api/v1/apps/{appId}/permissions
POST   /api/v1/apps/{appId}/permissions
DELETE /api/v1/apps/{appId}/permissions/{permissionId}
PUT    /api/v1/apps/{appId}/permissions/{permissionId}
GET    /api/v1/users/{userId}/permissions
GET    /api/v1/users/{userId}/accessible-apps
```

#### Get App Permissions
```http
GET /api/v1/apps/{appId}/permissions
Authorization: Bearer {accessToken}

Response 200:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "granteeType": "user",
            "grantee": {
                "id": "user-uuid",
                "name": "John Doe",
                "email": "john@example.com",
                "avatarUrl": "https://..."
            },
            "permissionLevel": "edit",
            "grantedAt": "2026-01-01T00:00:00Z",
            "grantedBy": {
                "id": "uuid",
                "name": "Admin User"
            }
        },
        {
            "id": "uuid",
            "granteeType": "team",
            "grantee": {
                "id": "team-uuid",
                "name": "Mobile Team",
                "memberCount": 5
            },
            "permissionLevel": "view",
            "grantedAt": "2026-01-01T00:00:00Z",
            "grantedBy": {
                "id": "uuid",
                "name": "Admin User"
            }
        }
    ]
}
```

#### Grant Permission
```http
POST /api/v1/apps/{appId}/permissions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
    "granteeType": "user",
    "granteeId": "user-uuid",
    "permissionLevel": "edit",
    "expiresAt": "2026-12-31T23:59:59Z"
}

Response 201:
{
    "success": true,
    "data": {
        "id": "permission-uuid",
        ...
    }
}
```

#### Get User's Accessible Apps
```http
GET /api/v1/users/{userId}/accessible-apps
Authorization: Bearer {accessToken}

Response 200:
{
    "success": true,
    "data": [
        {
            "app": {
                "id": "app-uuid",
                "name": "Weather Plus",
                "packageName": "com.weather.plus",
                "platform": "ios",
                "iconUrl": "https://..."
            },
            "permissionLevel": "edit",
            "source": "direct",
            "grantedAt": "2026-01-01T00:00:00Z"
        },
        {
            "app": {
                "id": "app-uuid-2",
                "name": "Game Master",
                "packageName": "com.game.master",
                "platform": "android",
                "iconUrl": "https://..."
            },
            "permissionLevel": "view",
            "source": "team",
            "sourceTeam": {
                "id": "team-uuid",
                "name": "Mobile Team"
            },
            "grantedAt": "2026-01-01T00:00:00Z"
        }
    ]
}
```

---

## 6. Authorization Middleware & Attributes

### 6.1 JWT Middleware

```csharp
public class JwtAuthenticationMiddleware
{
    public async Task InvokeAsync(HttpContext context, IJwtValidator validator, IUserService userService)
    {
        var token = context.Request.Headers["Authorization"]
            .FirstOrDefault()?.Replace("Bearer ", "");

        if (string.IsNullOrEmpty(token))
        {
            await _next(context);
            return;
        }

        try
        {
            var principal = validator.ValidateToken(token);
            var userId = Guid.Parse(principal.FindFirst(ClaimTypes.NameIdentifier).Value);
            
            // Check if token is blacklisted (logged out)
            if (await _cache.ExistsAsync($"blacklist:{token}"))
            {
                context.Response.StatusCode = 401;
                return;
            }

            context.User = principal;
            context.Items["UserId"] = userId;
        }
        catch (SecurityTokenExpiredException)
        {
            context.Response.StatusCode = 401;
            context.Response.Headers["X-Token-Expired"] = "true";
            return;
        }
        catch
        {
            context.Response.StatusCode = 401;
            return;
        }

        await _next(context);
    }
}
```

### 6.2 Permission Attributes

```csharp
// Role-based authorization
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireRoleAttribute : Attribute, IAuthorizationFilter
{
    public UserRole MinimumRole { get; }

    public RequireRoleAttribute(UserRole minimumRole)
    {
        MinimumRole = minimumRole;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var userRole = context.HttpContext.User.FindFirst("role")?.Value;
        if (!Enum.TryParse<UserRole>(userRole, out var role) || role < MinimumRole)
        {
            context.Result = new ForbidResult();
        }
    }
}

// App-level permission authorization
[AttributeUsage(AttributeTargets.Method)]
public class RequireAppPermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    public PermissionLevel RequiredLevel { get; }
    public string AppIdParameter { get; }

    public RequireAppPermissionAttribute(PermissionLevel level, string appIdParam = "appId")
    {
        RequiredLevel = level;
        AppIdParameter = appIdParam;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var permissionService = context.HttpContext.RequestServices
            .GetRequiredService<IPermissionService>();

        var userId = (Guid)context.HttpContext.Items["UserId"];
        
        // Get appId from route or query
        if (!context.RouteData.Values.TryGetValue(AppIdParameter, out var appIdObj))
        {
            context.HttpContext.Request.Query.TryGetValue(AppIdParameter, out var appIdStr);
            appIdObj = appIdStr.FirstOrDefault();
        }

        if (!Guid.TryParse(appIdObj?.ToString(), out var appId))
        {
            context.Result = new BadRequestResult();
            return;
        }

        var hasPermission = await permissionService.HasAppPermissionAsync(userId, appId, RequiredLevel);
        if (!hasPermission)
        {
            context.Result = new ForbidResult();
        }
    }
}

// Usage in controllers
[ApiController]
[Route("api/v1/apps/{appId}/mediation-groups")]
public class MediationGroupsController : ControllerBase
{
    [HttpGet]
    [RequireAppPermission(PermissionLevel.View)]
    public async Task<IActionResult> GetMediationGroups(Guid appId) { ... }

    [HttpPost]
    [RequireAppPermission(PermissionLevel.Edit)]
    public async Task<IActionResult> CreateMediationGroup(Guid appId, CreateRequest request) { ... }

    [HttpDelete("{id}")]
    [RequireAppPermission(PermissionLevel.Manage)]
    public async Task<IActionResult> DeleteMediationGroup(Guid appId, Guid id) { ... }
}
```

### 6.3 Resource Filter for Automatic App Permission Check

```csharp
public class AppPermissionResourceFilter : IAsyncResourceFilter
{
    private readonly IPermissionService _permissionService;
    private readonly IResourceToAppMapper _resourceMapper;

    public async Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
    {
        var userId = (Guid)context.HttpContext.Items["UserId"];
        var resourceType = GetResourceType(context);
        var resourceId = GetResourceId(context);
        var action = GetAction(context.HttpContext.Request.Method);

        if (resourceType != null && resourceId != null)
        {
            var canAccess = await _permissionService.CanAccessResourceAsync(
                userId, resourceType, resourceId.Value, action);

            if (!canAccess)
            {
                context.Result = new ForbidResult();
                return;
            }
        }

        await next();
    }

    private string GetAction(string httpMethod) => httpMethod switch
    {
        "GET" => "view",
        "POST" => "edit",
        "PUT" => "edit",
        "PATCH" => "edit",
        "DELETE" => "delete",
        _ => "view"
    };
}
```

---

## 7. Caching Strategy

### 7.1 Redis Cache Keys

```
# User permissions (TTL: 15 minutes)
user_permissions:{userId} -> EffectivePermissions object

# User session (TTL: matches refresh token)
user_session:{userId}:{tokenId} -> SessionInfo

# Token blacklist (TTL: matches original token expiry)
blacklist:{tokenHash} -> "1"

# Organization settings (TTL: 1 hour)
org_settings:{orgId} -> OrganizationSettings

# App permission list (TTL: 5 minutes)
app_permissions:{appId} -> List<AppPermission>
```

### 7.2 Cache Invalidation

```csharp
public class PermissionCacheInvalidator
{
    public async Task InvalidateUserPermissionsAsync(Guid userId)
    {
        await _cache.DeleteAsync($"user_permissions:{userId}");
    }

    public async Task InvalidateAppPermissionsAsync(Guid appId)
    {
        await _cache.DeleteAsync($"app_permissions:{appId}");
        
        // Also invalidate all affected users' permissions
        var permissions = await _permissionRepository.GetByAppAsync(appId);
        foreach (var perm in permissions)
        {
            if (perm.GranteeType == GranteeType.User)
            {
                await InvalidateUserPermissionsAsync(perm.GranteeId);
            }
            else // Team
            {
                var members = await _teamMemberRepository.GetByTeamAsync(perm.GranteeId);
                foreach (var member in members)
                {
                    await InvalidateUserPermissionsAsync(member.UserId);
                }
            }
        }
    }
}
```

---

## 8. Event Publishing (RabbitMQ)

### 8.1 Events

```csharp
public record UserCreatedEvent(Guid UserId, Guid OrganizationId, string Email, UserRole Role);
public record UserDeactivatedEvent(Guid UserId, Guid DeactivatedBy);
public record UserLoginEvent(Guid UserId, string IpAddress, string DeviceInfo);
public record PermissionGrantedEvent(Guid AppId, GranteeType GranteeType, Guid GranteeId, PermissionLevel Level);
public record PermissionRevokedEvent(Guid PermissionId, Guid AppId, Guid RevokedBy);
public record InvitationAcceptedEvent(Guid InvitationId, Guid NewUserId);
```

### 8.2 Event Handlers

```csharp
public class UserEventHandler : 
    IEventHandler<UserCreatedEvent>,
    IEventHandler<PermissionGrantedEvent>
{
    public async Task HandleAsync(UserCreatedEvent @event)
    {
        // Send welcome email
        // Initialize user preferences
        // Create default dashboard
    }

    public async Task HandleAsync(PermissionGrantedEvent @event)
    {
        // Invalidate cache
        // Send notification to user
        // Update search index
    }
}
```

---

## 9. Security Considerations

### 9.1 Password Policy

```csharp
public class PasswordPolicy
{
    public int MinLength { get; set; } = 8;
    public int MaxLength { get; set; } = 128;
    public bool RequireUppercase { get; set; } = true;
    public bool RequireLowercase { get; set; } = true;
    public bool RequireDigit { get; set; } = true;
    public bool RequireSpecialChar { get; set; } = true;
    public int PasswordHistoryCount { get; set; } = 5; // Cannot reuse last 5 passwords
    public int MaxAgeDays { get; set; } = 90;
}
```

### 9.2 Rate Limiting

```csharp
// Login endpoint: 5 attempts per minute per IP
// Password reset: 3 attempts per hour per email
// API general: 100 requests per minute per user
```

### 9.3 JWT Configuration

```csharp
public class JwtSettings
{
    public string Secret { get; set; } // Min 256 bits
    public string Issuer { get; set; }
    public string Audience { get; set; }
    public int AccessTokenExpiryMinutes { get; set; } = 60;
    public int RefreshTokenExpiryDays { get; set; } = 30;
}
```

---

## 10. Database Migrations Order

```
1. 001_CreateOrganizationsTable.cs
2. 002_CreateUsersTable.cs
3. 003_CreateTeamsTable.cs
4. 004_CreateTeamMembersTable.cs
5. 005_CreateAppPermissionsTable.cs
6. 006_CreateRefreshTokensTable.cs
7. 007_CreateUserInvitationsTable.cs
8. 008_AddIndexes.cs
9. 009_SeedDefaultData.cs
```

---

## 11. Project Structure

```
src/
├── MediationPro.Auth/
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── UsersController.cs
│   │   ├── TeamsController.cs
│   │   ├── InvitationsController.cs
│   │   └── PermissionsController.cs
│   ├── Services/
│   │   ├── IAuthService.cs
│   │   ├── AuthService.cs
│   │   ├── IUserService.cs
│   │   ├── UserService.cs
│   │   ├── IPermissionService.cs
│   │   ├── PermissionService.cs
│   │   ├── ITeamService.cs
│   │   └── TeamService.cs
│   ├── Models/
│   │   ├── Requests/
│   │   ├── Responses/
│   │   └── DTOs/
│   ├── Middleware/
│   │   ├── JwtAuthenticationMiddleware.cs
│   │   └── RateLimitingMiddleware.cs
│   ├── Attributes/
│   │   ├── RequireRoleAttribute.cs
│   │   └── RequireAppPermissionAttribute.cs
│   └── Extensions/
│       └── ServiceCollectionExtensions.cs
├── MediationPro.Auth.Domain/
│   ├── Entities/
│   ├── Enums/
│   ├── Events/
│   └── Interfaces/
└── MediationPro.Auth.Infrastructure/
    ├── Repositories/
    ├── Cache/
    └── ExternalServices/
```
