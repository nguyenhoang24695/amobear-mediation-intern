# Performance Module Template

Hướng dẫn tạo Performance Module cho Mediation Pro Portal.

## Cấu trúc Module

```
modules/
└── PerformanceModule/
    ├── PerformanceModule.Domain/
    │   ├── PerformanceModuleDomainModule.cs
    │   └── Entities/
    │       └── PerformanceData.cs
    ├── PerformanceModule.Application/
    │   ├── PerformanceModuleApplicationModule.cs
    │   └── Services/
    │       └── PerformanceAppService.cs
    ├── PerformanceModule.Application.Contracts/
    │   ├── PerformanceModuleApplicationContractsModule.cs
    │   └── DTOs/
    │       └── PerformanceDto.cs
    └── PerformanceModule.Blazor/
        ├── PerformanceModuleBlazorModule.cs
        └── Pages/
            └── Performance.razor
```

## Bước 1: Tạo Domain Project

```powershell
cd modules
dotnet new classlib -n PerformanceModule.Domain -f net10.0
cd PerformanceModule.Domain
dotnet add package Volo.Abp.Domain -v 10.0.2
```

## Bước 2: Tạo Application.Contracts Project

```powershell
cd ..
dotnet new classlib -n PerformanceModule.Application.Contracts -f net10.0
cd PerformanceModule.Application.Contracts
dotnet add package Volo.Abp.Application.Contracts -v 10.0.2
dotnet add reference ../PerformanceModule.Domain/PerformanceModule.Domain.csproj
```

## Bước 3: Tạo Application Project

```powershell
cd ..
dotnet new classlib -n PerformanceModule.Application -f net10.0
cd PerformanceModule.Application
dotnet add package Volo.Abp.Application -v 10.0.2
dotnet add package Volo.Abp.AutoMapper -v 10.0.2
dotnet add reference ../PerformanceModule.Application.Contracts/PerformanceModule.Application.Contracts.csproj
dotnet add reference ../PerformanceModule.Domain/PerformanceModule.Domain.csproj
```

## Bước 4: Tạo Blazor Project

```powershell
cd ..
dotnet new razorclasslib -n PerformanceModule.Blazor -f net10.0
cd PerformanceModule.Blazor
dotnet add package Volo.Abp.AspNetCore.Components -v 10.0.2
dotnet add reference ../PerformanceModule.Application.Contracts/PerformanceModule.Application.Contracts.csproj
```

## Bước 5: Thêm vào Solution

```powershell
cd ../../..
dotnet sln add modules/PerformanceModule/PerformanceModule.Domain/PerformanceModule.Domain.csproj
dotnet sln add modules/PerformanceModule/PerformanceModule.Application.Contracts/PerformanceModule.Application.Contracts.csproj
dotnet sln add modules/PerformanceModule/PerformanceModule.Application/PerformanceModule.Application.csproj
dotnet sln add modules/PerformanceModule/PerformanceModule.Blazor/PerformanceModule.Blazor.csproj
```

## Bước 6: Reference từ Blazor Application

Thêm reference vào `MediationProPortalTemplate.Blazor`:

```powershell
cd src/MediationProPortalTemplate.Blazor
dotnet add reference ../../modules/PerformanceModule/PerformanceModule.Blazor/PerformanceModule.Blazor.csproj
```

## Bước 7: Register Module

Trong `MediationProPortalTemplateBlazorModule.cs`:

```csharp
[DependsOn(
    typeof(PerformanceModuleBlazorModule),
    // ... other modules
)]
public class MediationProPortalTemplateBlazorModule : AbpModule
{
    // ...
}
```

## Lưu ý

- Sử dụng .NET 10.0 để tương thích với ABP 10.0.2
- Reference đến các project trong `src/` khi cần
- Tuân theo cấu trúc ABP Framework
- Không chỉnh sửa trực tiếp các project trong `src/`
