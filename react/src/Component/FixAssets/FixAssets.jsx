import Scanner from '../Scanner/Scan'
import React, { useState, useEffect } from 'react'
import { Box, Typography, Grid, Button } from '@mui/material'
import $ from "jquery";
export const FixAssets = () => {
  const [fixAssetState, setFixAssetState] = useState({
    page: 'fixasset',
    items: [],
    barcode: null,
    step: 'scan'
  })
  const processBarcode = async () => {
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'fixAssetLookUp',
        page: fixAssetState.page,
        data: {
          barcode: fixAssetState.barcode
        }
      })
    })
  }
  useEffect(() => {
    if (fixAssetState.barcode) {
      processBarcode()
    }
    console.log('fixAssetState', fixAssetState)
  }, [fixAssetState.barcode])
  return (
    <>
      <Scanner page='FixAssets' state={fixAssetState} setState={setFixAssetState} />
    </>
  )
}


