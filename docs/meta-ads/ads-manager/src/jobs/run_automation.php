<?php

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/FacebookAPI.php';

class AutomationJob {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    public function run() {
        echo "Starting automation rules execution at " . date('Y-m-d H:i:s') . "\n";
        
        try {
            $this->executeActiveRules();
            
            echo "Automation job completed successfully at " . date('Y-m-d H:i:s') . "\n";
            
        } catch (Exception $e) {
            echo "Error in automation job: " . $e->getMessage() . "\n";
            throw $e;
        }
    }
    
    private function executeActiveRules() {
        // Get all active automation rules
        $rules = $this->db->query("
            SELECT ar.*, aa.access_token, aa.account_id
            FROM automated_rules ar
            JOIN ad_accounts aa ON ar.ad_account_id = aa.id
            WHERE ar.status = 'active'
            AND aa.access_token IS NOT NULL
            ORDER BY ar.id
        ")->fetchAll();
        
        echo "Found " . count($rules) . " active automation rules\n";
        
        foreach ($rules as $rule) {
            try {
                $this->executeRule($rule);
                
                // Update last executed timestamp
                $this->db->update(
                    'automated_rules', 
                    ['last_executed_at' => date('Y-m-d H:i:s')], 
                    'id = ?', 
                    [$rule['id']]
                );
                
                echo "Executed rule: {$rule['name']} (ID: {$rule['id']})\n";
                
            } catch (Exception $e) {
                echo "Error executing rule {$rule['id']}: " . $e->getMessage() . "\n";
                continue;
            }
        }
    }
    
    private function executeRule($rule) {
        $fbApi = new FacebookAPI($rule['access_token']);
        $conditions = json_decode($rule['conditions'], true);
        $actionSpec = json_decode($rule['action_spec'], true);
        
        // Get entities to check based on rule entity type
        $entities = $this->getEntitiesForRule($rule);
        
        foreach ($entities as $entity) {
            if ($this->checkConditions($entity, $conditions, $rule)) {
                $this->executeAction($entity, $actionSpec, $fbApi, $rule);
            }
        }
    }
    
    private function getEntitiesForRule($rule) {
        $entityIds = json_decode($rule['entity_ids'], true);
        
        switch ($rule['entity_type']) {
            case 'campaign':
                $sql = "
                    SELECT c.*, ci.impressions, ci.clicks, ci.spend, ci.ctr, ci.cpc, ci.cpm
                    FROM campaigns c
                    LEFT JOIN campaign_insights ci ON c.id = ci.campaign_id
                    WHERE c.ad_account_id = ? 
                    AND ci.date_start = CURDATE()
                ";
                
                $params = [$rule['ad_account_id']];
                
                if ($entityIds) {
                    $placeholders = str_repeat('?,', count($entityIds) - 1) . '?';
                    $sql .= " AND c.campaign_id IN ({$placeholders})";
                    $params = array_merge($params, $entityIds);
                }
                
                return $this->db->query($sql, $params)->fetchAll();
                
            case 'adset':
                $sql = "
                    SELECT a.*, ai.impressions, ai.clicks, ai.spend, ai.ctr, ai.cpc, ai.cpm
                    FROM adsets a
                    JOIN campaigns c ON a.campaign_id = c.id
                    LEFT JOIN adset_insights ai ON a.id = ai.adset_id
                    WHERE c.ad_account_id = ? 
                    AND ai.date_start = CURDATE()
                ";
                
                $params = [$rule['ad_account_id']];
                
                if ($entityIds) {
                    $placeholders = str_repeat('?,', count($entityIds) - 1) . '?';
                    $sql .= " AND a.adset_id IN ({$placeholders})";
                    $params = array_merge($params, $entityIds);
                }
                
                return $this->db->query($sql, $params)->fetchAll();
                
            default:
                return [];
        }
    }
    
    private function checkConditions($entity, $conditions, $rule) {
        foreach ($conditions as $condition) {
            $field = $condition['field'];
            $operator = $condition['operator'];
            $value = $condition['value'];
            
            $entityValue = $entity[$field] ?? 0;
            
            switch ($operator) {
                case 'greater_than':
                    if (!($entityValue > $value)) return false;
                    break;
                    
                case 'less_than':
                    if (!($entityValue < $value)) return false;
                    break;
                    
                case 'equals':
                    if (!($entityValue == $value)) return false;
                    break;
                    
                case 'greater_than_or_equal':
                    if (!($entityValue >= $value)) return false;
                    break;
                    
                case 'less_than_or_equal':
                    if (!($entityValue <= $value)) return false;
                    break;
                    
                default:
                    return false;
            }
        }
        
        return true;
    }
    
    private function executeAction($entity, $actionSpec, $fbApi, $rule) {
        $action = $actionSpec['action'];
        
        switch ($action) {
            case 'PAUSE':
                $this->pauseEntity($entity, $fbApi, $rule['entity_type']);
                break;
                
            case 'ACTIVATE':
                $this->activateEntity($entity, $fbApi, $rule['entity_type']);
                break;
                
            case 'INCREASE_BUDGET':
                $this->adjustBudget($entity, $actionSpec, $fbApi, $rule['entity_type'], 'increase');
                break;
                
            case 'DECREASE_BUDGET':
                $this->adjustBudget($entity, $actionSpec, $fbApi, $rule['entity_type'], 'decrease');
                break;
                
            case 'SEND_NOTIFICATION':
                $this->sendNotification($entity, $actionSpec, $rule);
                break;
        }
        
        // Log the action
        $this->logAction($entity, $actionSpec, $rule);
    }
    
    private function pauseEntity($entity, $fbApi, $entityType) {
        $entityIdField = $entityType . '_id';
        $entityId = $entity[$entityIdField];
        
        switch ($entityType) {
            case 'campaign':
                $fbApi->updateCampaign($entityId, ['status' => 'PAUSED']);
                $this->db->update('campaigns', ['status' => 'PAUSED'], 'campaign_id = ?', [$entityId]);
                break;
                
            case 'adset':
                $fbApi->updateAdSet($entityId, ['status' => 'PAUSED']);
                $this->db->update('adsets', ['status' => 'PAUSED'], 'adset_id = ?', [$entityId]);
                break;
        }
    }
    
    private function activateEntity($entity, $fbApi, $entityType) {
        $entityIdField = $entityType . '_id';
        $entityId = $entity[$entityIdField];
        
        switch ($entityType) {
            case 'campaign':
                $fbApi->updateCampaign($entityId, ['status' => 'ACTIVE']);
                $this->db->update('campaigns', ['status' => 'ACTIVE'], 'campaign_id = ?', [$entityId]);
                break;
                
            case 'adset':
                $fbApi->updateAdSet($entityId, ['status' => 'ACTIVE']);
                $this->db->update('adsets', ['status' => 'ACTIVE'], 'adset_id = ?', [$entityId]);
                break;
        }
    }
    
    private function adjustBudget($entity, $actionSpec, $fbApi, $entityType, $direction) {
        $entityIdField = $entityType . '_id';
        $entityId = $entity[$entityIdField];
        
        $adjustment = $actionSpec['value'] ?? 10; // Default 10% adjustment
        $adjustmentType = $actionSpec['type'] ?? 'percentage'; // percentage or fixed
        
        $currentBudget = $entity['daily_budget'] ?? 0;
        
        if ($currentBudget <= 0) return;
        
        if ($adjustmentType === 'percentage') {
            $multiplier = $direction === 'increase' ? (1 + $adjustment/100) : (1 - $adjustment/100);
            $newBudget = round($currentBudget * $multiplier, 2);
        } else {
            $newBudget = $direction === 'increase' ? 
                ($currentBudget + $adjustment) : 
                ($currentBudget - $adjustment);
        }
        
        // Ensure minimum budget
        $newBudget = max($newBudget, 1.00);
        
        switch ($entityType) {
            case 'campaign':
                $fbApi->updateCampaign($entityId, ['daily_budget' => $newBudget * 100]); // Facebook expects cents
                $this->db->update('campaigns', ['daily_budget' => $newBudget], 'campaign_id = ?', [$entityId]);
                break;
                
            case 'adset':
                $fbApi->updateAdSet($entityId, ['daily_budget' => $newBudget * 100]);
                $this->db->update('adsets', ['daily_budget' => $newBudget], 'adset_id = ?', [$entityId]);
                break;
        }
    }
    
    private function sendNotification($entity, $actionSpec, $rule) {
        $message = $actionSpec['message'] ?? 'Automation rule triggered';
        $emails = $actionSpec['emails'] ?? [];
        
        if (empty($emails)) return;
        
        $subject = "Facebook Ads Automation Alert: {$rule['name']}";
        $body = "Rule '{$rule['name']}' has been triggered for {$rule['entity_type']} ID: {$entity[$rule['entity_type'] . '_id']}\n\n";
        $body .= "Message: {$message}\n\n";
        $body .= "Entity details:\n" . json_encode($entity, JSON_PRETTY_PRINT);
        
        foreach ($emails as $email) {
            mail($email, $subject, $body);
        }
    }
    
    private function logAction($entity, $actionSpec, $rule) {
        $logData = [
            'ad_account_id' => $rule['ad_account_id'],
            'entity_type' => $rule['entity_type'],
            'entity_id' => $entity[$rule['entity_type'] . '_id'],
            'action' => 'AUTOMATION_RULE_EXECUTED',
            'description' => "Automation rule '{$rule['name']}' executed action: {$actionSpec['action']}",
            'old_values' => null,
            'new_values' => json_encode(['rule_id' => $rule['id'], 'action_spec' => $actionSpec]),
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $this->db->insert('activity_logs', $logData);
    }
}

// Check if script is run from command line
if (php_sapi_name() === 'cli') {
    $job = new AutomationJob();
    $job->run();
}