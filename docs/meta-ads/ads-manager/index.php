<?php
// Initialize configuration first
require_once __DIR__ . '/src/config/Config.php';
Config::init();

// Start session
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

// Include autoloader or dependencies
require_once __DIR__ . '/src/controllers/DashboardController.php';

// Simple router
class Router {
    private $controller;
    
    public function __construct() {
        $this->controller = new DashboardController();
    }
    
    public function route() {
        $page = $_GET['page'] ?? 'dashboard';
        $action = $_GET['action'] ?? 'index';
        
        // Handle AJAX requests
        if (isset($_GET['ajax']) || $this->isAjaxRequest()) {
            $this->handleAjaxRequest($page, $action);
            return;
        }
        
        // Handle page requests
        $this->handlePageRequest($page);
    }
    
    private function handlePageRequest($page) {
        try {
            switch ($page) {
                case 'dashboard':
                    $this->controller->index();
                    break;
                    
                case 'campaigns':
                    $this->controller->campaigns();
                    break;
                    
                case 'adsets':
                    $this->controller->adsets();
                    break;
                    
                case 'ads':
                    $this->controller->ads();
                    break;
                    
                case 'audiences':
                    $this->controller->audiences();
                    break;
                    
                case 'users':
                    $this->controller->users();
                    break;
                    
                case 'insights':
                    $this->controller->insights();
                    break;
                    
                case 'automation':
                    $this->controller->automation();
                    break;
                    
                default:
                    $this->show404();
                    break;
            }
        } catch (Exception $e) {
            $this->showError($e->getMessage());
        }
    }
    
    private function handleAjaxRequest($page, $action) {
        header('Content-Type: application/json');
        
        try {
            switch ($action) {
                case 'metrics':
                    $this->controller->ajaxMetrics();
                    break;
                    
                case 'campaigns':
                    $this->controller->ajaxCampaigns();
                    break;
                    
                default:
                    echo json_encode(['success' => false, 'message' => 'Invalid AJAX action']);
                    break;
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
    
    private function isAjaxRequest() {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
               strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }
    
    private function show404() {
        http_response_code(404);
        echo '<h1>404 - Page Not Found</h1>';
        echo '<p>The requested page could not be found.</p>';
        echo '<a href="?page=dashboard">Go to Dashboard</a>';
    }
    
    private function showError($message) {
        http_response_code(500);
        echo '<h1>Error</h1>';
        echo '<p>An error occurred: ' . htmlspecialchars($message) . '</p>';
        echo '<a href="?page=dashboard">Go to Dashboard</a>';
    }
}

// Initialize and route
$router = new Router();
$router->route();