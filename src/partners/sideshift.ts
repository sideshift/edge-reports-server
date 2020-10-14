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

const LIMIT = 500
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

export async function querySideshift(
  pluginParams: PluginParams
): Promise<PluginResult> {
  const {
    apiKeys: { sideshiftAffiliateId, sideshiftAffiliateSecret },
    settings: {latestTimeStamp}
  } = pluginParams
  const time = Date.now()
  let offset = 0
  const xaiFormatTxs: StandardTx[] = []
  let signature = ''
  let lastCheckedTimeStamp = 0
  if (typeof latestTimeStamp === 'number') {
    lastCheckedTimeStamp = latestTimeStamp - QUERY_LOOKBACK
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
        lastCheckedTimeStamp: lastCheckedTimeStamp
      },
      transactions: []
    }
  }
  let newestTimeStamp = 0
  let done = false
  while (!done) {
    const url = `https://sideshift.ai/api/affiliate/completedOrders?limit=${LIMIT}&offset=${offset}&affiliateId=${sideshiftAffiliateId}&time=${time}&signature=${signature}`
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
        const xaiTx: StandardTx = {
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
        xaiFormatTxs.push(xaiTx)
        if (timestamp > newestTimeStamp) {
          newestTimeStamp = timestamp
        }
        if (lastCheckedTimeStamp > timestamp) {
          done = true
        }
      }
    }
    offset += LIMIT

    if (txs.length < LIMIT) {
      break
    }
  }
  console.log("xaiFormatTxs "  + xaiFormatTxs);
  
  const out: PluginResult = {
    settings: { lastCheckedTimeStamp: newestTimeStamp },
    transactions: xaiFormatTxs
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
