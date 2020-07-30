// import { asArray, asObject, asString, asUnknown } from 'cleaners'
import fetch from 'node-fetch'

import { PartnerPlugin, PluginParams, PluginResult, StandardTx } from '../types'

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
  const page = 0
  const request = `https://shapeshift.io/client/transactions?limit=500&sort=DESC&page=${page}`
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  }
  const response = await fetch(request, options)
  const txs = await response.json()
  console.log(txs)
  return {
    settings: {},
    transactions: ssFormatTxs
  }
}

export const shapeshift: PartnerPlugin = {
  // queryFunc will take PluginSettings as arg and return PluginResult
  queryFunc: queryShapeshift,
  // results in a PluginResult
  pluginName: 'Shapeshift',
  pluginId: 'shapeshift'
}
