<?php

require_once __DIR__ . '/../services/InsightsService.php';
require_once __DIR__ . '/../core/Database.php';

class SyncInsightsJob {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function run() {
        echo "Starting insights sync job at " . date('Y-m-d H:i:s') . "\n";
        
        try {
            $this->syncCampaignInsights();
            $this->syncAdSetInsights();
            
            echo "Insights sync job completed successfully at " . date('Y-m-d H:i:s') . "\n";
            
        } catch (Exception $e) {
            echo "Error in insights sync job: " . $e->getMessage() . "\n";
            throw $e;
        }
    }
    
    private function syncCampaignInsights() {
        echo "Syncing campaign insights...\n";
        
        // Get all active campaigns
        $campaigns = $this->db->query("
            SELECT c.campaign_id, a.access_token 
            FROM campaigns c 
            JOIN ad_accounts a ON c.ad_account_id = a.id 
            WHERE c.status = 'ACTIVE' 
            AND a.access_token IS NOT NULL
        ")->fetchAll();
        
        $dateStart = date('Y-m-d', strtotime('-1 days')); // Yesterday
        $dateEnd = date('Y-m-d'); // Today
        
        $totalSynced = 0;
        
        foreach ($campaigns as $campaign) {
            try {
                $insightsService = new InsightsService($campaign['access_token']);
                $result = $insightsService->syncCampaignInsights(
                    $campaign['campaign_id'], 
                    $dateStart, 
                    $dateEnd
                );
                
                if ($result['success']) {
                    $totalSynced += $result['synced_count'];
                    echo "Synced {$result['synced_count']} insights for campaign {$campaign['campaign_id']}\n";
                }
                
                // Add small delay to avoid rate limiting
                usleep(100000); // 100ms
                
            } catch (Exception $e) {
                echo "Error syncing campaign {$campaign['campaign_id']}: " . $e->getMessage() . "\n";
                continue;
            }
        }
        
        echo "Total campaign insights synced: {$totalSynced}\n";
    }
    
    private function syncAdSetInsights() {
        echo "Syncing ad set insights...\n";
        
        // Get all active ad sets
        $adsets = $this->db->query("
            SELECT a.adset_id, aa.access_token 
            FROM adsets a 
            JOIN campaigns c ON a.campaign_id = c.id
            JOIN ad_accounts aa ON c.ad_account_id = aa.id 
            WHERE a.status = 'ACTIVE' 
            AND aa.access_token IS NOT NULL
        ")->fetchAll();
        
        $dateStart = date('Y-m-d', strtotime('-1 days'));
        $dateEnd = date('Y-m-d');
        
        $totalSynced = 0;
        
        foreach ($adsets as $adset) {
            try {
                $insightsService = new InsightsService($adset['access_token']);
                $result = $insightsService->syncAdSetInsights(
                    $adset['adset_id'], 
                    $dateStart, 
                    $dateEnd
                );
                
                if ($result['success']) {
                    $totalSynced += $result['synced_count'];
                    echo "Synced {$result['synced_count']} insights for adset {$adset['adset_id']}\n";
                }
                
                usleep(100000); // 100ms delay
                
            } catch (Exception $e) {
                echo "Error syncing adset {$adset['adset_id']}: " . $e->getMessage() . "\n";
                continue;
            }
        }
        
        echo "Total ad set insights synced: {$totalSynced}\n";
    }
    
    public function syncHistoricalData($daysBack = 30) {
        echo "Starting historical data sync for last {$daysBack} days...\n";
        
        for ($i = $daysBack; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            
            echo "Syncing data for {$date}...\n";
            
            // Sync campaigns for this date
            $campaigns = $this->db->query("
                SELECT c.campaign_id, a.access_token 
                FROM campaigns c 
                JOIN ad_accounts a ON c.ad_account_id = a.id 
                WHERE a.access_token IS NOT NULL
            ")->fetchAll();
            
            foreach ($campaigns as $campaign) {
                try {
                    $insightsService = new InsightsService($campaign['access_token']);
                    $insightsService->syncCampaignInsights($campaign['campaign_id'], $date, $date);
                    
                    usleep(200000); // 200ms delay for historical data
                    
                } catch (Exception $e) {
                    echo "Error syncing historical data for campaign {$campaign['campaign_id']} on {$date}: " . $e->getMessage() . "\n";
                    continue;
                }
            }
        }
        
        echo "Historical data sync completed\n";
    }
}

// Check if script is run from command line
if (php_sapi_name() === 'cli') {
    $job = new SyncInsightsJob();
    
    // Check for arguments
    if (isset($argv[1]) && $argv[1] === 'historical') {
        $daysBack = isset($argv[2]) ? (int)$argv[2] : 30;
        $job->syncHistoricalData($daysBack);
    } else {
        $job->run();
    }
}