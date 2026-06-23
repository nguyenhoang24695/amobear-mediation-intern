<?php

require_once __DIR__ . '/../services/AdSetService.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $headers = getallheaders();
    $accessToken = $headers['Authorization'] ?? $_GET['access_token'] ?? null;
    
    if (!$accessToken) {
        throw new Exception('Access token is required');
    }
    
    if (strpos($accessToken, 'Bearer ') === 0) {
        $accessToken = substr($accessToken, 7);
    }
    
    $adsetService = new AdSetService($accessToken);
    $method = $_SERVER['REQUEST_METHOD'];
    $pathInfo = $_SERVER['PATH_INFO'] ?? '';
    
    switch ($method) {
        case 'GET':
            handleGetRequest($adsetService, $pathInfo);
            break;
            
        case 'POST':
            handlePostRequest($adsetService);
            break;
            
        case 'PUT':
            handlePutRequest($adsetService, $pathInfo);
            break;
            
        case 'DELETE':
            handleDeleteRequest($adsetService, $pathInfo);
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    ResponseHandler::error($e->getMessage(), 500);
}

function handleGetRequest($adsetService, $pathInfo) {
    $adsetId = trim($pathInfo, '/');
    
    if ($adsetId) {
        // Get specific ad set
        if (isset($_GET['performance'])) {
            $dateStart = $_GET['date_start'] ?? date('Y-m-d', strtotime('-7 days'));
            $dateEnd = $_GET['date_end'] ?? date('Y-m-d');
            $performance = $adsetService->getPerformance($adsetId, $dateStart, $dateEnd);
            ResponseHandler::success($performance);
        } else {
            $adset = $adsetService->getById($adsetId);
            ResponseHandler::success($adset);
        }
    } else {
        // Get ad sets for campaign
        $campaignId = $_GET['campaign_id'] ?? null;
        $status = $_GET['status'] ?? null;
        
        if (!$campaignId) {
            throw new Exception('campaign_id is required');
        }
        
        $adsets = $adsetService->getByCampaign($campaignId, $status);
        ResponseHandler::success([
            'adsets' => $adsets,
            'count' => count($adsets)
        ]);
    }
}

function handlePostRequest($adsetService) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $action = $input['action'] ?? 'create';
    
    switch ($action) {
        case 'create':
            $accountId = $input['account_id'] ?? null;
            if (!$accountId) {
                throw new Exception('account_id is required');
            }
            
            $result = $adsetService->create($accountId, $input);
            ResponseHandler::success($result, 201);
            break;
            
        case 'sync':
            $campaignId = $input['campaign_id'] ?? null;
            if (!$campaignId) {
                throw new Exception('campaign_id is required');
            }
            
            $result = $adsetService->syncFromFacebook($campaignId);
            ResponseHandler::success($result);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
}

function handlePutRequest($adsetService, $pathInfo) {
    $adsetId = trim($pathInfo, '/');
    
    if (!$adsetId) {
        throw new Exception('Ad Set ID is required');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $result = $adsetService->update($adsetId, $input);
    ResponseHandler::success($result);
}

function handleDeleteRequest($adsetService, $pathInfo) {
    $adsetId = trim($pathInfo, '/');
    
    if (!$adsetId) {
        throw new Exception('Ad Set ID is required');
    }
    
    $result = $adsetService->delete($adsetId);
    ResponseHandler::success($result);
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