<?php
session_start();

require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../core/Database.php';

Config::init();

class UsersAPI {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    private function getCurrentUser() {
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
    
    private function checkAdminAccess() {
        $user = $this->getCurrentUser();
        if (!$user || $user['role'] !== 'admin') {
            $this->json(['success' => false, 'message' => 'Access denied'], 403);
        }
        return $user;
    }
    
    public function handleRequest() {
        $action = $_GET['action'] ?? '';
        
        try {
            switch ($action) {
                case 'create':
                    $this->checkAdminAccess();
                    $this->createUser();
                    break;
                    
                case 'get_user':
                    $this->checkAdminAccess();
                    $this->getUser();
                    break;
                    
                case 'update':
                    $this->checkAdminAccess();
                    $this->updateUser();
                    break;
                    
                case 'get_access':
                    $this->checkAdminAccess();
                    $this->getUserAccess();
                    break;
                    
                case 'get_access_details':
                    $this->checkAdminAccess();
                    $this->getUserAccessDetails();
                    break;
                    
                case 'save_access':
                    $this->checkAdminAccess();
                    $this->saveUserAccess();
                    break;
                    
                case 'update_status':
                    $this->checkAdminAccess();
                    $this->updateUserStatus();
                    break;
                    
                case 'reset_password':
                    $this->checkAdminAccess();
                    $this->resetPassword();
                    break;
                    
                case 'delete':
                    $this->checkAdminAccess();
                    $this->deleteUser();
                    break;
                    
                default:
                    $this->json(['success' => false, 'message' => 'Invalid action'], 400);
            }
        } catch (Exception $e) {
            $this->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    private function createUser() {
        $input = $this->getInput();
        
        // Validate required fields
        $required = ['username', 'email', 'password', 'role'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                $this->json(['success' => false, 'message' => "Field {$field} is required"], 422);
            }
        }
        
        // Validate role
        if (!in_array($input['role'], ['admin', 'advertiser'])) {
            $this->json(['success' => false, 'message' => 'Invalid role'], 422);
        }
        
        // Check if username or email already exists
        $exists = $this->db->query(
            "SELECT COUNT(*) as count FROM users WHERE username = ? OR email = ?",
            [$input['username'], $input['email']]
        )->fetch();
        
        if ($exists['count'] > 0) {
            $this->json(['success' => false, 'message' => 'Username or email already exists'], 422);
        }
        
        // Hash password
        $passwordHash = password_hash($input['password'], PASSWORD_DEFAULT);
        
        // Insert user
        $this->db->query(
            "INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())",
            [
                $input['username'],
                $input['email'],
                $passwordHash,
                $input['first_name'] ?? null,
                $input['last_name'] ?? null,
                $input['role']
            ]
        );
        
        $userId = $this->db->lastInsertId();
        
        $this->json([
            'success' => true,
            'message' => 'User created successfully',
            'user_id' => $userId
        ]);
    }
    
    private function getUser() {
        $userId = $_GET['user_id'] ?? null;
        
        if (!$userId) {
            $this->json(['success' => false, 'message' => 'User ID is required'], 422);
        }
        
        $user = $this->db->query(
            "SELECT id, username, email, first_name, last_name, role, status, last_login_at, created_at 
             FROM users WHERE id = ?",
            [$userId]
        )->fetch();
        
        if (!$user) {
            $this->json(['success' => false, 'message' => 'User not found'], 404);
        }
        
        $this->json([
            'success' => true,
            'user' => $user
        ]);
    }
    
    private function updateUser() {
        $input = $this->getInput();
        $userId = $input['user_id'] ?? null;
        
        if (!$userId) {
            $this->json(['success' => false, 'message' => 'User ID is required'], 422);
        }
        
        // Validate required fields
        $required = ['username', 'email', 'role', 'status'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                $this->json(['success' => false, 'message' => "Field {$field} is required"], 422);
            }
        }
        
        // Validate role
        if (!in_array($input['role'], ['admin', 'advertiser'])) {
            $this->json(['success' => false, 'message' => 'Invalid role'], 422);
        }
        
        // Validate status
        if (!in_array($input['status'], ['active', 'inactive', 'suspended'])) {
            $this->json(['success' => false, 'message' => 'Invalid status'], 422);
        }
        
        // Check if user exists
        $existingUser = $this->db->query(
            "SELECT id, role FROM users WHERE id = ?",
            [$userId]
        )->fetch();
        
        if (!$existingUser) {
            $this->json(['success' => false, 'message' => 'User not found'], 404);
        }
        
        // Prevent changing own role/status
        $currentUser = $this->getCurrentUser();
        if ($currentUser['id'] == $userId) {
            if ($input['role'] !== $existingUser['role']) {
                $this->json(['success' => false, 'message' => 'Cannot change your own role'], 422);
            }
            if ($input['status'] !== 'active') {
                $this->json(['success' => false, 'message' => 'Cannot deactivate your own account'], 422);
            }
        }
        
        // Check if email is taken by another user
        $emailCheck = $this->db->query(
            "SELECT COUNT(*) as count FROM users WHERE email = ? AND id != ?",
            [$input['email'], $userId]
        )->fetch();
        
        if ($emailCheck['count'] > 0) {
            $this->json(['success' => false, 'message' => 'Email already taken by another user'], 422);
        }
        
        // Prepare update data
        $updateData = [
            $input['email'],
            $input['first_name'] ?? null,
            $input['last_name'] ?? null,
            $input['role'],
            $input['status'],
            $userId
        ];
        
        $sql = "UPDATE users SET 
                email = ?, 
                first_name = ?, 
                last_name = ?, 
                role = ?, 
                status = ?, 
                updated_at = NOW() 
                WHERE id = ?";
        
        // Handle password update if provided
        if (!empty($input['new_password'])) {
            $passwordHash = password_hash($input['new_password'], PASSWORD_DEFAULT);
            $sql = "UPDATE users SET 
                    email = ?, 
                    first_name = ?, 
                    last_name = ?, 
                    role = ?, 
                    status = ?, 
                    password_hash = ?, 
                    updated_at = NOW() 
                    WHERE id = ?";
            array_splice($updateData, -1, 0, [$passwordHash]); // Insert password before user_id
        }
        
        $this->db->query($sql, $updateData);
        
        $this->json([
            'success' => true,
            'message' => 'User updated successfully'
        ]);
    }
    
