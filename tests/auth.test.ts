import bcrypt from 'bcrypt';
import { authController } from '../src/controllers/AuthController';
import { userRepository } from '../src/repositories/UserRepository';

describe('Authentication & Session Handling', () => {
  describe('Password Hashing & Verification', () => {
    it('should securely hash password and verify matching hash', async () => {
      const password = 'SuperSecurePassword123!';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);

      const isMatch = await bcrypt.compare(password, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('Login Controller & Session', () => {
    it('should reject login with nonexistent username', async () => {
      jest.spyOn(userRepository, 'findByUsername').mockResolvedValue(null);

      const req: any = {
        body: { username: 'nonexistent', password: 'password123' },
        session: {},
      };
      const res: any = {
        render: jest.fn(),
        redirect: jest.fn(),
      };

      await authController.login(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'login',
        expect.objectContaining({ error: 'Invalid username or password' })
      );
      expect(req.session.userId).toBeUndefined();
    });

    it('should reject login when password does not match hash', async () => {
      const realHash = await bcrypt.hash('correctPassword', 10);
      jest.spyOn(userRepository, 'findByUsername').mockResolvedValue({
        id: 'user-1',
        username: 'admin',
        passwordHash: realHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const req: any = {
        body: { username: 'admin', password: 'wrongPassword' },
        session: {},
      };
      const res: any = {
        render: jest.fn(),
        redirect: jest.fn(),
      };

      await authController.login(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'login',
        expect.objectContaining({ error: 'Invalid username or password' })
      );
      expect(req.session.userId).toBeUndefined();
    });

    it('should establish session and redirect to /admin on valid credentials', async () => {
      const realPassword = 'validPassword123';
      const realHash = await bcrypt.hash(realPassword, 10);
      jest.spyOn(userRepository, 'findByUsername').mockResolvedValue({
        id: 'user-123',
        username: 'admin',
        passwordHash: realHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const req: any = {
        body: { username: 'admin', password: realPassword },
        session: {},
      };
      const res: any = {
        render: jest.fn(),
        redirect: jest.fn(),
      };

      await authController.login(req, res);

      expect(req.session.userId).toBe('user-123');
      expect(req.session.username).toBe('admin');
      expect(res.redirect).toHaveBeenCalledWith('/admin');
    });
  });
});
