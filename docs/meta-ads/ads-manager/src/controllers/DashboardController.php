<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../services/CampaignService.php';
require_once __DIR__ . '/../services/AdSetService.php';
require_once __DIR__ . '/../services/InsightsService.php';

class DashboardController extends BaseController {
    
    public function index() {
        $accountId = $this->input('account_id');
        $accessToken = $this->getAccessToken();
        
        // Get accounts list
        $accounts = $this->getAdAccounts();
        
        $data = [
            'accounts' => $accounts,
            'selectedAccount' => $accountId,
            'metrics' => [],
            'campaigns' => [],
            'chartData' => []
        ];
        
        // Load data if account is selected
        if ($accountId && $accessToken) {
            try {
                $data['metrics'] = $this->getDashboardMetrics($accountId, $accessToken);
                $data['campaigns'] = $this->getTopCampaigns($accountId, $accessToken);
                $data['chartData'] = $this->getChartData($accountId, $accessToken);
            } catch (Exception $e) {
                $data['error'] = $e->getMessage();
            }
        }
        
        $this->render('dashboard', $data);
    }
    
    public function campaigns() {
        $accountId = $this->input('account_id');
        
        $data = [
            'accounts' => $this->getAdAccounts(),
            'selectedAccount' => $accountId,
            'campaigns' => []
        ];
        
        if ($accountId) {
            try {
                // Get campaigns from database
                $campaigns = $this->db->query(
                    "SELECT c.* FROM campaigns c 
                     JOIN ad_accounts a ON c.ad_account_id = a.id 
                     WHERE a.account_id = ? 
                     ORDER BY c.name",
                    [$accountId]
                )->fetchAll();
                $data['campaigns'] = $campaigns;
                
            } catch (Exception $e) {
                $data['error'] = $e->getMessage();
            }
        }
        
        $this->render('campaigns', $data);
    }
    
    public function adsets() {
        $accountId = $this->input('account_id');
        $campaignId = $this->input('campaign_id');
        
        $data = [
            'accounts' => $this->getAdAccounts(),
            'selectedAccount' => $accountId,
            'selectedCampaign' => $campaignId,
            'adsets' => [],
            'campaigns' => []
        ];
        
        if ($accountId) {
            try {
                // Get campaigns from database
                $campaigns = $this->db->query(
                    "SELECT c.* FROM campaigns c 
                     JOIN ad_accounts a ON c.ad_account_id = a.id 
                     WHERE a.account_id = ? 
                     ORDER BY c.name",
                    [$accountId]
                )->fetchAll();
                $data['campaigns'] = $campaigns;
                
                // Get all ad sets for this account from database
                $adsets = $this->db->query(
                    "SELECT ads.* FROM adsets ads
                     JOIN campaigns c ON ads.campaign_id = c.id
                     JOIN ad_accounts a ON c.ad_account_id = a.id
                     WHERE a.account_id = ?
                     ORDER BY ads.name",
                    [$accountId]
                )->fetchAll();
                $data['adsets'] = $adsets;
                
            } catch (Exception $e) {
                $data['error'] = $e->getMessage();
            }
        }
        
        $this->render('adsets', $data);
    }
    
    public function ads() {
        $accountId = $this->input('account_id');
        $campaignId = $this->input('campaign_id');
        $adsetId = $this->input('adset_id');
        
        $data = [
            'accounts' => $this->getAdAccounts(),
            'selectedAccount' => $accountId,
            'selectedCampaign' => $campaignId,
            'selectedAdset' => $adsetId,
            'ads' => [],
            'campaigns' => [],
            'adsets' => []
        ];
        
        if ($accountId) {
            try {
                // Get campaigns from database
                $campaigns = $this->db->query(
                    "SELECT c.* FROM campaigns c 
                     JOIN ad_accounts a ON c.ad_account_id = a.id 
                     WHERE a.account_id = ? 
                     ORDER BY c.name",
                    [$accountId]
                )->fetchAll();
                $data['campaigns'] = $campaigns;
                
                // Get ad sets from database
                $adsets = $this->db->query(
                    "SELECT ads.* FROM adsets ads
                     JOIN campaigns c ON ads.campaign_id = c.id
                     JOIN ad_accounts a ON c.ad_account_id = a.id
                     WHERE a.account_id = ?
                     ORDER BY ads.name",
                    [$accountId]
                )->fetchAll();
                $data['adsets'] = $adsets;
                
                // Get all ads for this account from database
                $ads = $this->db->query(
                    "SELECT a.* FROM ads a
                     JOIN adsets ads ON a.adset_id = ads.id
                     JOIN campaigns c ON ads.campaign_id = c.id
                     JOIN ad_accounts aa ON c.ad_account_id = aa.id
                     WHERE aa.account_id = ?
                     ORDER BY a.name",
                    [$accountId]
                )->fetchAll();
                $data['ads'] = $ads;
                
            } catch (Exception $e) {
                $data['error'] = $e->getMessage();
            }
        }
        
        $this->render('ads', $data);
    }
    
