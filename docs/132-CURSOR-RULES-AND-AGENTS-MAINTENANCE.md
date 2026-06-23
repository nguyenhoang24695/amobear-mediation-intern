# Doc 132 — Bảo trì Cursor Rules & Agents (nexus-cursor-skills)

> **Audience:** Tech Lead, dev chỉnh sửa AI context  
> **Last updated:** April 2026  
> **Liên quan:** [Doc 130 — Git Organization Strategy](./130-GIT-ORGANIZATION-STRATEGY.md) §3.9, §9; [AGENTS.md](../AGENTS.md)

Tài liệu mô tả **khi nào** và **làm thế nào** để bổ sung hoặc cập nhật file `.mdc` (Project Rules) và hành vi agent khi codebase hoặc quy trình dự án thay đổi.

---

## 1. Hai lớp cần nhớ

| Lớp | Vị trí | Vai trò |
|-----|--------|---------|
| **Canonical (nguồn sự thật)** | `nexus-cursor-skills/` | Chỉnh sửa **ở đây** trước; phù hợp tách repo `nexus-cursor-skills` sau (Doc 130). |
| **Áp dụng cục bộ** | `.cursor/rules/` | Bản **copy** do script tạo — không sửa tay trừ khi thử nhanh; luồng chuẩn là sửa canonical rồi chạy lại script. |

File [AGENTS.md](../AGENTS.md) ở root trỏ AI tới `nexus-cursor-skills/` và lệnh setup.

---

## 2. Khi nào cần cập nhật rules?

- **Kiến trúc / stack:** đổi framework (ví dụ .NET major, Next major), thêm service (Kafka, v.v.), đổi tên layer — cập nhật `shared/global.mdc`, `shared/architecture.mdc`.
- **Quy ước:** đổi convention commit, branch, doc series — `shared/conventions.mdc`.
- **Domain kỹ thuật theo team:** pipeline ETL, API, SQL StarRocks, Superset — file trong `teams/backend/` hoặc `teams/da/` tương ứng.
- **Hành vi agent:** planner/reviewer/tester/docs-writer — `agents/*.mdc` (thêm checklist, lệnh `dotnet test`/`pnpm test`, link Doc mới).
- **Tài liệu nền:** có Doc 99–131 mới thay thế hoặc bổ sung kiến thức cốt lõi — thêm dòng tham chiếu trong `architecture.mdc` hoặc rule team liên quan.

Theo Doc 130 §10 (rủi ro R7): review `nexus-cursor-skills` **mỗi sprint** nếu có thay đổi kiến trúc lớn.

---

## 3. Cách thêm rule `.mdc` mới

1. Tạo file trong đúng thư mục:
   - Luôn áp dụng: `shared/` + `alwaysApply: true` trong frontmatter.
   - Theo file pattern: `teams/<team>/` + `globs:` + `alwaysApply: false`.
   - Agent: `agents/` + `description:` rõ ràng (từ khóa để Cursor gợi ý rule).
2. Frontmatter tối thiểu:

```yaml
---
description: Một dòng mô tả — gồm từ khóa tìm kiếm
alwaysApply: false
globs: backend/**/*.cs
---
```

3. Giữ nội dung **ngắn, một chủ đề** (khuyến nghị Cursor: dưới ~50 dòng mỗi rule khi có thể).
4. Thêm mục vào [nexus-cursor-skills/README.md](../nexus-cursor-skills/README.md) (mapping role) nếu là team mới hoặc role mới.

---

## 4. Cách cập nhật rule hiện có

1. Sửa file trong `nexus-cursor-skills/` (không chỉ `.cursor/rules/`).
2. Chạy lại script copy để đồng bộ workspace (Windows):

```powershell
.\nexus-cursor-skills\scripts\setup-cursor.ps1 -Role mvp -Clean
```

(`mvp` = shared + agents + backend + da; dùng `-Role backend` hoặc `-Role da` nếu chỉ cần subset — xem [SETUP.md](../nexus-cursor-skills/SETUP.md).)

3. Reload Cursor (hoặc đóng/mở project) để Rules nhận bản mới.
4. **Không** commit secret, URL nội bộ có token, hay key trong `.mdc`.

---

## 5. Thêm team / role mới (ví dụ `teams/frontend/`)

1. Tạo thư mục `nexus-cursor-skills/teams/<role>/` và các file `.mdc`.
2. Mở rộng [setup-cursor.ps1](../nexus-cursor-skills/scripts/setup-cursor.ps1) và [setup-cursor.sh](../nexus-cursor-skills/scripts/setup-cursor.sh): nhánh `case` cho role mới (copy `shared/` + `agents/` + `teams/<role>/`).
3. Cập nhật [SETUP.md](../nexus-cursor-skills/SETUP.md) và [README.md](../nexus-cursor-skills/README.md).
4. (Khi tách repo) Doc 130: `nexus-cursor-skills` do Tech Lead review; CODEOWNERS toàn repo.

---

## 6. Đồng bộ với thay đổi tài liệu dự án (`docs/`)

- Khi **Doc kiến trúc** (99, 120, 122, …) đổi: cập nhật đường dẫn hoặc tóm tắt trong `shared/architecture.mdc` hoặc rule team — tránh copy cả doc vào rule; chỉ **pointer + checklist**.
- Khi **quy trình test** đổi: cập nhật `agents/tester.mdc` và [Doc 131](./131-TESTING-AMOBEAR-NEXUS.md).

---

## 7. PR & review

- PR chỉ sửa rules: nhãn **docs** hoặc **chore**; ít nhất một người hiểu context (Tech Lead hoặc owner theo Doc 130).
- So sánh diff: `nexus-cursor-skills/` **và** (nếu commit) `.cursor/rules/` — hai thư mục phải khớp sau khi chạy script.

---

## 8. Checklist nhanh sau khi merge thay đổi lớn

- [ ] Đã sửa `nexus-cursor-skills/`, không chỉ `.cursor/rules/`.
- [ ] Đã chạy `setup-cursor.ps1 -Role mvp -Clean` (hoặc role đúng).
- [ ] Đã reload Cursor và kiểm tra Rules.
- [ ] `AGENTS.md` / Doc 132 cập nhật nếu có workflow mới cho AI.
