<?php

require_once __DIR__ . '/../core/FacebookAPI.php';
require_once __DIR__ . '/../core/Database.php';

class CampaignService {
    private $fbApi;
    private $db;
    
    public function __construct($accessToken) {
        $this->fbApi = new FacebookAPI($accessToken);
        $this->db = Database::getInstance();
    }
    
    /**
     * Create new campaign
     */
    public function create($accountId, $data) {
        try {
            // Validate required fields
            $this->validateCampaignData($data);
            
            // Create campaign via Facebook API
            $result = $this->fbApi->createCampaign($accountId, $data);
            
            // Save to local database
            $campaignData = [
                'campaign_id' => $result['id'],
                'ad_account_id' => $this->getAccountLocalId($accountId),
                'name' => $data['name'],
                'objective' => $data['objective'],
                'status' => $data['status'],
                'daily_budget' => $data['daily_budget'] ?? null,
                'lifetime_budget' => $data['lifetime_budget'] ?? null,
                'bid_strategy' => $data['bid_strategy'] ?? 'LOWEST_COST',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            $localId = $this->db->insert('campaigns', $campaignData);
            
            return [
                'success' => true,
                'facebook_id' => $result['id'],
                'local_id' => $localId,
                'data' => $campaignData
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to create campaign: " . $e->getMessage());
        }
    }
    
    /**
     * Update campaign
     */
    public function update($campaignId, $data) {
        try {
            // Update via Facebook API
            $result = $this->fbApi->updateCampaign($campaignId, $data);
            
            // Update local database
            $updateData = [
                'name' => $data['name'] ?? null,
                'status' => $data['status'] ?? null,
                'daily_budget' => $data['daily_budget'] ?? null,
                'lifetime_budget' => $data['lifetime_budget'] ?? null,
                'bid_strategy' => $data['bid_strategy'] ?? null,
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            // Remove null values
            $updateData = array_filter($updateData, function($value) {
                return $value !== null;
            });
            
            $this->db->update('campaigns', $updateData, 'campaign_id = ?', [$campaignId]);
            
            return [
                'success' => true,
                'facebook_response' => $result,
                'updated_fields' => array_keys($updateData)
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to update campaign: " . $e->getMessage());
        }
    }
    
    /**
     * Get campaign by ID
     */
    public function getById($campaignId) {
        try {
            // Get from local database first
            $localCampaign = $this->db->query(
                "SELECT * FROM campaigns WHERE campaign_id = ?", 
                [$campaignId]
            )->fetch();
            
            if (!$localCampaign) {
                throw new Exception("Campaign not found in local database");
            }
            
            // Get latest data from Facebook API
            $fbCampaign = $this->fbApi->getCampaign($campaignId);
            
            return array_merge($localCampaign, $fbCampaign);
            
        } catch (Exception $e) {
            throw new Exception("Failed to get campaign: " . $e->getMessage());
        }
    }
    
    /**
     * Get all campaigns for account
     */
    public function getByAccount($accountId, $status = null) {
        try {
            // Build query
            $where = 'c.ad_account_id = ?';
            $params = [$this->getAccountLocalId($accountId)];
            
            if ($status) {
                $where .= ' AND c.status = ?';
                $params[] = $status;
            }
            
            $sql = "
                SELECT c.*, a.account_id, a.name as account_name 
                FROM campaigns c 
                JOIN ad_accounts a ON c.ad_account_id = a.id 
                WHERE {$where}
                ORDER BY c.created_at DESC
            ";
            
            return $this->db->query($sql, $params)->fetchAll();
            
        } catch (Exception $e) {
            throw new Exception("Failed to get campaigns: " . $e->getMessage());
        }
    }
    
    /**
     * Delete campaign
     */
    public function delete($campaignId) {
        try {
            // Update status to DELETED in Facebook
            $this->fbApi->updateCampaign($campaignId, ['status' => 'DELETED']);
            
            // Update status in local database
            $this->db->update(
                'campaigns', 
                ['status' => 'DELETED', 'updated_at' => date('Y-m-d H:i:s')], 
                'campaign_id = ?', 
                [$campaignId]
            );
            
            return ['success' => true];
            
        } catch (Exception $e) {
            throw new Exception("Failed to delete campaign: " . $e->getMessage());
        }
    }
    
    /**
     * Sync campaigns from Facebook API
     */
    public function syncFromFacebook($accountId) {
        try {
            $fbCampaigns = $this->fbApi->getCampaigns($accountId);
            $synced = 0;
            
            foreach ($fbCampaigns['data'] as $fbCampaign) {
                $existingCampaign = $this->db->query(
                    "SELECT id FROM campaigns WHERE campaign_id = ?", 
                    [$fbCampaign['id']]
                )->fetch();
                
                $campaignData = [
                    'campaign_id' => $fbCampaign['id'],
                    'ad_account_id' => $this->getAccountLocalId($accountId),
                    'name' => $fbCampaign['name'],
                    'objective' => $fbCampaign['objective'],
                    'status' => $fbCampaign['status'],
                    'daily_budget' => $fbCampaign['daily_budget'] ?? null,
                    'lifetime_budget' => $fbCampaign['lifetime_budget'] ?? null,
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                
                if ($existingCampaign) {
                    // Update existing
                    $this->db->update('campaigns', $campaignData, 'id = ?', [$existingCampaign['id']]);
                } else {
                    // Insert new
                    $campaignData['created_at'] = date('Y-m-d H:i:s');
                    $this->db->insert('campaigns', $campaignData);
                }
                
                $synced++;
            }
            
            return [
                'success' => true,
                'synced_count' => $synced,
                'total_facebook' => count($fbCampaigns['data'])
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to sync campaigns: " . $e->getMessage());
        }
    }
    
    /**
     * Get campaign performance summary
     */
    public function getPerformanceSummary($campaignId, $dateStart, $dateEnd) {
        try {
            // Get insights from Facebook API
            $insights = $this->fbApi->getCampaignInsights($campaignId, $dateStart, $dateEnd);
            
            if (empty($insights['data'])) {
                return ['message' => 'No data available for the selected period'];
            }
            
            $data = $insights['data'][0];
            
            // Calculate additional metrics
            $ctr = $data['clicks'] > 0 ? ($data['clicks'] / $data['impressions']) * 100 : 0;
            $cpc = $data['clicks'] > 0 ? $data['spend'] / $data['clicks'] : 0;
            $cpm = $data['impressions'] > 0 ? ($data['spend'] / $data['impressions']) * 1000 : 0;
            
            return [
                'campaign_id' => $campaignId,
                'date_range' => ['start' => $dateStart, 'end' => $dateEnd],
                'metrics' => [
                    'impressions' => (int) $data['impressions'],
                    'reach' => (int) ($data['reach'] ?? 0),
                    'clicks' => (int) $data['clicks'],
                    'spend' => (float) $data['spend'],
                    'ctr' => round($ctr, 2),
                    'cpc' => round($cpc, 2),
                    'cpm' => round($cpm, 2)
                ],
                'actions' => $data['actions'] ?? []
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to get performance summary: " . $e->getMessage());
        }
    }
    
    /**
     * Validate campaign data
     */
    private function validateCampaignData($data) {
        $required = ['name', 'objective', 'status'];
        
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new Exception("Required field missing: {$field}");
            }
        }
        
        // Validate objective
        $validObjectives = [
            'OUTCOME_APP_PROMOTION', 'OUTCOME_AWARENESS', 'OUTCOME_ENGAGEMENT',
            'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_TRAFFIC'
        ];
        
        if (!in_array($data['objective'], $validObjectives)) {
            throw new Exception("Invalid objective: {$data['objective']}");
        }
        
        // Validate status
        $validStatuses = ['ACTIVE', 'PAUSED'];
        
        if (!in_array($data['status'], $validStatuses)) {
            throw new Exception("Invalid status: {$data['status']}");
        }
        
        // Validate budget (must have either daily or lifetime budget)
        if (empty($data['daily_budget']) && empty($data['lifetime_budget'])) {
            throw new Exception("Either daily_budget or lifetime_budget is required");
        }
    }
    
    /**
     * Get Facebook account ID from Facebook account ID or local database ID
     */
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
}