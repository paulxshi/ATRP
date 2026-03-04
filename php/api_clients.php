<?php
/**
 * API for Clients
 * Handles saving and loading client information
 */

header('Content-Type: application/json');
require_once 'db_config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        loadClients();
        break;
    case 'POST':
        saveClient();
        break;
    case 'PUT':
        updateClient();
        break;
    case 'DELETE':
        deleteClient();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function loadClients() {
    global $pdo;
    
    try {
        $stmt = $pdo->query("
            SELECT id, first_name, last_name, date_of_birth, email, phone, address, notes, created_at
            FROM clients 
            ORDER BY last_name, first_name
        ");
        
        $clients = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'clients' => $clients
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function saveClient() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['first_name']) || !isset($input['last_name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'First name and last name are required']);
            return;
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO clients (first_name, last_name, date_of_birth, email, phone, address, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['first_name'] ?? '',
            $input['last_name'] ?? '',
            $input['date_of_birth'] ?? null,
            $input['email'] ?? '',
            $input['phone'] ?? '',
            $input['address'] ?? '',
            $input['notes'] ?? ''
        ]);
        
        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId(),
            'message' => 'Client saved successfully'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateClient() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Client ID is required']);
            return;
        }
        
        $stmt = $pdo->prepare("
            UPDATE clients 
            SET first_name = ?, last_name = ?, date_of_birth = ?, email = ?, 
                phone = ?, address = ?, notes = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $input['first_name'] ?? '',
            $input['last_name'] ?? '',
            $input['date_of_birth'] ?? null,
            $input['email'] ?? '',
            $input['phone'] ?? '',
            $input['address'] ?? '',
            $input['notes'] ?? '',
            $input['id']
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Client updated successfully'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteClient() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Client ID is required']);
            return;
        }
        
        $stmt = $pdo->prepare("DELETE FROM clients WHERE id = ?");
        $stmt->execute([$input['id']]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Client deleted successfully'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
