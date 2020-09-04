import nano from 'nano'
import config from '../../config.json'
import { datelog } from '../util'
import {
  asNumber,
  asArray,
  asEither,
  asString,
  asObject,
  asNull,
  asBoolean
} from 'cleaners'

import banxaJSON from './cache/banRaw.json'
import bityJSON from './cache/bityRaw.json'
import bitsofgoldJSON from './cache/bogRaw.json'
import bitrefillJSON from './cache/brRaw.json'
import changellyJSON from './cache/chRaw.json'
import changenowJSON from './cache/cnRaw.json'
import coinswitchJSON from './cache/csRaw.json'
import faastJSON from './cache/faastRaw.json'
import foxJSON from './cache/foxRaw.json'
import godexJSON from './cache/gxRaw.json'
import libertyxJSON from './cache/libertyxRaw.json'
import moonpayJSON from './cache/mnpRaw.json'
import safelloJSON from './cache/safRaw.json'
import simplexJSON from './cache/simRaw.json'
// import shapeshiftJSON from './cache/ssRaw.json'
import switchainJSON from './cache/switchainRaw.json'
import totleJSON from './cache/tlRaw.json'
import transakJSON from './cache/tnkRaw.json'
import wyreJSON from './cache/wyrRaw.json'

const asTimestamps = asObject({
  timestamp: asNumber
})

const asTimestampResult = asObject({
  docs: asArray(asTimestamps)
})

const asOldTx = asObject({
  status: asString,
  inputTXID: asEither(asString, asNull),
  inputAddress: asEither(asString, asBoolean),
  inputCurrency: asString,
  inputAmount: asEither(asString, asNumber),
  outputAddress: asString,
  outputCurrency: asString,
  outputAmount: asEither(asString, asNumber),
  timestamp: asEither(asString, asNumber)
})

const asPartner = asObject({
  name: asString,
  txs: asArray(asOldTx)
})

const oldTransactions = [
  banxaJSON,
  bityJSON,
  bitsofgoldJSON,
  bitrefillJSON,
  changellyJSON,
  changenowJSON,
  coinswitchJSON,
  faastJSON,
  foxJSON,
  godexJSON,
  libertyxJSON,
  moonpayJSON,
  safelloJSON,
  simplexJSON,
  switchainJSON,
  totleJSON,
  transakJSON,
  wyreJSON
]

const nanoDb = nano(config.couchDbFullpath)

migration().catch(e => {
  datelog(e)
})

async function migration(): Promise<void> {
  const reportsTransactions = nanoDb.use('reports_transactions')
  for (const partnerJSON of oldTransactions) {
    const partner = asPartner(partnerJSON)
    const appAndPluginId = `edge_${partner.name}`
    const query = {
      selector: {
        timestamp: { $gte: 0 }
      },
      fields: ['timestamp'],
      // proper api arcitechture should page forward instead of all in 1 chunk
      limit: 100000000
    }
    const transactionTimestamps = asTimestampResult(
      await reportsTransactions.partitionedFind(appAndPluginId, query)
    )

    const earliestTimestamp = Math.min(
      ...transactionTimestamps.docs.map(object => object.timestamp)
    )
    const earliestDate = new Date(earliestTimestamp * 1000).toISOString()
    const oldTransactions = partner.txs.filter(
      obj => obj.timestamp < earliestTimestamp
    )
    datelog(
      `Importing ${oldTransactions.length} transactions for ${partner.name} before date ${earliestDate}.`
    )
  }
}
