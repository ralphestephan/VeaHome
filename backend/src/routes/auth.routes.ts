import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authSchemas } from '../utils/validators';

const router = Router();

router.post('/register', validate(authSchemas.register), register);
router.post('/login', validate(authSchemas.login), login);
router.get('/me', authenticateToken, me);
router.patch('/me', authenticateToken, updateProfile);

export default router;
