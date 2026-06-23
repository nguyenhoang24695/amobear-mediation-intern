# AI Provider Usage & Billing APIs

> Tài liệu tham khảo: cách lấy số liệu usage/cost (chi phí đã sử dụng) từ từng AI provider để cập nhật & quản lý quota. Phiên bản: 1.0.

---

## 1. Cách MediationPro đang tính chi phí (hiện tại)

- **Nguồn:** Mỗi lần gọi AI (Ask, Execute SQL, v.v.), response trả về `input_tokens` và `output_tokens`. Backend **tự tính cost** theo công thức:
  - `cost = (inputTokens × CostPerInputPerM + outputTokens × CostPerOutputPerM) / 1_000_000`
- **Pricing lấy từ đâu:**
  - **Ưu tiên:** Bảng `ai_provider_configs` (Admin → AI Settings): `cost_per_input_token`, `cost_per_output_token` (USD per 1M tokens).
  - **Fallback:** Nếu không cấu hình hoặc = 0, từng provider dùng bảng giá cứng trong code (OpenAiProvider.Pricing, ClaudeProvider.Pricing, GeminiProvider.Pricing).
- **Lưu trữ:** Cost được ghi vào `ai_token_usages` (PostgreSQL) và/hoặc Redis (`ai:quota:{userId}:daily:{yyyyMMdd}`, `ai:quota:{userId}:monthly:{yyyyMM}`). Quota status (GetMyUsage) đọc từ Redis hoặc aggregate từ `ai_token_usages`.

**Để “spent” hiển thị đúng:**

1. Vào **AI Admin → Provider settings** (OpenAI, Claude, Gemini), nhập **Cost per 1M input tokens** và **Cost per 1M output tokens** (hoặc để trống để dùng giá mặc định trong code).
2. Đảm bảo sau mỗi request, backend gọi `RecordUsageAsync(..., cost)` với `cost > 0` khi có tokens (các provider đã có fallback pricing khi DB = 0).

---

## 2. OpenAI — Usage & Cost API

