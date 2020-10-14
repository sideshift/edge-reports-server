import { asObject, asString } from 'cleaners'
import crypto from 'crypto'
import fetch from 'node-fetch'

import { PartnerPlugin, PluginParams, PluginResult, StandardTx } from '../types'
import { datelog } from '../util'

const asSideshiftTx = asObject({
  id: asString,
  depositAddress: asObject({
    address: asString
  }),
  depositAsset: asString,
  invoiceAmount: asString,
  settleAddress: asObject({
    address: asString
  }),
  settleAsset: asString,
  settleAmount: asString,
  createdAt: asString
})

const LIMIT = 2
const QUERY_LOOKBACK = 60 * 60 * 24 * 5 // 5 days

function affiliateSignature(
  affiliateId: string,
  affiliateSecret: string,
  time: number
): string {
  return crypto
    .createHmac('sha1', affiliateSecret)
    .update(affiliateId + time)
    .digest('hex')
}

async function fetchTransactions(
  affiliateId: string,
  affiliateSecret: string,
  offset: number,
  limit: number
): Promise<StandardTx[]> {
  const time = Date.now()

  const signature = affiliateSignature(affiliateId, affiliateSecret, time)
  const url = `https://sideshift.ai/api/affiliate/completedOrders?limit=${limit}&offset=${offset}&affiliateId=${affiliateId}&time=${time}&signature=${signature}`

  try {
    const response = await fetch(url)
    const orders = await response.json() as any[]

    return orders.map(order => {
      const tx = asSideshiftTx(order)

      return {
        status: 'complete',
        orderId: tx.id,
        depositTxid: undefined,
        depositAddress: tx.depositAddress.address,
        depositCurrency: tx.depositAsset.toUpperCase(),
        depositAmount: Number(tx.invoiceAmount),
        payoutTxid: undefined,
        payoutAddress: tx.settleAddress.address,
        payoutCurrency: tx.settleAsset.toUpperCase(),
        payoutAmount: Number(tx.settleAmount),
        timestamp: new Date(tx.createdAt).getTime() / 1000,
        isoDate: tx.createdAt,
        usdValue: undefined,
        rawTx: order
      }
    })
  } catch (e) {
    datelog(e)
    throw e
  }
}

export async function querySideshift(
  pluginParams: PluginParams
): Promise<PluginResult> {
  const {
    apiKeys: { sideshiftAffiliateId, sideshiftAffiliateSecret },
    settings: { latestTimestamp, offset: initialOffset }
  } = pluginParams

  let lastCheckedTimestamp = 0

  if (typeof latestTimestamp === 'number') {
    lastCheckedTimestamp = latestTimestamp - QUERY_LOOKBACK
  }

  if (!(typeof sideshiftAffiliateSecret === 'string')) {
    return {
      settings: {
        lastCheckedTimestamp: lastCheckedTimestamp
      },
      transactions: []
    }
  }

  const txs: StandardTx[] = []

  let newestTimestamp = 0
  
  let offset = initialOffset ?? 0

  while (true) {
    const newTxs = await fetchTransactions(sideshiftAffiliateId, sideshiftAffiliateSecret, offset, LIMIT)

    const txTakeCount = Math.min(newTxs.length, LIMIT)
    txs.push(...newTxs.slice(0, txTakeCount))

    // maybe ^ this still aadds too many newTxs to txs.
    // Because it's not supposed to .push anything with lastCheckedTimestamp over maxTimestamp??
    // before it would push one by one, and break (with done=true) before adding a next one

    const maxTimestamp = Math.max(...newTxs.map(tx => tx.timestamp))
    
    if (maxTimestamp > newestTimestamp) {
      newestTimestamp = maxTimestamp
    }

    if (lastCheckedTimestamp > maxTimestamp || newTxs.length < LIMIT) {
      break
    }

    offset += LIMIT
  }

  return {
    settings: { lastCheckedTimestamp: newestTimestamp, offset },
    transactions: txs
  }
}

export const sideshift: PartnerPlugin = {
  queryFunc: querySideshift,
  pluginName: 'SideShift.ai',
  pluginId: 'sideshift'
}
