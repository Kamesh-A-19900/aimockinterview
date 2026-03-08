/**
 * Rate Limiting Service
 * 
 * Prevents API throttling by implementing:
 * 1. Request queuing with delays
 * 2. Exponential backoff on failures
 * 3. Per-user rate limiting
 * 4. Circuit breaker pattern
 * 
 * Groq API Limits:
 * - 30 requests per minute
 * - 6000 tokens per minute
 * - Burst limit: 10 requests per 10 seconds
 */

class RateLimitService {
  constructor() {
    // Request queue
    this.requestQueue = [];
    this.processing = false;
    
    // Rate limiting counters
    this.requestCounts = new Map(); // userId -> { count, resetTime }
    this.globalCount = 0;
    this.globalResetTime = Date.now() + 60000; // 1 minute
    
    // Circuit breaker
    this.circuitBreaker = {
      failures: 0,
      lastFailure: null,
      state: 'closed', // closed, open, half-open
      threshold: 5,
      timeout: 30000 // 30 seconds
    };
    
    // Groq API limits
    this.limits = {
      globalPerMinute: 25, // Conservative limit (30 actual)
      userPerMinute: 10,   // Per user limit
      burstPerTenSeconds: 8, // Conservative burst (10 actual)
      tokenPerMinute: 5000  // Conservative token limit
    };
    
    // Burst tracking
    this.burstCount = 0;
    this.burstResetTime = Date.now() + 10000; // 10 seconds
    
    // Start processing queue
    this.processQueue();
  }
  
  /**
   * Add request to queue with rate limiting
   * @param {Function} requestFn - Function that makes the API call
   * @param {string} userId - User ID for per-user limiting
   * @param {number} estimatedTokens - Estimated token usage
   * @returns {Promise} Request result
   */
  async queueRequest(requestFn, userId, estimatedTokens = 500) {
    return new Promise((resolve, reject) => {
      // Check circuit breaker
      if (this.circuitBreaker.state === 'open') {
        const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailure;
        if (timeSinceLastFailure < this.circuitBreaker.timeout) {
          reject(new Error('Circuit breaker is open - API temporarily unavailable'));
          return;
        } else {
          // Try to close circuit breaker
          this.circuitBreaker.state = 'half-open';
          console.log('🔄 Circuit breaker: half-open (testing)');
        }
      }
      
      // Check rate limits
      if (!this.checkRateLimits(userId, estimatedTokens)) {
        reject(new Error('Rate limit exceeded - please wait before making more requests'));
        return;
      }
      
      // Add to queue
      this.requestQueue.push({
        requestFn,
        userId,
        estimatedTokens,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      console.log(`📋 Request queued for user ${userId} (queue size: ${this.requestQueue.length})`);
    });
  }
  
  /**
   * Check if request is within rate limits
   * @param {string} userId - User ID
   * @param {number} estimatedTokens - Estimated token usage
   * @returns {boolean} True if within limits
   */
  checkRateLimits(userId, estimatedTokens) {
    const now = Date.now();
    
    // Reset global counter if needed
    if (now > this.globalResetTime) {
      this.globalCount = 0;
      this.globalResetTime = now + 60000;
      console.log('🔄 Global rate limit counter reset');
    }
    
    // Reset burst counter if needed
    if (now > this.burstResetTime) {
      this.burstCount = 0;
      this.burstResetTime = now + 10000;
    }
    
    // Check global limits
    if (this.globalCount >= this.limits.globalPerMinute) {
      console.log('❌ Global rate limit exceeded');
      return false;
    }
    
    // Check burst limits
    if (this.burstCount >= this.limits.burstPerTenSeconds) {
      console.log('❌ Burst rate limit exceeded');
      return false;
    }
    
    // Check per-user limits
    const userLimits = this.requestCounts.get(userId);
    if (userLimits) {
      if (now > userLimits.resetTime) {
        // Reset user counter
        this.requestCounts.set(userId, { count: 0, resetTime: now + 60000 });
      } else if (userLimits.count >= this.limits.userPerMinute) {
        console.log(`❌ User rate limit exceeded for ${userId}`);
        return false;
      }
    } else {
      // Initialize user counter
      this.requestCounts.set(userId, { count: 0, resetTime: now + 60000 });
    }
    
    return true;
  }
  
  /**
   * Process request queue with delays
   */
  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (true) {
      if (this.requestQueue.length === 0) {
        await this.sleep(100); // Check every 100ms
        continue;
      }
      
      const request = this.requestQueue.shift();
      
      try {
        // Add delay between requests to avoid burst limits
        const delay = this.calculateDelay();
        if (delay > 0) {
          console.log(`⏳ Adding ${delay}ms delay to prevent throttling`);
          await this.sleep(delay);
        }
        
        // Update counters
        this.updateCounters(request.userId);
        
        // Execute request
        console.log(`🚀 Executing request for user ${request.userId}`);
        const result = await request.requestFn();
        
        // Success - reset circuit breaker
        if (this.circuitBreaker.state === 'half-open') {
          this.circuitBreaker.state = 'closed';
          this.circuitBreaker.failures = 0;
          console.log('✅ Circuit breaker: closed (recovered)');
        }
        
        request.resolve(result);
        
      } catch (error) {
        console.error(`❌ Request failed for user ${request.userId}:`, error.message);
        
        // Handle rate limiting errors
        if (this.isRateLimitError(error)) {
          console.log('⚠️  Rate limit error detected - adding exponential backoff');
          
          // Re-queue with exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, this.circuitBreaker.failures), 30000);
          setTimeout(() => {
            this.requestQueue.unshift(request); // Add back to front of queue
          }, backoffDelay);
          
          this.circuitBreaker.failures++;
          continue;
        }
        
        // Handle other errors
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();
        
        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
          this.circuitBreaker.state = 'open';
          console.log('🔴 Circuit breaker: open (too many failures)');
        }
        
        request.reject(error);
      }
    }
  }
  
