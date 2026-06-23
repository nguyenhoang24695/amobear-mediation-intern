# Hot Reload Setup - Xem thay đổi live không cần restart

## Tổng quan

Với .NET 10.0 và Blazor Server, bạn có thể enable **Hot Reload** để xem thay đổi ngay lập tức mà không cần restart frontend.

## Cấu hình đã thêm

### 1. Project File (.csproj)

Đã thêm vào `MediationProPortal.Blazor.csproj`:

```xml
<PropertyGroup>
  <!-- Enable Hot Reload for development -->
  <HotReloadEnabled>true</HotReloadEnabled>
  <HotReloadProfile>aspnetcore</HotReloadProfile>
</PropertyGroup>
```

### 2. Launch Settings

Đã cập nhật `launchSettings.json`:

```json
{
  "environmentVariables": {
    "ASPNETCORE_ENVIRONMENT": "Development",
    "ASPNETCORE_HOTRELOAD": "true"
  },
  "hotReloadEnabled": true
}
```

## Cách sử dụng

### Option 1: Sử dụng Script (Recommended)

```powershell
.\scripts\59-start-frontend-hotreload.ps1
```

Script này sẽ:
- ✅ Start `dotnet watch` với Hot Reload
- ✅ Start Tailwind CSS watch mode (tự động rebuild CSS)
- ✅ Tự động reload khi có thay đổi

### Option 2: Manual với dotnet watch

```powershell
cd frontend\src\MediationProPortal.Blazor

# Terminal 1: Tailwind CSS watch
npm run watch:css

# Terminal 2: dotnet watch
dotnet watch run
```

### Option 3: Visual Studio / VS Code

**Visual Studio:**
- Click vào "Hot Reload" button trên toolbar
- Hoặc press `Alt+F10` để toggle Hot Reload

**VS Code:**
- Install extension: ".NET Hot Reload"
- Press `F5` để start với Hot Reload

## Những gì Hot Reload hỗ trợ

### ✅ Tự động reload

- **Razor components** (.razor files) - Save và xem ngay
- **C# code** trong @code blocks - Save và xem ngay
- **CSS files** - Save và xem ngay
- **Component parameters** - Thay đổi và xem ngay

### ⚠️ Cần restart

Một số thay đổi vẫn cần restart:

- **Program.cs** hoặc **Module configuration**
- **Dependency Injection** changes
- **appsettings.json** changes
- **NuGet packages** added/removed
- **Project file** (.csproj) changes

## Tailwind CSS Hot Reload

Để Tailwind CSS tự động rebuild:

```powershell
cd frontend\src\MediationProPortal.Blazor
npm run watch:css
```

Lệnh này sẽ:
- Watch `tailwind.css` và các component files
- Tự động rebuild khi có thay đổi
- Generate `tailwind-output.css` mới

## Workflow Development

### Recommended Setup

1. **Terminal 1**: Start frontend với Hot Reload
   ```powershell
   .\scripts\59-start-frontend-hotreload.ps1
   ```

2. **Terminal 2** (Optional): Tailwind watch (nếu không dùng script)
   ```powershell
   cd frontend\src\MediationProPortal.Blazor
   npm run watch:css
   ```

3. **Editor**: Mở và edit files
   - Edit `.razor` files → Save → Xem ngay
   - Edit CSS → Save → Xem ngay
   - Edit C# code → Save → Xem ngay

### Example Workflow

```powershell
# 1. Start với Hot Reload
.\scripts\59-start-frontend-hotreload.ps1

# 2. Edit Dashboard.razor
# - Thay đổi text
# - Save (Ctrl+S)
# - Browser tự động refresh → Xem ngay!

# 3. Edit CSS
# - Thay đổi styles
# - Save
# - Browser tự động refresh → Xem ngay!

# 4. Edit C# code trong @code block
# - Thay đổi logic
# - Save
# - Browser tự động refresh → Xem ngay!
```

## Troubleshooting

### Hot Reload không hoạt động

**Kiểm tra:**
1. Đảm bảo `ASPNETCORE_ENVIRONMENT=Development`
2. Đảm bảo `HotReloadEnabled=true` trong .csproj
3. Đảm bảo đang dùng `dotnet watch` hoặc Visual Studio với Hot Reload enabled

**Giải pháp:**
```powershell
# Restart với dotnet watch
dotnet watch run
```

### Tailwind CSS không update

**Kiểm tra:**
1. Tailwind watch mode đang chạy?
2. File `tailwind-output.css` có được generate không?

**Giải pháp:**
```powershell
# Rebuild manually
npm run build:css

# Hoặc start watch mode
npm run watch:css
```

### Browser không tự động refresh

**Kiểm tra:**
1. Browser console có errors không?
2. SignalR connection có active không?

**Giải pháp:**
- Manual refresh: `Ctrl+R` hoặc `F5`
- Hard refresh: `Ctrl+Shift+R` hoặc `Ctrl+F5`

## Best Practices

### 1. Luôn dùng Hot Reload trong Development

```powershell
# Development
.\scripts\59-start-frontend-hotreload.ps1

# Production build
.\scripts\52-start-frontend.ps1
```

### 2. Combine với Tailwind Watch

Để có full hot reload experience:
- Razor/C# changes → Hot Reload
- Tailwind CSS changes → Watch mode rebuild

### 3. Monitor Console

Xem console output để biết:
- Hot Reload đã apply changes chưa
- Có errors không
- Tailwind CSS đã rebuild chưa

## Performance

Hot Reload rất nhanh:
- **Razor changes**: < 1 giây
- **C# changes**: < 2 giây
- **CSS changes**: < 1 giây

So với restart:
- **Restart**: 10-30 giây
- **Hot Reload**: < 2 giây

## Limitations

### Không hỗ trợ

- Thay đổi cấu trúc class/interface
- Thay đổi method signatures
- Thay đổi dependency injection
- Thay đổi project references

### Cần restart

Khi gặp lỗi hoặc cần full restart:
```powershell
# Stop current process (Ctrl+C)
# Restart
.\scripts\59-start-frontend-hotreload.ps1
```

## Next Steps

1. ✅ Enable Hot Reload
2. ⏭️ Start development với Hot Reload
3. ⏭️ Enjoy faster development cycle!

## Resources

- [.NET Hot Reload Documentation](https://learn.microsoft.com/en-us/aspnet/core/blazor/hot-reload)
- [dotnet watch Command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-watch)
