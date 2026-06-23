# Meta Business Manager API — Tài liệu tham chiếu quản lý BM qua API

> **Version:** v25.0 (Graph API)  
> **Cập nhật:** April 2026  
> **Dành cho:** Amobear Nexus — Tích hợp quản lý tài khoản BM tự động  
> **Base URL:** `https://graph.facebook.com/v25.0`

---

## 1. TỔNG QUAN KIẾN TRÚC

### 1.1 Hai tầng API (Tier 1 vs Tier 2)

| Tier | Mô tả | Use Case |
|------|--------|----------|
| **Tier 1** | Quản lý single BM: users, roles, assets, partners | Amobear quản lý BM của chính mình |
| **Tier 2** | Parent BM tạo/quản lý Child BMs, centralized billing | Agency model, multi-client management |

### 1.2 Các nhóm API chính

| Nhóm | Chức năng | Endpoints chính |
|------|-----------|-----------------|
| **Business Manager** | CRUD BM, đọc thông tin BM | `/{bm_id}`, `/{user_id}/businesses` |
| **User Management** | Invite/remove users, change roles | `/{bm_id}/business_users`, `/{bm_id}/system_users` |
| **Asset Management** | Ad accounts, Pages, Pixels, IG, Catalogs | `/{bm_id}/owned_ad_accounts`, `/{bm_id}/owned_pages` |
| **Agency/Client** | Quản lý mối quan hệ agency-client | `/{bm_id}/agencies`, `/{bm_id}/clients` |
| **2-Tier (Parent-Child)** | Tạo/quản lý child BMs | `/{bm_id}/owned_businesses` |
| **Finance** | Credit lines, invoices | `/{bm_id}/extendedcredits`, `/{bm_id}/business_invoices` |

---

## 2. AUTHENTICATION & PERMISSIONS

### 2.1 Cách truyền Token — QUAN TRỌNG

```
⚠️ LUÔN dùng Authorization Header, KHÔNG BAO GIỜ truyền token qua query params.

✅ ĐÚNG:
   Header: Authorization: Bearer {ACCESS_TOKEN}

❌ SAI:
   URL: ?access_token={ACCESS_TOKEN}
   → Token lộ trong URL history, server logs, referer headers, proxy logs
```

**Ví dụ request chuẩn:**

```bash
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}?fields=id,name"
```

### 2.2 Loại Token

| Token Type | Thời hạn | Tạo bằng | Use Case |
|------------|----------|----------|----------|
| **System User Token** | Không hết hạn | Business Settings > System Users > Generate Token | ✅ **Khuyến nghị cho automation** |
| **User Access Token** | Short-lived (~1h), extend 60 ngày | OAuth Login Flow | Thao tác thay mặt user cụ thể |
| **App Access Token** | Không hết hạn | `{app_id}\|{app_secret}` | Rất hạn chế, không dùng cho BM API |

### 2.3 Permissions cần thiết

| Permission | Mô tả | Access Level |
|------------|--------|-------------|
| `business_management` | CRUD BM, manage users/assets | Cần App Review cho production |
| `ads_management` | Tạo/sửa campaigns, ad accounts | Cần App Review |
| `ads_read` | Đọc ad performance data | Cần App Review |
| `pages_manage_metadata` | Quản lý Pages | Cần App Review |
| `instagram_basic` | Đọc IG profile/media | Cần App Review |

### 2.4 System User — Chi tiết

| Loại | Role | Quyền hạn |
|------|------|-----------|
| **Admin System User** | ADMIN | Full access mọi asset trong BM |
| **System User** | EMPLOYEE | Chỉ access assets được assign cụ thể |

### 2.5 Token Security

```
┌─────────────────────────────────────────────────────┐
│ Token Storage Architecture                           │
│                                                      │
│ System User Token                                    │
│   └── AES-256 Encrypted → PostgreSQL                │
│   └── Không hết hạn → Không cần refresh logic       │
│   └── Rotate định kỳ (quarterly) qua BM UI          │
│   └── Truyền qua Authorization: Bearer header       │
│                                                      │
│ KHÔNG BAO GIỜ:                                       │
│   ✗ Hardcode token trong source code                 │
│   ✗ Log token ra stdout/file                         │
│   ✗ Truyền token qua query string (?access_token=)  │
│   ✗ Commit token vào git                             │
└─────────────────────────────────────────────────────┘
```

---

## 3. BUSINESS MANAGER — CRUD

### 3.1 Đọc thông tin BM

```bash
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}?fields=id,name,primary_page,verification_status,created_time,two_factor_type,vertical,timezone_id"
```

### 3.2 Tạo BM mới

```bash
curl -X POST \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=Amobear BM&vertical=GAMING&primary_page={PAGE_ID}&timezone_id=175" \
  "https://graph.facebook.com/v25.0/me/businesses"
```

