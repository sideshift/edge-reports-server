import bodyParser from 'body-parser'
import { asArray, asNumber, asObject, asString } from 'cleaners'
import cors from 'cors'
import express from 'express'
import nano from 'nano'

import config from '../config.json'
import { getAnalytics } from './apiAnalytics'
import { asDbTx } from './types'

const asAnalyticsReq = asObject({
  start: asString,
  end: asString,
  pluginId: asString,
  timePeriod: asString
})

const asCheckTxReq = asObject({
  pluginId: asString,
  orderId: asString
})

const asDbReq = asObject({
  docs: asArray(
    asObject({
      inputTXID: asString,
      inputCurrency: asString,
      outputCurrency: asString,
      timestamp: asNumber,
      usdValue: asNumber
    })
  )
})

const nanoDb = nano(config.couchDbFullpath)

async function main(): Promise<void> {
  // start express and couch db server
  const app = express()
  const dbTransactions = nanoDb.use('db_transactions')

  app.use(bodyParser.json({ limit: '1mb' }))
  app.use(cors())

  app.get(`/v1/analytics/`, async function(req, res) {
    let start: string, end: string, pluginId: string, timePeriod: string
    try {
      const analyticsQuery = asAnalyticsReq(req.query)
      start = analyticsQuery.start
      end = analyticsQuery.end
      pluginId = analyticsQuery.pluginId
      timePeriod = analyticsQuery.timePeriod
    } catch {
      res.status(400).send(`Missing Request Fields`)
      return
    }

    timePeriod = timePeriod.toLowerCase()
    const queryStart = parseInt(start)
    const queryEnd = parseInt(end)
    if (
      !(queryStart > 0) ||
      !(queryEnd > 0) ||
      (!timePeriod.includes('month') &&
        !timePeriod.includes('day') &&
        !timePeriod.includes('hour'))
    ) {
      res.status(400).send(`Bad Request Fields`)
      return
    }
    if (queryStart > queryEnd) {
      res.status(400).send(`Start must be less than End`)
      return
    }
    const query = {
      selector: {
        usdValue: { $gte: 0 },
        timestamp: { $gte: queryStart, $lt: queryEnd }
      },
      fields: [
        'inputTXID',
        'inputCurrency',
        'outputCurrency',
        'timestamp',
        'usdValue'
      ],
      // proper api arcitechture should page forward instead of all in 1 chunk
      limit: 1000000
    }
    const result = asDbReq(
      await dbTransactions.partitionedFind(pluginId, query)
    )
    // TODO: put the sort within the query, need to add default indexs in the database.
    const sortedTxs = result.docs.sort(function(a, b) {
      return a.timestamp - b.timestamp
    })
    const answer = getAnalytics(
      sortedTxs,
      queryStart,
      queryEnd,
      pluginId,
      timePeriod
    )
    res.json(answer)
  })

  app.get('/v1/checkTx/', async function(req, res) {
    console.log('req.query', req.query)
    let queryResult
    try {
      queryResult = asCheckTxReq(req.query)
    } catch (e) {
      res.status(400).send(`Missing Request fields.`)
      return
    }
    let result
    try {
      const query = `${queryResult.pluginId}:${queryResult.orderId}`
      const dbResult = await dbTransactions.get(query.toLowerCase())
      result = asDbTx(dbResult)
    } catch (e) {
      console.log(e)
    }
    const out = {
      pluginId: queryResult.pluginId,
      orderId: queryResult.orderId,
      usdValue: undefined
    }
    if (result != null && result.usdValue != null) {
      out.usdValue = result.usdValue
    }
    res.json(out)
  })

  const result = await dbTransactions.get('bitsofgold:02de0a67ed')
  console.log('result', result)

  app.listen(3000, function() {
    console.log('Server started on Port 3000')
  })
}
main().catch(e => console.log(e))