# Facebook Ads Manager Platform

Hệ thống quản lý Facebook Ads hoàn chỉnh được xây dựng bằng PHP, tương tự Facebook Ads Manager với đầy đủ chức năng tạo, chỉnh sửa, giám sát, tối ưu và báo cáo.

## Tính năng chính

### 🎯 Campaign Management
- Tạo, chỉnh sửa, xóa campaigns
- Hỗ trợ tất cả objectives: TRAFFIC, CONVERSIONS, ENGAGEMENT, LEADS, SALES, AWARENESS
- Quản lý budget (daily/lifetime)
- Bid strategies: LOWEST_COST, COST_CAP, BID_CAP
- A/B Testing

### 📊 Ad Set Management
- Targeting nâng cao: demographics, interests, behaviors, custom audiences
- Placements: Facebook, Instagram, Audience Network, Messenger
- Optimization goals & scheduling
- Budget optimization (CBO)

### 🎨 Creative Management
- Upload media: images, videos, carousels
- Ad formats: Single Image, Carousel, Collection, Dynamic
- Call-to-action & ad copy management

### 👥 Audience Management
- Custom Audiences
- Lookalike Audiences
- Saved Audiences

### 📈 Reporting & Analytics
- Real-time dashboard
- Metrics: Reach, CTR, CPC, CPM, ROAS
- Export reports: CSV, Excel, PDF
- Automated reports

### 🤖 Automation & Optimization
- Automated rules (pause/activate)
- Budget reallocation
- Performance alerts

## Cài đặt

### Yêu cầu hệ thống
- PHP 7.4 trở lên
- MySQL 5.7 trở lên
- Web server (Apache/Nginx)
- cURL extension
- JSON extension

### 1. Cấu hình Environment (.env)

**Quan trọng**: Hệ thống sử dụng file `.env` để quản lý cấu hình.

```bash
# Sao chép file mẫu
copy .env.example .env
```

Cập nhật thông tin trong file `.env`:

```env
# Database
DB_HOST=localhost
DB_NAME=facebook_ads_manager
DB_USER=root
DB_PASS=your_password

# Facebook API (Bắt buộc)
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret
FB_ACCESS_TOKEN=your_long_lived_access_token

# Security
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

📖 **Xem hướng dẫn chi tiết**: [docs/ENV_SETUP.md](docs/ENV_SETUP.md)

### 2. Cài đặt cơ sở dữ liệu

```sql
-- Tạo database
CREATE DATABASE facebook_ads_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Import schema
mysql -u root -p facebook_ads_manager < database/schema.sql
```

### 2. Cấu hình

Chỉnh sửa file `src/config/Config.php`:

```php
// Database Configuration
const DB_HOST = 'localhost';
const DB_NAME = 'facebook_ads_manager';
const DB_USER = 'your_username';
const DB_PASS = 'your_password';

// Facebook API Configuration
const GRAPH_API_VERSION = 'v20.0';
```

### 3. Cấu hình Facebook App

1. Tạo Facebook App tại [Facebook Developers](https://developers.facebook.com)
2. Thêm Facebook Login và Marketing API
3. Lấy App ID và App Secret
4. Cấu hình redirect URIs

### 4. Cấu hình Web Server

#### Apache (.htaccess)
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/campaigns/?(.*)$ /src/api/campaigns.php/$1 [QSA,L]
RewriteRule ^api/adsets/?(.*)$ /src/api/adsets.php/$1 [QSA,L]
RewriteRule ^api/insights/?(.*)$ /src/api/insights.php/$1 [QSA,L]
```

#### Nginx
```nginx
location /api/campaigns {
    try_files $uri $uri/ /src/api/campaigns.php$is_args$args;
}

location /api/adsets {
    try_files $uri $uri/ /src/api/adsets.php$is_args$args;
}

location /api/insights {
    try_files $uri $uri/ /src/api/insights.php$is_args$args;
}
```

