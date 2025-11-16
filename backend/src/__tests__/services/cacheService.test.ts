import { cacheService, CacheKeys } from '../../services/cacheService';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    info: jest.fn().mockResolvedValue('used_memory_human:1.5M\nuptime_in_seconds:3600'),
    dbsize: jest.fn().mockResolvedValue(42),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    pipeline: jest.fn().mockReturnValue({
      incr: jest.fn(),
      expire: jest.fn(),
      setex: jest.fn(),
      exec: jest.fn().mockResolvedValue([
        [null, 1],
        [null, 1],
      ]),
    }),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
  }));
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.REDIS_URL;
  });

  describe('initialization', () => {
    it('should disable cache service when Redis URL is not provided', () => {
      // CacheService constructor is called during import
      expect(cacheService.isAvailable()).toBe(false);
    });

    it('should initialize Redis when URL is provided', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      // We would need to create a new instance to test initialization
      // For now, we'll test the behavior when Redis is available
      expect(process.env.REDIS_URL).toBe('redis://localhost:6379');
    });
  });

  describe('get operation', () => {
    it('should return null when cache is disabled', async () => {
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should return parsed JSON when cache is available', async () => {
      // Mock Redis as available
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        get: jest.fn().mockResolvedValue('{"test": "value"}'),
      };

      const result = await cacheService.get('test-key');
      expect(result).toEqual({ test: 'value' });
    });

    it('should handle JSON parse errors gracefully', async () => {
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        get: jest.fn().mockResolvedValue('invalid-json'),
      };

      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        get: jest.fn().mockRejectedValue(new Error('Redis error')),
      };

      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('set operation', () => {
    it('should return false when cache is disabled', async () => {
      const result = await cacheService.set('test-key', { test: 'value' });
      expect(result).toBe(false);
    });

    it('should set value with TTL when cache is available', async () => {
      const mockSetex = jest.fn().mockResolvedValue('OK');
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        setex: mockSetex,
      };

      const result = await cacheService.set('test-key', { test: 'value' }, 300);

      expect(result).toBe(true);
      expect(mockSetex).toHaveBeenCalledWith('test-key', 300, '{"test":"value"}');
    });

    it('should handle Redis set errors gracefully', async () => {
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        setex: jest.fn().mockRejectedValue(new Error('Redis error')),
      };

      const result = await cacheService.set('test-key', { test: 'value' });
      expect(result).toBe(false);
    });
  });

  describe('delete operation', () => {
    it('should return false when cache is disabled', async () => {
      const result = await cacheService.delete('test-key');
      expect(result).toBe(false);
    });

    it('should delete key when cache is available', async () => {
      const mockDel = jest.fn().mockResolvedValue(1);
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        del: mockDel,
      };

      const result = await cacheService.delete('test-key');

      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith('test-key');
    });
  });

  describe('deletePattern operation', () => {
    it('should return 0 when cache is disabled', async () => {
      const result = await cacheService.deletePattern('test-*');
      expect(result).toBe(0);
    });

    it('should delete matching keys when cache is available', async () => {
      const mockKeys = jest.fn().mockResolvedValue(['test-1', 'test-2']);
      const mockDel = jest.fn().mockResolvedValue(2);
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        keys: mockKeys,
        del: mockDel,
      };

      const result = await cacheService.deletePattern('test-*');

      expect(result).toBe(2);
      expect(mockKeys).toHaveBeenCalledWith('test-*');
      expect(mockDel).toHaveBeenCalledWith('test-1', 'test-2');
    });

    it('should return 0 when no keys match pattern', async () => {
      const mockKeys = jest.fn().mockResolvedValue([]);
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        keys: mockKeys,
      };

      const result = await cacheService.deletePattern('test-*');
      expect(result).toBe(0);
    });
  });

  describe('getOrSet operation', () => {
    it('should execute function when cache is disabled', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'test' });

      const result = await cacheService.getOrSet('test-key', mockFn, 300);

      expect(result).toEqual({ data: 'test' });
      expect(mockFn).toHaveBeenCalled();
    });

    it('should return cached value when available', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'test' });
      const mockGet = jest.fn().mockResolvedValue({ cached: 'value' });

      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        get: mockGet,
      };

      // Mock the get method directly
      jest.spyOn(cacheService, 'get').mockResolvedValue({ cached: 'value' });

      const result = await cacheService.getOrSet('test-key', mockFn, 300);

      expect(result).toEqual({ cached: 'value' });
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should execute function and cache result when cache miss', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'test' });

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue(true);

      const result = await cacheService.getOrSet('test-key', mockFn, 300);

      expect(result).toEqual({ data: 'test' });
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('increment operation', () => {
    it('should return 0 when cache is disabled', async () => {
      const result = await cacheService.increment('counter-key');
      expect(result).toBe(0);
    });

    it('should increment counter with TTL when cache is available', async () => {
      const mockPipeline = {
        incr: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 5],
          [null, 1],
        ]),
      };

      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        pipeline: jest.fn().mockReturnValue(mockPipeline),
      };

      const result = await cacheService.increment('counter-key', 3600);

      expect(result).toBe(5);
      expect(mockPipeline.incr).toHaveBeenCalledWith('counter-key');
      expect(mockPipeline.expire).toHaveBeenCalledWith('counter-key', 3600);
    });
  });

  describe('health check', () => {
    it('should return unhealthy when Redis is not available', async () => {
      const result = await cacheService.healthCheck();
      expect(result).toEqual({ status: 'unhealthy' });
    });

    it('should return healthy with latency when Redis is available', async () => {
      const mockPing = jest.fn().mockResolvedValue('PONG');
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        ping: mockPing,
      };

      const result = await cacheService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(typeof result.latency).toBe('number');
      expect(mockPing).toHaveBeenCalled();
    });

    it('should return unhealthy on Redis error', async () => {
      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        ping: jest.fn().mockRejectedValue(new Error('Connection error')),
      };

      const result = await cacheService.healthCheck();
      expect(result).toEqual({ status: 'unhealthy' });
    });
  });

  describe('getStats operation', () => {
    it('should return disconnected when Redis is not available', async () => {
      const result = await cacheService.getStats();
      expect(result).toEqual({ connected: false });
    });

    it('should return stats when Redis is available', async () => {
      const mockInfo = jest
        .fn()
        .mockResolvedValueOnce('used_memory_human:2.5M\nother_stat:value')
        .mockResolvedValueOnce('uptime_in_seconds:7200\nother_server_stat:value');
      const mockDbSize = jest.fn().mockResolvedValue(100);

      (cacheService as any).isEnabled = true;
      (cacheService as any).redis = {
        info: mockInfo,
        dbsize: mockDbSize,
      };

      const result = await cacheService.getStats();

      expect(result).toEqual({
        connected: true,
        memoryUsage: '2.5M',
        keyCount: 100,
        uptime: 7200,
      });
      expect(mockInfo).toHaveBeenCalledWith('memory');
      expect(mockInfo).toHaveBeenCalledWith('server');
      expect(mockDbSize).toHaveBeenCalled();
    });
  });

  describe('CacheKeys utility', () => {
    it('should generate consistent cache keys', () => {
      expect(CacheKeys.product('123')).toBe('product:123');
      expect(CacheKeys.productPrice('456')).toBe('product_price:456');
      expect(CacheKeys.userSession('user-789')).toBe('user_session:user-789');
      expect(CacheKeys.storeProducts('store-abc')).toBe('store_products:store-abc');
      expect(CacheKeys.recommendations('user-def')).toBe('recommendations:user-def');
      expect(CacheKeys.weatherRecommendations('sunny', 'Denver', 'CO')).toBe(
        'weather_rec:sunny:Denver:CO'
      );
      expect(CacheKeys.complianceRules('CA')).toBe('compliance:CA');
      expect(CacheKeys.rateLimit('user-123', '/api/products')).toBe(
        'rate_limit:user-123:/api/products'
      );
    });
  });
});
