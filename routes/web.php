<?php

use App\Http\Controllers\Accounting\AccountController;
use App\Http\Controllers\Accounting\AccountingPeriodController;
use App\Http\Controllers\Accounting\AuditLogController;
use App\Http\Controllers\Accounting\CashTransactionController;
use App\Http\Controllers\Accounting\InvoiceController;
use App\Http\Controllers\Accounting\InvoicePaymentController;
use App\Http\Controllers\Accounting\JournalEntryController;
use App\Http\Controllers\Accounting\ManualJournalController;
use App\Http\Controllers\Accounting\ReportController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BranchComparisonReportController;
use App\Http\Controllers\BranchSwitchController;
use App\Http\Controllers\BranchWarehouseController;
use App\Http\Controllers\CashierShiftController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\Inventory\ProductController;
use App\Http\Controllers\Inventory\StockAdjustmentController;
use App\Http\Controllers\Inventory\StockInController;
use App\Http\Controllers\Inventory\StockReportController;
use App\Http\Controllers\Inventory\StockTransferController;
use App\Http\Controllers\Platform\SuperAdminController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReceiptController;
use App\Http\Controllers\SalesReportController;
use App\Http\Controllers\TenantInvitationController;
use App\Http\Controllers\TenantSettingsController;
use App\Http\Controllers\TenantSwitchController;
use App\Http\Controllers\TenantUserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/health', HealthController::class)->name('health');

