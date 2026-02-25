import React, { useEffect, useState } from 'react'
import Scanner from '../Scanner/Scan'
import { Box, Typography } from '@mui/material'
import $ from "jquery"

export default () => {
  const [inboundState, setInboundState] = useState({
    page: 'inbound',
    item: [],
    barcode: null,
    location: 100, // TODO: default must be change to be dynamically set from netsuite user lcoation
    step: 'scan'
  })

  useEffect(() => {
    console.log('inboundState', inboundState)
    if (inboundState.barcode && inboundState.step === 'scan') {
      processBarcode(inboundState.barcode)
    }
  }, [inboundState.barcode])

  const processBarcode = async (barcode) => {
    setInboundState(prev => ({
      ...prev,
      step: 'processing'
    }))
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'confirmInbound',
        page: inboundState.page,
        data: {
          barcode: inboundState.barcode,
          location: inboundState.location
        }
      })
    }).done(() => {
      setInboundState(prev => ({
        ...prev,
        step: 'complete',
        barcode: null
      }))
      setTimeout(() => {
        setInboundState(prev => ({
          ...prev,
          step: 'scan',
          barcode: null
        }))
      }, 2000)
    })
  }

  if (inboundState.barcode == null && inboundState.step == 'scan') {
    return (<Scanner page='Inbound' state={setInboundState} />)
  } else if (inboundState.step == 'processing') {
    return (<Processing />)
  } else if (inboundState.step == 'complete') {
    return (<ProcessComplete />)
  }
}

const Processing = () => {
  return (<>
    <Box>
      <Typography>Processing . . .</Typography>
    </Box>
  </>)
}
const ProcessComplete = () => {
  return (<>
    <Box>
      <Typography>Process Complete!</Typography>
    </Box>
  </>)
}