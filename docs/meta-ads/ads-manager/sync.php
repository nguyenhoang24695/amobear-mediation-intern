<?php
/**
 * Sync Data from Facebook
 * Automatically sync campaigns, adsets, and ads from Facebook using token in .env
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300); // 5 minutes for sync

require_once 'src/config/Config.php';
require_once 'src/core/Database.php';
require_once 'src/core/FacebookAPI.php';

// Initialize
Config::init();
$db = Database::getInstance();

// Get access token from config
$fbConfig = Config::getFacebookConfig();
$accessToken = $fbConfig['access_token'];

if (!$accessToken || $accessToken === 'your_access_token_here') {
    die("❌ Please set FB_ACCESS_TOKEN in your .env file");
}

$fbApi = new FacebookAPI($accessToken);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sync Data from Facebook</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 30px 0;
        }
        .sync-container {
            max-width: 900px;
            margin: 0 auto;
        }
        .card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .progress {
            height: 30px;
            font-size: 14px;
        }
        .log-item {
            padding: 10px;
            margin: 5px 0;
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            border-radius: 5px;
        }
        .log-item.success {
            border-color: #28a745;
            background: #d4edda;
        }
        .log-item.error {
            border-color: #dc3545;
            background: #f8d7da;
        }
        .log-item.warning {
            border-color: #ffc107;
            background: #fff3cd;
        }
        #syncButton {
            padding: 15px 40px;
            font-size: 18px;
            font-weight: bold;
        }
        .stats-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .stats-card h3 {
            font-size: 2rem;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="sync-container">
        <div class="card">
            <div class="card-header bg-primary text-white">
                <h3 class="mb-0">
                    <i class="fas fa-sync-alt me-2"></i>
                    Sync Data from Facebook
                </h3>
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Auto-sync enabled!</strong> Using access token from .env file.
                </div>

                <!-- Stats -->
                <div class="row mb-4" id="stats-container">
                    <div class="col-md-4">
                        <div class="stats-card">
                            <h3 id="accounts-count">-</h3>
                            <p class="mb-0">Ad Accounts</p>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                            <h3 id="campaigns-count">-</h3>
                            <p class="mb-0">Campaigns</p>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="stats-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                            <h3 id="adsets-count">-</h3>
                            <p class="mb-0">Ad Sets</p>
                        </div>
                    </div>
                </div>

                <!-- Progress -->
                <div class="mb-4" id="progress-container" style="display: none;">
                    <label class="form-label fw-bold">Sync Progress:</label>
                    <div class="progress">
                        <div id="progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: 0%">0%</div>
                    </div>
                </div>

                <!-- Sync Button -->
                <div class="text-center mb-4">
                    <button id="syncButton" class="btn btn-success btn-lg" onclick="startSync()">
                        <i class="fas fa-sync-alt me-2"></i>
                        Start Sync Now
                    </button>
                    <div class="mt-2">
                        <small class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            Click to sync all data from Facebook (Accounts, Campaigns, Ad Sets)
                        </small>
                    </div>
                </div>

                <!-- Sync Log -->
                <div id="sync-log-container" style="display: none;">
                    <h5 class="mb-3">
                        <i class="fas fa-list me-2"></i>
                        Sync Log
                    </h5>
                    <div id="sync-log" style="max-height: 400px; overflow-y: auto;">
                        <!-- Log items will be added here -->
                    </div>
                </div>
            </div>
        </div>

        <div class="text-center mt-3">
            <a href="index.php" class="btn btn-light">
                <i class="fas fa-arrow-left me-2"></i>
                Back to Dashboard
            </a>
        </div>
    </div>

    <script>
        function addLog(message, type = 'info') {
            const logContainer = document.getElementById('sync-log');
            const logItem = document.createElement('div');
            logItem.className = `log-item ${type}`;
            
            let icon = 'fa-info-circle';
            if (type === 'success') icon = 'fa-check-circle';
            if (type === 'error') icon = 'fa-exclamation-circle';
            if (type === 'warning') icon = 'fa-exclamation-triangle';
            
            logItem.innerHTML = `<i class="fas ${icon} me-2"></i>${message}`;
            logContainer.appendChild(logItem);
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        function updateProgress(percent, text) {
            const progressBar = document.getElementById('progress-bar');
            progressBar.style.width = percent + '%';
            progressBar.textContent = text || (percent + '%');
        }

        function updateStats(accounts, campaigns, adsets) {
            document.getElementById('accounts-count').textContent = accounts || '-';
            document.getElementById('campaigns-count').textContent = campaigns || '-';
            document.getElementById('adsets-count').textContent = adsets || '-';
        }

        async function startSync() {
            const button = document.getElementById('syncButton');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Syncing...';

            document.getElementById('progress-container').style.display = 'block';
            document.getElementById('sync-log-container').style.display = 'block';
            document.getElementById('sync-log').innerHTML = '';

            addLog('Starting sync process...', 'info');
            updateProgress(10, 'Initializing...');

            try {
                // Step 1: Sync Accounts
                addLog('Fetching ad accounts from Facebook...', 'info');
                const accountsResponse = await fetch('sync_process.php?action=sync_accounts');
                const accountsData = await accountsResponse.json();
                
                if (accountsData.success) {
                    addLog(`✓ Synced ${accountsData.count} ad account(s)`, 'success');
                    updateStats(accountsData.count, '-', '-');
                    updateProgress(30, 'Accounts synced');
                } else {
                    throw new Error(accountsData.message || 'Failed to sync accounts');
                }

                // Step 2: Sync Campaigns
                addLog('Fetching campaigns...', 'info');
                const campaignsResponse = await fetch('sync_process.php?action=sync_campaigns');
                const campaignsData = await campaignsResponse.json();
                
                if (campaignsData.success) {
                    addLog(`✓ Synced ${campaignsData.count} campaign(s)`, 'success');
                    updateStats(accountsData.count, campaignsData.count, '-');
                    updateProgress(60, 'Campaigns synced');
                } else {
                    throw new Error(campaignsData.message || 'Failed to sync campaigns');
                }

                // Step 3: Sync Ad Sets
                addLog('Fetching ad sets...', 'info');
                const adsetsResponse = await fetch('sync_process.php?action=sync_adsets');
                const adsetsData = await adsetsResponse.json();
                
                if (adsetsData.success) {
                    addLog(`✓ Synced ${adsetsData.count} ad set(s)`, 'success');
                    updateStats(accountsData.count, campaignsData.count, adsetsData.count);
                    updateProgress(90, 'Ad Sets synced');
                } else {
                    throw new Error(adsetsData.message || 'Failed to sync ad sets');
                }

                // Complete
                updateProgress(100, 'Complete!');
                addLog('🎉 Sync completed successfully!', 'success');
                addLog('You can now return to dashboard to view your data', 'info');
                
                setTimeout(() => {
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Sync Again';
                }, 2000);

            } catch (error) {
                addLog('❌ Error: ' + error.message, 'error');
                updateProgress(0, 'Failed');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Try Again';
            }
        }
        
        // Auto-start if parameter is set
        document.addEventListener('DOMContentLoaded', function() {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('auto') === 'true') {
                setTimeout(() => startSync(), 500);
            }
        });
    </script>
</body>
</html>