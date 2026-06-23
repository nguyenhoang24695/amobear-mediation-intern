<?php
// AJAX Handler for dashboard
session_start();

require_once __DIR__ . '/src/controllers/DashboardController.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $controller = new DashboardController();
    $action = $_GET['action'] ?? $_POST['action'] ?? null;
    
    if (!$action) {
        throw new Exception('Action parameter is required');
    }
    
    switch ($action) {
        case 'metrics':
            $controller->ajaxMetrics();
            break;
            
        case 'campaigns':
            $controller->ajaxCampaigns();
            break;
            
        case 'sync_campaigns':
            // Handle campaign sync
            $accountId = $_POST['account_id'] ?? $_GET['account_id'] ?? null;
            $accessToken = getAccessTokenFromRequest();
            
            if (!$accountId || !$accessToken) {
                throw new Exception('Account ID and access token are required');
            }
            
            require_once __DIR__ . '/src/services/CampaignService.php';
            $campaignService = new CampaignService($accessToken);
            $result = $campaignService->syncFromFacebook($accountId);
            
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'toggle_campaign_status':
            // Handle campaign status toggle
            $campaignId = $_POST['campaign_id'] ?? null;
            $status = $_POST['status'] ?? null;
            $accessToken = getAccessTokenFromRequest();
            
            if (!$campaignId || !$status || !$accessToken) {
                throw new Exception('Campaign ID, status, and access token are required');
            }
            
            require_once __DIR__ . '/src/services/CampaignService.php';
            $campaignService = new CampaignService($accessToken);
            $result = $campaignService->update($campaignId, ['status' => $status]);
            
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'get_chart_data':
            // Handle chart data request
            $accountId = $_GET['account_id'] ?? null;
            $metric = $_GET['metric'] ?? 'spend';
            $days = $_GET['days'] ?? 30;
            
            if (!$accountId) {
                throw new Exception('Account ID is required');
            }
            
            $chartData = getChartData($accountId, $metric, $days);
            echo json_encode(['success' => true, 'data' => $chartData]);
            break;
            
        default:
            throw new Exception('Invalid action: ' . $action);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function getAccessTokenFromRequest() {
    // Try to get access token from various sources
    $headers = getallheaders();
    $token = null;
    
    if (isset($headers['Authorization'])) {
        $token = $headers['Authorization'];
        if (strpos($token, 'Bearer ') === 0) {
            $token = substr($token, 7);
        }
    } elseif (isset($_GET['access_token'])) {
        $token = $_GET['access_token'];
    } elseif (isset($_POST['access_token'])) {
        $token = $_POST['access_token'];
    } elseif (isset($_SESSION['access_token'])) {
        $token = $_SESSION['access_token'];
    }
    
    return $token;
}

function getChartData($accountId, $metric, $days) {
    require_once __DIR__ . '/src/core/Database.php';
    
    $db = Database::getInstance();
    $dateStart = date('Y-m-d', strtotime("-{$days} days"));
    $dateEnd = date('Y-m-d');
    
    // Get account local ID
    $account = $db->query("SELECT id FROM ad_accounts WHERE account_id = ?", [$accountId])->fetch();
    if (!$account) {
        throw new Exception("Account not found: {$accountId}");
    }
    
    $accountLocalId = $account['id'];
    
    // Get daily data
    $sql = "
        SELECT 
            ci.date_start,
            SUM(ci.{$metric}) as value
        FROM campaign_insights ci
        JOIN campaigns c ON ci.campaign_id = c.id
        WHERE c.ad_account_id = ?
        AND ci.date_start >= ?
        AND ci.date_stop <= ?
        GROUP BY ci.date_start
        ORDER BY ci.date_start
    ";
    
    $data = $db->query($sql, [$accountLocalId, $dateStart, $dateEnd])->fetchAll();
    
    // Fill missing dates with 0
    $result = [];
    for ($i = $days - 1; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-{$i} days"));
        $found = false;
        
        foreach ($data as $row) {
            if ($row['date_start'] === $date) {
                $result[] = [
                    'date' => $date,
                    'value' => (float) $row['value']
                ];
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            $result[] = [
                'date' => $date,
                'value' => 0
            ];
        }
    }
    
    return $result;
}