# Tài liệu hướng dẫn Mediation Pro

Thư mục này chứa tất cả các file hướng dẫn và troubleshooting cho dự án Mediation Pro.

## Danh sách tài liệu theo thứ tự

### 1. Testing Guide
**File:** `01-TESTING-GUIDE.md`
- Hướng dẫn chi tiết từng bước để test và debug AdMob API
- Bao gồm: Setup, OAuth flow, Test API endpoints

### 2. Troubleshooting
**File:** `02-TROUBLESHOOTING.md`
- Các vấn đề thường gặp khi chạy ứng dụng
- Không vào được URLs, port issues, HTTPS certificate

### 3. OAuth Setup Guide
**File:** `03-OAUTH-SETUP-GUIDE.md`
- Hướng dẫn cấu hình OAuth 2.0 trong Google Cloud Console
- Sửa lỗi "invalid request" khi OAuth

### 4. OAuth Flow Explained
**File:** `04-OAUTH-FLOW-EXPLAINED.md`
- Giải thích chi tiết OAuth flow hoạt động như thế nào
- Tại sao không thấy "code" trong response

### 5. Fix Token Not Saved
**File:** `05-FIX-TOKEN-NOT-SAVED.md`
- Sửa lỗi token không được lưu vào database
- JSON deserialization issues

### 6. Fix Hangfire Database
**File:** `06-FIX-HANGFIRE-DB.md`
- Sửa lỗi "database mediationpro_hangfire does not exist"
- Cách tạo Hangfire database

### 7. Run Quick Start
**File:** `07-RUN-QUICK-START.md`
- Hướng dẫn chạy quick-start.ps1 trên Windows
- Execution Policy issues

### 8. Chạy Script (Tiếng Việt)
**File:** `08-CHAY-SCRIPT.txt`
- Hướng dẫn ngắn gọn bằng tiếng Việt
- Các cách chạy PowerShell script

### 9. OAuth Automation Setup
**File:** `09-OAUTH-AUTOMATION-SETUP.md`
- Hướng dẫn setup OAuth một lần để hệ thống tự động refresh token
- Giải thích cơ chế background job tự động refresh
- Troubleshooting token issues

### 10. Cursor IDE Guide
**File:** `10-CURSOR-IDE-GUIDE.md`
- Hướng dẫn sử dụng Cursor IDE (navigation, debug, phím tắt)
- Cách tra cứu code (Go to Definition, Peek, References)
- Cách debug và đặt breakpoint
- Phím tắt hữu ích

### 11-26. Các tài liệu khác
Xem danh sách đầy đủ trong thư mục `docs/` với các file từ `11-` đến `26-`

### 108. Activity Log Phase 1 Design
**File:** `108-ACTIVITY-LOG-PHASE-1-DESIGN.md`
- Thiết kế `activity_logs` phase 1 cho `waterfall + jobs + organization/user audit`
- Bao gồm: schema, event types, filter cho Global Activity Center, permission, demo data
- Làm nền để mở rộng sang các module khác về sau

### 27. ABP Portal Setup Guide
**File:** `27-ABP-PORTAL-SETUP-GUIDE.md`
- Hướng dẫn setup chi tiết ABP Framework cho Frontend Portal
- Cài đặt packages, cấu hình database, setup Tailwind CSS
- Tích hợp Stitch components và Backend API

### 28. ABP Portal README
**File:** `28-ABP-PORTAL-README.md`
- Quick start guide cho ABP Portal
- Cấu trúc project và development workflow
- Links và tài liệu tham khảo


### 119. Waterfall Rule Config User Manual
**File:** `119 - WATERFALL RULE CONFIG USER MANUAL.md`
- User manual cho man `Waterfall Rules` theo mo hinh `config master + app mapping`
- Bao gom: create draft config, app assignment, global default, apply mode sync, va app detail assignment
- Co so do `mermaid` de xem workflow truc tiep trong file Markdown

### Alert Center — routes frontend
**File:** `ALERT-CENTER-FRONTEND-ROUTES.md`
- URL chuan `/alert-center` va `/alert-center/{id}`, redirect tu `/alerts`
- Tham chieu nhanh component va API `AlertsController`

## Scripts

Các script PowerShell và SQL nằm trong thư mục `../scripts/`:

### Backend Scripts
- `quick-start.ps1` - Setup tự động toàn bộ môi trường
- `test-api.ps1` - Test tự động các API endpoints
- `test-oauth.ps1` - Test OAuth configuration
- `check-app.ps1` - Kiểm tra trạng thái ứng dụng
- `setup-hangfire-db.ps1` - Tạo Hangfire database
- `create-hangfire-db.sql` - SQL script để tạo database
- `test-report.json` - JSON mẫu để test report API

### Frontend Scripts
- `27-setup-abp-packages.ps1` - Cài đặt ABP Framework packages cho Portal

## Quick Reference

### Setup lần đầu
1. Đọc: `07-RUN-QUICK-START.md`
2. Chạy: `scripts/quick-start.ps1`

### Test OAuth
1. Đọc: `03-OAUTH-SETUP-GUIDE.md`
2. Chạy: `scripts/test-oauth.ps1`

### Test API
1. Đọc: `01-TESTING-GUIDE.md`
2. Chạy: `scripts/test-api.ps1`

### Troubleshooting
1. Đọc: `02-TROUBLESHOOTING.md`
2. Chạy: `scripts/check-app.ps1`

### Fix lỗi token không lưu
1. Đọc: `05-FIX-TOKEN-NOT-SAVED.md`

### Fix lỗi Hangfire database
1. Đọc: `06-FIX-HANGFIRE-DB.md`
2. Chạy: `scripts/setup-hangfire-db.ps1`

### Setup OAuth tự động (một lần)
1. Đọc: `09-OAUTH-AUTOMATION-SETUP.md`
2. Sau khi setup, hệ thống tự động refresh token

### Setup ABP Portal
1. Đọc: `27-ABP-PORTAL-SETUP-GUIDE.md`
2. Chạy: `scripts/27-setup-abp-packages.ps1`
3. Quick reference: `28-ABP-PORTAL-README.md`

## Cấu trúc thư mục

```
MediationPro/
├── docs/                    # Tài liệu hướng dẫn
│   ├── 01-TESTING-GUIDE.md
│   ├── 02-TROUBLESHOOTING.md
│   ├── ... (các file từ 03-26)
│   ├── 27-ABP-PORTAL-SETUP-GUIDE.md
│   └── 28-ABP-PORTAL-README.md
├── scripts/                 # Scripts và utilities
│   ├── quick-start.ps1
│   ├── test-api.ps1
│   ├── ... (các scripts khác)
│   └── 27-setup-abp-packages.ps1
└── README.md                # README chính (giữ ở root)
```
