import { describe, it } from 'node:test'
import { strictEqual, ok } from 'node:assert'
import { config, plans } from './index.js'

describe('config', () => {
  it('should have database config', () => {
    ok(config.database)
    ok(config.database.url)
  })

  it('should have auth config', () => {
    ok(config.auth)
    ok(config.auth.secret)
    ok(config.auth.url)
  })

  it('should have stripe config', () => {
    ok(config.stripe)
    strictEqual(typeof config.stripe.secretKey, 'string')
    strictEqual(typeof config.stripe.webhookSecret, 'string')
  })

  it('should have ai config', () => {
    ok(config.ai)
    strictEqual(typeof config.ai.openAIKey, 'string')
    strictEqual(typeof config.ai.model, 'string')
  })

  it('should have rate limits', () => {
    ok(config.rateLimits.scan)
    ok(config.rateLimits.scan.free)
    ok(config.rateLimits.scan.pro)
  })

  it('should have security config', () => {
    ok(config.security)
    ok(config.security.allowedOrigins)
    ok(config.security.maxRequestSize)
  })

  it('should have websocket config', () => {
    ok(config.websocket)
    strictEqual(typeof config.websocket.port, 'number')
  })
})

describe('plans', () => {
  it('should have FREE plan', () => {
    ok(plans.FREE)
    strictEqual(plans.FREE.name, 'Free')
    ok(plans.FREE.limits)
    strictEqual(plans.FREE.limits.scans, 10)
  })

  it('should have PRO plan', () => {
    ok(plans.PRO)
    strictEqual(plans.PRO.name, 'Pro')
    strictEqual(plans.PRO.limits.scans, 100)
  })

  it('should have ENTERPRISE plan', () => {
    ok(plans.ENTERPRISE)
    strictEqual(plans.ENTERPRISE.name, 'Enterprise')
    strictEqual(plans.ENTERPRISE.limits.scans, -1)
  })
})