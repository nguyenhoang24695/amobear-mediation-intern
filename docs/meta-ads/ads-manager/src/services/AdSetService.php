<?php

require_once __DIR__ . '/../core/FacebookAPI.php';
require_once __DIR__ . '/../core/Database.php';

class AdSetService {
    private $fbApi;
    private $db;
    
    public function __construct($accessToken) {
        $this->fbApi = new FacebookAPI($accessToken);
        $this->db = Database::getInstance();
    }
    
    /**
     * Create new ad set
     */
    public function create($accountId, $data) {
        try {
            $this->validateAdSetData($data);
            
            // Create ad set via Facebook API
            $result = $this->fbApi->createAdSet($accountId, $data);
            
            // Save to local database
            $adsetData = [
                'adset_id' => $result['id'],
                'campaign_id' => $this->getCampaignLocalId($data['campaign_id']),
                'name' => $data['name'],
                'status' => $data['status'],
                'optimization_goal' => $data['optimization_goal'],
                'targeting' => json_encode($data['targeting']),
                'daily_budget' => $data['daily_budget'] ?? null,
                'lifetime_budget' => $data['lifetime_budget'] ?? null,
                'bid_amount' => $data['bid_amount'] ?? null,
                'start_time' => $data['start_time'] ?? null,
                'end_time' => $data['end_time'] ?? null,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            $localId = $this->db->insert('adsets', $adsetData);
            
            return [
                'success' => true,
                'facebook_id' => $result['id'],
                'local_id' => $localId,
                'data' => $adsetData
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to create ad set: " . $e->getMessage());
        }
    }
    
    /**
     * Update ad set
     */
    public function update($adsetId, $data) {
        try {
            // Update via Facebook API
            $result = $this->fbApi->updateAdSet($adsetId, $data);
            
            // Prepare update data
            $updateData = [
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            $allowedFields = ['name', 'status', 'optimization_goal', 'daily_budget', 'lifetime_budget', 'bid_amount', 'targeting'];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'targeting') {
                        $updateData[$field] = json_encode($data[$field]);
                    } else {
                        $updateData[$field] = $data[$field];
                    }
                }
            }
            
            $this->db->update('adsets', $updateData, 'adset_id = ?', [$adsetId]);
            
            return [
                'success' => true,
                'facebook_response' => $result,
                'updated_fields' => array_keys($updateData)
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to update ad set: " . $e->getMessage());
        }
    }
    
    /**
     * Get ad set by ID
     */
    public function getById($adsetId) {
        try {
            $localAdSet = $this->db->query("
                SELECT a.*, c.campaign_id, c.name as campaign_name 
                FROM adsets a 
                JOIN campaigns c ON a.campaign_id = c.id 
                WHERE a.adset_id = ?
            ", [$adsetId])->fetch();
            
            if (!$localAdSet) {
                throw new Exception("Ad set not found in local database");
            }
            
            // Decode targeting JSON
            if ($localAdSet['targeting']) {
                $localAdSet['targeting'] = json_decode($localAdSet['targeting'], true);
            }
            
            // Get latest data from Facebook API
            $fbAdSet = $this->fbApi->getAdSet($adsetId);
            
            return array_merge($localAdSet, $fbAdSet);
            
        } catch (Exception $e) {
            throw new Exception("Failed to get ad set: " . $e->getMessage());
        }
    }
    
    /**
     * Get ad sets by campaign
     */
    public function getByCampaign($campaignId, $status = null) {
        try {
            $where = 'a.campaign_id = ?';
            $params = [$this->getCampaignLocalId($campaignId)];
            
            if ($status) {
                $where .= ' AND a.status = ?';
                $params[] = $status;
            }
            
            $sql = "
                SELECT a.*, c.campaign_id, c.name as campaign_name 
                FROM adsets a 
                JOIN campaigns c ON a.campaign_id = c.id 
                WHERE {$where}
                ORDER BY a.created_at DESC
            ";
            
            $adsets = $this->db->query($sql, $params)->fetchAll();
            
            // Decode targeting JSON for each ad set
            foreach ($adsets as &$adset) {
                if ($adset['targeting']) {
                    $adset['targeting'] = json_decode($adset['targeting'], true);
                }
            }
            
            return $adsets;
            
        } catch (Exception $e) {
            throw new Exception("Failed to get ad sets: " . $e->getMessage());
        }
    }
    
    /**
     * Delete ad set
     */
    public function delete($adsetId) {
        try {
            $this->fbApi->updateAdSet($adsetId, ['status' => 'DELETED']);
            
            $this->db->update(
                'adsets', 
                ['status' => 'DELETED', 'updated_at' => date('Y-m-d H:i:s')], 
                'adset_id = ?', 
                [$adsetId]
            );
            
            return ['success' => true];
            
        } catch (Exception $e) {
            throw new Exception("Failed to delete ad set: " . $e->getMessage());
        }
    }
    
    /**
     * Sync ad sets from Facebook API
     */
    public function syncFromFacebook($campaignId) {
        try {
            $fbAdSets = $this->fbApi->getAdSets($campaignId);
            $synced = 0;
            
            foreach ($fbAdSets['data'] as $fbAdSet) {
                $existingAdSet = $this->db->query(
                    "SELECT id FROM adsets WHERE adset_id = ?", 
                    [$fbAdSet['id']]
                )->fetch();
                
                $adsetData = [
                    'adset_id' => $fbAdSet['id'],
                    'campaign_id' => $this->getCampaignLocalId($campaignId),
                    'name' => $fbAdSet['name'],
                    'status' => $fbAdSet['status'],
                    'optimization_goal' => $fbAdSet['optimization_goal'] ?? null,
                    'targeting' => isset($fbAdSet['targeting']) ? json_encode($fbAdSet['targeting']) : null,
                    'daily_budget' => $fbAdSet['daily_budget'] ?? null,
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                
                if ($existingAdSet) {
                    $this->db->update('adsets', $adsetData, 'id = ?', [$existingAdSet['id']]);
                } else {
                    $adsetData['created_at'] = date('Y-m-d H:i:s');
                    $this->db->insert('adsets', $adsetData);
                }
                
                $synced++;
            }
            
            return [
                'success' => true,
                'synced_count' => $synced,
                'total_facebook' => count($fbAdSets['data'])
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to sync ad sets: " . $e->getMessage());
        }
    }
    
    /**
     * Create targeting configuration
     */
    public function createTargeting($config) {
        $targeting = [];
        
        // Age and gender
        if (isset($config['age_min'])) {
            $targeting['age_min'] = $config['age_min'];
        }
        if (isset($config['age_max'])) {
            $targeting['age_max'] = $config['age_max'];
        }
        if (isset($config['genders'])) {
            $targeting['genders'] = $config['genders']; // [1] for male, [2] for female
        }
        
        // Geo locations
        if (isset($config['geo_locations'])) {
            $targeting['geo_locations'] = $config['geo_locations'];
        }
        
        // Interests
        if (isset($config['interests'])) {
            $targeting['interests'] = $config['interests'];
        }
        
        // Behaviors
        if (isset($config['behaviors'])) {
            $targeting['behaviors'] = $config['behaviors'];
        }
        
        // Custom audiences
        if (isset($config['custom_audiences'])) {
            $targeting['custom_audiences'] = $config['custom_audiences'];
        }
        
        // Excluded audiences
        if (isset($config['exclusions'])) {
            $targeting['exclusions'] = $config['exclusions'];
        }
        
        // Device platforms
        if (isset($config['device_platforms'])) {
            $targeting['device_platforms'] = $config['device_platforms'];
        }
        
        // Publisher platforms
        if (isset($config['publisher_platforms'])) {
            $targeting['publisher_platforms'] = $config['publisher_platforms'];
        }
        
        return $targeting;
    }
    
    /**
     * Get ad set performance
     */
    public function getPerformance($adsetId, $dateStart, $dateEnd) {
        try {
            $insights = $this->fbApi->getInsights($adsetId, [
                'time_range' => json_encode(['since' => $dateStart, 'until' => $dateEnd]),
                'fields' => 'impressions,reach,clicks,spend,ctr,cpc,cpm,actions'
            ]);
            
            if (empty($insights['data'])) {
                return ['message' => 'No data available for the selected period'];
            }
            
            return [
                'adset_id' => $adsetId,
                'date_range' => ['start' => $dateStart, 'end' => $dateEnd],
                'metrics' => $insights['data'][0]
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to get ad set performance: " . $e->getMessage());
        }
    }
    
    /**
     * Validate ad set data
     */
    private function validateAdSetData($data) {
        $required = ['name', 'campaign_id', 'optimization_goal', 'targeting', 'status'];
        
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new Exception("Required field missing: {$field}");
            }
        }
        
        // Validate optimization goal
        $validGoals = [
            'REACH', 'IMPRESSIONS', 'CLICKS', 'UNIQUE_CLICKS', 'APP_INSTALLS',
            'LEAD_GENERATION', 'LINK_CLICKS', 'POST_ENGAGEMENT', 'VIDEO_VIEWS',
            'CONVERSIONS', 'VALUE'
        ];
        
        if (!in_array($data['optimization_goal'], $validGoals)) {
            throw new Exception("Invalid optimization goal: {$data['optimization_goal']}");
        }
        
        // Validate status
        if (!in_array($data['status'], ['ACTIVE', 'PAUSED'])) {
            throw new Exception("Invalid status: {$data['status']}");
        }
        
        // Validate budget
        if (empty($data['daily_budget']) && empty($data['lifetime_budget'])) {
            throw new Exception("Either daily_budget or lifetime_budget is required");
        }
        
        // Validate targeting
        if (!is_array($data['targeting']) || empty($data['targeting'])) {
            throw new Exception("Targeting must be a non-empty array");
        }
    }
    
    /**
     * Get local campaign ID from Facebook campaign ID
     */
    private function getCampaignLocalId($campaignId) {
        $campaign = $this->db->query(
            "SELECT id FROM campaigns WHERE campaign_id = ?", 
            [$campaignId]
        )->fetch();
        
        if (!$campaign) {
            throw new Exception("Campaign not found: {$campaignId}");
        }
        
        return $campaign['id'];
    }
}