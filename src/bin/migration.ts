import nano from 'nano'
import config from '../../config.json'
import { datelog } from '../util'
import { DbTx, StandardTx } from '../types'
import {
  asNumber,
  asArray,
  asEither,
  asString,
  asObject,
  asNull,
  asBoolean
} from 'cleaners'
import js from 'jsonfile'

const banxaJSON = js.readFileSync('./src/bin/cache/banRaw.json')
const bitrefillJSON = js.readFileSync('./src/bin/cache/brRaw.json')
const bitsofgoldJSON = js.readFileSync('./src/bin/cache/bogRaw.json')
const bityJSON = js.readFileSync('./src/bin/cache/bityRaw.json')
const changellyJSON = js.readFileSync('./src/bin/cache/chRaw.json')
const changenowJSON = js.readFileSync('./src/bin/cache/cnRaw.json')
const coinswitchJSON = js.readFileSync('./src/bin/cache/csRaw.json')
const faastJSON = js.readFileSync('./src/bin/cache/faastRaw.json')
const foxJSON = js.readFileSync('./src/bin/cache/foxRaw.json')
const godexJSON = js.readFileSync('./src/bin/cache/gxRaw.json')
const libertyxJSON = js.readFileSync('./src/bin/cache/libertyxRaw.json')
const moonpayJSON = js.readFileSync('./src/bin/cache/mnpRaw.json')
const safelloJSON = js.readFileSync('./src/bin/cache/safRaw.json')
const shapeshiftJSON = js.readFileSync('./src/bin/cache/ssRaw.json')
const simplexJSON = js.readFileSync('./src/bin/cache/simRaw.json')
const switchainJSON = js.readFileSync('./src/bin/cache/switchainRaw.json')
const totleJSON = js.readFileSync('./src/bin/cache/tlRaw.json')
const transakJSON = js.readFileSync('./src/bin/cache/tnkRaw.json')
const wyreJSON = js.readFileSync('./src/bin/cache/wyrRaw.json')

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

const asShapeshiftTx = asObject({
  orderId: asString,
  inputTXID: asString,
  inputAddress: asString,
  inputCurrency: asString,
  inputAmount: asNumber,
  outputTXID: asString,
  outputAddress: asString,
  outputCurrency: asString,
  outputAmount: asString,
  timestamp: asNumber
})

const asPartner = asObject({
  name: asString,
  txs: asArray(asOldTx)
})

const CURRENCY_CONVERSION = {
  USDT20: 'USDT',
  USDTERC20: 'USDT',
  BCHABC: 'BCH',
  BCHSV: 'BSV'
}

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
  shapeshiftJSON,
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
    let partner
    if (partnerJSON.name === 'shapeshift') {
      partner = partnerJSON
    } else {
      partner = asPartner(partnerJSON)
    }
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
    const oldTransactions = partner.txs.filter(obj => {
      if (obj.timestamp < earliestTimestamp && obj.inputTXID !== null) {
        if (partnerJSON.name !== 'shapeshift') {
          return obj
        }
        if (obj.status === 'complete') {
          return obj
        }
      }
    })
    datelog(
      `Importing ${oldTransactions.length} transactions for ${partner.name} before date ${earliestDate}.`
    )
    await insertTransactions(oldTransactions, appAndPluginId)
  }
}

async function insertTransactions(
  oldTxs: Array<ReturnType<typeof asOldTx>>,
  appAndPluginId: string
): Promise<void> {
  const reformattedTxs = oldTxs.map(tx => {
    if (appAndPluginId === `edge_shapeshift`) {
      const cleanedShapeshift = asShapeshiftTx(tx)
      return {
        status: 'complete',
        orderId: cleanedShapeshift.orderId,
        depositTxid: cleanedShapeshift.inputTXID,
        depositAddress: cleanedShapeshift.inputAddress,
        depositCurrency: cleanedShapeshift.inputCurrency,
        depositAmount: cleanedShapeshift.inputAmount,
        payoutTxid: cleanedShapeshift.outputTXID,
        payoutAddress: cleanedShapeshift.outputAddress,
        payoutCurrency: cleanedShapeshift.outputCurrency,
        payoutAmount: parseFloat(cleanedShapeshift.outputAmount),
        timestamp: cleanedShapeshift.timestamp,
        isoDate: new Date(cleanedShapeshift.timestamp * 1000).toISOString(),
        usdValue: undefined,
        rawTx: tx
      }
    }
    const orderId = asString(tx.inputTXID)
    const timestamp =
      typeof tx.timestamp === 'number' ? tx.timestamp : parseInt(tx.timestamp)
    const isoDate = new Date(timestamp * 1000).toISOString()
    const depositAddress =
      typeof tx.inputAddress === 'string' && tx.inputAddress.length > 0
        ? tx.inputAddress
        : undefined
    const payoutAddress =
      tx.outputAddress.length > 0 ? tx.outputAddress : undefined
    const depositAmount =
      typeof tx.inputAmount === 'number'
        ? tx.inputAmount
        : parseFloat(tx.inputAmount)
    const payoutAmount =
      typeof tx.outputAmount === 'number'
        ? tx.outputAmount
        : parseFloat(tx.outputAmount)
    return {
      orderId,
      depositTxid: undefined,
      depositAddress,
      depositCurrency: tx.inputCurrency,
      depositAmount,
      payoutTxid: undefined,
      payoutAddress,
      payoutCurrency: tx.outputCurrency,
      payoutAmount,
      status: 'complete',
      isoDate,
      timestamp,
      usdValue: undefined,
      rawTx: undefined
    }
  })
  const dbTransactions: nano.DocumentScope<DbTx> = nanoDb.db.use(
    'reports_transactions'
  )
  const transactionsArray: StandardTx[] = []
  for (const transaction of reformattedTxs) {
    // TODO: Add batching for more than 500 transactions
    transaction.orderId = transaction.orderId.toLowerCase()
    const key = `${appAndPluginId}:${transaction.orderId}`.toLowerCase()
    const result = await dbTransactions.get(key).catch(e => {
      if (e != null && e.error === 'not_found') {
        return {}
      } else {
        throw e
      }
    })
    // no duplicate transactions
    if (Object.keys(result).length > 0) {
      continue
    }
    const newObj = { _rev: undefined, ...result, ...transaction, _id: key }

    // replace all fields with non-standard names
    newObj.depositCurrency = standardizeNames(newObj.depositCurrency)
    newObj.payoutCurrency = standardizeNames(newObj.payoutCurrency)

    datelog(`id: ${newObj._id}. revision: ${newObj._rev}`)
    transactionsArray.push(newObj)
  }
  try {
    const docs = await dbTransactions.bulk({ docs: transactionsArray })
    let numErrors = 0
    for (const doc of docs) {
      if (doc.error != null) {
        datelog(
          `There was an error in the batch ${doc.error}.  id: ${doc.id}. revision: ${doc.rev}`
        )
        numErrors++
      }
    }
    datelog(`total errors: ${numErrors}`)
  } catch (e) {
    datelog('Error doing bulk transaction insert', e)
    throw e
  }
}

const standardizeNames = (field: string): string => {
  if (CURRENCY_CONVERSION[field] !== undefined) {
    return CURRENCY_CONVERSION[field]
  }
  return field
}
