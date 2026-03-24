import React, { useEffect, useState } from 'react'
import { Box, Typography, Grid, Button, TextField, prerelease } from '@mui/material'
import $ from "jquery"
import Outbound from '../InventoryManagement/Outbound'
import { FixAssets } from '../FixAssets/FixAssets'


export default (props) => {
  const { state, setState } = props
  const [scanForm, setScanForm] = useState({ barcode: '' })
  const objTransaction = {
    recount: {
      scan: 'Item'
    },
    inbound: {
      inFromSupplier: 'Purchase Order',
      inFromBranch: 'Transfer Order',
    },
    outbound: {
      outforcustomer: 'Sales Order',
      outforbranch: 'Transfer Order',
      pack: 'Packing Ticket',
      ship: 'Shipping Ticket',
    },
    return: {
      scan: 'Return Authorization'
    },
    fixasset: {
      scan: 'Fix Asset'
    }
  }
  useEffect(() => {
    let buffer = ''
    let lastTime = 0

    const handler = (e) => {
      const now = Date.now()
      if (now - lastTime > 100000)
        buffer = ''
      lastTime = now
      if (e.key === 'Enter') {
        setState(prev => {
          if (prev.page == 'recount' && prev.step == 'scan')
            return { barcode: buffer, test: buffer, ...prev, step: 'recountItemForm' }
          else
            return { barcode: buffer, test: buffer, ...prev }
        })
        buffer = ''
      } else if (e?.key?.length === 1) {
        // setScanForm(prev => ({ ...prev, barcode: prev.barcode + e.key }))
        buffer += e.key
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [scanForm.barcode])

  const forceReadBarcode = async () => {
    const barcode = scanForm.barcode // TODO: will be changed to auto generated barcode from netsuite
    try {
      setState(prev => {
        if (prev.page == 'recount' && prev.step == 'scan')
          return { ...prev, barcode, step: 'recountItemForm' }
        else
          return { ...prev, barcode }
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleChange = (name) => (event) => {
    setScanForm({
      ...scanForm,
      [name]: event.target.value,
    })
  }

  return (<>
    <Grid
      container
      direction="column"
      sx={{
        justifyContent: "center",
        alignItems: "center",
      }}
      spacing={3}
    >
      <Grid size={10}>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "grey.400",
            borderRadius: 2,
            p: 2,
            display: "flex",
            height: '150px',
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="p" align='center'>Please scan the {objTransaction[state.page][state.step] || ''} barcode by holding it near the scanner.</Typography>
        </Box>
      </Grid>
      {/* TODO: Remove this on production or make ENV file have debug mode */}

      {/* <Grid size={12}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>*/
        <>
          <Box>
            <TextField
              label="Barcode"
              value={scanForm.barcode || ''}
              onChange={handleChange("barcode")}
              size="small"
            />
          </Box>
          <Box>
            <Button
              onClick={forceReadBarcode}>
              Force Read Barcode
            </Button>
          </Box>
        </>
          /*
          <Box>
            <Typography>3498754542803 | 60" Tv</Typography>
            <Typography>0590270309656 | laptop</Typography>
          </Box>
          <Box>
            <Button
              onClick={forceReadBarcode}>
              Force Read Barcode
            </Button>
          </Box>
        </Box>
      </Grid> */}
      {/* TODO: Remove this on production or make ENV file have debug mode */}
    </Grid>
  </>
  )
}