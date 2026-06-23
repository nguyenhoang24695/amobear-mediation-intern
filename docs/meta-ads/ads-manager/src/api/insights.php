<?php

require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../services/InsightsService.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Initialize config
    Config::init();
    
    // Get access token - try multiple sources
    $accessToken = null;
    
    // 1. Check Authorization header (for API calls)
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $accessToken = $headers['Authorization'];
        if (strpos($accessToken, 'Bearer ') === 0) {
            $accessToken = substr($accessToken, 7);
        }
    }
    
    // 2. Check query parameter
    if (!$accessToken && isset($_GET['access_token'])) {
        $accessToken = $_GET['access_token'];
    }
    
    // 3. Check session
    if (!$accessToken) {
        session_start();
        $accessToken = $_SESSION['access_token'] ?? null;
    }
    
    // 4. Get from config/env as fallback
    if (!$accessToken) {
        $fbConfig = Config::getFacebookConfig();
        $accessToken = $fbConfig['access_token'] ?? null;
    }
    
    if (!$accessToken) {
        throw new Exception('Access token is required');
    }
    
    $insightsService = new InsightsService($accessToken);
    $method = $_SERVER['REQUEST_METHOD'];
    $pathInfo = $_SERVER['PATH_INFO'] ?? '';
    
    switch ($method) {
        case 'GET':
            handleGetRequest($insightsService);
            break;
            
        case 'POST':
            handlePostRequest($insightsService);
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    ResponseHandler::error($e->getMessage(), 500);
}

