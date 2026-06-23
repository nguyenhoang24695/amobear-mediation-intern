<?php

require_once __DIR__ . '/../config/Config.php';

class FacebookAPI {
    private $accessToken;
    private $apiVersion;
    private $baseUrl;
    
    public function __construct($accessToken) {
        $this->accessToken = $accessToken;
        $fbConfig = Config::getFacebookConfig();
        $this->apiVersion = $fbConfig['api_version'];
        $this->baseUrl = $fbConfig['base_url'];
    }
    
    /**
     * Campaign Management
     */
    public function createCampaign($accountId, $data) {
        $endpoint = "act_{$accountId}/campaigns";
        return $this->post($endpoint, $data);
    }
    
    public function updateCampaign($campaignId, $data) {
        return $this->post($campaignId, $data);
    }
    
    public function getCampaign($campaignId, $fields = 'id,name,status,objective') {
        return $this->get($campaignId, ['fields' => $fields]);
    }
    
    public function getCampaigns($accountId, $fields = 'id,name,status,objective,daily_budget,lifetime_budget') {
        $endpoint = "act_{$accountId}/campaigns";
        return $this->get($endpoint, ['fields' => $fields]);
    }
    
    /**
     * AdSet Management
     */
    public function createAdSet($accountId, $data) {
        $endpoint = "act_{$accountId}/adsets";
        return $this->post($endpoint, $data);
    }
    
    public function updateAdSet($adsetId, $data) {
        return $this->post($adsetId, $data);
    }
    
    public function getAdSet($adsetId, $fields = 'id,name,status,optimization_goal,daily_budget') {
        return $this->get($adsetId, ['fields' => $fields]);
    }
    
    public function getAdSets($campaignId, $fields = 'id,name,status,optimization_goal,daily_budget,targeting') {
        $endpoint = "{$campaignId}/adsets";
        return $this->get($endpoint, ['fields' => $fields]);
    }
    
    /**
     * Ad Management
     */
    public function createAd($accountId, $data) {
        $endpoint = "act_{$accountId}/ads";
        return $this->post($endpoint, $data);
    }
    
    public function updateAd($adId, $data) {
        return $this->post($adId, $data);
    }
    
    public function getAd($adId, $fields = 'id,name,status,creative') {
        return $this->get($adId, ['fields' => $fields]);
    }
    
    public function getAds($adsetId, $fields = 'id,name,status,creative') {
        $endpoint = "{$adsetId}/ads";
        return $this->get($endpoint, ['fields' => $fields]);
    }
    
    /**
     * Creative Management
     */
    public function uploadImage($accountId, $imagePath, $filename = null) {
        $endpoint = "act_{$accountId}/adimages";
        
        if (!file_exists($imagePath)) {
            throw new Exception("Image file not found: {$imagePath}");
        }
        
        $data = [
            'filename' => new CURLFile($imagePath, mime_content_type($imagePath), $filename)
        ];
        
        return $this->post($endpoint, $data, true);
    }
    
    public function uploadVideo($accountId, $videoPath, $filename = null) {
        $endpoint = "act_{$accountId}/advideos";
        
        if (!file_exists($videoPath)) {
            throw new Exception("Video file not found: {$videoPath}");
        }
        
        $data = [
            'source' => new CURLFile($videoPath, mime_content_type($videoPath), $filename)
        ];
        
        return $this->post($endpoint, $data, true);
    }
    
    public function createCreative($accountId, $data) {
        $endpoint = "act_{$accountId}/adcreatives";
        return $this->post($endpoint, $data);
    }
    
    public function getCreative($creativeId, $fields = 'id,name,body,call_to_action_type,image_url,video_id') {
        return $this->get($creativeId, ['fields' => $fields]);
    }
    
    /**
     * Insights & Reporting
     */
    public function getInsights($entityId, $params = []) {
        $endpoint = "{$entityId}/insights";
        
        $defaultParams = [
            'fields' => 'impressions,reach,clicks,spend,ctr,cpc,cpm,actions,action_values',
            'time_range' => json_encode(['since' => date('Y-m-d', strtotime('-7 days')), 'until' => date('Y-m-d')])
        ];
        
        $params = array_merge($defaultParams, $params);
        return $this->get($endpoint, $params);
    }
    
    public function getCampaignInsights($campaignId, $dateStart, $dateEnd, $fields = null) {
        $params = [
            'time_range' => json_encode(['since' => $dateStart, 'until' => $dateEnd])
        ];
        
        if ($fields) {
            $params['fields'] = $fields;
        }
        
        return $this->getInsights($campaignId, $params);
    }
    
    /**
     * Account Management
     */
    public function getAccount($accountId, $fields = 'id,name,currency,spend_cap,balance') {
        $endpoint = "act_{$accountId}";
        return $this->get($endpoint, ['fields' => $fields]);
    }
    
    public function getAccounts($fields = 'id,name,currency,spend_cap') {
        $endpoint = "me/adaccounts";
        return $this->get($endpoint, ['fields' => $fields]);
    }
    
    /**
     * Audience Management
     */
    public function createCustomAudience($accountId, $data) {
        $endpoint = "act_{$accountId}/customaudiences";
        return $this->post($endpoint, $data);
    }
    
    public function createLookalikeAudience($accountId, $data) {
        $endpoint = "act_{$accountId}/customaudiences";
        $data['subtype'] = 'LOOKALIKE';
        return $this->post($endpoint, $data);
    }
    
    /**
     * HTTP Methods
     */
    private function get($endpoint, $params = []) {
        $params['access_token'] = $this->accessToken;
        $url = $this->baseUrl . '/' . $endpoint . '?' . http_build_query($params);
        
        return $this->makeRequest('GET', $url);
    }
    
    private function post($endpoint, $data, $isFileUpload = false) {
        $url = $this->baseUrl . '/' . $endpoint;
        
        if (!$isFileUpload) {
            $data['access_token'] = $this->accessToken;
        }
        
        return $this->makeRequest('POST', $url, $data, $isFileUpload);
    }
    
    private function makeRequest($method, $url, $data = null, $isFileUpload = false) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            
            if ($data) {
                if ($isFileUpload) {
                    $data['access_token'] = $this->accessToken;
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
                } else {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
                    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
                }
            }
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            throw new Exception("CURL Error: {$error}");
        }
        
        $result = json_decode($response, true);
        
        if ($httpCode >= 400) {
            $errorMessage = isset($result['error']['message']) 
                ? $result['error']['message'] 
                : "HTTP Error {$httpCode}";
            throw new Exception("Facebook API Error: {$errorMessage}");
        }
        
        return $result;
    }
    
    /**
     * Batch Requests
     */
    public function batch($requests) {
        $batchData = [
            'batch' => json_encode($requests),
            'access_token' => $this->accessToken
        ];
        
        $url = $this->baseUrl;
        return $this->makeRequest('POST', $url, $batchData);
    }
}