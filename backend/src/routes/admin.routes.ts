import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { requireSuperAdmin } from '../middleware/admin-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { adminRejectApplicationSchema, adminRequestInfoSchema } from '../utils/validators.js';
import { emailService } from '../services/email.service.js';
import { logAdminActivity, getActivityLogs } from '../services/admin-activity.service.js';
import { adminDashboardService } from '../services/admin-dashboard.service.js';
import { logAdminAction } from '../middleware/adminLog.middleware.js';

const router = Router();

// All admin routes require authentication via admin auth system
router.use(requireSuperAdmin);

// ==================== DASHBOARD OVERVIEW ====================

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminDashboardService.getDashboardOverview();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ==================== ALERTS (Smart Notification Center) ====================

import { adminAlertsService } from '../services/admin-alerts.service.js';

// Get all alerts grouped by severity
router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminAlertsService.getAlerts();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get just the badge count (lightweight)
router.get('/alerts/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await adminAlertsService.getAlertCount();
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

// Sales chart data
router.get('/analytics/sales-chart', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = req.query.period as string;
    const data = await adminDashboardService.getSalesChart(period);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Orders by status
router.get('/analytics/orders-by-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminDashboardService.getOrdersByStatus();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Top selling categories
router.get('/analytics/top-categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await adminDashboardService.getTopCategories(limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Sales by Ghana region
router.get('/analytics/by-region', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminDashboardService.getSalesByRegion();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Top products
router.get('/stats/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await adminDashboardService.getTopProducts(limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ==================== SALES STATISTICS ====================

router.get('/stats/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = req.query.period as string;
    const data = await adminDashboardService.getSalesStats(period);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ==================== USER MANAGEMENT ====================

import { adminUserService } from '../services/admin-user.service.js';

router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const role = req.query.role as string;

    const data = await adminUserService.getUsers(page, limit, search, status, role);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get user detail
router.get('/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const user = await adminUserService.getUserDetail(userId);
    res.json({ success: true, data: { user } });
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Update user status
router.put('/users/:userId/status', logAdminAction('UPDATE_USER_STATUS', 'user', 'userId'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    const user = await adminUserService.updateUserStatus(userId, status, req);
    res.json({
      success: true,
      message: `User ${status.toLowerCase()} successfully`,
      data: user,
    });
  } catch (error: any) {
    if (error.message === 'Invalid status') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Delete user (soft - deactivate)
router.delete('/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    await adminUserService.deactivateUser(userId, req);
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error: any) {
    if (error.message === 'Cannot delete your own account') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// ==================== SELLER MANAGEMENT ====================

import { adminSellerService } from '../services/admin-seller.service.js';

router.get('/sellers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const data = await adminSellerService.getSellers(page, limit, search, status);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get seller detail
router.get('/sellers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await adminSellerService.getSellerDetail(id);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message === 'Seller not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Suspend a seller
router.put('/sellers/:id/suspend', logAdminAction('SUSPEND_SELLER', 'seller', 'id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const profile = await adminSellerService.suspendSeller(id, reason, req);
    res.json({ success: true, message: `Seller ${profile.businessName} has been suspended.` });
  } catch (error: any) {
    if (error.message === 'Seller not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Activate a seller
router.put('/sellers/:id/activate', logAdminAction('ACTIVATE_SELLER', 'seller', 'id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const profile = await adminSellerService.activateSeller(id, req);
    res.json({ success: true, message: `Seller ${profile.businessName} has been activated.` });
  } catch (error: any) {
    if (error.message === 'Seller not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Update seller commission rate
router.put('/sellers/:id/commission-rate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;
    
    const profile = await adminSellerService.updateCommissionRate(id, commissionRate, req);
    res.json({
      success: true,
      message: `Commission rate updated to ${commissionRate}%`,
      data: profile,
    });
  } catch (error: any) {
    if (error.message === 'Commission rate must be between 0 and 50') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// ==================== SELLER APPLICATION MANAGEMENT ====================

// List seller applications with filters
router.get('/seller-applications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const data = await adminSellerService.getApplications(page, limit, status, search);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get single application detail
router.get('/seller-applications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await adminSellerService.getApplicationDetail(id, req);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message === 'Application not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Approve seller application (atomic transaction)
router.post('/seller-applications/:id/approve', logAdminAction('APPROVE_SELLER_APPLICATION', 'seller_application', 'id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await adminSellerService.approveApplication(id, req);
    
    res.json({
      success: true,
      message: `Seller application approved. User is now a seller.`,
      data: result,
    });
  } catch (error: any) {
    if (error.message === 'Application not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    } else if (error.message === 'Application is already approved' || error.message === 'Cannot approve a rejected application') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Reject seller application
router.post('/seller-applications/:id/reject', validate(adminRejectApplicationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const data = await adminSellerService.rejectApplication(id, reason, req);
    res.json({ success: true, message: 'Application rejected.', data });
  } catch (error: any) {
    if (error.message === 'Application not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    } else if (error.message.startsWith('Cannot reject')) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Request more info from applicant
router.post('/seller-applications/:id/request-info', validate(adminRequestInfoSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const data = await adminSellerService.requestInfo(id, notes, req);
    res.json({ success: true, message: 'Info requested from applicant.', data });
  } catch (error: any) {
    if (error.message === 'Application not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    } else if (error.message.startsWith('Can only request info')) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Update application notes
router.put('/seller-applications/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const data = await adminSellerService.updateApplicationNotes(id, notes, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ==================== ORDER MANAGEMENT ====================

import { adminOrderService } from '../services/admin-order.service.js';

router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const data = await adminOrderService.getOrders(page, limit, status, search);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Update order status
router.put('/orders/:orderId/status', logAdminAction('UPDATE_ORDER_STATUS', 'order', 'orderId'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, notes } = req.body;

    const order = await adminOrderService.updateOrderStatus(orderId, status, trackingNumber, notes, req);
    res.json({ success: true, message: `Order status updated to ${status}`, data: order });
  } catch (error: any) {
    if (error.message === 'Invalid order status') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// ==================== INVENTORY MANAGEMENT ====================

import { adminInventoryService } from '../services/admin-inventory.service.js';

router.get('/inventory/low-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await adminInventoryService.getLowStockProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

router.put('/inventory/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { stockQuantity, reason } = req.body;

    const data = await adminInventoryService.updateStock(productId, stockQuantity, reason, req);
    res.json({ success: true, message: 'Inventory updated successfully', data });
  } catch (error: any) {
    if (error.message === 'Product not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// ==================== ACTIVITY LOGS ====================

router.get('/activity-logs', async (req: Request, res: Response) => {
  try {
    const result = await getActivityLogs({
      entityType: req.query.entity as string,
      entityId: req.query.entityId as string,
      adminId: req.query.adminId as string,
      action: req.query.action as string,
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to get activity logs' });
  }
});

export default router;