    public function audiences() {
        $accountId = $this->input('account_id');
        
        $data = [
            'accounts' => $this->getAdAccounts(),
            'selectedAccount' => $accountId,
            'audiences' => []
        ];
        
        if ($accountId) {
            try {
                // Get audiences from database
                $audiences = $this->db->query(
                    "SELECT ca.* FROM custom_audiences ca
                     JOIN ad_accounts a ON ca.ad_account_id = a.id
                     WHERE a.account_id = ?
                     ORDER BY ca.name",
                    [$accountId]
                )->fetchAll();
                $data['audiences'] = $audiences;
                
            } catch (Exception $e) {
                $data['error'] = $e->getMessage();
            }
        }
        
        $this->render('audiences', $data);
    }
    
    public function users() {
        // Check if user is admin
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            $this->render('error', [
                'error' => 'Access denied. Only administrators can manage users.',
                'accounts' => $this->getAdAccounts()
            ]);
            return;
        }
        
        $data = [
            'accounts' => $this->getAdAccounts(),
            'users' => [],
            'currentUser' => $currentUser
        ];
        
        try {
            // Get all users
            $users = $this->db->query(
                "SELECT u.*, 
                 GROUP_CONCAT(DISTINCT aa.account_id ORDER BY aa.account_id SEPARATOR ', ') as accessible_accounts,
                 COUNT(DISTINCT uaa.ad_account_id) as account_count
                 FROM users u
                 LEFT JOIN user_account_access uaa ON u.id = uaa.user_id
                 LEFT JOIN ad_accounts aa ON uaa.ad_account_id = aa.id
                 GROUP BY u.id
                 ORDER BY u.created_at DESC"
            )->fetchAll();
            $data['users'] = $users;
            
            // Get all ad accounts for assignment
            $allAccounts = $this->db->query(
                "SELECT * FROM ad_accounts ORDER BY name"
            )->fetchAll();
            $data['allAccounts'] = $allAccounts;
            
        } catch (Exception $e) {
            $data['error'] = $e->getMessage();
        }
        
