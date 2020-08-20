import 'regenerator-runtime/runtime'

import fetch from 'node-fetch'
import React, { Component } from 'react'

import BarGraph from './components/BarGraph'
import LineGraph from './components/LineGraph'

interface Bucket {
  start: number
  usdValue: number
  isoDate: string
  currencyCodes: { [currencyCode: string]: number }
  currencyPairs: { [currencyPair: string]: number }
}

interface AnalyticsResult {
  result: {
    hour: Bucket[]
    day: Bucket[]
    month: Bucket[]
  }
  appAndPluginId: string
  start: number
  end: number
}

class App extends Component<
  {},
  {
    start: number
    end: number
    appId: string
    pluginIds: string[]
    timePeriod: string
    data: AnalyticsResult[]
  }
> {
  constructor(props) {
    super(props)
    // const data = getPluginIds('4fea83a6812f3394d77afc6dc5000f3f')
    this.state = {
      start: 0,
      end: 0,
      appId: 'edge',
      pluginIds: [],
      timePeriod: 'Day',
      data: []
    }
  }

  async componentDidMount(): Promise<void> {
    await this.lastMonth()
    const pluginIds = await this.getPluginIds()
    await this.getData(pluginIds, this.state.start, this.state.end)
  }

  changeMonth(): void {
    this.setState({ timePeriod: 'Month' })
  }

  changeDay(): void {
    this.setState({ timePeriod: 'Day' })
  }

  changeHour(): void {
    this.setState({ timePeriod: 'Hour' })
  }

  async lastDay(): Promise<void> {
    const currentDate = new Date(Date.now())
    const y = currentDate.getUTCFullYear()
    const m = currentDate.getUTCMonth()
    const d = currentDate.getUTCDate()
    const start = Date.UTC(y, m, d - 1) / 1000
    const end = Date.UTC(y, m, d) / 1000 - 1
    await this.getData(this.state.pluginIds, start, end)
    this.setState({ start: start, end: end, timePeriod: 'Hour' })
  }

  async thisDay(): Promise<void> {
    const currentDate = new Date(Date.now())
    const y = currentDate.getUTCFullYear()
    const m = currentDate.getUTCMonth()
    const d = currentDate.getUTCDate()
    const start = Date.UTC(y, m, d) / 1000
    const end = Date.UTC(y, m, d + 1) / 1000 - 1
    await this.getData(this.state.pluginIds, start, end)
    this.setState({ start: start, end: end, timePeriod: 'Hour' })
  }

  async lastWeek(): Promise<void> {
    const currentDate = new Date(Date.now())
    const y = currentDate.getUTCFullYear()
    const m = currentDate.getUTCMonth()
    const d = currentDate.getUTCDate() - currentDate.getUTCDay()
    const start = Date.UTC(y, m, d - 7) / 1000
    const end = Date.UTC(y, m, d) / 1000 - 1
    await this.getData(this.state.pluginIds, start, end)
    this.setState({ start: start, end: end, timePeriod: 'Day' })
  }

  async thisWeek(): Promise<void> {
    const currentDate = new Date(Date.now())
    const y = currentDate.getUTCFullYear()
    const m = currentDate.getUTCMonth()
    const d = currentDate.getUTCDate() - currentDate.getUTCDay()
    const start = Date.UTC(y, m, d) / 1000
    const end = Date.UTC(y, m, d + 7) / 1000 - 1
    await this.getData(this.state.pluginIds, start, end)
    this.setState({ start: start, end: end, timePeriod: 'Day' })
  }

  async lastMonth(): Promise<void> {
    const currentDate = new Date(Date.now())
    const y = currentDate.getUTCFullYear()
    const m = currentDate.getUTCMonth()
    const start = Date.UTC(y, m - 1, 1) / 1000
    const end = Date.UTC(y, m, 1) / 1000 - 1
    await this.getData(this.state.pluginIds, start, end)
    this.setState({ start: start, end: end, timePeriod: 'Day' })
  }

  async thisMonth(): Promise<void> {
    const currentDate = new Date(Date.now())
    const y = currentDate.getUTCFullYear()
    const m = currentDate.getUTCMonth()
    const start = Date.UTC(y, m, 1) / 1000
    const end = Date.UTC(y, m + 1, 1) / 1000 - 1
    await this.getData(this.state.pluginIds, start, end)
    this.setState({ start: start, end: end, timePeriod: 'Day' })
  }

  async lastQuarter(): Promise<void> {
    const currentDate = new Date(Date.now())
    const y = currentDate.getUTCFullYear()
    const m = Math.floor(currentDate.getUTCMonth() / 3) * 3
    const start = Date.UTC(y, m - 3, 1) / 1000
    const end = Date.UTC(y, m, 1) / 1000 - 1
    await this.getData(this.state.pluginIds, start, end)
    this.setState({ start: start, end: end, timePeriod: 'Month' })
  }

  async thisQuarter(): Promise<void> {
    const currentDate = new Date(Date.now())
    const y = currentDate.getUTCFullYear()
    const m = Math.floor(currentDate.getUTCMonth() / 3) * 3
    const start = Date.UTC(y, m, 1) / 1000
    const end = Date.UTC(y, m + 3, 1) / 1000 - 1
    await this.getData(this.state.pluginIds, start, end)
    this.setState({ start: start, end: end, timePeriod: 'Month' })
  }

  async getPluginIds(): Promise<string[]> {
    const partners = [
      'bitsofgold',
      'bity',
      'bitrefill',
      'changelly',
      'changenow',
      'coinswitch',
      'faast',
      'fox',
      'godex',
      'libertyx',
      'moonpay',
      'paytrie',
      'safello',
      'switchain',
      'totle',
      'transak',
      'simplex',
      'wyre'
    ]
    const url = `http://localhost:3000/v1/getPluginIds?appId=${this.state.appId}`
    const response = await fetch(url)
    const json = await response.json()
    const existingPartners = json.filter(pluginId =>
      partners.includes(pluginId)
    )
    this.setState({ pluginIds: existingPartners })
    return existingPartners
  }

  async getData(
    pluginIds: string[],
    start: number,
    end: number
  ): Promise<void> {
    const urls: string[] = []
    for (const pluginId of pluginIds) {
      const url = `http://localhost:3000/v1/analytics/?start=${start}&end=${end}&appId=${this.state.appId}&pluginId=${pluginId}&timePeriod=monthdayhour`
      urls.push(url)
    }
    const promises = urls.map(url => fetch(url).then(y => y.json()))
    const newData = await Promise.all(promises)
    // discard all entries with 0 usdValue on every bucket
    const trimmedData = newData.filter(data => {
      if (
        Math.max.apply(
          Math,
          data.result.month.map(x => x.usdValue)
        ) !== 0
      ) {
        return data
      }
    })
    this.setState({ data: trimmedData })
  }

  render(): JSX.Element {
    console.log(this.state.data)
    const lineGraphs = this.state.data.map((object, key) => {
      return (
        <div key={key}>
          {this.state.timePeriod === 'Month' && (
            <LineGraph analyticsRequest={object} timePeriod="Month" />
          )}
          {this.state.timePeriod === 'Day' && (
            <LineGraph analyticsRequest={object} timePeriod="Day" />
          )}
          {this.state.timePeriod === 'Hour' && (
            <LineGraph analyticsRequest={object} timePeriod="Hour" />
          )}
        </div>
      )
    })
    return (
      <>
        <div>
          <button onClick={() => this.changeMonth()}>Month</button>
          <button onClick={() => this.changeDay()}>Day</button>
          <button onClick={() => this.changeHour()}>Hour</button>
        </div>
        <div>
          <button
            onClick={async () => {
              await this.lastDay()
            }}
          >
            Yesterday
          </button>
          <button
            onClick={async () => {
              await this.thisDay()
            }}
          >
            Today
          </button>
          <button
            onClick={async () => {
              await this.lastWeek()
            }}
          >
            Last Week
          </button>
          <button
            onClick={async () => {
              await this.thisWeek()
            }}
          >
            This Week
          </button>
          <button
            onClick={async () => {
              await this.lastMonth()
            }}
          >
            Last Month
          </button>
          <button
            onClick={async () => {
              await this.thisMonth()
            }}
          >
            This Month
          </button>
          <button
            onClick={async () => {
              await this.lastQuarter()
            }}
          >
            Last Quarter
          </button>
          <button
            onClick={async () => {
              await this.thisQuarter()
            }}
          >
            This Quarter
          </button>
        </div>
        <button
          onClick={async () => {
            await this.getData(
              this.state.pluginIds,
              this.state.start,
              this.state.end
            )
          }}
        >
          Get Data
        </button>
        <div>{this.state.start}</div>
        <div>{this.state.end}</div>
        <div>{this.state.pluginIds}</div>
        <div>{this.state.timePeriod}</div>
        {this.state.data.length > 0 && (
          <div>
            {this.state.timePeriod === 'Month' && (
              <BarGraph rawData={this.state.data} timePeriod="Month" />
            )}
            {this.state.timePeriod === 'Day' && (
              <BarGraph rawData={this.state.data} timePeriod="Day" />
            )}
            {this.state.timePeriod === 'Hour' && (
              <BarGraph rawData={this.state.data} timePeriod="Hour" />
            )}
          </div>
        )}
        <div>{lineGraphs}</div>
      </>
    )
  }
}
export default App
