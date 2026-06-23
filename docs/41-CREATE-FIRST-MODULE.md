# Hướng dẫn tạo Module đầu tiên

## Tổng quan

Module đầu tiên sẽ là **Performance Module** - hiển thị dữ liệu performance từ Backend API.

## Cấu trúc Module

Một module ABP thường có các layers:
- **Domain**: Entities, Domain Services
- **Application.Contracts**: DTOs, Interfaces
- **Application**: Application Services, Business Logic
- **Blazor**: UI Components, Pages

## Bước 1: Tạo cấu trúc thư mục

```powershell
cd MediationProPortal\modules
mkdir PerformanceModule
cd PerformanceModule
```

## Bước 2: Tạo các projects

### 2.1. Domain Layer

```powershell
dotnet new classlib -n PerformanceModule.Domain -f net10.0
cd PerformanceModule.Domain
dotnet add package Volo.Abp.Domain
dotnet add reference ..\..\src\MediationProPortalTemplate.Domain\MediationProPortalTemplate.Domain.csproj
```

### 2.2. Application Contracts Layer

```powershell
cd ..
dotnet new classlib -n PerformanceModule.Application.Contracts -f net10.0
cd PerformanceModule.Application.Contracts
dotnet add package Volo.Abp.Application.Contracts
dotnet add reference ..\..\src\MediationProPortalTemplate.Application.Contracts\MediationProPortalTemplate.Application.Contracts.csproj
```

### 2.3. Application Layer

```powershell
cd ..
dotnet new classlib -n PerformanceModule.Application -f net10.0
cd PerformanceModule.Application
dotnet add package Volo.Abp.Application
dotnet add package Volo.Abp.AutoMapper
dotnet add reference ..\PerformanceModule.Application.Contracts\PerformanceModule.Application.Contracts.csproj
dotnet add reference ..\PerformanceModule.Domain\PerformanceModule.Domain.csproj
dotnet add reference ..\..\src\MediationProPortalTemplate.Application\MediationProPortalTemplate.Application.csproj
```

### 2.4. Blazor Layer

```powershell
cd ..
dotnet new razorclasslib -n PerformanceModule.Blazor -f net10.0
cd PerformanceModule.Blazor
dotnet add package Volo.Abp.AspNetCore.Components
dotnet add package Volo.Abp.AspNetCore.Components.Web
dotnet add reference ..\PerformanceModule.Application.Contracts\PerformanceModule.Application.Contracts.csproj
dotnet add reference ..\..\src\MediationProPortalTemplate.Blazor\MediationProPortalTemplate.Blazor.csproj
```

## Bước 3: Tạo Module Classes

### 3.1. Domain Module

**File:** `PerformanceModule.Domain/PerformanceModuleDomainModule.cs`

```csharp
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Modularity;

namespace PerformanceModule;

[DependsOn(
    typeof(MediationProPortalTemplateDomainModule)
)]
public class PerformanceModuleDomainModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
    }
}
```

### 3.2. Application Contracts Module

**File:** `PerformanceModule.Application.Contracts/PerformanceModuleApplicationContractsModule.cs`

```csharp
using Volo.Abp.Modularity;
using MediationProPortalTemplate.Application.Contracts;

namespace PerformanceModule;

[DependsOn(
    typeof(MediationProPortalTemplateApplicationContractsModule)
)]
public class PerformanceModuleApplicationContractsModule : AbpModule
{
}
```

### 3.3. Application Module

**File:** `PerformanceModule.Application/PerformanceModuleApplicationModule.cs`

```csharp
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.AutoMapper;
using Volo.Abp.Modularity;
using MediationProPortalTemplate.Application;

namespace PerformanceModule;

[DependsOn(
    typeof(PerformanceModuleApplicationContractsModule),
    typeof(PerformanceModuleDomainModule),
    typeof(MediationProPortalTemplateApplicationModule)
)]
public class PerformanceModuleApplicationModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddAutoMapperObjectMapper<PerformanceModuleApplicationModule>();
    }
}
```

### 3.4. Blazor Module

**File:** `PerformanceModule.Blazor/PerformanceModuleBlazorModule.cs`

```csharp
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.AspNetCore.Components.Web;
using Volo.Abp.Modularity;
using MediationProPortalTemplate.Blazor;

namespace PerformanceModule;

[DependsOn(
    typeof(PerformanceModuleApplicationContractsModule),
    typeof(MediationProPortalTemplateBlazorModule)
)]
public class PerformanceModuleBlazorModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
    }
}
```

## Bước 4: Đăng ký Module vào Main Application

### 4.1. Domain Module

**File:** `MediationProPortal/src/MediationProPortalTemplate.Domain/MediationProPortalTemplateDomainModule.cs`

Thêm dependency:
```csharp
[DependsOn(
    // ... existing dependencies
    typeof(PerformanceModuleDomainModule)  // Add this
)]
```

### 4.2. Application Contracts Module

**File:** `MediationProPortal/src/MediationProPortalTemplate.Application.Contracts/MediationProPortalTemplateApplicationContractsModule.cs`

Thêm dependency:
```csharp
[DependsOn(
    // ... existing dependencies
    typeof(PerformanceModuleApplicationContractsModule)  // Add this
)]
```

### 4.3. Application Module

**File:** `MediationProPortal/src/MediationProPortalTemplate.Application/MediationProPortalTemplateApplicationModule.cs`

