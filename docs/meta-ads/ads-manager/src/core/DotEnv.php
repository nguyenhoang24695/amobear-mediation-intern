<?php

/**
 * Simple .env file loader
 * Loads environment variables from .env file
 */
class DotEnv {
    private static $loaded = false;
    private static $variables = [];
    
    /**
     * Load .env file from specified path
     */
    public static function load($path = null) {
        if (self::$loaded) {
            return;
        }
        
        $envPath = $path ?? __DIR__ . '/../../.env';
        
        if (!file_exists($envPath)) {
            // Try to load from .env.example if .env doesn't exist
            $examplePath = dirname($envPath) . '/.env.example';
            if (file_exists($examplePath)) {
                error_log("Warning: .env file not found. Please copy .env.example to .env and configure your settings.");
            }
            return;
        }
        
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            
            // Parse key=value pairs
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                if (preg_match('/^(["\'])(.*)\1$/', $value, $matches)) {
                    $value = $matches[2];
                }
                
                // Convert string booleans to actual booleans
                if (strtolower($value) === 'true') {
                    $value = true;
                } elseif (strtolower($value) === 'false') {
                    $value = false;
                } elseif (strtolower($value) === 'null') {
                    $value = null;
                } elseif (is_numeric($value)) {
                    $value = is_float($value + 0) ? (float)$value : (int)$value;
                }
                
                // Set in $_ENV superglobal
                $_ENV[$key] = $value;
                
                // Also set in our internal array
                self::$variables[$key] = $value;
                
                // Set as environment variable using putenv
                putenv("{$key}={$value}");
            }
        }
        
        self::$loaded = true;
    }
    
    /**
     * Get environment variable with default value
     */
    public static function get($key, $default = null) {
        // Try to get from $_ENV first
        if (isset($_ENV[$key])) {
            return $_ENV[$key];
        }
        
        // Try to get from getenv()
        $value = getenv($key);
        if ($value !== false) {
            return $value;
        }
        
        // Try our internal array
        if (isset(self::$variables[$key])) {
            return self::$variables[$key];
        }
        
        return $default;
    }
    
    /**
     * Set environment variable
     */
    public static function set($key, $value) {
        $_ENV[$key] = $value;
        self::$variables[$key] = $value;
        putenv("{$key}={$value}");
    }
    
    /**
     * Check if variable exists
     */
    public static function has($key) {
        return isset($_ENV[$key]) || getenv($key) !== false || isset(self::$variables[$key]);
    }
    
    /**
     * Get all loaded variables
     */
    public static function getAll() {
        return self::$variables;
    }
    
    /**
     * Get required environment variable or throw exception
     */
    public static function getRequired($key) {
        $value = self::get($key);
        
        if ($value === null || $value === '') {
            throw new Exception("Required environment variable '{$key}' is not set");
        }
        
        return $value;
    }
    
    /**
     * Validate required environment variables
     */
    public static function validateRequired($requiredKeys) {
        $missing = [];
        
        foreach ($requiredKeys as $key) {
            if (!self::has($key) || self::get($key) === '' || self::get($key) === null) {
                $missing[] = $key;
            }
        }
        
        if (!empty($missing)) {
            throw new Exception("Missing required environment variables: " . implode(', ', $missing));
        }
    }
    
    /**
     * Create .env file from array of variables
     */
    public static function create($variables, $path = null) {
        $envPath = $path ?? __DIR__ . '/../../.env';
        
        $content = "# Facebook Ads Manager Configuration\n";
        $content .= "# Generated on " . date('Y-m-d H:i:s') . "\n\n";
        
        foreach ($variables as $key => $value) {
            // Escape values that contain spaces or special characters
            if (is_string($value) && (strpos($value, ' ') !== false || strpos($value, '#') !== false)) {
                $value = '"' . addslashes($value) . '"';
            } elseif (is_bool($value)) {
                $value = $value ? 'true' : 'false';
            } elseif (is_null($value)) {
                $value = 'null';
            }
            
            $content .= "{$key}={$value}\n";
        }
        
        file_put_contents($envPath, $content);
    }
}