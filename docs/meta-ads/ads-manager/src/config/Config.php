<?php

// Load environment variables
require_once __DIR__ . '/../core/DotEnv.php';
DotEnv::load();

/**
 * Application Configuration
 */
class Config {
    
    /**
     * Get database DSN
     */
    public static function getDatabaseDSN() {
        return sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            self::get('DB_HOST', 'localhost'),
            self::get('DB_NAME', 'facebook_ads_manager'),
            self::get('DB_CHARSET', 'utf8mb4')
        );
    }
    
    /**
     * Get database configuration array
     */
    public static function getDatabaseConfig() {
        return [
            'dsn' => self::getDatabaseDSN(),
            'username' => self::get('DB_USER', 'root'),
            'password' => self::get('DB_PASS', ''),
            'options' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . self::get('DB_CHARSET', 'utf8mb4')
            ]
        ];
    }
    
    /**
     * Get Facebook API configuration
     */
    public static function getFacebookConfig() {
        return [
            'app_id' => self::get('FB_APP_ID'),
            'app_secret' => self::get('FB_APP_SECRET'),
            'access_token' => self::get('FB_ACCESS_TOKEN'),
            'api_version' => self::get('FB_API_VERSION', 'v20.0'),
            'base_url' => 'https://graph.facebook.com/' . self::get('FB_API_VERSION', 'v20.0') . '/'
        ];
    }
    
    /**
     * Check if we're in development environment
     */
    public static function isDevelopment() {
        return self::get('APP_ENV', 'development') === 'development';
    }
    
    /**
     * Check if we're in production environment
     */
    public static function isProduction() {
        return self::get('APP_ENV', 'development') === 'production';
    }
    
    /**
     * Check if debug mode is enabled
     */
    public static function isDebugMode() {
        return self::get('APP_DEBUG', true) && self::isDevelopment();
    }
    
    /**
     * Legacy method for compatibility
     */
    public static function isDebug() {
        return self::isDebugMode();
    }
    
    /**
     * Get application URL with path
     */
    public static function url($path = '') {
        $baseUrl = self::get('APP_URL', 'http://localhost');
        return rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
    }
    
    /**
     * Get asset URL
     */
    public static function asset($path = '') {
        return self::url('assets/' . ltrim($path, '/'));
    }
    
    /**
     * Get storage path
     */
    public static function storagePath($path = '') {
        return __DIR__ . '/../../storage/' . ltrim($path, '/');
    }
    
    /**
     * Get cache path
     */
    public static function cachePath($path = '') {
        $cachePath = self::get('CACHE_PATH', __DIR__ . '/../../storage/cache/');
        return rtrim($cachePath, '/') . '/' . ltrim($path, '/');
    }
    
    /**
     * Get log path
     */
    public static function logPath($path = '') {
        $logPath = self::get('LOG_PATH', __DIR__ . '/../../storage/logs/');
        return rtrim($logPath, '/') . '/' . ltrim($path, '/');
    }
    
    /**
     * Get upload path
     */
    public static function uploadPath($path = '') {
        $uploadPath = self::get('UPLOAD_PATH', __DIR__ . '/../../uploads/');
        return rtrim($uploadPath, '/') . '/' . ltrim($path, '/');
    }
    
    /**
     * Get configuration value by key with dot notation support
     */
    public static function get($key, $default = null) {
        // First try to get from environment variables
        $envValue = DotEnv::get($key);
        if ($envValue !== null) {
            return $envValue;
        }
        
        // Handle dot notation for nested config access
        $config = [
            // Application Configuration
            'app.name' => DotEnv::get('APP_NAME', 'Facebook Ads Manager'),
            'app.version' => DotEnv::get('APP_VERSION', '1.0.0'),
            'app.env' => DotEnv::get('APP_ENV', 'development'),
            'app.debug' => DotEnv::get('APP_DEBUG', true),
            'app.timezone' => DotEnv::get('APP_TIMEZONE', 'Asia/Ho_Chi_Minh'),
            'app.url' => DotEnv::get('APP_URL', 'http://localhost'),
            
            // Database Configuration
            'db.host' => DotEnv::get('DB_HOST', 'localhost'),
            'db.name' => DotEnv::get('DB_NAME', 'facebook_ads_manager'),
            'db.user' => DotEnv::get('DB_USER', 'root'),
            'db.pass' => DotEnv::get('DB_PASS', ''),
            'db.charset' => DotEnv::get('DB_CHARSET', 'utf8mb4'),
            
            // Facebook API Configuration
            'facebook.app_id' => DotEnv::get('FB_APP_ID'),
            'facebook.app_secret' => DotEnv::get('FB_APP_SECRET'),
            'facebook.access_token' => DotEnv::get('FB_ACCESS_TOKEN'),
            'facebook.api_version' => DotEnv::get('FB_API_VERSION', 'v20.0'),
            
            // Session Configuration
            'session.name' => DotEnv::get('SESSION_NAME', 'fb_ads_session'),
            'session.lifetime' => DotEnv::get('SESSION_LIFETIME', 3600),
            'session.secure' => DotEnv::get('SESSION_SECURE', false),
            'session.httponly' => DotEnv::get('SESSION_HTTPONLY', true),
            
            // Cache Configuration
            'cache.enabled' => DotEnv::get('CACHE_ENABLED', true),
            'cache.ttl' => DotEnv::get('CACHE_TTL', 300),
            'cache.path' => DotEnv::get('CACHE_PATH', __DIR__ . '/../../storage/cache/'),
            
            // Logging Configuration
            'log.enabled' => DotEnv::get('LOG_ENABLED', true),
            'log.level' => DotEnv::get('LOG_LEVEL', 'debug'),
            'log.path' => DotEnv::get('LOG_PATH', __DIR__ . '/../../storage/logs/'),
            
            // File Upload Configuration
            'upload.max_size' => DotEnv::get('UPLOAD_MAX_SIZE', 10485760),
            'upload.allowed_types' => explode(',', DotEnv::get('UPLOAD_ALLOWED_TYPES', 'jpg,jpeg,png,gif,mp4,avi,mov')),
            'upload.path' => DotEnv::get('UPLOAD_PATH', __DIR__ . '/../../uploads/'),
            
            // Rate Limiting Configuration
            'rate_limit.enabled' => DotEnv::get('RATE_LIMIT_ENABLED', true),
            'rate_limit.requests' => DotEnv::get('RATE_LIMIT_REQUESTS', 100),
            'rate_limit.window' => DotEnv::get('RATE_LIMIT_WINDOW', 60),
            
            // Email Configuration
            'mail.host' => DotEnv::get('MAIL_HOST', 'smtp.gmail.com'),
            'mail.port' => DotEnv::get('MAIL_PORT', 587),
            'mail.username' => DotEnv::get('MAIL_USERNAME', ''),
            'mail.password' => DotEnv::get('MAIL_PASSWORD', ''),
            'mail.encryption' => DotEnv::get('MAIL_ENCRYPTION', 'tls'),
            'mail.from_address' => DotEnv::get('MAIL_FROM_ADDRESS', 'noreply@example.com'),
            'mail.from_name' => DotEnv::get('MAIL_FROM_NAME', 'Facebook Ads Manager'),
            
            // Security Configuration
            'security.csrf_enabled' => DotEnv::get('CSRF_ENABLED', true),
            'security.csrf_token_name' => DotEnv::get('CSRF_TOKEN_NAME', '_token'),
            'security.encryption_key' => DotEnv::get('ENCRYPTION_KEY', 'your-32-character-encryption-key-here'),
            
            // Facebook Webhook Configuration
            'webhook.verify_token' => DotEnv::get('WEBHOOK_VERIFY_TOKEN'),
            'webhook.secret' => DotEnv::get('WEBHOOK_SECRET'),
        ];
        
        return $config[$key] ?? $default;
    }
    
    /**
     * Legacy method for compatibility - same as get()
     */
    public static function env($key, $default = null) {
        return self::get($key, $default);
    }
    
    /**
     * Set configuration value
     */
    public static function set($key, $value) {
        DotEnv::set($key, $value);
    }
    
    /**
     * Check if configuration key exists
     */
    public static function has($key) {
        return DotEnv::has($key);
    }
    
    /**
     * Get all configuration values
     */
    public static function all() {
        return DotEnv::getAll();
    }
    
    /**
     * Validate required configuration
     */
    public static function validateRequired() {
        $required = [
            'FB_APP_ID',
            'FB_ACCESS_TOKEN',
            'DB_NAME'
        ];
        
        try {
            DotEnv::validateRequired($required);
        } catch (Exception $e) {
            throw new Exception("Configuration validation failed: " . $e->getMessage());
        }
    }
    
    /**
     * Initialize configuration and validate
     */
    public static function init() {
        // Set timezone
        date_default_timezone_set(self::get('APP_TIMEZONE', 'Asia/Ho_Chi_Minh'));
        
        // Set error reporting based on environment
        if (self::isDebugMode()) {
            error_reporting(E_ALL);
            ini_set('display_errors', 1);
        } else {
            error_reporting(0);
            ini_set('display_errors', 0);
        }
        
        // Validate required configuration in production
        if (self::isProduction()) {
            self::validateRequired();
        }
    }
}