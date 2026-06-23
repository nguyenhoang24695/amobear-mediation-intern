# Doc 131 — Testing Amobear Nexus (Backend + Frontend)

> **Audience:** Backend, Frontend, QA, Tech Lead  
> **Last updated:** April 2026

Tài liệu mô tả cách chạy và mở rộng **test tự động** trong monorepo Mediation Pro / Amobear Nexus.

---

## 1. Tổng quan

| Thành phần | Công cụ | Lệnh chính |
|------------|---------|------------|
| Backend xUnit (nhiều project) | xUnit — bảng dưới | `dotnet test backend/MediationPro.sln` |
| Backend harness (legacy) | Console (`MediationPro.Infrastructure.Tests`) | `dotnet run --project backend/MediationPro.Infrastructure.Tests` |
| Frontend unit | Vitest | `pnpm test` trong `frontend/` |
| Cả hai | Script root | `.\scripts\test-all.ps1` |

### Mapping project production → project test (xUnit)

| Production | Project test | Ví dụ mẫu |
|------------|--------------|-----------|
| `MediationPro.Shared` | `MediationPro.Shared.Tests` | `StableStringHash` |
| `MediationPro.Core` | `MediationPro.Core.Tests` | `FormatHelpers`, `EnumExtensions` |
| `MediationPro.Infrastructure` | `MediationPro.Infrastructure.UnitTests` | `StarRocksConnectionStringBuilder` (khác với console `MediationPro.Infrastructure.Tests`) |
| `MediationPro.Jobs` | `MediationPro.Jobs.Tests` | `ManualRuleConfigParser` (cần `InternalsVisibleTo`) |
| `MediationPro.Api` | `MediationPro.Api.Tests` | `ClaimsPrincipalExtensions` |
| `MediationPro.Tools` | `MediationPro.Tools.Tests` | `AppSettingsConnectionReader` |

`dotnet test` trên solution chỉ chạy các project có **Microsoft.NET.Test.Sdk** — **không** chạy harness console `MediationPro.Infrastructure.Tests`.

---

## 2. Backend — xUnit (khuyến nghị cho CI/PR)

```powershell
dotnet test .\backend\MediationPro.sln -c Release
```

- Thêm test: tạo class `*Tests.cs` trong đúng `*.Tests` project, tham chiếu project đang test.
- **Shared** trước đây trống — đã có helper `StableStringHash` + test mẫu; có thể bổ sung utility chung vào `MediationPro.Shared` rồi test tại `MediationPro.Shared.Tests`.

### Harness `MediationPro.Infrastructure.Tests` (console, không phải xUnit)

- Không dùng xUnit; là **ứng dụng console** chạy danh sách test trong `Program.cs`.
- Dùng khi cần regression đặc thù (Meta/MCP/StarRocks helpers, …).

```powershell
dotnet run --project .\backend\MediationPro.Infrastructure.Tests
```

Thoát mã `0` khi pass, khác `0` khi có failure.

---

## 3. Frontend — Vitest

- **Cấu hình:** `frontend/vitest.config.ts`
- **File test:** `*.test.ts` hoặc `*.spec.ts` (ví dụ `lib/utils.test.ts`)

```powershell
cd frontend
pnpm test
pnpm run test:watch
```

MVP hiện test **pure TS** (`cn`, `uuid`). Test component React có thể bổ sung sau với `environment: 'jsdom'` và `@testing-library/react`.

---

## 4. Script gộp (root)

Từ thư mục gốc repo:

```powershell
.\scripts\test-all.ps1
```

Chạy lần lượt `dotnet test` trên solution và `pnpm test` trong `frontend`. Thoát khác `0` nếu một trong hai thất bại.

**Yêu cầu:** .NET 8 SDK, `pnpm` trên `PATH`.

---

## 5. CI (GitHub Actions)

Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (nếu đã bật) chạy cùng logic: `dotnet test` + `pnpm install` + `pnpm test` trên `ubuntu-latest`.

---

## 6. Cursor — rule **tester**

- File rule: `nexus-cursor-skills/agents/tester.mdc` (copy vào `.cursor/rules/` bằng `setup-cursor.ps1`).
- **Kích hoạt:** nhắc *tester* / *@tester* trong chat, hoặc **@** → chọn rule **tester**.

Agent không tự chạy lệnh trên máy bạn; rule giúp AI đưa checklist và mẫu lệnh đúng repo.

---

## 7. Hướng mở rộng (không bắt buộc MVP)

- `MediationPro.Api.Tests` + `WebApplicationFactory` (integration HTTP).
- TestContainers cho Postgres/Redis.
- E2E Playwright cho luồng UI quan trọng.

---

## 8. Liên quan

- [Doc 130 — Git Organization Strategy](./130-GIT-ORGANIZATION-STRATEGY.md) — CI/CD & branch.
- [AGENTS.md](../AGENTS.md) — entry point cho AI.
