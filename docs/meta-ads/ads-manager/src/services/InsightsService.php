<?php

require_once __DIR__ . '/../core/FacebookAPI.php';
require_once __DIR__ . '/../core/Database.php';

class InsightsService {
    private $fbApi;
    private $db;
    
    public function __construct($accessToken) {
        $this->fbApi = new FacebookAPI($accessToken);
        $this->db = Database::getInstance();
    }
    
    /**
     * Sync insights for campaigns
     */
    public function syncCampaignInsights($campaignId, $dateStart, $dateEnd) {
        try {
            $params = [
                'fields' => 'impressions,reach,clicks,spend,ctr,cpc,cpm,actions,action_values,cost_per_action_type,video_30_sec_watched_actions',
                'time_range' => json_encode(['since' => $dateStart, 'until' => $dateEnd]),
                'time_increment' => 1 // Daily breakdown
            ];
            
            $insights = $this->fbApi->getInsights($campaignId, $params);
            
            if (empty($insights['data'])) {
                return ['message' => 'No insights data available'];
            }
            
            $synced = 0;
            foreach ($insights['data'] as $data) {
                $insightData = [
                    'campaign_id' => $this->getCampaignLocalId($campaignId),
                    'date_start' => $data['date_start'],
                    'date_stop' => $data['date_stop'],
                    'impressions' => $data['impressions'] ?? 0,
                    'reach' => $data['reach'] ?? 0,
                    'clicks' => $data['clicks'] ?? 0,
                    'spend' => $data['spend'] ?? 0,
                    'ctr' => $data['ctr'] ?? 0,
                    'cpc' => $data['cpc'] ?? 0,
                    'cpm' => $data['cpm'] ?? 0,
                    'actions' => isset($data['actions']) ? json_encode($data['actions']) : null,
                    'action_values' => isset($data['action_values']) ? json_encode($data['action_values']) : null,
                    'cost_per_action_type' => isset($data['cost_per_action_type']) ? json_encode($data['cost_per_action_type']) : null,
                    'video_30_sec_watched_actions' => isset($data['video_30_sec_watched_actions']) ? json_encode($data['video_30_sec_watched_actions']) : null,
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                
                // Check if record exists
                $existing = $this->db->query(
                    "SELECT id FROM campaign_insights WHERE campaign_id = ? AND date_start = ? AND date_stop = ?",
                    [$insightData['campaign_id'], $insightData['date_start'], $insightData['date_stop']]
                )->fetch();
                
                if ($existing) {
                    $this->db->update('campaign_insights', $insightData, 'id = ?', [$existing['id']]);
                } else {
                    $insightData['created_at'] = date('Y-m-d H:i:s');
                    $this->db->insert('campaign_insights', $insightData);
                }
                
                $synced++;
            }
            
            return [
                'success' => true,
                'synced_count' => $synced,
                'date_range' => ['start' => $dateStart, 'end' => $dateEnd]
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to sync campaign insights: " . $e->getMessage());
        }
    }
    
    /**
     * Sync insights for ad sets
     */
    public function syncAdSetInsights($adsetId, $dateStart, $dateEnd) {
        try {
            $params = [
                'fields' => 'impressions,reach,clicks,spend,ctr,cpc,cpm,actions,action_values',
                'time_range' => json_encode(['since' => $dateStart, 'until' => $dateEnd]),
                'time_increment' => 1
            ];
            
            $insights = $this->fbApi->getInsights($adsetId, $params);
            
            if (empty($insights['data'])) {
                return ['message' => 'No insights data available'];
            }
            
            $synced = 0;
            foreach ($insights['data'] as $data) {
                $insightData = [
                    'adset_id' => $this->getAdSetLocalId($adsetId),
                    'date_start' => $data['date_start'],
                    'date_stop' => $data['date_stop'],
                    'impressions' => $data['impressions'] ?? 0,
                    'reach' => $data['reach'] ?? 0,
                    'clicks' => $data['clicks'] ?? 0,
                    'spend' => $data['spend'] ?? 0,
                    'ctr' => $data['ctr'] ?? 0,
                    'cpc' => $data['cpc'] ?? 0,
                    'cpm' => $data['cpm'] ?? 0,
                    'actions' => isset($data['actions']) ? json_encode($data['actions']) : null,
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                
                $existing = $this->db->query(
                    "SELECT id FROM adset_insights WHERE adset_id = ? AND date_start = ? AND date_stop = ?",
                    [$insightData['adset_id'], $insightData['date_start'], $insightData['date_stop']]
                )->fetch();
                
                if ($existing) {
                    $this->db->update('adset_insights', $insightData, 'id = ?', [$existing['id']]);
                } else {
                    $insightData['created_at'] = date('Y-m-d H:i:s');
                    $this->db->insert('adset_insights', $insightData);
                }
                
                $synced++;
            }
            
            return [
                'success' => true,
                'synced_count' => $synced
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to sync ad set insights: " . $e->getMessage());
        }
    }
    
    /**
     * Generate performance report
     */
    public function generateReport($accountId, $dateStart, $dateEnd, $entityType = 'campaign') {
        try {
            switch ($entityType) {
                case 'campaign':
                    return $this->generateCampaignReport($accountId, $dateStart, $dateEnd);
                case 'adset':
                    return $this->generateAdSetReport($accountId, $dateStart, $dateEnd);
                case 'account':
                    return $this->generateAccountReport($accountId, $dateStart, $dateEnd);
                default:
                    throw new Exception("Invalid entity type: {$entityType}");
            }
        } catch (Exception $e) {
            throw new Exception("Failed to generate report: " . $e->getMessage());
        }
    }
    
    /**
     * Generate campaign report
     */
    private function generateCampaignReport($accountId, $dateStart, $dateEnd) {
        $sql = "
            SELECT 
                c.campaign_id,
                c.name,
                c.objective,
                c.status,
                SUM(ci.impressions) as total_impressions,
                SUM(ci.reach) as total_reach,
                SUM(ci.clicks) as total_clicks,
                SUM(ci.spend) as total_spend,
                AVG(ci.ctr) as avg_ctr,
                AVG(ci.cpc) as avg_cpc,
                AVG(ci.cpm) as avg_cpm
            FROM campaigns c
            LEFT JOIN campaign_insights ci ON c.id = ci.campaign_id
            WHERE c.ad_account_id = ?
                AND ci.date_start >= ?
                AND ci.date_stop <= ?
            GROUP BY c.id, c.campaign_id, c.name, c.objective, c.status
            ORDER BY total_spend DESC
        ";
        
        $accountLocalId = $this->getAccountLocalId($accountId);
        $campaigns = $this->db->query($sql, [$accountLocalId, $dateStart, $dateEnd])->fetchAll();
        
        // Calculate totals
        $totals = [
            'impressions' => 0,
            'reach' => 0,
            'clicks' => 0,
            'spend' => 0
        ];
        
        foreach ($campaigns as $campaign) {
            $totals['impressions'] += $campaign['total_impressions'];
            $totals['reach'] += $campaign['total_reach'];
            $totals['clicks'] += $campaign['total_clicks'];
            $totals['spend'] += $campaign['total_spend'];
        }
        
        return [
            'entity_type' => 'campaign',
            'account_id' => $accountId,
            'date_range' => ['start' => $dateStart, 'end' => $dateEnd],
            'data' => $campaigns,
            'totals' => $totals,
            'generated_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Generate ad set report
     */
    private function generateAdSetReport($accountId, $dateStart, $dateEnd) {
        $sql = "
            SELECT 
                a.adset_id,
                a.name,
                a.optimization_goal,
                a.status,
                c.campaign_id,
                c.name as campaign_name,
                SUM(ai.impressions) as total_impressions,
                SUM(ai.reach) as total_reach,
                SUM(ai.clicks) as total_clicks,
                SUM(ai.spend) as total_spend,
                AVG(ai.ctr) as avg_ctr,
                AVG(ai.cpc) as avg_cpc,
                AVG(ai.cpm) as avg_cpm
            FROM adsets a
            JOIN campaigns c ON a.campaign_id = c.id
            LEFT JOIN adset_insights ai ON a.id = ai.adset_id
            WHERE c.ad_account_id = ?
                AND ai.date_start >= ?
                AND ai.date_stop <= ?
            GROUP BY a.id, a.adset_id, a.name, a.optimization_goal, a.status, c.campaign_id, c.name
            ORDER BY total_spend DESC
        ";
        
        $accountLocalId = $this->getAccountLocalId($accountId);
        $adsets = $this->db->query($sql, [$accountLocalId, $dateStart, $dateEnd])->fetchAll();
        
        return [
            'entity_type' => 'adset',
            'account_id' => $accountId,
            'date_range' => ['start' => $dateStart, 'end' => $dateEnd],
            'data' => $adsets,
            'generated_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Generate account summary report
     */
    private function generateAccountReport($accountId, $dateStart, $dateEnd) {
        $accountLocalId = $this->getAccountLocalId($accountId);
        
        // Get account summary
        $summarySql = "
            SELECT 
                COUNT(DISTINCT c.id) as total_campaigns,
                COUNT(DISTINCT a.id) as total_adsets,
                SUM(ci.impressions) as total_impressions,
                SUM(ci.reach) as total_reach,
                SUM(ci.clicks) as total_clicks,
                SUM(ci.spend) as total_spend
            FROM campaigns c
            LEFT JOIN adsets a ON c.id = a.campaign_id
            LEFT JOIN campaign_insights ci ON c.id = ci.campaign_id
            WHERE c.ad_account_id = ?
                AND ci.date_start >= ?
                AND ci.date_stop <= ?
        ";
        
        $summary = $this->db->query($summarySql, [$accountLocalId, $dateStart, $dateEnd])->fetch();
        
        // Get daily breakdown
        $dailySql = "
            SELECT 
                ci.date_start,
                SUM(ci.impressions) as impressions,
                SUM(ci.clicks) as clicks,
                SUM(ci.spend) as spend,
                AVG(ci.ctr) as ctr,
                AVG(ci.cpc) as cpc,
                AVG(ci.cpm) as cpm
            FROM campaign_insights ci
            JOIN campaigns c ON ci.campaign_id = c.id
            WHERE c.ad_account_id = ?
                AND ci.date_start >= ?
                AND ci.date_stop <= ?
            GROUP BY ci.date_start
            ORDER BY ci.date_start
        ";
        
        $dailyData = $this->db->query($dailySql, [$accountLocalId, $dateStart, $dateEnd])->fetchAll();
        
        return [
            'entity_type' => 'account',
            'account_id' => $accountId,
            'date_range' => ['start' => $dateStart, 'end' => $dateEnd],
            'summary' => $summary,
            'daily_breakdown' => $dailyData,
            'generated_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * Export report to CSV
     */
    public function exportToCSV($reportData, $filename = null) {
        if (!$filename) {
            $filename = 'facebook_ads_report_' . date('Y-m-d_H-i-s') . '.csv';
        }
        
        $filepath = Config::uploadPath($filename);
        
        // Ensure upload directory exists
        $uploadDir = Config::uploadPath('');
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $file = fopen($filepath, 'w');
        
        if (!empty($reportData['data'])) {
            // Write headers
            $headers = array_keys($reportData['data'][0]);
            fputcsv($file, $headers);
            
            // Write data
            foreach ($reportData['data'] as $row) {
                fputcsv($file, $row);
            }
        }
        
        fclose($file);
        
        return [
            'success' => true,
            'filename' => $filename,
            'filepath' => $filepath,
            'size' => filesize($filepath)
        ];
    }
    
    /**
     * Get performance trends
     */
    public function getPerformanceTrends($entityId, $entityType, $dateStart, $dateEnd, $metric = 'spend') {
        $table = $entityType . '_insights';
        $foreignKey = $entityType . '_id';
        
        $sql = "
            SELECT 
                date_start,
                SUM({$metric}) as value
            FROM {$table}
            WHERE {$foreignKey} = ?
                AND date_start >= ?
                AND date_stop <= ?
            GROUP BY date_start
            ORDER BY date_start
        ";
        
        $localId = $this->getEntityLocalId($entityId, $entityType);
        $trends = $this->db->query($sql, [$localId, $dateStart, $dateEnd])->fetchAll();
        
        return [
            'entity_id' => $entityId,
            'entity_type' => $entityType,
            'metric' => $metric,
            'date_range' => ['start' => $dateStart, 'end' => $dateEnd],
            'trends' => $trends
        ];
    }
    
    /**
     * Helper methods
     */
    private function getCampaignLocalId($campaignId) {
        $campaign = $this->db->query("SELECT id FROM campaigns WHERE campaign_id = ?", [$campaignId])->fetch();
        if (!$campaign) throw new Exception("Campaign not found: {$campaignId}");
        return $campaign['id'];
    }
    
    private function getAdSetLocalId($adsetId) {
        $adset = $this->db->query("SELECT id FROM adsets WHERE adset_id = ?", [$adsetId])->fetch();
        if (!$adset) throw new Exception("Ad set not found: {$adsetId}");
        return $adset['id'];
    }
    
    private function getAccountLocalId($accountId) {
        $account = $this->db->query("SELECT id FROM ad_accounts WHERE account_id = ?", [$accountId])->fetch();
        if (!$account) throw new Exception("Account not found: {$accountId}");
        return $account['id'];
    }
    
    private function getEntityLocalId($entityId, $entityType) {
        switch ($entityType) {
            case 'campaign':
                return $this->getCampaignLocalId($entityId);
            case 'adset':
                return $this->getAdSetLocalId($entityId);
            default:
                throw new Exception("Invalid entity type: {$entityType}");
        }
    }
}