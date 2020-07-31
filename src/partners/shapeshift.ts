import { asArray, asNumber, asObject, asString, asUnknown } from 'cleaners'
import fetch from 'node-fetch'

import { PartnerPlugin, PluginParams, PluginResult, StandardTx } from '../types'

const asShapeshiftTx = asObject({
  inputTXID: asString,
  inputAddress: asString,
  inputCurrency: asString,
  inputAmount: asNumber,
  outputAddress: asString,
  outputCurrency: asString,
  outputAmount: asString,
  timestamp: asNumber
})

const asRawShapeshiftTx = asObject({ status: asString })
const asShapeshiftResult = asArray(asUnknown)
const SS_QUERY_PAGES = 2
let page = 0

export async function queryShapeshift(
  pluginParams: PluginParams
): Promise<PluginResult> {
  const ssFormatTxs: StandardTx[] = []
  let apiKey

  if (typeof pluginParams.apiKeys.apiKey === 'string') {
    apiKey = pluginParams.apiKeys.apiKey
  } else {
    return {
      settings: {},
      transactions: []
    }
  }

  let done = false
  while (!done) {
    try {
      const request = `https://shapeshift.io/client/transactions`
      const options = {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
      const response = await fetch(request, options)
      const result = await response.json()
      console.log(result)
      const txs = asShapeshiftResult(result)
      for (const rawtx of txs) {
        if (asRawShapeshiftTx(rawtx).status === 'complete') {
          const tx = asShapeshiftTx(rawtx)
          const ssTx = {
            status: 'complete',
            inputTXID: tx.inputTXID,
            inputAddress: tx.inputAddress,
            inputCurrency: tx.inputCurrency,
            inputAmount: tx.inputAmount,
            outputAddress: tx.outputAddress,
            outputCurrency: tx.outputCurrency,
            outputAmount: parseFloat(tx.outputAmount),
            timestamp: tx.timestamp,
            isoDate: new Date(tx.timestamp * 1000).toISOString()
          }
          ssFormatTxs.push(ssTx)
        }
      }
      if (txs.length < 500) {
        done = true
      }
    } catch (e) {
      break
    }
    page++
    if (page > SS_QUERY_PAGES) {
      done = true
    }
  }
  const out: PluginResult = {
    settings: {},
    transactions: ssFormatTxs
  }
  return out
}

export const shapeshift: PartnerPlugin = {
  // queryFunc will take PluginSettings as arg and return PluginResult
  queryFunc: queryShapeshift,
  // results in a PluginResult
  pluginName: 'Shapeshift',
  pluginId: 'shapeshift'
}
