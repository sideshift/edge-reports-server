import { ResponsiveBar } from '@nivo/bar'
import React from 'react'

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

interface UtcValues {
  y: string
  m: string
  d: string
  h: string
}

const BarGraph: any = (props: {
  rawData: AnalyticsResult[]
  timePeriod: string
}) => {
  // Creating Labels for the Legend
  const keys = props.rawData.map(analyticsResult => {
    const split: string[] = analyticsResult.appAndPluginId.split('_')
    return split[1].charAt(0).toUpperCase() + split[1].slice(1)
  })
  // An array of all ticks that will be displayed on the bottom X axis.
  const tickRate: string[] = []
  // The distance between each tick.
  let tickSpace = 0
  let data
  if (props.timePeriod === 'Month') {
    // month
    tickSpace = Math.floor(props.rawData[0].result.month.length / 5)
    if (tickSpace === 0) tickSpace++
    data = props.rawData[0].result.month.map((bucket, index) => {
      const { y, m } = utcVariables(bucket.start)
      const formattedDate = `${y}-${m}`
      if (index % tickSpace === 0) {
        tickRate.push(formattedDate)
      }
      return { date: formattedDate }
    })
    for (let i = 0; i < props.rawData.length; i++) {
      for (let j = 0; j < props.rawData[0].result.month.length; j++) {
        const split: string[] = props.rawData[i].appAndPluginId.split('_')
        const graphName = split[1].charAt(0).toUpperCase() + split[1].slice(1)
        data[j][graphName] = props.rawData[i].result.month[j].usdValue
      }
    }
  } else if (props.timePeriod === 'Day') {
    // day
    tickSpace = Math.floor(props.rawData[0].result.day.length / 5)
    if (tickSpace === 0) tickSpace++
    data = props.rawData[0].result.day.map((bucket, index) => {
      const { y, m, d } = utcVariables(bucket.start)
      const formattedDate = `${y}-${m}-${d}`
      if (index % tickSpace === 0) {
        tickRate.push(formattedDate)
      }
      return { date: formattedDate }
    })
    for (let i = 0; i < props.rawData.length; i++) {
      for (let j = 0; j < props.rawData[0].result.day.length; j++) {
        const split: string[] = props.rawData[i].appAndPluginId.split('_')
        const graphName = split[1].charAt(0).toUpperCase() + split[1].slice(1)
        data[j][graphName] = props.rawData[i].result.day[j].usdValue
      }
    }
  } else if (props.timePeriod === 'Hour') {
    // hour
    tickSpace = Math.floor(props.rawData[0].result.hour.length / 5)
    if (tickSpace === 0) tickSpace++
    data = props.rawData[0].result.hour.map((bucket, index) => {
      const { y, m, d, h } = utcVariables(bucket.start)
      const formattedDate = `${y}-${m}-${d}:${h}`
      if (index % tickSpace === 0) {
        tickRate.push(formattedDate)
      }
      return { date: formattedDate }
    })
    for (let i = 0; i < props.rawData.length; i++) {
      for (let j = 0; j < props.rawData[0].result.hour.length; j++) {
        const split: string[] = props.rawData[i].appAndPluginId.split('_')
        const graphName = split[1].charAt(0).toUpperCase() + split[1].slice(1)
        data[j][graphName] = props.rawData[i].result.hour[j].usdValue
      }
    }
  }

  const theme = {
    axis: {
      ticks: {
        text: {
          fill: '#333333',
          fontSize: 18
        }
      }
    },
    legends: {
      text: {
        fill: '#333333',
        fontSize: 18
      }
    }
  }

  return (
    <>
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy="date"
        theme={theme}
        margin={{ top: 70, right: 80, bottom: 100, left: 80 }}
        padding={0.24}
        colors={{ scheme: 'nivo' }}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickValues: tickRate,
          tickPadding: 15,
          tickRotation: 0,
          legend: '',
          legendPosition: 'middle',
          legendOffset: 36
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 15,
          tickRotation: 0,
          legend: '',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        enableLabel={false}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'top-left',
            direction: 'row',
            justify: false,
            translateX: -60,
            translateY: -50,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.75,
            symbolSize: 20,
            symbolShape: 'square',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        animate
        motionStiffness={90}
        motionDamping={15}
      />
    </>
  )
}
export default BarGraph

const utcVariables = (unixTimestamp: number): UtcValues => {
  const beginningDate = new Date(unixTimestamp * 1000)
  const y = beginningDate.getUTCFullYear().toString()
  const firstM = beginningDate.getUTCMonth()
  const firstD = beginningDate.getUTCDate()
  const firstH = beginningDate.getUTCHours()
  const m = firstM.toString().length === 1 ? `0${firstM}` : firstM.toString()
  const d = firstD.toString().length === 1 ? `0${firstD}` : firstD.toString()
  const h = firstH.toString().length === 1 ? `0${firstH}` : firstH.toString()
  return { y, m, d, h }
}
