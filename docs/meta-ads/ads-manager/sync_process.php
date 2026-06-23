<?php
/**
 * Sync Process Handler
 * Handles AJAX requests for syncing data from Facebook
 */

error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't show errors in JSON response
set_time_limit(300);

require_once 'src/config/Config.php';
require_once 'src/core/Database.php';
require_once 'src/core/FacebookAPI.php';

header('Content-Type: application/json');

try {
    Config::init();
    $db = Database::getInstance();
    
    // Get access token from config
    $fbConfig = Config::getFacebookConfig();
    $accessToken = $fbConfig['access_token'];
    
    if (!$accessToken) {
        throw new Exception('Access token not configured');
    }
    
    $fbApi = new FacebookAPI($accessToken);
    
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'sync_accounts':
            $result = syncAccounts($fbApi, $db);
            break;
            
        case 'sync_campaigns':
            $result = syncCampaigns($fbApi, $db);
            break;
            
        case 'sync_adsets':
            $result = syncAdSets($fbApi, $db);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Convert Facebook DateTime to MySQL format
 * Facebook: 2025-09-20T19:13:55+0800
 * MySQL: 2025-09-20 19:13:55
 */
function convertFacebookDateTime($dateTime) {
    if (empty($dateTime)) {
        return null;
    }
    
    try {
        // Parse ISO 8601 datetime with timezone
        $dt = new DateTime($dateTime);
        // Convert to MySQL format
        return $dt->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        // Fallback: try to extract date and time
        if (preg_match('/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/', $dateTime, $matches)) {
            return $matches[1] . ' ' . $matches[2];
        }
        return null;
    }
}

/**
 * Sync Ad Accounts
 */
function syncAccounts($fbApi, $db) {
    $response = $fbApi->getAccounts('id,name,currency,account_status,timezone_name');
    
    if (!isset($response['data'])) {
        throw new Exception('No accounts data received from Facebook');
    }
    
    $accounts = $response['data'];
    $count = 0;
    
    foreach ($accounts as $account) {
        $accountId = str_replace('act_', '', $account['id']);
        
        // Check if exists
        $existing = $db->query(
            "SELECT id FROM ad_accounts WHERE account_id = ?",
            [$accountId]
        )->fetch();
        
        $data = [
            'account_id' => $accountId,
            'name' => $account['name'] ?? 'Unnamed Account',
            'currency' => $account['currency'] ?? 'USD',
            'timezone_name' => $account['timezone_name'] ?? 'UTC',
            'account_status' => $account['account_status'] ?? '1',
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        if ($existing) {
            $db->update('ad_accounts', $data, 'id = :where_id', ['where_id' => $existing['id']]);
        } else {
            $data['created_at'] = date('Y-m-d H:i:s');
            $db->insert('ad_accounts', $data);
        }
        
        $count++;
    }
    
    return [
        'success' => true,
        'count' => $count,
        'accounts' => $accounts
    ];
}

/**
 * Sync Campaigns
 */
function syncCampaigns($fbApi, $db) {
    // Get all ad accounts
    $accounts = $db->query("SELECT id, account_id FROM ad_accounts")->fetchAll();
    
    if (empty($accounts)) {
        throw new Exception('No ad accounts found. Please sync accounts first.');
    }
    
    $totalCount = 0;
    $campaignsList = [];
    
    foreach ($accounts as $account) {
        try {
            $response = $fbApi->getCampaigns(
                $account['account_id'],
                'id,name,status,objective,daily_budget,lifetime_budget,bid_strategy,buying_type,start_time,stop_time,special_ad_categories'
            );
            
            if (isset($response['data'])) {
                foreach ($response['data'] as $campaign) {
                    $campaignId = $campaign['id'];
                    
                    // Check if exists
                    $existing = $db->query(
                        "SELECT id FROM campaigns WHERE campaign_id = ?",
                        [$campaignId]
                    )->fetch();
                    
                    $data = [
                        'ad_account_id' => $account['id'],
                        'campaign_id' => $campaignId,
                        'name' => $campaign['name'] ?? 'Unnamed Campaign',
                        'status' => $campaign['status'] ?? 'PAUSED',
                        'objective' => $campaign['objective'] ?? 'OUTCOME_TRAFFIC',
                        'daily_budget' => isset($campaign['daily_budget']) ? $campaign['daily_budget'] / 100 : null,
                        'lifetime_budget' => isset($campaign['lifetime_budget']) ? $campaign['lifetime_budget'] / 100 : null,
                        'bid_strategy' => $campaign['bid_strategy'] ?? 'LOWEST_COST',
                        'buying_type' => $campaign['buying_type'] ?? 'AUCTION',
                        'start_time' => isset($campaign['start_time']) ? convertFacebookDateTime($campaign['start_time']) : null,
                        'stop_time' => isset($campaign['stop_time']) ? convertFacebookDateTime($campaign['stop_time']) : null,
                        'special_ad_categories' => isset($campaign['special_ad_categories']) ? json_encode($campaign['special_ad_categories']) : null,
                        'updated_at' => date('Y-m-d H:i:s')
                    ];
                    
                    if ($existing) {
                        $db->update('campaigns', $data, 'id = :where_id', ['where_id' => $existing['id']]);
                    } else {
                        $data['created_at'] = date('Y-m-d H:i:s');
                        $db->insert('campaigns', $data);
                    }
                    
                    $totalCount++;
                    $campaignsList[] = [
                        'id' => $campaignId,
                        'name' => $campaign['name'] ?? 'Unnamed Campaign',
                        'status' => $campaign['status'] ?? 'PAUSED'
                    ];
                }
            }
        } catch (Exception $e) {
            // Continue with next account if one fails
            error_log("Failed to sync campaigns for account {$account['account_id']}: " . $e->getMessage());
        }
    }
    
    return [
        'success' => true,
        'count' => $totalCount,
        'campaigns' => $campaignsList
    ];
}

/**
 * Sync Ad Sets
 */
function syncAdSets($fbApi, $db) {
    // Get all campaigns
    $campaigns = $db->query("SELECT id, campaign_id FROM campaigns")->fetchAll();
    
    if (empty($campaigns)) {
        throw new Exception('No campaigns found. Please sync campaigns first.');
    }
    
    $totalCount = 0;
    $adsetsList = [];
    
    foreach ($campaigns as $campaign) {
        try {
            $response = $fbApi->getAdSets(
                $campaign['campaign_id'],
                'id,name,status,optimization_goal,targeting,daily_budget,lifetime_budget,bid_amount,bid_strategy,billing_event,start_time,end_time,frequency_control_specs'
            );
            
            if (isset($response['data'])) {
                foreach ($response['data'] as $adset) {
                    $adsetId = $adset['id'];
                    
                    // Check if exists
                    $existing = $db->query(
                        "SELECT id FROM adsets WHERE adset_id = ?",
                        [$adsetId]
                    )->fetch();
                    
                    $data = [
                        'campaign_id' => $campaign['id'],
                        'adset_id' => $adsetId,
                        'name' => $adset['name'] ?? 'Unnamed AdSet',
                        'status' => $adset['status'] ?? 'PAUSED',
                        'optimization_goal' => $adset['optimization_goal'] ?? 'LINK_CLICKS',
                        'targeting' => isset($adset['targeting']) ? json_encode($adset['targeting']) : json_encode(['interests' => []]),
                        'daily_budget' => isset($adset['daily_budget']) ? $adset['daily_budget'] / 100 : null,
                        'lifetime_budget' => isset($adset['lifetime_budget']) ? $adset['lifetime_budget'] / 100 : null,
                        'bid_amount' => isset($adset['bid_amount']) ? $adset['bid_amount'] / 100 : null,
                        'bid_strategy' => $adset['bid_strategy'] ?? 'LOWEST_COST',
                        'billing_event' => $adset['billing_event'] ?? 'IMPRESSIONS',
                        'start_time' => isset($adset['start_time']) ? convertFacebookDateTime($adset['start_time']) : null,
                        'end_time' => isset($adset['end_time']) ? convertFacebookDateTime($adset['end_time']) : null,
                        'frequency_control_specs' => isset($adset['frequency_control_specs']) ? json_encode($adset['frequency_control_specs']) : null,
                        'updated_at' => date('Y-m-d H:i:s')
                    ];
                    
                    if ($existing) {
                        $db->update('adsets', $data, 'id = :where_id', ['where_id' => $existing['id']]);
                    } else {
                        $data['created_at'] = date('Y-m-d H:i:s');
                        $db->insert('adsets', $data);
                    }
                    
                    $totalCount++;
                    $adsetsList[] = [
                        'id' => $adsetId,
                        'name' => $adset['name'] ?? 'Unnamed AdSet',
                        'status' => $adset['status'] ?? 'PAUSED'
                    ];
                }
            }
        } catch (Exception $e) {
            // Continue with next campaign if one fails
            error_log("Failed to sync adsets for campaign {$campaign['campaign_id']}: " . $e->getMessage());
        }
    }
    
    return [
        'success' => true,
        'count' => $totalCount,
        'adsets' => $adsetsList
    ];
}
?>