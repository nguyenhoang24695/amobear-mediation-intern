<?php

class View {
    private $viewPath;
    private $data = [];
    
    public function __construct($viewPath = '') {
        $this->viewPath = __DIR__ . '/../views/';
    }
    
    /**
     * Set data for view
     */
    public function set($key, $value) {
        $this->data[$key] = $value;
        return $this;
    }
    
    /**
     * Set multiple data
     */
    public function setData($data) {
        $this->data = array_merge($this->data, $data);
        return $this;
    }
    
    /**
     * Render view with layout
     */
    public function render($viewFile, $layout = 'main') {
        // Extract data to variables
        extract($this->data);
        
        // Start output buffering for content
        ob_start();
        
        // Include the view file
        $viewFilePath = $this->viewPath . 'pages/' . $viewFile . '.php';
        if (file_exists($viewFilePath)) {
            include $viewFilePath;
        } else {
            throw new Exception("View file not found: {$viewFile}");
        }
        
        // Get content
        $content = ob_get_clean();
        
        // Include layout
        $layoutPath = $this->viewPath . 'layouts/' . $layout . '.php';
        if (file_exists($layoutPath)) {
            include $layoutPath;
        } else {
            echo $content; // No layout, just output content
        }
    }
    
    /**
     * Render partial view
     */
    public function partial($viewFile, $data = []) {
        extract(array_merge($this->data, $data));
        
        $partialPath = $this->viewPath . 'partials/' . $viewFile . '.php';
        if (file_exists($partialPath)) {
            include $partialPath;
        }
    }
    
    /**
     * Include component
     */
    public function component($componentFile, $data = []) {
        extract(array_merge($this->data, $data));
        
        $componentPath = $this->viewPath . 'components/' . $componentFile . '.php';
        if (file_exists($componentPath)) {
            include $componentPath;
        }
    }
    
    /**
     * Escape HTML
     */
    public function e($string) {
        return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Format number
     */
    public function formatNumber($number, $decimals = 0) {
        return number_format($number, $decimals);
    }
    
    /**
     * Format currency
     */
    public function formatCurrency($amount, $currency = '$') {
        return $currency . number_format($amount, 2);
    }
    
    /**
     * Format percentage
     */
    public function formatPercent($number, $decimals = 2) {
        return number_format($number, $decimals) . '%';
    }
    
    /**
     * Format date
     */
    public function formatDate($date, $format = 'Y-m-d') {
        return date($format, strtotime($date));
    }
    
    /**
     * Get status badge class
     */
    public function getStatusBadge($status) {
        $badges = [
            'ACTIVE' => 'success',
            'PAUSED' => 'warning', 
            'DELETED' => 'danger',
            'ARCHIVED' => 'secondary'
        ];
        
        return $badges[$status] ?? 'secondary';
    }
    
    /**
     * Generate URL
     */
    public function url($path = '') {
        // $baseUrl = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'];
        $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
        $url = $scriptDir . '/' . ltrim($path, '/');
        // Remove double slashes (except after http:// or https://)
        return preg_replace('#(?<!:)//+#', '/', $url);
    }
    
    /**
     * Get asset URL
     */
    public function asset($path) {
        return $this->url('assets/' . ltrim($path, '/'));
    }
    
    /**
     * Check if current page
     */
    public function isCurrentPage($page) {
        $currentPage = $_GET['page'] ?? 'dashboard';
        return $currentPage === $page;
    }
}