### 5. Cron Jobs

Thêm vào crontab:

```bash
# Sync insights mỗi giờ
0 * * * * /usr/bin/php /path/to/your/project/src/jobs/sync_insights.php

# Chạy automation rules mỗi 15 phút
*/15 * * * * /usr/bin/php /path/to/your/project/src/jobs/run_automation.php

# Sync lại dữ liệu mỗi ngày lúc 2:00 AM
0 2 * * * /usr/bin/php /path/to/your/project/src/jobs/sync_insights.php
```

## Sử dụng API

### Authentication

Tất cả API requests cần access token trong header:

```bash
Authorization: Bearer YOUR_FACEBOOK_ACCESS_TOKEN
```

### Campaign API

#### Tạo Campaign
```bash
POST /api/campaigns
Content-Type: application/json

{
  "account_id": "act_123456789",
  "name": "My Test Campaign",
  "objective": "OUTCOME_TRAFFIC",
  "status": "PAUSED",
  "daily_budget": 50.00,
  "bid_strategy": "LOWEST_COST"
}
```

#### Lấy danh sách Campaigns
```bash
GET /api/campaigns?account_id=act_123456789&status=ACTIVE
```

#### Cập nhật Campaign
```bash
PUT /api/campaigns/{campaign_id}
Content-Type: application/json

{
  "name": "Updated Campaign Name",
  "status": "ACTIVE",
  "daily_budget": 75.00
}
```

#### Xóa Campaign
```bash
DELETE /api/campaigns/{campaign_id}
```

### Ad Set API

#### Tạo Ad Set
```bash
POST /api/adsets
Content-Type: application/json

{
  "account_id": "act_123456789",
  "campaign_id": "123456789",
  "name": "My Ad Set",
  "optimization_goal": "LINK_CLICKS",
  "status": "PAUSED",
  "daily_budget": 25.00,
  "targeting": {
    "age_min": 18,
    "age_max": 65,
    "genders": [1, 2],
    "geo_locations": {
      "countries": ["US", "CA"]
    },
    "interests": [
      {"id": "6003107902433", "name": "Technology"}
    ]
  }
}
```

### Insights API

#### Lấy báo cáo
```bash
GET /api/insights?account_id=act_123456789&entity_type=campaign&date_start=2025-01-01&date_end=2025-01-31
```

#### Sync insights
```bash
POST /api/insights
Content-Type: application/json

{
  "action": "sync",
  "entity_id": "123456789",
  "entity_type": "campaign",
  "date_start": "2025-01-01",
  "date_end": "2025-01-31"
}
```

#### Export báo cáo
```bash
GET /api/insights?action=export&account_id=act_123456789&format=csv&date_start=2025-01-01&date_end=2025-01-31
```

## Dashboard (PHP Views)

Truy cập dashboard tại: `http://your-domain.com/dashboard-facebook/`

### Tính năng Dashboard:
- **PHP-based Views**: Sử dụng hoàn toàn PHP thay vì HTML tĩnh
- **MVC Architecture**: Controller, View, Model pattern
- **Dynamic Data Loading**: Real-time data từ database và Facebook API
- **Responsive UI**: Bootstrap 5 với custom styling
- **Interactive Charts**: Chart.js integration
- **AJAX Operations**: Seamless user experience
- **Session Management**: User authentication và state management

### Cấu trúc View System:

```
src/
├── views/
│   ├── layouts/
│   │   └── main.php           # Layout chính với sidebar và header
│   ├── pages/
│   │   ├── dashboard.php      # Trang dashboard với metrics
│   │   ├── campaigns.php      # Quản lý campaigns
│   │   ├── adsets.php         # Quản lý ad sets
│   │   └── insights.php       # Báo cáo và analytics
│   └── components/            # Reusable components
├── controllers/
│   ├── BaseController.php     # Base controller với common methods
│   └── DashboardController.php # Main dashboard controller
└── core/
    └── View.php              # View engine với helper methods
```

