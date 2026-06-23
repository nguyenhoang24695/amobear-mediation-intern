# Hệ thống Ads Manager Platform - Quản lý Facebook Ads qua API

## Tổng quan
Xây dựng nền tảng quản lý chiến dịch quảng cáo Facebook hoàn chỉnh, tương tự Facebook Ads Manager với đầy đủ chức năng: tạo, chỉnh sửa, giám sát, tối ưu và báo cáo.

## Chức năng chính

### 1. Quản lý tài khoản
- Quản lý Business Manager & Ad Accounts
- System User & Access Tokens
- Phân quyền người dùng (Admin, Advertiser, Analyst)

### 2. Campaign Management
- CRUD campaigns
- Objectives: APP_PROMOTION, TRAFFIC, ENGAGEMENT, LEADS, SALES, AWARENESS
- Budget: daily/lifetime
- Bid strategy: LOWEST_COST, COST_CAP, BID_CAP
- A/B Testing

### 3. Ad Set Management
- Targeting: demographics, interests, behaviors, custom audiences
- Placements: Facebook, Instagram, Audience Network, Messenger
- Optimization goals & scheduling
- Budget optimization (CBO)

### 4. Creative Management
- Upload media: images, videos, carousels
- Ad formats: Single, Carousel, Collection, Dynamic
- Call-to-action & ad copy

### 5. Audience Management
- Custom Audiences
- Lookalike Audiences
- Saved Audiences

### 6. Tracking & Conversion
- Facebook Pixel
- Conversion events
- App events

### 7. Reporting & Analytics
- Real-time dashboard
- Metrics: Reach, CTR, CPC, CPM, ROAS
- Export reports: CSV, Excel, PDF
- Automated reports

### 8. Optimization & Automation
- Automated rules (pause/activate)
- Budget reallocation
- Performance alerts

## Cấu trúc Database (MySQL)

```sql
-- Core Tables
CREATE TABLE ad_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    access_token TEXT,
    currency VARCHAR(10),
    spend_cap DECIMAL(15,2)
);

CREATE TABLE campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id VARCHAR(50) UNIQUE,
    ad_account_id INT,
    name VARCHAR(255),
    objective VARCHAR(100),
    status ENUM('ACTIVE', 'PAUSED', 'DELETED'),
    daily_budget DECIMAL(15,2),
    lifetime_budget DECIMAL(15,2),
    bid_strategy VARCHAR(100),
    FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id)
);

CREATE TABLE adsets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    adset_id VARCHAR(50) UNIQUE,
    campaign_id INT,
    name VARCHAR(255),
    status ENUM('ACTIVE', 'PAUSED', 'DELETED'),
    optimization_goal VARCHAR(100),
    targeting JSON,
    daily_budget DECIMAL(15,2),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE TABLE ads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad_id VARCHAR(50) UNIQUE,
    adset_id INT,
    creative_id INT,
    name VARCHAR(255),
    status ENUM('ACTIVE', 'PAUSED', 'DELETED'),
    FOREIGN KEY (adset_id) REFERENCES adsets(id)
);

CREATE TABLE ad_creatives (
    id INT PRIMARY KEY AUTO_INCREMENT,
    creative_id VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    image_url TEXT,
    video_id VARCHAR(50),
    body TEXT,
    call_to_action_type VARCHAR(50)
);

-- Insights Tables
CREATE TABLE campaign_insights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT,
    date_start DATE,
    date_stop DATE,
    impressions BIGINT,
    reach BIGINT,
    clicks BIGINT,
    spend DECIMAL(15,4),
    ctr DECIMAL(10,6),
    cpc DECIMAL(15,6),
    cpm DECIMAL(15,6),
    actions JSON,
    UNIQUE KEY (campaign_id, date_start, date_stop)
);

CREATE TABLE automated_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad_account_id INT,
    name VARCHAR(255),
    entity_type ENUM('campaign', 'adset', 'ad'),
    conditions JSON,
    action_spec JSON,
    status ENUM('active', 'paused')
);
```

## PHP Core Classes