### 3.3 Cập nhật BM

```bash
curl -X POST \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "name=Amobear Updated&vertical=GAMING&two_factor_type=admin_required" \
  "https://graph.facebook.com/v25.0/{bm_id}"
```

### 3.4 Liệt kê BMs của user

```bash
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/me/businesses"
```

### 3.5 Vertical Values

```
NOT_SET, ADVERTISING, AUTOMOTIVE, CONSUMER_PACKAGED_GOODS, ECOMMERCE, 
EDUCATION, ENERGY_AND_UTILITIES, ENTERTAINMENT_AND_MEDIA, FINANCIAL_SERVICES, 
GAMING, GOVERNMENT_AND_POLITICS, MARKETING, ORGANIZATIONS_AND_ASSOCIATIONS, 
PROFESSIONAL_SERVICES, RETAIL, TECHNOLOGY, TELECOM, TRAVEL, 
NON_PROFIT, RESTAURANT, HEALTH, LUXURY, OTHER
```

---

## 4. USER MANAGEMENT

### 4.1 Business Users (Người thật)

```bash
# List all users (cần Advanced Access)
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/business_users?fields=id,name,email,role&summary=total_count"

# Invite user
curl -X POST -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "email=newuser@amobear.com&role=EMPLOYEE" \
  "https://graph.facebook.com/v25.0/{bm_id}/business_users"

# List pending users
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/pending_users?fields=id,email,role,status"

# Change role
curl -X POST -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "role=ADMIN" \
  "https://graph.facebook.com/v25.0/{business_scoped_user_id}"

# Remove user
curl -X DELETE -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{business_scoped_user_id}"

# Cancel pending invite
curl -X DELETE -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{pending_user_id}"
```

**Roles:** `ADMIN`, `EMPLOYEE`, `FINANCE_EDITOR`, `FINANCE_ANALYST`, `DEVELOPER`

⚠️ **Rate limit:** Invite bị giới hạn/ngày. Error code 17 → đợi 24h.

### 4.2 System Users

```bash
# List system users
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/system_users?fields=id,name,role&summary=total_count"

# Create system user
curl -X POST -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "name=Nexus Automation Bot&role=ADMIN" \
  "https://graph.facebook.com/v25.0/{bm_id}/system_users"
```

---

## 5. AD ACCOUNT MANAGEMENT

```bash
# List owned ad accounts
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/owned_ad_accounts?fields=id,account_id,name,account_status,currency,timezone_id,amount_spent,balance,permitted_tasks,access_type&limit=100"

# Claim existing account (⚠️ IRREVERSIBLE)
curl -X POST -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "adaccount_id=act_123456789" \
  "https://graph.facebook.com/v25.0/{bm_id}/owned_ad_accounts"

# Create new ad account (limit 5 via API)
curl -X POST -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "name=Amobear WeatherApp US&currency=USD&timezone_id=1&end_advertiser={BM_ID}&media_agency=NONE&partner=NONE" \
  "https://graph.facebook.com/v25.0/{bm_id}/adaccount"

# Assign user to ad account
curl -X POST -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d 'user={USER_ID}&tasks=["MANAGE","ADVERTISE","ANALYZE"]' \
  "https://graph.facebook.com/v25.0/act_{id}/assigned_users"

# List users on ad account
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/act_{id}/assigned_users?fields=id,name,email,tasks"

# List user's ad accounts
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{user_id}/assigned_ad_accounts?fields=id,name,account_status"

# Remove user from ad account
curl -X DELETE -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "user={USER_ID}" \
  "https://graph.facebook.com/v25.0/act_{id}/assigned_users"

# Remove ad account from BM (AGENCY/PENDING only)
curl -X DELETE -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "adaccount_id=act_123456789" \
  "https://graph.facebook.com/v25.0/{bm_id}/ad_accounts"

# List pending ad accounts
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/pending_owned_ad_accounts"
```

**Task permissions:**

| Tasks | Role | Quyền |
|-------|------|-------|
| `["ANALYZE"]` | Reporting only | Xem data |
| `["ADVERTISE", "ANALYZE"]` | General user | Xem + sửa + tạo ads |
| `["MANAGE", "ADVERTISE", "ANALYZE"]` | Admin | Full control |

---

## 6. PAGE MANAGEMENT

```bash
# Owned pages
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/owned_pages?fields=id,name,category,fan_count"

# Client pages
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/client_pages?fields=id,name,category"

# Pending pages
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/pending_owned_pages"

# Remove page
curl -X DELETE -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "page_id={PAGE_ID}" \
  "https://graph.facebook.com/v25.0/{bm_id}/pages"
```

---

## 7. INSTAGRAM ACCOUNT MANAGEMENT