### Routing và Navigation:

```php
// Các trang available
?page=dashboard     // Trang chính với overview
?page=campaigns     // Quản lý campaigns
?page=adsets        // Quản lý ad sets  
?page=insights      // Báo cáo và analytics
?page=automation    // Automation rules

// Với account ID
?page=dashboard&account_id=act_123456789
```

## Automation Rules

### Tạo Automation Rule

```php
$rule = [
    'name' => 'High CPA Pause Rule',
    'entity_type' => 'campaign',
    'conditions' => [
        [
            'field' => 'cpc',
            'operator' => 'greater_than',
            'value' => 2.00
        ]
    ],
    'action_spec' => [
        'action' => 'PAUSE'
    ]
];

// Lưu vào database
$db->insert('automated_rules', $rule);
```

### Các loại Actions:
- `PAUSE`: Tạm dừng entity
- `ACTIVATE`: Kích hoạt entity
- `INCREASE_BUDGET`: Tăng budget
- `DECREASE_BUDGET`: Giảm budget
- `SEND_NOTIFICATION`: Gửi thông báo email

## Cấu trúc thư mục

```
dashboard-facebook/
├── index.php                   # Main entry point với routing
├── ajax.php                    # AJAX handler cho dynamic operations
├── database/
│   └── schema.sql              # Database schema
├── docs/
│   ├── facebook_ads_system_design.md
│   └── sample-code/           # Sample scripts
├── src/
│   ├── controllers/           # MVC Controllers
│   │   ├── BaseController.php
│   │   └── DashboardController.php
│   ├── views/                 # PHP View Templates
│   │   ├── layouts/
│   │   │   └── main.php       # Main layout với sidebar
│   │   ├── pages/
│   │   │   ├── dashboard.php   # Dashboard page
│   │   │   ├── campaigns.php   # Campaigns management
│   │   │   ├── adsets.php      # Ad Sets management
│   │   │   └── insights.php    # Reports và analytics
│   │   └── components/        # Reusable view components
│   ├── api/                   # REST API endpoints
│   │   ├── campaigns.php
│   │   ├── adsets.php
│   │   └── insights.php
│   ├── config/
│   │   └── Config.php         # Configuration
│   ├── core/
│   │   ├── View.php           # View engine với helpers
│   │   ├── Database.php       # Database connection
│   │   └── FacebookAPI.php    # Facebook API wrapper
│   ├── services/
│   │   ├── CampaignService.php
│   │   ├── AdSetService.php
│   │   └── InsightsService.php
│   └── jobs/
│       ├── sync_insights.php  # Cron job sync insights
│       └── run_automation.php # Cron job automation
├── composer.json              # Dependency management
└── README.md
```

## Bảo mật

### Rate Limiting
- API có rate limiting tự động
- Lưu trữ trong bảng `api_rate_limits`
- Default: 200 requests/hour per account

### Authentication
- Sử dụng Facebook Access Tokens
- Token validation trước mỗi API call
- User management với roles

### Logging
- Tất cả actions được log trong `activity_logs`
- Tracking user activities
- API error logging

## Monitoring & Alerts

### Performance Monitoring
```php
// Check campaign performance
$alerts = [
    'high_cpc' => ['threshold' => 2.00, 'action' => 'email'],
    'low_ctr' => ['threshold' => 1.0, 'action' => 'pause'],
    'budget_depletion' => ['threshold' => 90, 'action' => 'notification']
];
```

