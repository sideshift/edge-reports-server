import 'regenerator-runtime/runtime'
import './demo.css'
import 'react-datepicker/dist/react-datepicker.css'

import fetch from 'node-fetch'
import { instanceOf } from 'prop-types'
import React, { Component } from 'react'
import { Cookies, withCookies } from 'react-cookie'

import ApiKeyScreen from './components/ApiKeyScreen'
import BarGraphs from './components/BarGraphs'
import LineGraphs from './components/LineGraphs'
import Sidebar from './components/Sidebar'
import TimePeriods from './components/TimePeriods'

const PRODUCTION = true
let API_PREFIX = 'localhost:8000'
if (PRODUCTION === true) {
  API_PREFIX = ''
}

interface Bucket {
  start: number
  usdValue: number
  numTxs: number
  isoDate: string
  currencyCodes: { [currencyCode: string]: number }
  currencyPairs: { [currencyPair: string]: number }
}

interface AnalyticsResult {
  result: {
    hour: Bucket[]
    day: Bucket[]
    month: Bucket[]
    numAllTxs: number
  }
  app: string
  pluginId: string
  start: number
  end: number
}

class App extends Component<
  {},
  {
    year: number
    month: number
    day: number
    weekStart: number
    start: Date
    end: Date
    apiKey: string
    apiKeyMessage: string
    appId: string
    pluginIds: string[]
    timePeriod: string
    partnerTypes: any
    exchangeType: string
    colorPalette: string[]
    data: AnalyticsResult[]
  }
