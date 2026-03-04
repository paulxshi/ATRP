-- ATRP Database Schema
-- Run this SQL to create the necessary tables

CREATE DATABASE IF NOT EXISTS atrp_database;
USE atrp_database;

-- Table for BCM (Continuous Measurement) - Behavior records
CREATE TABLE IF NOT EXISTS bcm_behaviors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    antecedent TEXT,
    behavior TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for BCM Session Frequencies
CREATE TABLE IF NOT EXISTS bcm_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    behavior_id INT NOT NULL,
    session_number INT NOT NULL,
    frequency INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (behavior_id) REFERENCES bcm_behaviors(id) ON DELETE CASCADE
);

-- Table for BCM Function checkboxes (Sensory, Escape, Attention, Tangible)
CREATE TABLE IF NOT EXISTS bcm_functions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    behavior_id INT NOT NULL,
    function_type ENUM('Sensory', 'Escape', 'Attention', 'Tangible') NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (behavior_id) REFERENCES bcm_behaviors(id) ON DELETE CASCADE
);

-- Table for BDM (Discontinuous Measurement) Sessions
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
);

-- Table for BDM Interval data (+/- observations)
CREATE TABLE IF NOT EXISTS bdm_intervals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    interval_number INT NOT NULL,
    observation ENUM('', '+', '-') DEFAULT '',
    FOREIGN KEY (session_id) REFERENCES bdm_sessions(id) ON DELETE CASCADE
);

-- Table for BCM General Notes
CREATE TABLE IF NOT EXISTS bcm_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
