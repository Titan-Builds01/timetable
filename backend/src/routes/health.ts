import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../shared/types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  };
  res.json(response);
});

export default router;

