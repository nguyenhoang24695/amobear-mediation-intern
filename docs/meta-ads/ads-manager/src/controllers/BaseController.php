<?php

require_once __DIR__ . '/../core/View.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../config/Config.php';

class BaseController {
    protected $view;
    protected $db;
    protected $data = [];
    
    public function __construct() {
        $this->view = new View();
        $this->db = Database::getInstance();
        
        // Set common data
        $this->data['currentPage'] = $_GET['page'] ?? 'dashboard';
        $this->data['selectedAccount'] = $_GET['account_id'] ?? '';
    }
    
    /**
     * Render view
     */
    protected function render($viewName, $data = []) {
        $this->view->setData(array_merge($this->data, $data));
        $this->view->render($viewName);
    }
    
    /**
     * Return JSON response
     */
    protected function json($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
    
    /**
     * Get request input
     */
    protected function input($key = null, $default = null) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $input = array_merge($_GET, $_POST, $input);
        
        if ($key === null) {
            return $input;
        }
        
        return $input[$key] ?? $default;
    }
    
    /**
     * Validate required fields
     */
    protected function validate($rules) {
        $errors = [];
        $input = $this->input();
        
        foreach ($rules as $field => $rule) {
            if (is_string($rule)) {
                $rule = explode('|', $rule);
            }
            
            foreach ($rule as $r) {
                if ($r === 'required' && empty($input[$field])) {
                    $errors[$field] = "Field {$field} is required";
                }
            }
        }
        
        if (!empty($errors)) {
            $this->json(['success' => false, 'errors' => $errors], 422);
        }
        
        return $input;
    }
    
    /**
     * Get access token from request
     */
    protected function getAccessToken() {
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? $_GET['access_token'] ?? $_SESSION['access_token'] ?? null;
        
        if ($token && strpos($token, 'Bearer ') === 0) {
            $token = substr($token, 7);
        }
        
        // Fallback to config access token if no token provided
        if (!$token) {
            $fbConfig = Config::getFacebookConfig();
            $token = $fbConfig['access_token'] ?? null;
        }
        
        return $token;
    }
    
    /**
     * Get current logged in user
     */
    protected function getCurrentUser() {
        if (!isset($_SESSION['user_id'])) {
            return null;
        }
        
        try {
            $user = $this->db->query(
                "SELECT * FROM users WHERE id = ? AND status = 'active'",
                [$_SESSION['user_id']]
            )->fetch();
            
            return $user ?: null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Get ad accounts accessible by current user
     */
    protected function getAccessibleAccounts() {
        $user = $this->getCurrentUser();
        if (!$user) {
            return [];
        }
        
        // Admin has access to all accounts
        if ($user['role'] === 'admin') {
            return $this->db->query("SELECT * FROM ad_accounts ORDER BY name")->fetchAll();
        }
        
        // Advertiser/Marketing users only see assigned accounts
        return $this->db->query(
            "SELECT aa.* FROM ad_accounts aa
             JOIN user_account_access uaa ON aa.id = uaa.ad_account_id
             WHERE uaa.user_id = ?
             ORDER BY aa.name",
            [$user['id']]
        )->fetchAll();
    }
    
    /**
     * Check if user has access to account
     */
    protected function hasAccountAccess($accountId) {
        $user = $this->getCurrentUser();
        if (!$user) {
            return false;
        }
        
        // Admin has access to all accounts
        if ($user['role'] === 'admin') {
            return true;
        }
        
        // Check if advertiser/marketing user has access
        $access = $this->db->query(
            "SELECT COUNT(*) as count FROM user_account_access uaa
             JOIN ad_accounts aa ON uaa.ad_account_id = aa.id
             WHERE uaa.user_id = ? AND aa.account_id = ?",
            [$user['id'], $accountId]
        )->fetch();
        
        return ($access['count'] ?? 0) > 0;
    }
    
    /**
     * Redirect
     */
    protected function redirect($url) {
        header("Location: {$url}");
        exit;
    }
}