Route::get('/invitations/{token}', [TenantInvitationController::class, 'accept'])->name('invitations.accept');
Route::post('/invitations/{token}', [TenantInvitationController::class, 'complete'])->name('invitations.complete');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware('platform.admin')->group(function () {
        Route::redirect('/platform', '/platform/tenants')->name('platform.index');
        Route::get('/platform/tenants', [SuperAdminController::class, 'index'])->name('platform.tenants.index');
        Route::patch('/platform/tenants/{tenant}', [SuperAdminController::class, 'update'])->name('platform.tenants.update');
    });

    Route::post('/tenant-switch/{tenant}', TenantSwitchController::class)->name('tenant.switch');
    Route::post('/branch-switch', BranchSwitchController::class)->name('branch.switch');

    Route::middleware('tenant.role:owner,admin,branch_manager,cashier')->group(function () {
        Route::get('/pos', [PosController::class, 'index'])->name('pos.index');
        Route::post('/pos/checkout', [PosController::class, 'store'])->name('pos.checkout');
        Route::get('/pos/sales/{sale}/receipt', [ReceiptController::class, 'show'])->name('pos.receipt');
        Route::get('/cashier-shifts', [CashierShiftController::class, 'index'])->name('cashier-shifts.index');
        Route::post('/cashier-shifts/open', [CashierShiftController::class, 'open'])->name('cashier-shifts.open');
        Route::post('/cashier-shifts/close', [CashierShiftController::class, 'close'])->name('cashier-shifts.close');
    });

    Route::middleware(['cashier.redirect', 'tenant.role:owner,admin,accountant,branch_manager,warehouse_staff'])->group(function () {
        Route::get('/dashboard', DashboardController::class)->name('dashboard');
    });

    Route::middleware(['cashier.redirect', 'tenant.role:owner,admin,accountant'])->group(function () {
        Route::get('/accounts', [AccountController::class, 'index'])->name('accounts.index');
        Route::post('/accounts', [AccountController::class, 'store'])->name('accounts.store');
        Route::get('/cash-transactions', [CashTransactionController::class, 'index'])->name('cash-transactions.index');
        Route::post('/cash-transactions', [CashTransactionController::class, 'store'])->name('cash-transactions.store');
        Route::get('/manual-journal', [ManualJournalController::class, 'create'])->name('manual-journal.create');
        Route::post('/manual-journal', [ManualJournalController::class, 'store'])->name('manual-journal.store');
        Route::get('/journal-entries', [JournalEntryController::class, 'index'])->name('journal-entries.index');
        Route::get('/accounting-periods', [AccountingPeriodController::class, 'index'])->name('accounting-periods.index');
        Route::post('/accounting-periods', [AccountingPeriodController::class, 'store'])->name('accounting-periods.store');
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::get('/reports/ledger', [ReportController::class, 'ledger'])->name('reports.ledger');
        Route::get('/reports/trial-balance', [ReportController::class, 'trialBalance'])->name('reports.trial-balance');
        Route::get('/reports/profit-loss', [ReportController::class, 'profitLoss'])->name('reports.profit-loss');
        Route::get('/reports/balance-sheet', [ReportController::class, 'balanceSheet'])->name('reports.balance-sheet');
        Route::get('/reports/sales', SalesReportController::class)->name('reports.sales');
        Route::get('/reports/branch-comparison', BranchComparisonReportController::class)->name('reports.branch-comparison');
        Route::get('/tenant-users', [TenantUserController::class, 'index'])->name('tenant-users.index');
        Route::post('/tenant-users', [TenantUserController::class, 'store'])->name('tenant-users.store');
        Route::patch('/tenant-users/{user}', [TenantUserController::class, 'update'])->name('tenant-users.update');
        Route::post('/tenant-invitations', [TenantInvitationController::class, 'store'])->name('tenant-invitations.store');
        Route::get('/tenant-settings', [TenantSettingsController::class, 'edit'])->name('tenant-settings.edit');
        Route::patch('/tenant-settings', [TenantSettingsController::class, 'update'])->name('tenant-settings.update');
        Route::get('/branches-warehouses', [BranchWarehouseController::class, 'index'])->name('branches-warehouses.index');
        Route::post('/branches', [BranchWarehouseController::class, 'storeBranch'])->name('branches.store');
        Route::patch('/branches/{branch}', [BranchWarehouseController::class, 'updateBranch'])->name('branches.update');
        Route::patch('/branches/{branch}/status', [BranchWarehouseController::class, 'toggleBranch'])->name('branches.status');
        Route::post('/warehouses', [BranchWarehouseController::class, 'storeWarehouse'])->name('warehouses.store');
        Route::patch('/warehouses/{warehouse}', [BranchWarehouseController::class, 'updateWarehouse'])->name('warehouses.update');
        Route::patch('/warehouses/{warehouse}/status', [BranchWarehouseController::class, 'toggleWarehouse'])->name('warehouses.status');
        Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
    });

    Route::middleware(['cashier.redirect', 'tenant.role:owner,admin,accountant,branch_manager'])->group(function () {
        Route::get('/contacts', [ContactController::class, 'index'])->name('contacts.index');
        Route::post('/contacts', [ContactController::class, 'store'])->name('contacts.store');
        Route::get('/invoices', [InvoiceController::class, 'index'])->name('invoices.index');
        Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
        Route::post('/invoice-payments', [InvoicePaymentController::class, 'store'])->name('invoice-payments.store');
    });

    Route::middleware(['cashier.redirect', 'tenant.role:owner,admin,branch_manager,warehouse_staff'])->group(function () {
        Route::get('/products', [ProductController::class, 'index'])->name('products.index');
        Route::post('/products', [ProductController::class, 'store'])->name('products.store');
        Route::patch('/products/{product}', [ProductController::class, 'update'])->name('products.update');
        Route::get('/stock-in', [StockInController::class, 'index'])->name('stock-in.index');
        Route::post('/stock-in', [StockInController::class, 'store'])->name('stock-in.store');
        Route::get('/stock-adjustments', [StockAdjustmentController::class, 'index'])->name('stock-adjustments.index');
        Route::post('/stock-adjustments', [StockAdjustmentController::class, 'store'])->name('stock-adjustments.store');
        Route::get('/stock-transfers', [StockTransferController::class, 'index'])->name('stock-transfers.index');
        Route::post('/stock-transfers', [StockTransferController::class, 'store'])->name('stock-transfers.store');
        Route::patch('/stock-transfers/{stockTransfer}/approve', [StockTransferController::class, 'approve'])->name('stock-transfers.approve');
        Route::patch('/stock-transfers/{stockTransfer}/receive', [StockTransferController::class, 'receive'])->name('stock-transfers.receive');
        Route::get('/reports/stock', StockReportController::class)->name('reports.stock');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
