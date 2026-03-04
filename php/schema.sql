-- ATRP Database Schema
-- Run this SQL to create the necessary tables

CREATE DATABASE IF NOT EXISTS atrp_database;
USE atrp_database;

-- Table for Clients
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for BCM (Continuous Measurement) - consolidated table with client connection
CREATE TABLE IF NOT EXISTS bcm_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    antecedent TEXT,
    behavior TEXT,
    notes TEXT,
    session_number INT DEFAULT 1,
    frequency INT DEFAULT 0,
    function_type ENUM('Sensory', 'Escape', 'Attention', 'Tangible'),
    is_checked BOOLEAN DEFAULT FALSE,
    session_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Table for BCM General Notes (linked to client)
CREATE TABLE IF NOT EXISTS bcm_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Table for BDM (Discontinuous Measurement) Sessions
CREATE TABLE IF NOT EXISTS bdm_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    behavior_name VARCHAR(255),
    interval_duration VARCHAR(50),
    function_type VARCHAR(100),
    measurement_type VARCHAR(50),
    session_number INT NOT NULL,
    session_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Table for BDM Interval data (+/- observations)
CREATE TABLE IF NOT EXISTS bdm_intervals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    interval_number INT NOT NULL,
    observation ENUM('', '+', '-') DEFAULT '',
    FOREIGN KEY (session_id) REFERENCES bdm_sessions(id) ON DELETE CASCADE
);