  /**
   * Calculate delay between requests
   * @returns {number} Delay in milliseconds
   */
  calculateDelay() {
    // Base delay to stay under burst limits
    const baseDelay = 1250; // 8 requests per 10 seconds = 1.25s between requests
    
    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 500; // 0-500ms
    
    // Add exponential backoff if circuit breaker is recovering
    let backoffMultiplier = 1;
    if (this.circuitBreaker.state === 'half-open') {
      backoffMultiplier = 2;
    }
    
    return Math.floor((baseDelay + jitter) * backoffMultiplier);
  }
  
  /**
   * Update request counters
   * @param {string} userId - User ID
   */
  updateCounters(userId) {
    // Update global counter
    this.globalCount++;
    
    // Update burst counter
    this.burstCount++;
    
    // Update user counter
    const userLimits = this.requestCounts.get(userId);
    if (userLimits) {
      userLimits.count++;
    }
    
    console.log(`📊 Counters - Global: ${this.globalCount}/${this.limits.globalPerMinute}, Burst: ${this.burstCount}/${this.limits.burstPerTenSeconds}, User: ${userLimits?.count || 0}/${this.limits.userPerMinute}`);
  }
  
  /**
   * Check if error is a rate limiting error
   * @param {Error} error - Error object
   * @returns {boolean} True if rate limit error
   */
  isRateLimitError(error) {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           message.includes('quota exceeded') ||
           message.includes('throttle') ||
           error.status === 429;
  }
  
  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current rate limit status
   * @returns {Object} Status information
   */
  getStatus() {
    const now = Date.now();
    
    return {
      queueSize: this.requestQueue.length,
      globalCount: this.globalCount,
      globalResetIn: Math.max(0, this.globalResetTime - now),
      burstCount: this.burstCount,
      burstResetIn: Math.max(0, this.burstResetTime - now),
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failures: this.circuitBreaker.failures,
        timeUntilRetry: this.circuitBreaker.state === 'open' 
          ? Math.max(0, this.circuitBreaker.timeout - (now - this.circuitBreaker.lastFailure))
          : 0
      }
    };
  }
  
  /**
   * Get user-specific rate limit status
   * @param {string} userId - User ID
   * @returns {Object} User status
   */
  getUserStatus(userId) {
    const userLimits = this.requestCounts.get(userId);
    const now = Date.now();
    
    return {
      requestCount: userLimits?.count || 0,
      limit: this.limits.userPerMinute,
      resetIn: userLimits ? Math.max(0, userLimits.resetTime - now) : 0
    };
  }
}

// Singleton instance
let rateLimitService = null;

function getRateLimitService() {
  if (!rateLimitService) {
    rateLimitService = new RateLimitService();
  }
  return rateLimitService;
}

module.exports = { RateLimitService, getRateLimitService };