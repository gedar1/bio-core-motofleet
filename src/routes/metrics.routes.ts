import { Router, Request, Response, NextFunction } from "express";
import type { MetricsMolecule } from "../molecules/MetricsMolecule.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { roleGuard } from "../middleware/roleGuard.middleware.js";

/**
 * Creates admin metrics routes. All endpoints require admin role.
 * - GET /api/admin/metrics — aggregated business metrics
 * - GET /api/admin/errands — admin errand list with filters
 */
export function createMetricsRoutes(metricsMolecule: MetricsMolecule): Router {
  const router = Router();

  // All metrics routes require auth + admin
  router.use(authMiddleware, roleGuard("admin"));

  // GET /api/admin/metrics — business metrics for a period
  router.get("/metrics", (req: Request, res: Response, next: NextFunction) => {
    try {
      // Default period: current month
      const now = new Date();
      const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const defaultEnd = now.toISOString().substring(0, 10);

      const startDate = (req.query.start_date as string) || defaultStart;
      const endDate = (req.query.end_date as string) || defaultEnd;

      const errandsByStatus = metricsMolecule.getErrandsByStatus(
        startDate,
        endDate,
      );
      const commissionTotal = metricsMolecule.getCommissionTotal(
        startDate,
        endDate,
      );
      const motorcyclesByStatus = metricsMolecule.getMotorcyclesByStatus();
      const contractsByStatus = metricsMolecule.getContractsByStatus();
      const rentalPaymentsTotal = metricsMolecule.getRentalPaymentsTotal(
        startDate,
        endDate,
      );

      res.status(200).json({
        period: { start_date: startDate, end_date: endDate },
        errands_by_status: errandsByStatus,
        commission_total: commissionTotal,
        motorcycles_by_status: motorcyclesByStatus,
        contracts_by_status: contractsByStatus,
        rental_payments_total: rentalPaymentsTotal,
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/admin/errands — filtered admin errand list with pagination
  router.get("/errands", (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        type: req.query.type as string | undefined,
        rider_id: req.query.rider_id as string | undefined,
        start_date: req.query.start_date as string | undefined,
        end_date: req.query.end_date as string | undefined,
      };

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

      const result = metricsMolecule.listErrands(filters, page);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