function handleGetRequest($insightsService) {
    $action = $_GET['action'] ?? 'report';
    
    switch ($action) {
        case 'report':
            $accountId = $_GET['account_id'] ?? null;
            $entityType = $_GET['entity_type'] ?? 'campaign';
            $dateStart = $_GET['date_start'] ?? date('Y-m-d', strtotime('-7 days'));
            $dateEnd = $_GET['date_end'] ?? date('Y-m-d');
            
            if (!$accountId) {
                throw new Exception('account_id is required');
            }
            
            $report = $insightsService->generateReport($accountId, $dateStart, $dateEnd, $entityType);
            ResponseHandler::success($report);
            break;
            
        case 'trends':
            $entityId = $_GET['entity_id'] ?? null;
            $entityType = $_GET['entity_type'] ?? 'campaign';
            $metric = $_GET['metric'] ?? 'spend';
            $dateStart = $_GET['date_start'] ?? date('Y-m-d', strtotime('-30 days'));
            $dateEnd = $_GET['date_end'] ?? date('Y-m-d');
            
            if (!$entityId) {
                throw new Exception('entity_id is required');
            }
            
            $trends = $insightsService->getPerformanceTrends($entityId, $entityType, $dateStart, $dateEnd, $metric);
            ResponseHandler::success($trends);
            break;
            
        case 'export':
            handleExportRequest($insightsService);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
}

function handlePostRequest($insightsService) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $action = $input['action'] ?? 'sync';
    
    switch ($action) {
        case 'sync':
            $accountId = $input['account_id'] ?? null;
            $entityId = $input['entity_id'] ?? null;
            $entityType = $input['entity_type'] ?? 'campaign';
            $dateStart = $input['date_start'] ?? date('Y-m-d', strtotime('-7 days'));
            $dateEnd = $input['date_end'] ?? date('Y-m-d');
            
            // Sync all entities for an account
            if ($accountId && !$entityId) {
                $result = syncAccountInsights($insightsService, $accountId, $entityType, $dateStart, $dateEnd);
                ResponseHandler::success($result);
                break;
            }
            
            // Sync single entity
            if (!$entityId) {
                throw new Exception('entity_id or account_id is required');
            }
            
            if ($entityType === 'campaign') {
                $result = $insightsService->syncCampaignInsights($entityId, $dateStart, $dateEnd);
            } elseif ($entityType === 'adset') {
                $result = $insightsService->syncAdSetInsights($entityId, $dateStart, $dateEnd);
            } else {
                throw new Exception('Invalid entity_type');
            }
            
            ResponseHandler::success($result);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
}

function syncAccountInsights($insightsService, $accountId, $entityType, $dateStart, $dateEnd) {
    require_once __DIR__ . '/../core/Database.php';
    
    $db = Database::getInstance();
    $results = [];
    
    // Get entities to sync based on type
    switch ($entityType) {
        case 'campaign':
            $query = "SELECT c.campaign_id FROM campaigns c 
                      JOIN ad_accounts a ON c.ad_account_id = a.id 
                      WHERE a.account_id = ?";
            $entities = $db->query($query, [$accountId]);
            
            foreach ($entities as $entity) {
                try {
                    $result = $insightsService->syncCampaignInsights(
                        $entity['campaign_id'], 
                        $dateStart, 
                        $dateEnd
                    );
                    $results[] = ['campaign_id' => $entity['campaign_id'], 'status' => 'success'];
                } catch (Exception $e) {
                    $results[] = ['campaign_id' => $entity['campaign_id'], 'status' => 'error', 'message' => $e->getMessage()];
                }
            }
            break;
            
        case 'adset':
            $query = "SELECT ads.adset_id FROM adsets ads
                      JOIN campaigns c ON ads.campaign_id = c.id
                      JOIN ad_accounts a ON c.ad_account_id = a.id 
                      WHERE a.account_id = ?";
            $entities = $db->query($query, [$accountId]);
            
            foreach ($entities as $entity) {
                try {
                    $result = $insightsService->syncAdSetInsights(
                        $entity['adset_id'], 
                        $dateStart, 
                        $dateEnd
                    );
                    $results[] = ['adset_id' => $entity['adset_id'], 'status' => 'success'];
                } catch (Exception $e) {
                    $results[] = ['adset_id' => $entity['adset_id'], 'status' => 'error', 'message' => $e->getMessage()];
                }
            }
            break;
    }
    
    return [
        'message' => 'Insights synced successfully',
        'synced' => count(array_filter($results, fn($r) => $r['status'] === 'success')),
        'total' => count($results),
        'results' => $results
    ];
}

function handleExportRequest($insightsService) {
    $accountId = $_GET['account_id'] ?? null;
    $entityId = $_GET['entity_id'] ?? null;
    $entityType = $_GET['entity_type'] ?? 'campaign';
    $dateStart = $_GET['date_start'] ?? date('Y-m-d', strtotime('-7 days'));
    $dateEnd = $_GET['date_end'] ?? date('Y-m-d');
    $format = $_GET['format'] ?? 'csv';
    
    if (!$accountId && !$entityId) {
        throw new Exception('account_id or entity_id is required');
    }
    
    $report = $insightsService->generateReport($accountId, $dateStart, $dateEnd, $entityType);
    
    if ($format === 'csv') {
        exportToCSV($report, $entityType, $dateStart, $dateEnd);
    } else {
        throw new Exception('Export format not supported');
    }
}

function exportToCSV($report, $entityType, $dateStart, $dateEnd) {
    $filename = "{$entityType}_insights_{$dateStart}_to_{$dateEnd}.csv";
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    $output = fopen('php://output', 'w');
    
    // Write UTF-8 BOM for Excel compatibility
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    if (empty($report['data'])) {
        fputcsv($output, ['No data available for the selected period']);
        fclose($output);
        exit;
    }
    
    // Write header row
    $headers = ['Name', 'Date Range', 'Impressions', 'Clicks', 'CTR (%)', 'Spend ($)', 'CPC ($)', 'CPM ($)', 'Conversions', 'CPA ($)', 'ROAS'];
    fputcsv($output, $headers);
    
    // Write data rows
    foreach ($report['data'] as $item) {
        $name = $item['name'] ?? 'Unknown';
        $impressions = $item['impressions'] ?? 0;
        $clicks = $item['clicks'] ?? 0;
        $spend = $item['spend'] ?? 0;
        $conversions = $item['conversions'] ?? 0;
        
        $ctr = $impressions > 0 ? ($clicks / $impressions * 100) : 0;
        $cpc = $clicks > 0 ? ($spend / $clicks) : 0;
        $cpm = $impressions > 0 ? ($spend / $impressions * 1000) : 0;
        $cpa = $conversions > 0 ? ($spend / $conversions) : 0;
        $roas = $conversions > 0 && isset($item['conversion_value']) ? ($item['conversion_value'] / $spend) : 0;
        
        $row = [
            $name,
            "{$dateStart} to {$dateEnd}",
            number_format($impressions, 0),
            number_format($clicks, 0),
            number_format($ctr, 2),
            number_format($spend, 2),
            number_format($cpc, 2),
            number_format($cpm, 2),
            number_format($conversions, 0),
            number_format($cpa, 2),
            number_format($roas, 2)
        ];
        
        fputcsv($output, $row);
    }
    
    // Write summary row
    $summary = $report['summary'] ?? [];
    fputcsv($output, []); // Empty line
    fputcsv($output, [
        'TOTAL',
        '',
        number_format($summary['impressions'] ?? 0, 0),
        number_format($summary['clicks'] ?? 0, 0),
        number_format($summary['ctr'] ?? 0, 2),
        number_format($summary['spend'] ?? 0, 2),
        number_format($summary['cpc'] ?? 0, 2),
        number_format($summary['cpm'] ?? 0, 2),
        number_format($summary['conversions'] ?? 0, 0),
        number_format($summary['cpa'] ?? 0, 2),
        number_format($summary['roas'] ?? 0, 2)
    ]);
    
    fclose($output);
    exit;
}

class ResponseHandler {
    public static function success($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode([
            'success' => true,
            'data' => $data,
            'timestamp' => date('c')
        ]);
        exit();
    }
    
    public static function error($message, $statusCode = 400, $details = null) {
        http_response_code($statusCode);
        $response = [
            'success' => false,
            'error' => $message,
            'timestamp' => date('c')
        ];
        
        if ($details) {
            $response['details'] = $details;
        }
        
        echo json_encode($response);
        exit();
    }
}