```bash
# All IG accounts
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/instagram_accounts?fields=id,username"

# Owned IG
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/owned_instagram_accounts?fields=id,username"

# IG business accounts
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/instagram_business_accounts?fields=id,username"

# Remove IG
curl -X DELETE -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "instagram_account={IG_ID}" \
  "https://graph.facebook.com/v25.0/{bm_id}/instagram_accounts"
```

---

## 8. PIXEL & CATALOG MANAGEMENT

```bash
# All pixels | Owned pixels | Client pixels
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/adspixels?fields=id,name,owner_business"
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/owned_pixels?fields=id,name"
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/client_pixels?fields=id,name"

# Owned catalogs | Client catalogs
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/owned_product_catalogs?fields=id,name"
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/client_product_catalogs?fields=id,name"
```

---

## 9. AGENCY / CLIENT RELATIONSHIP

```bash
# List agencies / clients
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/agencies?fields=id,name"
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/clients?fields=id,name"

# Remove
curl -X DELETE -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "business={AGENCY_BM_ID}" \
  "https://graph.facebook.com/v25.0/{bm_id}/agencies"
```

---

## 10. BUSINESS ASSET GROUPS

```bash
# List groups
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/business_asset_groups?fields=id,name"

# Assets in group
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{group_id}/contained_pages"
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{group_id}/contained_adaccounts"

# Add/Remove asset
curl -X POST -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "asset_id={PAGE_ID}" \
  "https://graph.facebook.com/v25.0/{group_id}/contained_pages"
curl -X DELETE -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "asset_id={PAGE_ID}" \
  "https://graph.facebook.com/v25.0/{group_id}/contained_pages"
```

---

## 11. 2-TIER BM (PARENT-CHILD)

```bash
# Create child BM (⚠️ shared_page_id bắt buộc)
curl -X POST -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d 'name=Game Division&shared_page_id={PAGE_ID}&page_permitted_tasks=["MANAGE","CREATE_CONTENT","MODERATE","ADVERTISE","ANALYZE"]&timezone_id=175&child_business_external_id=game_001' \
  "https://graph.facebook.com/v25.0/{parent_bm_id}/owned_businesses"

# List child BMs
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{parent_bm_id}/owned_businesses?fields=id,name,child_business_external_id"

# Delete child BM
curl -X DELETE -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "client_id={CHILD_BM_ID}" \
  "https://graph.facebook.com/v25.0/{parent_bm_id}/owned_businesses"

# Managed businesses (aggregator)
curl -X POST -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d "name=Client Corp&timezone_id=175&vertical=GAMING" \
  "https://graph.facebook.com/v25.0/{bm_id}/managed_businesses"
```

---

## 12. FINANCE & INVOICING

### 12.1 Extended Credits (Credit Lines)

```bash
# List credit lines với đầy đủ fields
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/extendedcredits?fields=id,legal_entity_name,allocated_amount,balance,credit_available,max_balance,online_max_balance,owner_business_name,credit_type,is_automated_experience,liable_biz_name,send_bill_to_biz_name,partition_from,is_access_revoked"
```

#### Extended Credit Fields — Chi tiết

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | numeric string | ID credit line |
| `legal_entity_name` | string | Tên pháp lý chủ credit line |
| `allocated_amount` | CurrencyAmount | Tổng credit phân bổ cho businesses khác |
| `balance` | CurrencyAmount | Tổng chi tiêu (parent + child accounts). Đo bằng USD |
| `credit_available` | CurrencyAmount | Credit khả dụng |
| `max_balance` | CurrencyAmount | Credit limit cho business cụ thể |
| `online_max_balance` | CurrencyAmount | Raw credit limit toàn business |
| `owner_business` | Business | Business chịu trách nhiệm thanh toán |
| `owner_business_name` | string | Tên business thanh toán |
| `credit_type` | enum | `ADS_BUSINESS`, `ADS_SEQUENTIAL`, `WHATSAPP_BUSINESS` |
| `is_automated_experience` | bool | Fully automated experience |
| `is_access_revoked` | bool | Credit owner đã revoke access |
| `liable_biz_name` | string | Business chịu trách nhiệm khi dùng credit |
| `send_bill_to_biz_name` | string | Business nhận hóa đơn |
| `partition_from` | string | Business cấp credit (cho `ADS_SEQUENTIAL`) |

**CurrencyAmount Object:**
```json
{
  "amount": "5000.00",
  "amount_in_hundredths": "500000",
  "currency": "USD",
  "offsetted_amount": "500000"
}
```

```bash
# Chi tiết 1 credit line
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{extended_credit_id}?fields=id,legal_entity_name,allocated_amount,balance,credit_available,max_balance,online_max_balance,owner_business_name,credit_type"

# Invoice groups trong credit line
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{extended_credit_id}/extended_credit_invoice_groups"

# Credit allocation configs (phân bổ cho child BMs)
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{extended_credit_id}/owning_credit_allocation_configs"
```