- **Tài liệu:** [Usage API](https://community.openai.com/t/introducing-the-usage-api-track-api-usage-and-costs-programmatically/1043058), [Costs API Reference](https://platform.openai.com/docs/api-reference/organization-costs/get-costs) (hoặc tương đương trong API reference).
- **Yêu cầu:** API key có quyền **Organization/Admin** (thường dùng cho billing).
- **Endpoint chính (Cost):** `GET https://api.openai.com/v1/organization/costs` (hoặc path tương đương theo phiên bản API).
  - Query params: `start_time`, `end_time` (Unix timestamp), `group_by` (project_id, line_item, …), `bucket_width` (vd. `1d`), `limit`, `page`.
  - Response: token usage (input/output/cached), request counts theo model, cost theo bucket.
- **Ý nghĩa:** Có thể gọi định kỳ (job) để lấy **chi phí thực tế theo hóa đơn OpenAI**, so sánh với số liệu tự tính trong MediationPro hoặc dùng để cập nhật/sync quota.

**Ghi chú:** Đường dẫn chính xác (vd. `/v1/organization/costs` hay `/organization/costs`) cần kiểm tra lại trong [OpenAI API Reference](https://platform.openai.com/docs/api-reference) mới nhất.

---

## 3. Anthropic (Claude) — Usage & Cost Admin API

- **Tài liệu:** [Usage and Cost API](https://docs.anthropic.com/en/api/data-usage-cost-api).
- **Yêu cầu:**
  - **Admin API key** (dạng `sk-ant-admin...`), chỉ tạo được trong Claude Console bởi thành viên có role admin.
  - Chỉ dùng được với **organization**, không dùng với tài khoản cá nhân.
- **Endpoints:**
  - **Usage (tokens):** `GET https://api.anthropic.com/v1/organizations/usage_report/messages`
    - Params: `starting_at`, `ending_at` (ISO 8601), `bucket_width` (`1m` | `1h` | `1d`), `group_by[]` (model, workspace_id, api_key_id, …), `models[]`, …
    - Trả về: uncached/cached input, cache creation, output tokens theo bucket và group.
  - **Cost (USD):** `GET https://api.anthropic.com/v1/organizations/cost_report`
    - Params: `starting_at`, `ending_at`, `group_by[]` (workspace_id, description), …
    - Cost theo service (token usage, web search, code execution); đơn vị USD (decimal string, cents).
- **Pagination:** Cả hai endpoint hỗ trợ `limit` và `page` (trường `next_page`, `has_more`).
- **Ý nghĩa:** Có thể dùng Admin API để lấy **usage và cost thực tế theo organization**, sync vào hệ thống quota hoặc báo cáo.

---

## 4. Google (Gemini) — Không có Usage/Cost API tương đương

- **Tài liệu:** [Billing](https://ai.google.dev/gemini-api/docs/billing), [Counting tokens](https://ai.google.dev/api/tokens).
- **Thực tế:**
  - Mỗi response có `usageMetadata` (promptTokenCount, candidatesTokenCount) — MediationPro đã dùng để tính cost trong code.
  - **Không** có REST API công khai để “lấy tổng chi phí đã sử dụng” theo ngày/tháng như OpenAI/Anthropic.
  - Với GCP (Google Cloud): có thể dùng **Cloud Billing Export** (BigQuery), gán label cho request và query billing data — nằm ngoài phạm vi API Gemini trực tiếp.
- **Kết luận:** Chi phí Gemini trong MediationPro **chỉ** có thể dựa trên **tính toán từ token mỗi request** (pricing trong DB hoặc trong code). Không có cách “pull spent” từ Google qua API giống OpenAI/Claude.

---

## 5. Tóm tắt & Gợi ý triển khai

| Provider | Lấy “spent” từ API nhà cung cấp? | Cách hiện tại trong MediationPro |
|----------|-----------------------------------|-----------------------------------|
| **OpenAI** | Có — Usage/Cost API (key Org/Admin) | Tự tính từ tokens × pricing (DB hoặc fallback), lưu vào quota. Có thể thêm job sync từ Cost API. |
| **Claude** | Có — Usage & Cost Admin API (Admin key) | Tự tính từ tokens × pricing. Có thể thêm job sync từ cost_report / usage_report. |
| **Gemini** | Không (chỉ billing export GCP) | Chỉ tự tính từ tokens × pricing. |

**Để quota và “spent” hoạt động đúng ngay hiện tại:**

1. Cấu hình **Cost per 1M input/output tokens** trong AI Admin cho từng provider (hoặc dựa vào fallback trong code).
2. Kiểm tra sau mỗi request AI rằng `RecordUsageAsync` được gọi với `cost` tương ứng (đã có trong Ask/Execute flow).
3. Nếu dùng Redis: đảm bảo key `ai:quota:{userId}:daily|monthly` có cả field `cost` (backend hiện đã ghi khi record usage).

**Nếu muốn dùng số liệu “chính thức” từ nhà cung cấp:**

- **OpenAI:** Thêm job (scheduled) gọi Cost/Usage API bằng Org/Admin key, parse response và cập nhật bảng usage/quota (hoặc bảng riêng “provider_billing_snapshot”) để so sánh với self-calculated.
- **Claude:** Tương tự với Admin API (`usage_report/messages`, `cost_report`), dùng Admin key, có thể group theo workspace hoặc description để map về user/team nếu cần.
- **Gemini:** Giữ nguyên cơ chế tự tính; nếu cần đối chiếu hóa đơn GCP thì thiết kế riêng theo Billing Export.

---

> **Cập nhật:** Khi OpenAI/Anthropic/Google thay đổi endpoint hoặc thêm API usage/billing, nên cập nhật lại tài liệu này và (nếu có) job sync tương ứng.