    private function getUserAccess() {
        $userId = $_GET['user_id'] ?? null;
        
        if (!$userId) {
            $this->json(['success' => false, 'message' => 'User ID is required'], 422);
        }
        
        $access = $this->db->query(
            "SELECT ad_account_id FROM user_account_access WHERE user_id = ?",
            [$userId]
        )->fetchAll();
        
        $accountIds = array_column($access, 'ad_account_id');
        
        $this->json([
            'success' => true,
            'accounts' => $accountIds
        ]);
    }
    
    private function getUserAccessDetails() {
        $userId = $_GET['user_id'] ?? null;
        
        if (!$userId) {
            $this->json(['success' => false, 'message' => 'User ID is required'], 422);
        }
        
        // Get account IDs and access levels
        $access = $this->db->query(
            "SELECT ad_account_id, access_level FROM user_account_access WHERE user_id = ?",
            [$userId]
        )->fetchAll();
        
        $accountIds = array_column($access, 'ad_account_id');
        
        // Create a map of account_id => access_level
        $accessLevels = [];
        foreach ($access as $item) {
            $accessLevels[$item['ad_account_id']] = $item['access_level'];
        }
        
        // Get account details
        $currentAccounts = [];
        if (!empty($accountIds)) {
            $placeholders = str_repeat('?,', count($accountIds) - 1) . '?';
            $currentAccounts = $this->db->query(
                "SELECT id, account_id, name FROM ad_accounts WHERE id IN ($placeholders)",
                $accountIds
            )->fetchAll();
        }
        
        $this->json([
            'success' => true,
            'account_ids' => $accountIds,
            'access_levels' => $accessLevels,
            'current_accounts' => $currentAccounts
        ]);
    }
    