### 12.2 Invoices

```bash
# Invoices theo date range
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/business_invoices?start_date=2026-01-01&end_date=2026-04-01&fields=id,billed_amount_details,billing_period,invoice_id,payment_term,type,payment_status,due_date,invoice_date,amount_due,download_uri"

# Invoices với campaign breakdown
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  "https://graph.facebook.com/v25.0/{bm_id}/business_invoices?start_date=2026-01-01&end_date=2026-04-01&fields=billed_amount_details,billing_period,entity,id,invoice_id,payment_term,type,campaigns"
```

---

## 13. ERROR CODES REFERENCE

| Code | Mô tả | Xử lý |
|------|--------|-------|
| 17 | Rate limit on invite | Đợi 24h |
| 100 | Invalid parameter | Check request params |
| 104 | Incorrect signature | Verify token |
| 190 | Invalid OAuth 2.0 Access Token | Regenerate token |
| 200 | Permissions error | Check permission scope |
| 368 | Action deemed abusive | Đợi & retry |
| 415 | 2FA required | User nhập 2FA code |
| 613 | Rate limit exceeded | Exponential backoff |
| 3914 | Cannot remove last admin | Phải có ≥1 admin |
| 3918 | Page owned by another BM | Request access thay vì claim |
| 3949 | Max system user limit | Delete unused system users |
| 3965 | Max admin system user limit | Downgrade hoặc delete |
| 42001 | Page linked to IG business | Unlink IG trước |
| 80004 | Too many calls to ad account | Exponential backoff |
| 104001 | App not claimed by BM | Add app to BM first |

---

## 14. RATE LIMITING

| Tier | Calls/hour | Điều kiện |
|------|-----------|-----------|
| Development | 200 | App in dev mode |
| Standard | 300 per BM | App approved, < 10 ad accounts |
| Standard+ | 3,000 per BM | App approved, 10+ ad accounts |

**Best Practices:** Batch requests, exponential backoff (1s → 5min), cache responses, monitor `x-business-use-case-usage` header.

---

## 15. INTEGRATION CHECKLIST CHO AMOBEAR NEXUS

### Phase 1: Foundation (Sprint 1-2)

- [ ] Tạo Admin System User trong BM chính
- [ ] Generate non-expiring token, lưu AES-256 encrypted vào PostgreSQL
- [ ] App Review: submit `business_management` + `ads_management` + `ads_read`
- [ ] HTTP client: dùng `Authorization: Bearer` header (KHÔNG query params)
- [ ] Sync: BM info, owned ad accounts, business users, system users, extended credits
- [ ] Lưu vào `meta_accounts` table trong PostgreSQL

### Phase 2: Automation (Sprint 3-4)

- [ ] Batch assign/revoke permissions trên ad accounts
- [ ] Sync invoices vào StarRocks Gold layer
- [ ] Audit trail: log permission changes vào `audit_logs`
- [ ] Daily sync job: ad accounts + users + permissions

### Phase 3: Advanced (Sprint 5+)

- [ ] Asset Groups management
- [ ] 2-Tier BM nếu cần child BMs
- [ ] Finance dashboard: credit lines + invoices + campaign breakdown
- [ ] Alert khi permissions thay đổi ngoài hệ thống

---

## 16. CẢNH BÁO RỦI RO

| Rủi ro | Mức độ | Giảm thiểu |
|--------|--------|-----------|
| Token lộ qua query params | 🔴 Critical | Luôn dùng Authorization Bearer header |
| Claim ad account không đảo ngược | 🔴 Critical | Test sandbox trước, double-confirm UX |
| Token leak | 🔴 Critical | AES-256 encrypt, never log, rotate quarterly |
| Rate limit invite | 🟡 Medium | Queue + retry 24h |
| API version deprecation (2 năm) | 🟡 Medium | Track changelog, upgrade trước 6 tháng |
| App Review lead time | 🟡 Medium | Submit sớm, 2-4 tuần |

---

## 17. TÀI LIỆU THAM KHẢO

| Resource | URL |
|----------|-----|
| Business Manager API Reference | https://developers.facebook.com/docs/marketing-api/reference/business/ |
| Extended Credit Reference | https://developers.facebook.com/docs/marketing-api/reference/extended-credit/ |
| Business Management APIs | https://developers.facebook.com/docs/business-management-apis/business-manager-api/ |
| System Users Guide | https://developers.facebook.com/docs/business-management-apis/system-users |
| Ad Account Management | https://developers.facebook.com/docs/business-management-apis/business-asset-management/guides/ad-accounts/ |
| Graph API Explorer | https://developers.facebook.com/tools/explorer/ |
| Marketing API Changelog | https://developers.facebook.com/docs/marketing-api/marketing-api-changelog |
