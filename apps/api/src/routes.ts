import { Router } from 'express';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { listingsRouter } from './modules/listings/listings.routes.js';
import { dealsRouter } from './modules/deals/deals.routes.js';
import { walletRouter } from './modules/wallet/wallet.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { mediaRouter } from './modules/media/media.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'canjea-api',
    environment: env.NODE_ENV,
    currency: env.CURRENCY,
    time: new Date().toISOString(),
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/listings', listingsRouter);
apiRouter.use('/deals', dealsRouter);
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/admin', adminRouter);