Thêm dependency:
```csharp
[DependsOn(
    // ... existing dependencies
    typeof(PerformanceModuleApplicationModule)  // Add this
)]
```

### 4.4. Blazor Module

**File:** `MediationProPortal/src/MediationProPortalTemplate.Blazor/MediationProPortalTemplateBlazorModule.cs`

Thêm dependency:
```csharp
[DependsOn(
    // ... existing dependencies
    typeof(PerformanceModuleBlazorModule)  // Add this
)]
```

### 4.5. Thêm Project References

**File:** `MediationProPortal.sln` hoặc `MediationProPortal/MediationProPortal.sln`

Thêm các projects vào solution:
```powershell
dotnet sln add MediationProPortal/modules/PerformanceModule/PerformanceModule.Domain/PerformanceModule.Domain.csproj
dotnet sln add MediationProPortal/modules/PerformanceModule/PerformanceModule.Application.Contracts/PerformanceModule.Application.Contracts.csproj
dotnet sln add MediationProPortal/modules/PerformanceModule/PerformanceModule.Application/PerformanceModule.Application.csproj
dotnet sln add MediationProPortal/modules/PerformanceModule/PerformanceModule.Blazor/PerformanceModule.Blazor.csproj
```

## Bước 5: Tạo DTO và Service

### 5.1. DTO

**File:** `PerformanceModule.Application.Contracts/PerformanceDataDto.cs`

```csharp
namespace PerformanceModule;

public class PerformanceDataDto
{
    public DateTime Date { get; set; }
    public string PublisherId { get; set; } = string.Empty;
    public string AppId { get; set; } = string.Empty;
    public decimal Ecpm { get; set; }
    public long Impressions { get; set; }
    public decimal Revenue { get; set; }
}
```

### 5.2. Application Service Interface

**File:** `PerformanceModule.Application.Contracts/IPerformanceAppService.cs`

```csharp
using Volo.Abp.Application.Services;

namespace PerformanceModule;

public interface IPerformanceAppService : IApplicationService
{
    Task<List<PerformanceDataDto>> GetPerformanceDataAsync(DateTime startDate, DateTime endDate);
}
```

### 5.3. Application Service Implementation

**File:** `PerformanceModule.Application/PerformanceAppService.cs`

```csharp
using Volo.Abp.Application.Services;
using PerformanceModule;

namespace PerformanceModule;

public class PerformanceAppService : ApplicationService, IPerformanceAppService
{
    public async Task<List<PerformanceDataDto>> GetPerformanceDataAsync(DateTime startDate, DateTime endDate)
    {
        // TODO: Call Backend API to get data
        // For now, return sample data
        return new List<PerformanceDataDto>
        {
            new PerformanceDataDto
            {
                Date = DateTime.Now,
                PublisherId = "pub-123",
                AppId = "app-123",
                Ecpm = 1.5m,
                Impressions = 1000,
                Revenue = 1.5m
            }
        };
    }
}
```

## Bước 6: Tạo Blazor Page

**File:** `PerformanceModule.Blazor/Pages/Performance.razor`

```razor
@page "/performance"
@using PerformanceModule
@using Volo.Abp.AspNetCore.Components.Web.BasicTheme.Themes.Basic
@inherits AbpComponentBase
@inject IPerformanceAppService PerformanceAppService

<PageTitle>Performance</PageTitle>

<Card>
    <CardHeader>
        <CardTitle>Performance Data</CardTitle>
    </CardHeader>
    <CardBody>
        @if (loading)
        {
            <p>Loading...</p>
        }
        else if (performanceData.Any())
        {
            <Table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Publisher</th>
                        <th>App</th>
                        <th>eCPM</th>
                        <th>Impressions</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach (var item in performanceData)
                    {
                        <tr>
                            <td>@item.Date.ToString("yyyy-MM-dd")</td>
                            <td>@item.PublisherId</td>
                            <td>@item.AppId</td>
                            <td>@item.Ecpm.ToString("F2")</td>
                            <td>@item.Impressions.ToString("N0")</td>
                            <td>@item.Revenue.ToString("F2")</td>
                        </tr>
                    }
                </tbody>
            </Table>
        }
        else
        {
            <p>No data available</p>
        }
    </CardBody>
</Card>

@code {
    private bool loading = true;
    private List<PerformanceDataDto> performanceData = new();

    protected override async Task OnInitializedAsync()
    {
        await LoadData();
    }

    private async Task LoadData()
    {
        try
        {
            loading = true;
            performanceData = await PerformanceAppService.GetPerformanceDataAsync(
                DateTime.Now.AddDays(-7),
                DateTime.Now
            );
        }
        finally
        {
            loading = false;
        }
    }
}
```

## Bước 7: Build và Test

```powershell
# Build solution
dotnet build MediationProPortal.sln

# Run application
.\scripts\40-start-frontend.ps1
```

Truy cập: https://localhost:44343/performance

## Next Steps

1. ✅ Module structure đã tạo
2. ✅ Basic page đã có
3. ➡️ Integrate với Backend API
4. ➡️ Thêm filters, charts, etc.

## Lưu ý

- Luôn build solution sau khi thêm module mới
- Kiểm tra dependencies giữa các modules
- Sử dụng ABP conventions (Application Services, DTOs, etc.)
- Reference đến Backend API qua HTTP Client
