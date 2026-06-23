<?php

require_once __DIR__ . '/../config/Config.php';

class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dbConfig = Config::getDatabaseConfig();
            $this->connection = new PDO(
                $dbConfig['dsn'],
                $dbConfig['username'],
                $dbConfig['password'],
                $dbConfig['options']
            );
        } catch (PDOException $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            if (Config::isDebugMode()) {
                throw new Exception("Query failed: " . $e->getMessage() . " SQL: " . $sql);
            }
            throw new Exception("Database query failed");
        }
    }
    
    public function insert($table, $data) {
        $columns = implode(',', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        
        $stmt = $this->query($sql, $data);
        return $this->connection->lastInsertId();
    }
    
    public function update($table, $data, $where, $whereParams = []) {
        $setClause = [];
        foreach (array_keys($data) as $column) {
            $setClause[] = "{$column} = :{$column}";
        }
        
        $sql = "UPDATE {$table} SET " . implode(', ', $setClause) . " WHERE {$where}";
        
        // Convert whereParams to named parameters if needed
        if (!empty($whereParams)) {
            // Check if whereParams are positional (numeric keys) or named (string keys)
            $firstKey = array_key_first($whereParams);
            if (is_numeric($firstKey)) {
                // Convert positional to named parameters
                $namedWhereParams = [];
                $paramIndex = 0;
                $newWhere = $where;
                
                // Replace ? with named parameters
                while (strpos($newWhere, '?') !== false) {
                    $paramName = 'where_param_' . $paramIndex;
                    $newWhere = preg_replace('/\?/', ':' . $paramName, $newWhere, 1);
                    if (isset($whereParams[$paramIndex])) {
                        $namedWhereParams[$paramName] = $whereParams[$paramIndex];
                    }
                    $paramIndex++;
                }
                
                $sql = "UPDATE {$table} SET " . implode(', ', $setClause) . " WHERE {$newWhere}";
                $params = array_merge($data, $namedWhereParams);
            } else {
                // Already named parameters
                $params = array_merge($data, $whereParams);
            }
        } else {
            $params = $data;
        }
        
        return $this->query($sql, $params);
    }
    
    public function delete($table, $where, $params = []) {
        $sql = "DELETE FROM {$table} WHERE {$where}";
        return $this->query($sql, $params);
    }
    
    public function find($table, $id, $primaryKey = 'id') {
        $sql = "SELECT * FROM {$table} WHERE {$primaryKey} = ?";
        $result = $this->query($sql, [$id])->fetch();
        return $result;
    }
    
    public function findAll($table, $where = '1=1', $params = [], $limit = null, $orderBy = null) {
        $sql = "SELECT * FROM {$table} WHERE {$where}";
        
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        
        if ($limit) {
            $sql .= " LIMIT {$limit}";
        }
        
        return $this->query($sql, $params)->fetchAll();
    }
    
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    public function commit() {
        return $this->connection->commit();
    }
    
    public function rollBack() {
        return $this->connection->rollBack();
    }
    
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }
}