> {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired
  }

  constructor(props) {
    super(props)
    const { cookies } = props
    const currentDate = new Date(Date.now())
    const year = currentDate.getUTCFullYear()
    const month = currentDate.getUTCMonth()
    const day = currentDate.getUTCDate()
    const weekStart = day - currentDate.getUTCDay()
    this.state = {
      year,
      month,
      day,
      weekStart,
      start: currentDate,
      end: currentDate,
      apiKey: cookies.get('apiKey') || '',
      apiKeyMessage: 'Enter API Key.',
      appId: '',
      pluginIds: [],
      partnerTypes: {
        banxa: 'Fiat',
        bitaccess: 'Fiat',
        bitsofgold: 'Fiat',
        bity: 'Fiat',
        bitrefill: 'Fiat',
        changelly: 'Swap',
        changenow: 'Swap',
        coinswitch: 'Fiat',
        faast: 'Swap',
        fox: 'Swap',
        godex: 'Swap',
        libertyx: 'Fiat',
        moonpay: 'Fiat',
        paytrie: 'Fiat',
        safello: 'Fiat',
        shapeshift: 'Swap',
        switchain: 'Swap',
        totle: 'Swap',
        transak: 'Fiat',
        simplex: 'Fiat',
        wyre: 'Fiat'
      },
      exchangeType: 'All',
      colorPalette: [
        '#004c6d',
        '#06759d',
        '#06a1ce',
        '#00cfff',
        '#dc143c',
        '#ed5e67',
        '#f99093',
        '#ffbec0',
        '#006400',
        '#4d953c',
        '#86c972',
        '#c1ffaa',
        '#ff8c00',
        '#fdb03b',
        '#fccf6a',
        '#ffeb9c',
        '#4b0082',
        '#8d4da9',
        '#c892d2',
        '#ffdaff',
        '#8b4513',
        '#b17f49',
        '#d6b989',
        '#fff3d0'
      ],
      timePeriod: 'day',
      data: []
    }
  }

  async componentDidMount(): Promise<void> {
    if (this.state.apiKey !== '') {
      await this.getAppId()
      await this.getPluginIds()
      await this.getPresetDates(0, 0, 1, 0, false, false, true)
    }
  }

  handleStartChange(start: Date): void {
    this.setState({ start })
  }

  handleEndChange(end: Date): void {
    this.setState({ end })
  }

  handleApiKeyChange = (apiKey: any): void => {
    this.setState({ apiKey: apiKey.target.value })
  }

  changeTimeperiod = (timePeriod: string): void => {
    this.setState({ timePeriod })
  }

  changeExchangetype = (exchangeType: string): void => {
    this.setState({ exchangeType })
  }

  getISOString(date: Date, end: boolean): string {
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const day = date.getUTCDate()
    const isEnd = end === true ? 1 : 0
    const timezonedDate = new Date(Date.UTC(year, month, day) - isEnd)
    return timezonedDate.toISOString()
  }

  getAppId = async (): Promise<void> => {
    const url = `${API_PREFIX}/v1/getAppId?apiKey=${this.state.apiKey}`
    const response = await fetch(url)
    if (response.status === 400) {
      this.setState({ apiKeyMessage: 'Invalid API Key.' })
      return
    }
    const { cookies } = this.props
    cookies.set('apiKey', this.state.apiKey, { path: '/' })
    const appId = await response.json()
    this.setState({ appId })
    await this.getPluginIds()
    await this.getPresetDates(0, 0, 1, 0, false, false, true)
  }

  async getPluginIds(): Promise<void> {
    const partners = [
      'banxa',
      'bitaccess',
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
      'shapeshift',
      'switchain',
      'totle',
      'transak',
      'simplex',
      'wyre'
    ]
    const url = `${API_PREFIX}/v1/getPluginIds?appId=${this.state.appId}`
    const response = await fetch(url)
    const json = await response.json()
    const existingPartners = json.filter(pluginId =>
      partners.includes(pluginId)
    )
    this.setState({ pluginIds: existingPartners })
  }

  async getPresetDates(
    startMonthModifier: number,
    startDayModifier: number,
    endMonthModifier: number,
    endDayModifier: number,
    quarterSearch: boolean,
    weekSearch: boolean,
    dropDay: boolean
  ): Promise<void> {
    let { year, month, day } = this.state
    if (quarterSearch === true) {
      month = Math.floor(month / 3) * 3
    }
    if (weekSearch === true) {
      day = this.state.weekStart
    }
    if (dropDay === true) {
      day = 1
    }
    const offset = this.state.start.getTimezoneOffset()
    const start = new Date(
      Date.UTC(
        year,
        month + startMonthModifier,
        day + startDayModifier,
        0,
        offset
      )
    )
    const end = new Date(
      Date.UTC(
        year,
        month + endMonthModifier,
        day + endDayModifier,
        0,
        offset
      ) + -1
    )
    const startDate = new Date(
      Date.UTC(year, month + startMonthModifier, day + startDayModifier)
    ).toISOString()

    const endDate = new Date(
      Date.UTC(year, month + endMonthModifier, day + endDayModifier) - 1
    ).toISOString()

    this.setState({ start, end })
    await this.getData(startDate, endDate)
  }

  getData = async (start: string, end: string): Promise<void> => {
    const time1 = Date.now()
    const urls: string[] = []
    for (const pluginId of this.state.pluginIds) {
      const url = `${API_PREFIX}/v1/analytics/?start=${start}&end=${end}&appId=${this.state.appId}&pluginId=${pluginId}&timePeriod=monthdayhour`
      urls.push(url)
    }
    const promises = urls.map(url => fetch(url).then(y => y.json()))
    const newData = await Promise.all(promises)
    // discard all entries with 0 usdValue on every bucket
    const trimmedData = newData.filter(data => {
      if (data.result.numAllTxs > 0) {
        return data
      }
    })
    const timeRange = new Date(end).getTime() - new Date(start).getTime()
    let timePeriod
    if (timeRange < 1000 * 60 * 60 * 24 * 3) {
      timePeriod = 'hour'
    } else if (timeRange < 1000 * 60 * 60 * 24 * 75) {
      timePeriod = 'day'
    } else {
      timePeriod = 'month'
    }
    this.setState({ data: trimmedData, timePeriod })
    const time2 = Date.now()
    console.log(`getData time: ${time2 - time1} ms.`)
  }

  logout = (): void => {
    const { cookies } = this.props
    cookies.set('apiKey', '', { path: '/' })
    this.setState({
      apiKey: '',
      apiKeyMessage: 'Enter API Key.',
      appId: '',
      data: []
    })
  }

  render(): JSX.Element {
    return (
      <div className="row">
        <div className="sidebar column">
          <Sidebar
            getData={this.getData}
            changeExchangeType={this.changeExchangetype}
            logout={this.logout}
            appId={this.state.appId}
            exchangeType={this.state.exchangeType}
          />
        </div>
        {this.state.appId === '' ? (
          <ApiKeyScreen
            apiKeyMessage={this.state.apiKeyMessage}
            handleApiKeyChange={e => this.handleApiKeyChange(e)}
            getAppId={this.getAppId}
          />
        ) : (
          <div className="graphs column">
            <TimePeriods
              timePeriod={this.state.timePeriod}
              changeTimePeriod={this.changeTimeperiod}
            />
            {this.state.data.length > 0 ? (
              <BarGraphs
                data={this.state.data}
                exchangeType={this.state.exchangeType}
                timePeriod={this.state.timePeriod}
                partnerTypes={this.state.partnerTypes}
                colorPalette={this.state.colorPalette}
              />
            ) : null}
            <LineGraphs
              data={this.state.data}
              exchangeType={this.state.exchangeType}
              timePeriod={this.state.timePeriod}
              partnerTypes={this.state.partnerTypes}
              colorPalette={this.state.colorPalette}
            />
          </div>
        )}
      </div>
    )
  }
}
export default withCookies(App)