    private function saveUserAccess() {
        $input = $this->getInput();
        $userId = $input['user_id'] ?? null;
        $accounts = $input['accounts'] ?? [];
        
        if (!$userId) {
            $this->json(['success' => false, 'message' => 'User ID is required'], 422);
        }
        
        // Check if user exists and is not admin
        $user = $this->db->query(
            "SELECT role FROM users WHERE id = ?",
            [$userId]
        )->fetch();
        
        if (!$user) {
            $this->json(['success' => false, 'message' => 'User not found'], 404);
        }
        
        if ($user['role'] === 'admin') {
            $this->json(['success' => false, 'message' => 'Cannot manage access for admin users'], 422);
        }
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // Remove all existing access
            $this->db->query(
                "DELETE FROM user_account_access WHERE user_id = ?",
                [$userId]
            );
            
            // Add new access
            foreach ($accounts as $account) {
                $this->db->query(
                    "INSERT INTO user_account_access (user_id, ad_account_id, access_level, granted_at, granted_by)
                     VALUES (?, ?, ?, NOW(), ?)",
                    [
                        $userId,
                        $account['ad_account_id'],
                        $account['access_level'] ?? 'view_only',
                        $this->getCurrentUser()['id']
                    ]
                );
            }
            
            $this->db->commit();
            
            $this->json([
                'success' => true,
                'message' => 'Account access updated successfully'
            ]);
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    private function updateUserStatus() {
        $input = $this->getInput();
        $userId = $input['user_id'] ?? null;
        $status = $input['status'] ?? null;
        
        if (!$userId || !$status) {
            $this->json(['success' => false, 'message' => 'User ID and status are required'], 422);
        }
        
        if (!in_array($status, ['active', 'inactive', 'suspended'])) {
            $this->json(['success' => false, 'message' => 'Invalid status'], 422);
        }
        
        $this->db->query(
            "UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?",
            [$status, $userId]
        );
        
        $this->json([
            'success' => true,
            'message' => 'User status updated successfully'
        ]);
    }
    
    private function resetPassword() {
        $input = $this->getInput();
        $userId = $input['user_id'] ?? null;
        
        if (!$userId) {
            $this->json(['success' => false, 'message' => 'User ID is required'], 422);
        }
        
        // Get user email
        $user = $this->db->query(
            "SELECT email FROM users WHERE id = ?",
            [$userId]
        )->fetch();
        
        if (!$user) {
            $this->json(['success' => false, 'message' => 'User not found'], 404);
        }
        
        // Generate temporary password
        $tempPassword = bin2hex(random_bytes(8));
        $passwordHash = password_hash($tempPassword, PASSWORD_DEFAULT);
        
        // Update password
        $this->db->query(
            "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
            [$passwordHash, $userId]
        );
        
        // In production, send email with temporary password
        // For now, just return success
        
        $this->json([
            'success' => true,
            'message' => 'Password reset successfully. Temporary password: ' . $tempPassword,
            'temp_password' => $tempPassword
        ]);
    }
    
    private function deleteUser() {
        $input = $this->getInput();
        $userId = $input['user_id'] ?? null;
        
        if (!$userId) {
            $this->json(['success' => false, 'message' => 'User ID is required'], 422);
        }
        
        // Check if trying to delete self
        $currentUser = $this->getCurrentUser();
        if ($currentUser['id'] == $userId) {
            $this->json(['success' => false, 'message' => 'Cannot delete yourself'], 422);
        }
        
        $this->db->query(
            "DELETE FROM users WHERE id = ?",
            [$userId]
        );
        
        $this->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }
    
    private function getInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        return $input ?? [];
    }
    
    private function json($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}

$api = new UsersAPI();
$api->handleRequest();
