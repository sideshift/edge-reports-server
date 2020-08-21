import { ResponsiveLine } from '@nivo/line'
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
  app: string
  pluginId: string
  start: number
  end: number
}

interface UtcValues {
  y: string
  m: string
  d: string
  h: string
}

const LineGraph: any = (props: {
  analyticsRequest: AnalyticsResult
  timePeriod: string
}) => {
  const tickRate: string[] = []
  let inputData: any
  let tickSpace = 0
  if (props.timePeriod === 'Month') {
    tickSpace = Math.floor(props.analyticsRequest.result.month.length / 5)
    if (tickSpace === 0) tickSpace++
    inputData = props.analyticsRequest.result.month.map((object, index) => {
      const { y, m } = utcVariables(object.start)
      const formattedDate = `${y}-${m}`
      if (index % tickSpace === 0) {
        tickRate.push(formattedDate)
      }
      return {
        x: formattedDate,
        y: object.usdValue
      }
    })
  } else if (props.timePeriod === 'Day') {
    tickSpace = Math.floor(props.analyticsRequest.result.day.length / 5)
    if (tickSpace === 0) tickSpace++
    inputData = props.analyticsRequest.result.day.map((object, index) => {
      const { y, m, d } = utcVariables(object.start)
      const formattedDate = `${y}-${m}-${d}`
      if (index % tickSpace === 0) {
        tickRate.push(formattedDate)
      }
      return {
        x: formattedDate,
        y: object.usdValue
      }
    })
  } else if (props.timePeriod === 'Hour') {
    tickSpace = Math.floor(props.analyticsRequest.result.hour.length / 5)
    if (tickSpace === 0) tickSpace++
    inputData = props.analyticsRequest.result.hour.map((object, index) => {
      const { y, m, d, h } = utcVariables(object.start)
      const formattedDate = `${y}-${m}-${d}:${h}`
      if (index % tickSpace === 0) {
        tickRate.push(formattedDate)
      }
      return {
        x: formattedDate,
        y: object.usdValue
      }
    })
  }

  const data = [
    {
      id:
        props.analyticsRequest.pluginId.charAt(0).toUpperCase() +
        props.analyticsRequest.pluginId.slice(1),
      color: 'hsl(317, 70%, 50%)',
      data: inputData
    }
  ]

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
    <ResponsiveLine
      data={data}
      theme={theme}
      margin={{ top: 70, right: 65, bottom: 100, left: 80 }}
      xScale={{ type: 'point' }}
      yScale={{
        type: 'linear',
        min: 0,
        max: 'auto',
        stacked: true,
        reverse: false
      }}
      enableGridX={false}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        orient: 'bottom',
        tickSize: 5,
        tickValues: tickRate,
        tickPadding: 15,
        tickRotation: 0,
        legend: '',
        legendOffset: 36,
        legendPosition: 'middle'
      }}
      axisLeft={{
        orient: 'left',
        tickSize: 5,
        tickPadding: 15,
        tickRotation: 0,
        legend: '',
        legendOffset: -40,
        legendPosition: 'middle'
      }}
      colors={{ scheme: 'nivo' }}
      pointSize={4}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={4}
      pointBorderColor={{ from: 'serieColor' }}
      pointLabel="y"
      pointLabelYOffset={-12}
      useMesh
      legends={[
        {
          anchor: 'top-left',
          direction: 'column',
          justify: false,
          translateX: -60,
          translateY: -50,
          itemsSpacing: 0,
          itemDirection: 'left-to-right',
          itemWidth: 80,
          itemHeight: 20,
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
    />
  )
}
export default LineGraph

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
