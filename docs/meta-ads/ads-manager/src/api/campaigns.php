<?php

require_once __DIR__ . '/../services/CampaignService.php';
require_once __DIR__ . '/../core/ResponseHandler.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Get access token from header
    $headers = getallheaders();
    $accessToken = $headers['Authorization'] ?? $_GET['access_token'] ?? null;
    
    if (!$accessToken) {
        throw new Exception('Access token is required');
    }
    
    // Remove "Bearer " prefix if present
    if (strpos($accessToken, 'Bearer ') === 0) {
        $accessToken = substr($accessToken, 7);
    }
    
    $campaignService = new CampaignService($accessToken);
    $method = $_SERVER['REQUEST_METHOD'];
    $pathInfo = $_SERVER['PATH_INFO'] ?? '';
    
    switch ($method) {
        case 'GET':
            handleGetRequest($campaignService, $pathInfo);
            break;
            
        case 'POST':
            handlePostRequest($campaignService);
            break;
            
        case 'PUT':
            handlePutRequest($campaignService, $pathInfo);
            break;
            
        case 'DELETE':
            handleDeleteRequest($campaignService, $pathInfo);
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    ResponseHandler::error($e->getMessage(), 500);
}

function handleGetRequest($campaignService, $pathInfo) {
    // Parse path to get campaign ID if present
    $campaignId = trim($pathInfo, '/');
    
    if ($campaignId) {
        // Get specific campaign
        $campaign = $campaignService->getById($campaignId);
        ResponseHandler::success($campaign);
    } else {
        // Get campaigns for account
        $accountId = $_GET['account_id'] ?? null;
        $status = $_GET['status'] ?? null;
        
        if (!$accountId) {
            throw new Exception('account_id is required');
        }
        
        $campaigns = $campaignService->getByAccount($accountId, $status);
        ResponseHandler::success([
            'campaigns' => $campaigns,
            'count' => count($campaigns)
        ]);
    }
}

function handlePostRequest($campaignService) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $accountId = $input['account_id'] ?? null;
    
    if (!$accountId) {
        throw new Exception('account_id is required');
    }
    
    // Handle different actions
    $action = $input['action'] ?? 'create';
    
    switch ($action) {
        case 'create':
            $result = $campaignService->create($accountId, $input);
            ResponseHandler::success($result, 201);
            break;
            
        case 'sync':
            $result = $campaignService->syncFromFacebook($accountId);
            ResponseHandler::success($result);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
}

function handlePutRequest($campaignService, $pathInfo) {
    $campaignId = trim($pathInfo, '/');
    
    if (!$campaignId) {
        throw new Exception('Campaign ID is required');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $result = $campaignService->update($campaignId, $input);
    ResponseHandler::success($result);
}

function handleDeleteRequest($campaignService, $pathInfo) {
    $campaignId = trim($pathInfo, '/');
    
    if (!$campaignId) {
        throw new Exception('Campaign ID is required');
    }
    
    $result = $campaignService->delete($campaignId);
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