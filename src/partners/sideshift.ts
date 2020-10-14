import { asArray, asNumber, asObject, asString, asUnknown } from 'cleaners'
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
  invoiceAmount: asNumber,
  settleAddress: asObject({
    address: asString
  }),
  settleAsset: asString,
  settleAmount: asNumber,
  createdAt: asString
})

const asRawSideshiftTx = asObject({
  status: asString
})

const asSideshiftResult = asObject({
  orders: asArray(asUnknown)
})

const PAGE_LIMIT = 500
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

export async function querySideshift({
  settings,
  apiKeys
}: PluginParams): Promise<PluginResult> {
  const { sideshiftAffiliateId, sideshiftAffiliateSecret } = apiKeys
  const time = Date.now()
  let offset = 0
  const ssFormatTxs: StandardTx[] = []
  let signature = ''
  let latestTimeStamp = 0
  if (typeof settings.latestTimeStamp === 'number') {
    latestTimeStamp = settings.latestTimeStamp
  }
  if (typeof sideshiftAffiliateSecret === 'string') {
    signature = affiliateSignature(
      sideshiftAffiliateId,
      sideshiftAffiliateSecret,
      time
    )
  } else {
    return {
      settings: {
        latestTimeStamp: latestTimeStamp
      },
      transactions: []
    }
  }
  let newLatestTimeStamp = latestTimeStamp
  let done = false
  while (!done) {
    const url = `https://sideshift.ai/api/affiliate/completedOrders?limit=${PAGE_LIMIT}&offset=${offset}&affiliateId=${sideshiftAffiliateId}&time=${time}&signature=${signature}`
    let jsonObj: ReturnType<typeof asSideshiftResult>
    let resultJSON
    try {
      const result = await fetch(url, { method: 'GET' })
      resultJSON = await result.json()
      jsonObj = asSideshiftResult(resultJSON)
    } catch (e) {
      datelog(e)
      throw e
    }
    const txs = jsonObj.orders
    for (const rawtx of txs) {
      if (asRawSideshiftTx(rawtx).status === 'complete') {
        const tx = asSideshiftTx(rawtx)
        const date = new Date(tx.createdAt)
        const timestamp = date.getTime() / 1000
        const ssTx: StandardTx = {
          status: 'complete',
          orderId: tx.id,
          depositTxid: undefined,
          depositAddress: tx.depositAddress.address,
          depositCurrency: tx.depositAsset.toUpperCase(),
          depositAmount: tx.invoiceAmount,
          payoutTxid: undefined,
          payoutAddress: tx.settleAddress.address,
          payoutCurrency: tx.settleAsset.toUpperCase(),
          payoutAmount: tx.settleAmount,
          timestamp,
          isoDate: tx.createdAt,
          usdValue: undefined,
          rawTx: rawtx
        }
        ssFormatTxs.push(ssTx)
        if (timestamp > newLatestTimeStamp) {
          newLatestTimeStamp = timestamp
        }
        if (timestamp < latestTimeStamp - QUERY_LOOKBACK) {
          done = true
        }
      }
    }
    if (txs.length < PAGE_LIMIT) {
      break
    }
    offset += PAGE_LIMIT
  }
  const out: PluginResult = {
    settings: { latestTimeStamp: newLatestTimeStamp },
    transactions: ssFormatTxs
  }
  return out
}

export const sideshift: PartnerPlugin = {
  // queryFunc will take PluginSettings as arg and return PluginResult
  queryFunc: querySideshift,
  // results in a PluginResult
  pluginName: 'SideShift.ai',
  pluginId: 'sideshift'
}