        $this->render('users', $data);
    }
    
    public function insights() {
        $accountId = $this->input('account_id');
        $dateStart = $this->input('date_start', date('Y-m-d', strtotime('-7 days')));
        $dateEnd = $this->input('date_end', date('Y-m-d'));
        $entityType = $this->input('entity_type', 'campaign');
        $accessToken = $this->getAccessToken();
        
        $data = [
            'accounts' => $this->getAdAccounts(),
            'selectedAccount' => $accountId,
            'dateStart' => $dateStart,
            'dateEnd' => $dateEnd,
            'entityType' => $entityType,
            'report' => ['data' => [], 'summary' => []],
            'trends' => ['labels' => [], 'impressions' => [], 'clicks' => [], 'spend' => [], 'conversions' => []]
        ];
        
        if ($accountId && $accessToken) {
            try {
                // Generate trends data for chart from date range - always call this
                $data['trends'] = $this->generateTrendsData($dateStart, $dateEnd);
                error_log('Trends data generated: ' . json_encode($data['trends']));
                
                $insightsService = new InsightsService($accessToken);
                $reportData = $insightsService->generateReport($accountId, $dateStart, $dateEnd, $entityType);
                
                // Transform report data to view format
                if (!empty($reportData['data'])) {
                    $data['report']['data'] = $reportData['data'];
                    
                    // Calculate summary metrics
                    $summary = [
                        'impressions' => 0,
                        'clicks' => 0,
                        'spend' => 0,
                        'conversions' => 0,
                        'ctr' => 0,
                        'cpc' => 0,
                        'cpm' => 0,
                        'cpa' => 0,
                        'roas' => 0
                    ];
                    
                    foreach ($reportData['data'] as $item) {
                        $summary['impressions'] += $item['total_impressions'] ?? $item['impressions'] ?? 0;
                        $summary['clicks'] += $item['total_clicks'] ?? $item['clicks'] ?? 0;
                        $summary['spend'] += $item['total_spend'] ?? $item['spend'] ?? 0;
                        $summary['conversions'] += $item['conversions'] ?? 0;
                    }
                    
                    // Calculate derived metrics
                    if ($summary['impressions'] > 0) {
                        $summary['ctr'] = ($summary['clicks'] / $summary['impressions']) * 100;
                        $summary['cpm'] = ($summary['spend'] / $summary['impressions']) * 1000;
                    }
                    if ($summary['clicks'] > 0) {
                        $summary['cpc'] = $summary['spend'] / $summary['clicks'];
                    }
                    if ($summary['conversions'] > 0) {
                        $summary['cpa'] = $summary['spend'] / $summary['conversions'];
                    }
                    
                    $data['report']['summary'] = $summary;
                }
            } catch (Exception $e) {
                $data['error'] = $e->getMessage();
                error_log('Insights error: ' . $e->getMessage());
            }
        } else {
            // Even without account/token, try to generate trends from database
            if ($accountId) {
                try {
                    $data['trends'] = $this->generateTrendsData($dateStart, $dateEnd);
                    error_log('Trends data generated (no token): ' . json_encode($data['trends']));
                } catch (Exception $e) {
                    error_log('Trends generation error: ' . $e->getMessage());
                }
            }
        }
        
        $this->render('insights', $data);
    }
    
    public function automation() {
        $accountId = $this->input('account_id');
        
        $data = [
            'accounts' => $this->getAdAccounts(),
            'selectedAccount' => $accountId,
            'rules' => []
        ];
        
        if ($accountId) {
            try {
                $accountLocalId = $this->getAccountLocalId($accountId);
                $data['rules'] = $this->db->findAll(
                    'automated_rules', 
                    'ad_account_id = ? AND status != ?', 
                    [$accountLocalId, 'deleted']
                );
            } catch (Exception $e) {
                $data['error'] = $e->getMessage();
            }
        }
        
        $this->render('automation', $data);
    }
    
    // AJAX endpoints
    public function ajaxMetrics() {
        $accountId = $this->input('account_id');
        $accessToken = $this->getAccessToken();
        
        if (!$accountId || !$accessToken) {
            $this->json(['success' => false, 'message' => 'Account ID and access token required'], 400);
        }
        
        try {
            $metrics = $this->getDashboardMetrics($accountId, $accessToken);
            $this->json(['success' => true, 'data' => $metrics]);
        } catch (Exception $e) {
            $this->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    public function ajaxCampaigns() {
        $accountId = $this->input('account_id');
        $accessToken = $this->getAccessToken();
        
        if (!$accountId || !$accessToken) {
            $this->json(['success' => false, 'message' => 'Account ID and access token required'], 400);
        }
        
        try {
            $campaignService = new CampaignService($accessToken);
            $campaigns = $campaignService->getByAccount($accountId);
            $this->json(['success' => true, 'data' => $campaigns]);
        } catch (Exception $e) {
            $this->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    // Helper methods
    private function getAdAccounts() {
        // Use getAccessibleAccounts which respects user permissions
        $accounts = $this->getAccessibleAccounts();
        
        if (!empty($accounts)) {
            return $accounts;
        }
        
        // If no accounts in database, try to get from Facebook API
        $currentUser = $this->getCurrentUser();
        if ($currentUser && $currentUser['role'] === 'admin') {
            try {
                $accessToken = $this->getAccessToken();
                if ($accessToken) {
                    require_once __DIR__ . '/../core/FacebookAPI.php';
                    $fbApi = new FacebookAPI($accessToken);
                    $response = $fbApi->getAccounts('id,name,currency,account_status,timezone_name');
                    
                    if (isset($response['data']) && is_array($response['data'])) {
                        // Cache accounts to database
                        try {
                            $this->cacheAdAccounts($response['data']);
                        } catch (Exception $cacheError) {
                            error_log("Failed to cache accounts: " . $cacheError->getMessage());
                        }
                        
                        return $response['data'];
                    }
                }
            } catch (Exception $e) {
                error_log("Failed to fetch accounts from API: " . $e->getMessage());
            }
        }
        
        return [];
    }
    
    private function getAdAccounts_old() {
        // Try to get accounts from Facebook API first
        try {
            $accessToken = $this->getAccessToken();
            if ($accessToken) {
                require_once __DIR__ . '/../core/FacebookAPI.php';
                $fbApi = new FacebookAPI($accessToken);
                $response = $fbApi->getAccounts('id,name,currency,account_status,timezone_name');
                
                if (isset($response['data']) && is_array($response['data'])) {
                    // Try to cache accounts to database (optional)
                    try {
                        $this->cacheAdAccounts($response['data']);
                    } catch (Exception $cacheError) {
                        // Cache failed, but we can still return API data
                        error_log("Failed to cache accounts: " . $cacheError->getMessage());
                    }
                    
                    return $response['data'];
                }
            }
        } catch (Exception $e) {
            // If API fails, fallback to database
            error_log("Failed to fetch accounts from API: " . $e->getMessage());
        }
        
        // Fallback: get from database if table exists
        try {
            $accounts = $this->db->findAll('ad_accounts', '1=1', [], 100);
            return $accounts ?: [];
        } catch (Exception $e) {
            error_log("Failed to fetch accounts from database: " . $e->getMessage());
            return [];
        }
    }
    
    private function cacheAdAccounts($accounts) {
        // Cache accounts to database for future offline access
        foreach ($accounts as $account) {
            $accountId = str_replace('act_', '', $account['id']);
            
            // Check if account exists
            $existing = $this->db->query(
                "SELECT id FROM ad_accounts WHERE account_id = ?",
                [$accountId]
            )->fetch();
            
            $data = [
                'account_id' => $accountId,
                'name' => $account['name'] ?? 'Unnamed Account',
                'currency' => $account['currency'] ?? 'USD',
                'timezone_name' => $account['timezone_name'] ?? 'UTC',
                'account_status' => $account['account_status'] ?? 'ACTIVE',
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            if ($existing) {
                $this->db->update('ad_accounts', $data, 'id = :where_id', ['where_id' => $existing['id']]);
            } else {
                $data['created_at'] = date('Y-m-d H:i:s');
                $this->db->insert('ad_accounts', $data);
            }
        }
    }
    
    private function getDashboardMetrics($accountId, $accessToken) {
        $accountLocalId = $this->getAccountLocalId($accountId);
        $dateStart = date('Y-m-d', strtotime('-30 days'));
        $dateEnd = date('Y-m-d');
        
        $sql = "
            SELECT 
                SUM(ci.impressions) as total_impressions,
                SUM(ci.clicks) as total_clicks,
                SUM(ci.spend) as total_spend,
                AVG(ci.ctr) as avg_ctr,
                AVG(ci.cpc) as avg_cpc,
                AVG(ci.cpm) as avg_cpm,
                COUNT(DISTINCT c.id) as total_campaigns
            FROM campaigns c
            LEFT JOIN campaign_insights ci ON c.id = ci.campaign_id
            WHERE c.ad_account_id = ?
            AND ci.date_start >= ?
            AND ci.date_stop <= ?
        ";
        
        $result = $this->db->query($sql, [$accountLocalId, $dateStart, $dateEnd])->fetch();
        
        return [
            'total_spend' => (float) ($result['total_spend'] ?? 0),
            'total_impressions' => (int) ($result['total_impressions'] ?? 0),
            'total_clicks' => (int) ($result['total_clicks'] ?? 0),
            'avg_ctr' => (float) ($result['avg_ctr'] ?? 0),
            'avg_cpc' => (float) ($result['avg_cpc'] ?? 0),
            'avg_cpm' => (float) ($result['avg_cpm'] ?? 0),
            'total_campaigns' => (int) ($result['total_campaigns'] ?? 0)
        ];
    }
    
    private function getTopCampaigns($accountId, $accessToken, $limit = 10) {
        $accountLocalId = $this->getAccountLocalId($accountId);
        $dateStart = date('Y-m-d', strtotime('-30 days'));
        $dateEnd = date('Y-m-d');
        
        $sql = "
            SELECT 
                c.campaign_id,
                c.name,
                c.objective,
                c.status,
                c.daily_budget,
                c.lifetime_budget,
                SUM(ci.impressions) as total_impressions,
                SUM(ci.clicks) as total_clicks,
                SUM(ci.spend) as total_spend,
                AVG(ci.ctr) as avg_ctr,
                AVG(ci.cpc) as avg_cpc
            FROM campaigns c
            LEFT JOIN campaign_insights ci ON c.id = ci.campaign_id
            WHERE c.ad_account_id = ?
            AND ci.date_start >= ?
            AND ci.date_stop <= ?
            GROUP BY c.id
            ORDER BY total_spend DESC
            LIMIT ?
        ";
        
        return $this->db->query($sql, [$accountLocalId, $dateStart, $dateEnd, $limit])->fetchAll();
    }
    
    private function getChartData($accountId, $accessToken) {
        $accountLocalId = $this->getAccountLocalId($accountId);
        $dateStart = date('Y-m-d', strtotime('-30 days'));
        $dateEnd = date('Y-m-d');
        
        // Daily trends
        $sql = "
            SELECT 
                ci.date_start,
                SUM(ci.impressions) as impressions,
                SUM(ci.clicks) as clicks,
                SUM(ci.spend) as spend
            FROM campaign_insights ci
            JOIN campaigns c ON ci.campaign_id = c.id
            WHERE c.ad_account_id = ?
            AND ci.date_start >= ?
            AND ci.date_stop <= ?
            GROUP BY ci.date_start
            ORDER BY ci.date_start
        ";
        
        $trends = $this->db->query($sql, [$accountLocalId, $dateStart, $dateEnd])->fetchAll();
        
        // Objectives breakdown
        $sql = "
            SELECT 
                c.objective,
                COUNT(*) as count,
                SUM(ci.spend) as total_spend
            FROM campaigns c
            LEFT JOIN campaign_insights ci ON c.id = ci.campaign_id
            WHERE c.ad_account_id = ?
            AND ci.date_start >= ?
            AND ci.date_stop <= ?
            GROUP BY c.objective
        ";
        
        $objectives = $this->db->query($sql, [$accountLocalId, $dateStart, $dateEnd])->fetchAll();
        
        return [
            'trends' => $trends,
            'objectives' => $objectives
        ];
    }
    
    private function getAccountLocalId($accountId) {
        // First try to find by Facebook account_id
        $account = $this->db->query(
            "SELECT account_id FROM ad_accounts WHERE account_id = ?", 
            [$accountId]
        )->fetch();
        
        // If not found, try to find by local database id and return the Facebook account_id
        if (!$account) {
            $account = $this->db->query(
                "SELECT account_id FROM ad_accounts WHERE id = ?", 
                [$accountId]
            )->fetch();
        }
        
        if (!$account) {
            throw new Exception("Ad account not found: {$accountId}");
        }
        
        // Return Facebook account_id instead of database id
        return $account['account_id'];
    }
    
    private function generateTrendsData($dateStart, $dateEnd) {
        $start = new DateTime($dateStart);
        $end = new DateTime($dateEnd);
        $endPlusOne = clone $end;
        $endPlusOne->modify('+1 day');
        $interval = new DateInterval('P1D');
        $period = new DatePeriod($start, $interval, $endPlusOne);
        
        $trends = ['labels' => [], 'impressions' => [], 'clicks' => [], 'spend' => []];
        
        foreach ($period as $date) {
            $trends['labels'][] = $date->format('M j');
        }
        
        $accountId = $this->input('account_id');
        $entityType = $this->input('entity_type', 'campaign');
        
        if ($accountId) {
            $db = Database::getInstance();
            
            if ($entityType === 'campaign') {
                $query = "SELECT ci.date_start as date, SUM(ci.impressions) as total_impressions, 
                          SUM(ci.clicks) as total_clicks, SUM(ci.spend) as total_spend
                          FROM campaign_insights ci
                          JOIN campaigns c ON ci.campaign_id = c.id
                          JOIN ad_accounts a ON c.ad_account_id = a.id
                          WHERE a.account_id = ? AND ci.date_start >= ? AND ci.date_start <= ?
                          GROUP BY ci.date_start ORDER BY ci.date_start ASC";
            } else {
                $query = "SELECT ai.date_start as date, SUM(ai.impressions) as total_impressions,
                          SUM(ai.clicks) as total_clicks, SUM(ai.spend) as total_spend
                          FROM adset_insights ai
                          JOIN adsets ads ON ai.adset_id = ads.id
                          JOIN campaigns c ON ads.campaign_id = c.id
                          JOIN ad_accounts a ON c.ad_account_id = a.id
                          WHERE a.account_id = ? AND ai.date_start >= ? AND ai.date_start <= ?
                          GROUP BY ai.date_start ORDER BY ai.date_start ASC";
            }
            
            try {
                $stmt = $db->query($query, [$accountId, $dateStart, $dateEnd]);
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                error_log("Query results count: " . count($results));
                error_log("Account ID: $accountId, Entity: $entityType, Date: $dateStart to $dateEnd");
                
                $dataByDate = [];
                foreach ($results as $row) {
                    $dataByDate[$row['date']] = $row;
                }
                
                foreach ($period as $date) {
                    $dateStr = $date->format('Y-m-d');
                    if (isset($dataByDate[$dateStr])) {
                        $trends['impressions'][] = (int)$dataByDate[$dateStr]['total_impressions'];
                        $trends['clicks'][] = (int)$dataByDate[$dateStr]['total_clicks'];
                        $trends['spend'][] = (float)$dataByDate[$dateStr]['total_spend'];
                    } else {
                        $trends['impressions'][] = 0;
                        $trends['clicks'][] = 0;
                        $trends['spend'][] = 0;
                    }
                }
            } catch (Exception $e) {
                error_log("generateTrendsData error: " . $e->getMessage());
            }
        }
        
        return $trends;
    }
}