### Email Notifications
```php
// Cấu hình SMTP trong Config.php
const SMTP_HOST = 'your-smtp-host';
const SMTP_USER = 'your-email';
const SMTP_PASS = 'your-password';
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Kiểm tra credentials trong Config.php
   - Đảm bảo MySQL service đang chạy

2. **Facebook API Errors**
   - Kiểm tra access token còn hạn
   - Verify app permissions
   - Check rate limits

3. **Cron Jobs Not Running**
   - Verify cron permissions
   - Check PHP path in crontab
   - Review error logs

### Debug Mode
Bật debug trong `Config.php`:
```php
const DEBUG = true;
```

### Logs
- Application logs: `/logs/app.log`
- Error logs: `/logs/error.log`
- API logs: `/logs/api.log`

## Mở rộng

### Thêm Custom Metrics
```php
// Trong InsightsService.php
public function getCustomMetric($entityId, $metric) {
    // Implementation
}
```

### Tích hợp Third-party Services
- Google Analytics
- Slack notifications  
- Custom webhooks
- External reporting tools

## Hỗ trợ

Để được hỗ trợ:
1. Check logs trong `/logs/`
2. Review Facebook API documentation
3. Check cơ sở dữ liệu integrity
4. Verify permissions và access tokens

## PHP View System Usage

### Khởi chạy hệ thống:

1. **Truy cập trang chính**: `http://localhost/dashboard-facebook/`
2. **Chọn Ad Account** từ dropdown trong header
3. **Navigate** qua các pages sử dụng sidebar menu

### View Helpers Available:

```php
// Format helpers
$this->formatCurrency($amount);     // $1,234.56
$this->formatNumber($number);       // 1,234,567
$this->formatPercent($number);      // 12.34%
$this->formatDate($date);          // 2025-01-01

// HTML helpers
$this->e($string);                 // HTML escape
$this->url($path);                 // Generate URL
$this->getStatusBadge($status);    // Bootstrap badge class

// Navigation helpers
$this->isCurrentPage($page);       // Check active page
```

### Controller Methods:

```php
// Dashboard pages
index()          // Dashboard overview với metrics
campaigns()      // Campaign management
adsets()         // Ad Set management  
insights()       // Reports và analytics
automation()     // Automation rules

// AJAX endpoints
ajaxMetrics()    // Load dashboard metrics
ajaxCampaigns()  // Load campaigns data
```

### Customization Guide:

#### Thêm page mới:
1. **Create view**: `src/views/pages/your-page.php`
2. **Add method** trong `DashboardController.php`
3. **Add route** trong `index.php` router
4. **Add navigation** trong `main.php` layout

#### Thêm AJAX endpoint:
1. **Add method** trong controller với prefix `ajax`
2. **Handle** trong `ajax.php`
3. **Call** từ JavaScript frontend

### Features của View System:

- ✅ **Template Inheritance**: Layout system với content blocks
- ✅ **Helper Methods**: Format, URL, HTML utilities  
- ✅ **Data Binding**: Automatic variable extraction
- ✅ **Component System**: Reusable view components
- ✅ **AJAX Integration**: Seamless dynamic loading
- ✅ **Error Handling**: Graceful error display
- ✅ **Security**: HTML escaping và input validation
- ✅ **Responsive Design**: Bootstrap 5 integration

### Example Usage:

```php
// Trong controller
public function myPage() {
    $data = [
        'pageTitle' => 'My Custom Page',
        'items' => $this->getItems(),
        'metrics' => $this->calculateMetrics()
    ];
    
    $this->render('my-page', $data);
}
```

```php
// Trong view (my-page.php)
<h1><?php echo $this->e($pageTitle); ?></h1>

<div class="metrics-row">
    <?php foreach ($metrics as $metric): ?>
        <div class="metric-card">
            <h3><?php echo $this->formatCurrency($metric['value']); ?></h3>
            <p><?php echo $this->e($metric['label']); ?></p>
        </div>
    <?php endforeach; ?>
</div>

<table class="table">
    <?php foreach ($items as $item): ?>
        <tr>
            <td><?php echo $this->e($item['name']); ?></td>
            <td><?php echo $this->formatNumber($item['count']); ?></td>
        </tr>
    <?php endforeach; ?>
</table>
```

## License

MIT License - có thể sử dụng cho mục đích thương mại và cá nhân.