```php
// config/Config.php
class Config {
    const GRAPH_API = 'https://graph.facebook.com/v20.0';
    const DB_HOST = 'localhost';
    const DB_NAME = 'ads_manager';
}

// core/FacebookAPI.php
class FacebookAPI {
    private $accessToken;
    
    public function __construct($token) {
        $this->accessToken = $token;
    }
    
    // Campaign
    public function createCampaign($accountId, $data) {
        return $this->post("act_{$accountId}/campaigns", $data);
    }
    
    public function updateCampaign($campaignId, $data) {
        return $this->post($campaignId, $data);
    }
    
    // Ad Set
    public function createAdSet($accountId, $data) {
        return $this->post("act_{$accountId}/adsets", $data);
    }
    
    // Creative
    public function uploadImage($accountId, $imagePath) {
        $data = ['filename' => new CURLFile($imagePath)];
        return $this->post("act_{$accountId}/adimages", $data);
    }
    
    public function createCreative($accountId, $data) {
        return $this->post("act_{$accountId}/adcreatives", $data);
    }
    
    // Insights
    public function getInsights($entityId, $params) {
        return $this->get("{$entityId}/insights", $params);
    }
    
    private function post($endpoint, $data) {
        $data['access_token'] = $this->accessToken;
        return $this->request('POST', $endpoint, $data);
    }
    
    private function get($endpoint, $params = []) {
        $params['access_token'] = $this->accessToken;
        return $this->request('GET', $endpoint, $params);
    }
}

// services/CampaignService.php
class CampaignService {
    private $fbApi;
    private $db;
    
    public function create($accountId, $data) {
        // Create via API
        $result = $this->fbApi->createCampaign($accountId, $data);
        
        // Save to DB
        $stmt = $this->db->prepare("
            INSERT INTO campaigns (campaign_id, ad_account_id, name, objective, status)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$result['id'], $accountId, $data['name'], 
                       $data['objective'], $data['status']]);
        
        return $result;
    }
    
    public function update($campaignId, $data) {
        $this->fbApi->updateCampaign($campaignId, $data);
        
        // Update DB
        $stmt = $this->db->prepare("
            UPDATE campaigns SET name=?, status=?, daily_budget=? 
            WHERE campaign_id=?
        ");
        $stmt->execute([$data['name'], $data['status'], 
                       $data['daily_budget'], $campaignId]);
    }
}

// services/InsightsService.php
class InsightsService {
    public function sync($campaignId, $dateStart, $dateEnd) {
        $params = [
            'fields' => 'impressions,reach,clicks,spend,ctr,cpc,cpm,actions',
            'time_range' => json_encode(['since' => $dateStart, 'until' => $dateEnd])
        ];
        
        $insights = $this->fbApi->getInsights($campaignId, $params);
        
        // Save to DB
        foreach ($insights['data'] as $data) {
            $stmt = $this->db->prepare("
                INSERT INTO campaign_insights 
                (campaign_id, date_start, date_stop, impressions, clicks, spend)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                impressions=VALUES(impressions), spend=VALUES(spend)
            ");
            $stmt->execute([
                $this->getCampaignLocalId($campaignId),
                $dateStart, $dateEnd,
                $data['impressions'], $data['clicks'], $data['spend']
            ]);
        }
    }
}

// services/AutomationService.php
class AutomationService {
    public function executeRules($accountId) {
        $rules = $this->db->query("
            SELECT * FROM automated_rules 
            WHERE ad_account_id={$accountId} AND status='active'
        ")->fetchAll();
        
        foreach ($rules as $rule) {
            $conditions = json_decode($rule['conditions'], true);
            
            // Example: Pause if CPA > threshold
            if ($rule['action_spec']['type'] === 'PAUSE') {
                $entities = $this->getEntitiesMatchingConditions($rule);
                foreach ($entities as $entity) {
                    $this->fbApi->updateCampaign($entity['id'], ['status' => 'PAUSED']);
                }
            }
        }
    }
}
```

## API Endpoints

```php
// api/campaigns.php
switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST': // Create
        $service = new CampaignService($accessToken);
        $result = $service->create($accountId, $data);
        echo json_encode(['success' => true, 'data' => $result]);
        break;
        
    case 'PUT': // Update
        $service->update($campaignId, $data);
        break;
        
    case 'GET': // List
        $campaigns = $db->query("SELECT * FROM campaigns")->fetchAll();
        echo json_encode($campaigns);
        break;
}

// api/insights.php
$service = new InsightsService($accessToken);
$report = $service->generateReport($accountId, $dateStart, $dateEnd);
echo json_encode($report);

// api/automation.php
$service = new AutomationService($accessToken);
$service->createRule($accountId, $ruleData);
$service->executeRules($accountId);
```

## Cron Jobs

```php
// jobs/sync_insights.php
$campaigns = $db->query("SELECT * FROM campaigns WHERE status='ACTIVE'")->fetchAll();

foreach ($campaigns as $campaign) {
    $service = new InsightsService($accessToken);
    $service->sync($campaign['campaign_id'], date('Y-m-d'), date('Y-m-d'));
}

// jobs/run_automation.php
$accounts = $db->query("SELECT DISTINCT ad_account_id FROM automated_rules")->fetchAll();

foreach ($accounts as $account) {
    $service = new AutomationService($accessToken);
    $service->executeRules($account['ad_account_id']);
}
```

## Tính năng Dashboard (Frontend)

```javascript
// Hiển thị overview
GET /api/dashboard?account_id=123&date_start=2025-01-01&date_end=2025-01-31

// Quản lý campaigns
POST /api/campaigns
PUT /api/campaigns/{id}
GET /api/campaigns?account_id=123

// Upload creative
POST /api/creatives/upload
POST /api/creatives

// Báo cáo
GET /api/reports?type=performance&date_range=last_7_days

// Automation rules
POST /api/rules
GET /api/rules?account_id=123
```

## Triển khai

1. Setup database MySQL
2. Cấu hình access tokens trong `ad_accounts`
3. Setup cron jobs cho sync insights và automation
4. Tạo frontend dashboard
5. Implement authentication & authorization

Hệ thống này cung cấp đầy đủ tính năng quản lý Facebook Ads qua API, tương tự Facebook Ads Manager với khả năng mở rộng và tùy chỉnh cao.