// API route definitions. authenticate applies to protected endpoints;
// public routes are accessible without token;
// requireRole('ADMIN') gates destructive/user-management operations.
const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const auth = require('../controllers/authController');
const portal = require('../controllers/customerPortalController');
const vehicles = require('../controllers/vehicleController');
const customers = require('../controllers/customerController');
const rentals = require('../controllers/rentalController');
const payments = require('../controllers/paymentController');
const maintenance = require('../controllers/maintenanceController');
const branches = require('../controllers/branchController');
const reports = require('../controllers/reportController');
const meta = require('../controllers/metaController');

const router = express.Router();

// ---- Health ----------------------------------------------------------------
router.get('/health', (req, res) => res.json({ status: 'ok', service: 'vehicle-rental-api' }));

// ---- Public Showroom & Meta ------------------------------------------------
router.get('/public/meta', portal.publicMeta);
router.get('/public/vehicles', portal.publicVehicles);
router.get('/public/vehicles/:id', portal.publicVehicleDetail);

// ---- Auth ------------------------------------------------------------------
router.post('/auth/login', auth.login);
router.post('/auth/register-customer', auth.registerCustomer);
router.get('/auth/me', authenticate, auth.me);

// ---- Customer Portal (Authenticated Customer Routes) -----------------------
router.get('/customer/rentals', authenticate, portal.getMyRentals);
router.post('/customer/book', authenticate, portal.bookVehicle);
router.post('/customer/rentals/:id/pay', authenticate, portal.payRental);
router.post('/customer/rentals/:id/cancel', authenticate, portal.cancelBooking);
router.get('/customer/profile', authenticate, portal.getProfile);
router.put('/customer/profile', authenticate, portal.updateProfile);

// ---- Admin/Staff: Vehicles -------------------------------------------------
router.get('/vehicles', authenticate, vehicles.list);
router.get('/vehicles/:id/availability', authenticate, vehicles.checkAvailability);
router.get('/vehicles/:id', authenticate, vehicles.getOne);
router.post('/vehicles', authenticate, requireRole('ADMIN'), vehicles.create);
router.put('/vehicles/:id', authenticate, requireRole('ADMIN'), vehicles.update);
router.patch('/vehicles/:id/status', authenticate, requireRole('ADMIN'), vehicles.updateStatus);

// ---- Admin/Staff: Customers ------------------------------------------------
router.get('/customers', authenticate, customers.list);
router.get('/customers/:id', authenticate, customers.getOne);
router.post('/customers', authenticate, customers.create);
router.put('/customers/:id', authenticate, customers.update);
router.patch('/customers/:id/status', authenticate, requireRole('ADMIN'), customers.updateStatus);

// ---- Admin/Staff: Rentals --------------------------------------------------
router.get('/rentals', authenticate, rentals.list);
router.post('/rentals', authenticate, rentals.create);
router.get('/rentals/:id', authenticate, rentals.getOne);
router.post('/rentals/:id/approve', authenticate, requireRole('ADMIN', 'STAFF'), rentals.approve);
router.post('/rentals/:id/pickup', authenticate, rentals.pickup);
router.post('/rentals/:id/return', authenticate, rentals.returnVehicle);
router.post('/rentals/:id/cancel', authenticate, rentals.cancel);

// ---- Admin/Staff: Payments -------------------------------------------------
router.get('/payments', authenticate, payments.list);
router.get('/payments/outstanding', authenticate, payments.outstanding);
router.get('/payments/:id', authenticate, payments.getOne);
router.post('/payments', authenticate, payments.create);
router.patch('/payments/:id/status', authenticate, payments.updateStatus);

// ---- Admin/Staff: Maintenance ----------------------------------------------
router.get('/maintenance', authenticate, maintenance.list);
router.get('/maintenance/summary', authenticate, maintenance.summary);
router.post('/maintenance', authenticate, maintenance.create);
router.put('/maintenance/:id', authenticate, maintenance.update);
router.patch('/maintenance/:id/status', authenticate, maintenance.updateStatus);

// ---- Admin/Staff: Branches -------------------------------------------------
router.get('/branches', authenticate, branches.list);
router.get('/branches/:id', authenticate, branches.getOne);
router.post('/branches', authenticate, requireRole('ADMIN'), branches.create);
router.put('/branches/:id', authenticate, requireRole('ADMIN'), branches.update);
router.patch('/branches/:id/status', authenticate, requireRole('ADMIN'), branches.updateStatus);

// ---- Admin/Staff: Reports --------------------------------------------------
router.get('/reports/dashboard', authenticate, reports.dashboard);
router.get('/reports/fleet', authenticate, reports.fleet);
router.get('/reports/rentals', authenticate, reports.rentals);
router.get('/reports/revenue', authenticate, reports.revenue);

// ---- Meta (form dropdowns) -------------------------------------------------
router.get('/meta/form-data', authenticate, meta.formData);

module.exports = router;
