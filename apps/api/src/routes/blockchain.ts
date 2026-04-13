import { FastifyInstance } from 'fastify'

interface TransactionMonitorConfig {
  chains: Record<string, { apiKey: string; rpcUrl?: string }>
  alertThresholds: {
    largeTransferUsd: number
    rapidTransactions: number // per minute
  }
}

// Track recent transactions for rate limiting (in production use Redis)
const txCache = new Map<string, { count: number; firstSeen: number }>()

export async function blockchainRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/blockchain/monitor
   * Query: chain, address, alertThreshold (optional)
   * Header: x-api-key (for blockchain explorer APIs)
   * 
   * Monitors an address for suspicious activity
   */
  fastify.get('/api/blockchain/monitor', async (request, reply) => {
    const { chain, address, alertThreshold } = request.query as {
      chain?: string
      address?: string
      alertThreshold?: string
    }

    if (!chain || !address) {
      return reply.status(400).send({ error: 'Missing chain or address' })
    }

    const threshold = parseFloat(alertThreshold) || 10000 // Default $10k

    try {
      const { getTransactions, getBalance } = getChainProvider(chain)
      
      // Fetch recent transactions
      const transactions = await getTransactions(address, 50)
      const balance = await getBalance(address)

      // Analyze for suspicious activity
      const analysis = analyzeTransactions(transactions, threshold, chain)

      // Check for rapid transactions (potential drainer)
      const now = Date.now()
      const txKey = `${chain}:${address}`
      const recentTxCount = transactions.filter((tx: any) => {
        const txTime = new Date(tx.timeStamp * 1000).getTime()
        return now - txTime < 60000 // Last minute
      }).length

      // Update cache
      const cacheEntry = txCache.get(txKey) || { count: 0, firstSeen: now }
      cacheEntry.count = recentTxCount
      txCache.set(txKey, cacheEntry)

      const riskScore = calculateRiskScore(analysis, recentTxCount, balance)

      return {
        success: true,
        address,
        chain,
        balance,
        analysis,
        metrics: {
          totalTransactions: transactions.length,
          transactionsLastMinute: recentTxCount,
          riskScore,
        },
        alerts: riskScore > 70 ? ['HIGH_RISK_DETECTED'] : [],
      }
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ error: error.message })
    }
  })

  /**
   * POST /api/blockchain/webhook
   * Body: { chain, address, alertTypes[] }
   * 
   * Register for ongoing monitoring (simplified - in production use database)
   */
  fastify.post('/api/blockchain/webhook', async (request, reply) => {
    const { chain, address, alertTypes } = request.body as {
      chain: string
      address: string
      alertTypes?: string[]
    }

    if (!chain || !address) {
      return reply.status(400).send({ error: 'Missing required fields' })
    }

    // In production, this would save to database and set up polling
    fastify.log.info(`Registered webhook for ${chain}:${address}`)

    return {
      success: true,
      message: 'Webhook registered',
      id: `wh_${Date.now()}`,
      chain,
      address,
      alertTypes: alertTypes || ['large_transfer', 'rapid_tx', 'new_contract'],
    }
  })

  /**
   * GET /api/blockchain/balance
   * Query: chain, address
   * 
   * Quick balance check
   */
  fastify.get('/api/blockchain/balance', async (request, reply) => {
    const { chain, address } = request.query as { chain?: string; address?: string }

    if (!chain || !address) {
      return reply.status(400).send({ error: 'Missing chain or address' })
    }

    try {
      const { getBalance } = getChainProvider(chain)
      const balance = await getBalance(address)
      return { success: true, chain, address, balance }
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })
}

function getChainProvider(chain: string) {
  const apiKey = process.env[`${chain.toUpperCase()}_API_KEY`] || ''

  switch (chain.toLowerCase()) {
    case 'ethereum':
    case 'eth':
      return {
        getTransactions: async (address: string, limit: number) => {
          if (!apiKey) throw new Error('Missing ETHERSCAN_API_KEY')
          const res = await fetch(
            `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`
          )
          const data = await res.json()
          return data.status === '1' ? data.result : []
        },
        getBalance: async (address: string) => {
          if (!apiKey) throw new Error('Missing ETHERSCAN_API_KEY')
          const res = await fetch(
            `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
          )
          const data = await res.json()
          return data.status === '1' ? parseFloat(data.result) / 1e18 : 0 // Convert wei to ETH
        },
      }

    case 'polygon':
    case 'matic':
      return {
        getTransactions: async (address: string, limit: number) => {
          if (!apiKey) throw new Error('Missing POLYGONSCAN_API_KEY')
          const res = await fetch(
            `https://api.polygonscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`
          )
          const data = await res.json()
          return data.status === '1' ? data.result : []
        },
        getBalance: async (address: string) => {
          if (!apiKey) throw new Error('Missing POLYGONSCAN_API_KEY')
          const res = await fetch(
            `https://api.polygonscan.com/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
          )
          const data = await res.json()
          return data.status === '1' ? parseFloat(data.result) / 1e18 : 0
        },
      }

    case 'bsc':
    case 'binance':
      return {
        getTransactions: async (address: string, limit: number) => {
          if (!apiKey) throw new Error('Missing BSCSCAN_API_KEY')
          const res = await fetch(
            `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`
          )
          const data = await res.json()
          return data.status === '1' ? data.result : []
        },
        getBalance: async (address: string) => {
          if (!apiKey) throw new Error('Missing BSCSCAN_API_KEY')
          const res = await fetch(
            `https://api.bscscan.com/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
          )
          const data = await res.json()
          return data.status === '1' ? parseFloat(data.result) / 1e18 : 0
        },
      }

    default:
      throw new Error(`Unsupported chain: ${chain}`)
  }
}

function analyzeTransactions(transactions: any[], threshold: number, chain: string) {
  const issues: string[] = []
  let totalIn = 0
  let totalOut = 0
  let largeTransfers = 0

  const usdRate = getUsdRate(chain)

  for (const tx of transactions) {
    const value = parseFloat(tx.value) / 1e18 // Convert to native token
    const valueUsd = value * usdRate

    if (tx.from?.toLowerCase() === tx.to?.toLowerCase()) {
      issues.push('SELF_TRANSFER_DETECTED')
    }

    if (valueUsd > threshold) {
      largeTransfers++
      if (largeTransfers > 3) {
        issues.push('HIGH_VOLUME_LARGE_TRANSFERS')
      }
    }

    // Check for new contract interactions
    const blockNum = parseInt(tx.blockNumber)
    if (blockNum > 0) {
      // Could check contract creation
    }
  }

  return {
    issues,
    largeTransferCount: largeTransfers,
    suspiciousPatterns: issues.length,
  }
}

function calculateRiskScore(analysis: any, txPerMinute: number, balance: number): number {
  let score = 0

  // Base score from issues found
  score += analysis.suspiciousPatterns * 20
  score += analysis.largeTransferCount * 15

  // Rapid transactions = high risk
  if (txPerMinute > 10) score += 30
  else if (txPerMinute > 5) score += 15

  // Very high or very low balance can be suspicious
  if (balance > 10000) score += 10 // Whale alert

  return Math.min(score, 100)
}

function getUsdRate(chain: string): number {
  // Simplified - in production use a price API
  const rates: Record<string, number> = {
    ethereum: 2500,
    eth: 2500,
    polygon: 0.8,
    matic: 0.8,
    bsc: 600,
    binance: 600,
  }
  return rates[chain.toLowerCase()] || 1000
}