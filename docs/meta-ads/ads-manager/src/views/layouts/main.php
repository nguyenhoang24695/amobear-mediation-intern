<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $title ?? 'Facebook Ads Manager Dashboard'; ?></title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <style>
        .sidebar {
            min-height: 100vh;
            background: linear-gradient(135deg, #1877f2 0%, #42b883 100%);
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }
        .sidebar .nav-link {
            color: white;
            padding: 15px 20px;
            border-radius: 0;
            transition: all 0.3s ease;
            margin: 2px 10px;
            border-radius: 8px;
        }
        .sidebar .nav-link:hover {
            background-color: rgba(255,255,255,0.15);
            color: white;
            transform: translateX(5px);
        }
        .sidebar .nav-link.active {
            background-color: rgba(255,255,255,0.25);
            color: white;
            font-weight: bold;
        }
        .main-content {
            padding: 20px;
            background-color: #f8f9fa;
            min-height: 100vh;
        }
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .metric-card:hover {
            transform: translateY(-5px);
        }
        .metric-card h3 {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .metric-card p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.95rem;
        }
        .chart-container {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            margin-bottom: 20px;
        }
        .table-container {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            margin-top: 20px;
        }
        .status-badge {
            font-size: 0.8rem;
            padding: 6px 12px;
            border-radius: 20px;
        }
        .btn-facebook {
            background: linear-gradient(135deg, #1877f2 0%, #42b883 100%);
            border: none;
            color: white;
            border-radius: 8px;
            padding: 10px 20px;
            transition: all 0.3s ease;
        }
        .btn-facebook:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(24, 119, 242, 0.4);
            color: white;
        }
        .page-header {
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 25px;
        }
        .account-selector {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 8px 15px;
            transition: all 0.3s ease;
        }
        .account-selector:focus {
            border-color: #1877f2;
            box-shadow: 0 0 0 0.2rem rgba(24, 119, 242, 0.25);
        }
        .alert-custom {
            border-radius: 10px;
            border: none;
        }
        .card-custom {
            border: none;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        .table-custom {
            border-radius: 10px;
            overflow: hidden;
        }
        .table-custom thead th {
            background-color: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
            font-weight: 600;
            color: #495057;
        }
        .loading-spinner {
            display: none;
            text-align: center;
            padding: 20px;
        }
    </style>
    
    <?php if (isset($additionalCSS)): ?>
        <?php echo $additionalCSS; ?>
    <?php endif; ?>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <div class="col-md-2 sidebar p-0">
                <div class="p-4">
                    <h4 class="text-white mb-0">
                        <i class="fab fa-facebook me-2"></i>
                        Ads Manager
                    </h4>
                    <small class="text-light opacity-75">Professional Dashboard</small>
                </div>
                <nav class="nav flex-column px-2">
                    <a class="nav-link <?php echo $this->isCurrentPage('dashboard') ? 'active' : ''; ?>" 
                       href="<?php echo $this->url('?page=dashboard'); ?>">
                        <i class="fas fa-chart-dashboard me-2"></i> Dashboard
                    </a>
                    <a class="nav-link <?php echo $this->isCurrentPage('campaigns') ? 'active' : ''; ?>" 
                       href="<?php echo $this->url('?page=campaigns'); ?>">
                        <i class="fas fa-bullhorn me-2"></i> Campaigns
                    </a>
                    <a class="nav-link <?php echo $this->isCurrentPage('adsets') ? 'active' : ''; ?>" 
                       href="<?php echo $this->url('?page=adsets'); ?>">
                        <i class="fas fa-layer-group me-2"></i> Ad Sets
                    </a>
                    <a class="nav-link <?php echo $this->isCurrentPage('ads') ? 'active' : ''; ?>" 
                       href="<?php echo $this->url('?page=ads'); ?>">
                        <i class="fas fa-ad me-2"></i> Ads
                    </a>
                    <a class="nav-link <?php echo $this->isCurrentPage('audiences') ? 'active' : ''; ?>" 
                       href="<?php echo $this->url('?page=audiences'); ?>">
                        <i class="fas fa-users me-2"></i> Audiences
                    </a>
                    <a class="nav-link <?php echo $this->isCurrentPage('insights') ? 'active' : ''; ?>" 
                       href="<?php echo $this->url('?page=insights'); ?>">
                        <i class="fas fa-chart-line me-2"></i> Insights
                    </a>
                    <a class="nav-link <?php echo $this->isCurrentPage('automation') ? 'active' : ''; ?>" 
                       href="<?php echo $this->url('?page=automation'); ?>">
                        <i class="fas fa-robot me-2"></i> Automation
                    </a>
                    
                    <hr class="text-white opacity-25 my-2">
                    
                    <a class="nav-link <?php echo $this->isCurrentPage('users') ? 'active' : ''; ?>" 
                       href="<?php echo $this->url('?page=users'); ?>">
                        <i class="fas fa-user-shield me-2"></i> User Management
                    </a>
                    
                    <a class="nav-link" href="sync.php">
                        <i class="fas fa-sync-alt me-2"></i> Sync from Facebook
                    </a>
                </nav>
                
                <div class="mt-auto p-3">
                    <small class="text-light">
                        <i class="fas fa-clock me-1"></i>
                        Last sync: <?php echo date('H:i'); ?>
                    </small>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="col-md-10 main-content">
                <!-- Page Header -->
                <div class="page-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h1 class="mb-1"><?php echo $pageTitle ?? ucfirst($currentPage ?? 'Dashboard'); ?></h1>
                            <p class="text-muted mb-0"><?php echo $pageDescription ?? 'Manage your Facebook advertising campaigns'; ?></p>
                        </div>
                        <div class="d-flex align-items-center gap-3">
                            <!-- Account Selector -->
                            <?php
                            // Debug: Check if accounts exist
                            if (!isset($accounts)) {
                                echo "<!-- DEBUG: \$accounts variable not set -->";
                                $accounts = [];
                            } else {
                                echo "<!-- DEBUG: Found " . count($accounts) . " accounts -->";
                            }
                            ?>
                            <select id="account-selector" class="form-select account-selector" style="width: 300px;">
                                <option value="">Select Ad Account</option>
                                <?php if (isset($accounts) && is_array($accounts) && count($accounts) > 0): ?>
                                    <?php foreach ($accounts as $account): ?>
                                        <?php 
                                        // Use Facebook account_id for display and value
                                        $fbAccountId = $account['account_id'] ?? '';
                                        $dbId = $account['id'] ?? '';
                                        $accountName = $account['name'] ?? 'Unnamed Account';
                                        $currency = $account['currency'] ?? 'USD';
                                        $status = $account['account_status'] ?? 'ACTIVE';
                                        ?>
                                        <option value="<?php echo htmlspecialchars($fbAccountId); ?>" 
                                                data-db-id="<?php echo htmlspecialchars($dbId); ?>"
                                                <?php echo (isset($selectedAccount) && $selectedAccount === $fbAccountId) ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($accountName); ?> (FB: <?php echo htmlspecialchars($fbAccountId); ?>) - <?php echo htmlspecialchars($currency); ?>
                                        </option>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <!-- DEBUG: No accounts to display -->
                                    <option value="" disabled>No accounts available</option>
                                <?php endif; ?>
                            </select>
                            
                            <button class="btn btn-facebook" onclick="refreshData()" id="refresh-btn">
                                <i class="fas fa-sync-alt me-1"></i> Refresh
                            </button>
                            
                            <!-- User Menu -->
                            <div class="dropdown">
                                <button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-user-circle me-1"></i>
                                    <?php 
                                    $currentUser = $_SESSION['username'] ?? 'Guest';
                                    $userRole = $_SESSION['role'] ?? 'guest';
                                    echo htmlspecialchars($currentUser); 
                                    ?>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li>
                                        <div class="dropdown-item-text">
                                            <div><strong><?php echo htmlspecialchars($_SESSION['full_name'] ?? $currentUser); ?></strong></div>
                                            <small class="text-muted"><?php echo htmlspecialchars($_SESSION['email'] ?? ''); ?></small>
                                            <div class="mt-1">
                                                <span class="badge bg-<?php echo $userRole === 'admin' ? 'danger' : 'success'; ?>">
                                                    <?php echo $userRole === 'advertiser' ? 'Marketing' : ucfirst($userRole); ?>
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li>
                                        <a class="dropdown-item" href="?page=profile">
                                            <i class="fas fa-user me-2"></i>My Profile
                                        </a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item" href="?page=settings">
                                            <i class="fas fa-cog me-2"></i>Settings
                                        </a>
                                    </li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li>
                                        <a class="dropdown-item text-danger" href="logout.php">
                                            <i class="fas fa-sign-out-alt me-2"></i>Logout
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            
                            <?php if (isset($showCreateButton) && $showCreateButton): ?>
                                <button class="btn btn-success" onclick="<?php echo $createButtonAction ?? 'showCreateModal()'; ?>">
                                    <i class="fas fa-plus me-1"></i> <?php echo $createButtonText ?? 'Create'; ?>
                                </button>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                
                <!-- Error/Success Messages -->
                <?php if (isset($error)): ?>
                    <div class="alert alert-danger alert-custom">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <?php echo $this->e($error); ?>
                    </div>
                <?php endif; ?>
                
                <?php if (isset($success)): ?>
                    <div class="alert alert-success alert-custom">
                        <i class="fas fa-check-circle me-2"></i>
                        <?php echo $this->e($success); ?>
                    </div>
                <?php endif; ?>
                
                <!-- Loading Spinner -->
                <div class="loading-spinner" id="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading data...</p>
                </div>
                
                <!-- Main Content Area -->
                <div id="main-content">
                    <?php echo $content; ?>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modals Area -->
    <div id="modals-container">
        <?php if (isset($modals)): ?>
            <?php echo $modals; ?>
        <?php endif; ?>
    </div>
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    
    <!-- Common JavaScript -->
    <script>
        // Global variables
        let selectedAccount = '<?php echo $selectedAccount ?? ''; ?>';
        let currentPage = '<?php echo $currentPage ?? 'dashboard'; ?>';
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            initializeAccountSelector();
            initializeRefreshButton();
            
            // Load data if account is selected
            if (selectedAccount) {
                loadPageData();
            }
        });
        
        // Account selector
        function initializeAccountSelector() {
            const selector = document.getElementById('account-selector');
            if (selector) {
                // Auto-select first account if no account is selected and accounts exist
                if (!selectedAccount && selector.options.length > 1) {
                    // Skip first option which is "Select Ad Account"
                    const firstAccount = selector.options[1];
                    if (firstAccount && firstAccount.value) {
                        selector.value = firstAccount.value;
                        selectedAccount = firstAccount.value;
                        
                        // Update URL with first account
                        const url = new URL(window.location);
                        url.searchParams.set('account_id', selectedAccount);
                        // Fix double slashes in pathname
                        let finalUrl = url.toString().replace(/([^:])(\/\/+)/g, '$1/');
                        window.location.href = finalUrl;
                        return;
                    }
                }
                
                selector.addEventListener('change', function() {
                    selectedAccount = this.value;
                    
                    // Reload page with new account
                    const url = new URL(window.location);
                    if (selectedAccount) {
                        url.searchParams.set('account_id', selectedAccount);
                    } else {
                        url.searchParams.delete('account_id');
                    }
                    // Fix double slashes in pathname
                    let finalUrl = url.toString().replace(/([^:])(\/\/+)/g, '$1/');
                    window.location.href = finalUrl;
                });
            }
        }
        
        // Refresh button
        function initializeRefreshButton() {
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', function() {
                    if (selectedAccount) {
                        refreshData();
                    } else {
                        alert('Please select an ad account first');
                    }
                });
            }
        }
        
        // Update URL with selected account
        function updateURL() {
            const url = new URL(window.location);
            if (selectedAccount) {
                url.searchParams.set('account_id', selectedAccount);
            } else {
                url.searchParams.delete('account_id');
            }
            window.history.pushState({}, '', url);
        }
        
        // Load page-specific data
        function loadPageData() {
            showLoading();
            
            switch(currentPage) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'campaigns':
                    loadCampaignsData();
                    break;
                case 'adsets':
                    loadAdSetsData();
                    break;
                case 'insights':
                    loadInsightsData();
                    break;
                default:
                    hideLoading();
            }
        }
        
        // Refresh current data
        function refreshData() {
            loadPageData();
        }
        
        // Loading functions
        function showLoading() {
            document.getElementById('loading-spinner').style.display = 'block';
            document.getElementById('main-content').style.opacity = '0.5';
        }
        
        function hideLoading() {
            document.getElementById('loading-spinner').style.display = 'none';
            document.getElementById('main-content').style.opacity = '1';
        }
        
        // Utility functions
        function formatCurrency(amount) {
            return '$' + parseFloat(amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }
        
        function formatNumber(num) {
            return parseInt(num).toLocaleString('en-US');
        }
        
        function formatPercent(num, decimals = 2) {
            return parseFloat(num).toFixed(decimals) + '%';
        }
        
        // Page-specific data loading functions (will be overridden by individual views)
        function loadDashboardData() {
            console.log('Loading dashboard data...');
            hideLoading();
        }
        
        function loadCampaignsData() {
            console.log('Loading campaigns data...');
            hideLoading();
        }
        
        function loadAdSetsData() {
            console.log('Loading ad sets data...');
            hideLoading();
        }
        
        function loadInsightsData() {
            console.log('Loading insights data...');
            hideLoading();
        }
        
        // Page-specific functions will be loaded in individual views
    </script>
    
    <?php if (isset($additionalJS)): ?>
        <?php echo $additionalJS; ?>
    <?php endif; ?>
</body>
</html>