<?php
/**
 * Database Setup Script
 * Run this file once to create the database and tables
 */

header('Content-Type: text/html; charset=utf-8');

echo "<h1>ATRP Database Setup</h1>";

try {
    // Connect without database first
    $pdo = new PDO(
        "mysql:host=localhost;charset=utf8mb4",
        "root",
        "",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
    
    // Create database
    $pdo->exec("CREATE DATABASE IF NOT EXISTS atrp_database");
    echo "<p>✓ Database 'atrp_database' created/verified</p>";
    
    // Select database
    $pdo->exec("USE atrp_database");
    
    // Create behaviors table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bcm_behaviors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            antecedent TEXT,
            behavior TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    echo "<p>✓ Table 'bcm_behaviors' created</p>";
    
    // Create sessions table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bcm_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            behavior_id INT NOT NULL,
            session_number INT NOT NULL,
            frequency INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (behavior_id) REFERENCES bcm_behaviors(id) ON DELETE CASCADE
        )
    ");
    echo "<p>✓ Table 'bcm_sessions' created</p>";
    
    // Create functions table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bcm_functions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            behavior_id INT NOT NULL,
            function_type ENUM('Sensory', 'Escape', 'Attention', 'Tangible') NOT NULL,
            is_checked BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (behavior_id) REFERENCES bcm_behaviors(id) ON DELETE CASCADE
        )
    ");
    echo "<p>✓ Table 'bcm_functions' created</p>";
    
    // Create BDM sessions table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bdm_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            behavior_name VARCHAR(255),
            interval_duration VARCHAR(50),
            function_type VARCHAR(100),
            measurement_type VARCHAR(50),
            session_number INT NOT NULL,
            session_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    echo "<p>✓ Table 'bdm_sessions' created</p>";
    
    // Create BDM intervals table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bdm_intervals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id INT NOT NULL,
            interval_number INT NOT NULL,
            observation ENUM('', '+', '-') DEFAULT '',
            FOREIGN KEY (session_id) REFERENCES bdm_sessions(id) ON DELETE CASCADE
        )
    ");
    echo "<p>✓ Table 'bdm_intervals' created</p>";
    
    // Create notes table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bcm_notes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    echo "<p>✓ Table 'bcm_notes' created</p>";
    
    echo "<h2 style='color: green;'>Setup Complete!</h2>";
    echo "<p>You can now use the ATRP Dashboard. Data will be saved to the database.</p>";
    echo "<p><a href='../index.html'>Go to Dashboard</a></p>";
    
} catch (PDOException $e) {
    echo "<h2 style='color: red;'>Error</h2>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
