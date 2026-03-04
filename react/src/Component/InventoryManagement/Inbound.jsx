import React, { useEffect, useState } from 'react'
import Scanner from '../Scanner/Scan'
import { Box, TextField, Button, Typography, TableBody, TableRow, TableCell, Table, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import $ from "jquery"

export default () => {
  const [inboundState, setInboundState] = useState({
    page: 'inbound',
    items: [],
    barcode: null,
    location: 100, // TODO: default must be change to be dynamically set from netsuite user lcoation
    step: 'scan',
    locationSelect: []
  })

  useEffect(() => {
    console.log('inboundState', inboundState)
    if (inboundState.barcode && inboundState.step === 'scan') {
      processBarcode(inboundState.barcode)
    }
  }, [inboundState.barcode])
  const processBarcode = async () => {
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'inboundItemRecieptLookUp',
        page: inboundState.page,
        data: {
          barcode: inboundState.barcode,
          location: inboundState.location
        }
      })
    }).done(async (res) => {
      const objItemLookupResult = JSON.parse(res)
      console.log('objItemLookupResult | ', objItemLookupResult)
      await $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          action: 'uomandlocation',
          page: 'general'
        })
      }).done((res) => {
        const objUomAndLocationResult = JSON.parse(res)
        console.log('objUomAndLocationResult | ', objUomAndLocationResult)
        setInboundState(prev => ({
          ...prev,
          locationSelect: [...objUomAndLocationResult.locationSelect],
          items: [...prev.items, objItemLookupResult]
        }))
      })
    })
  }

  const handleConfirmForm = async (barcode) => {
    setInboundState(prev => ({
      ...prev,
      step: 'processing'
    }))
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'confirmInbound',
        page: inboundState.page,
        data: {
          items: inboundState.items,
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
          barcode: null,
          items: []
        }))
      }, 2000)
    })
  }
  const handleChange = (parentId, itemId, value) => {
    setInboundState(prev => ({
      ...prev,
      items: prev.items.map(row => {
        if (row.id !== parentId) return row
        return {
          ...row,
          items: row.items.map(sub => {
            let qty = Number(value)
            if (qty > sub.max_quantity) qty = sub.max_quantity
            if (sub.itemid === itemId)
              return { ...sub, quantity: qty }
            else
              return sub
          }
          )
        }
      })
    }))
  }
  const handleLocationChange = (e) => {
    setInboundState(prev => ({
      ...prev,
      location: e.target.value
    }))
  }
  if (inboundState.step == 'scan') {
    return (
      <>
        {inboundState.items.length == 0 && <Scanner page='Inbound' state={setInboundState} />}
        <Box>
          <Box
            component="form"
            sx={{
              width: "100%",
              maxWidth: 400,
              mx: "auto",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {inboundState.items.length ?
              <>

                {!!inboundState.locationSelect.length && <FormControl fullWidth size="small" >
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={inboundState.location || ''}
                    onChange={handleLocationChange}
                    label="Location"
                  >
                    {
                      inboundState.locationSelect.map((o, key) => {
                        return <MenuItem value={o.id} key={key}>{o.name}</MenuItem>
                      })
                    }
                  </Select>
                </FormControl>}
                <Table>
                  <TableBody>
                    {inboundState.items.map(row => {
                      return (row.type == "itemReceipt" ? (<>
                        <TableRow key={row.id} >
                          <TableCell >
                            <Typography variant="h6" style={{ textAlign: 'top' }}>{row.name}</Typography>
                          </TableCell>
                          <TableCell>
                          </TableCell>
                        </TableRow>
                        <TableRow key={row.id} style={{ backgroundColor: 'rgb(245, 245, 245)', boxShadow: 'inset 0px 5px 5px #cfcfcf' }}>
                          <TableCell style={{ padding: '0px', margin: '0px' }} colSpan={2} >
                            {/* subitems */}
                            <Table style={{ padding: '0px', margin: '0px' }}>
                              <TableBody>
                                {row.items.map(item => {
                                  return (
                                    <TableRow key={item.itemid}>
                                      <TableCell>{item.itemname}</TableCell>
                                      <TableCell>
                                        <TextField
                                          value={item.quantity}
                                          onChange={(e) => handleChange(row.id, item.itemid, e.target.value)}
                                          style={{ width: 60 }}
                                          size="small"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                            {/* subitems */}
                          </TableCell >
                        </TableRow>
                      </>) : (
                        <TableRow key={row.id} >
                          <TableCell >
                            <Typography style={{ textAlign: 'top' }}>{row.item.itemid}</Typography>
                          </TableCell>
                          <TableCell >
                            <TextField
                              value={row.quantity}
                              onChange={(e) => handleChange(row.id, e.target.value)}
                              style={{ width: 60, backgroundColor: '#fff' }}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>)
                      )
                    })}
                  </TableBody>
                </Table>

                <Typography>Do you confirm these items?</Typography>

                <Button
                  onClick={() => handleConfirmForm(true)}
                  variant="outlined"
                  sx={{ width: '100%', height: '60px' }}
                >
                  Yes
                </Button>
                <Button
                  onClick={() => handleConfirmForm(false)}
                  variant="outlined"
                  sx={{ width: '100%', height: '60px' }}
                >
                  No
                </Button>
              </> : ''}
          </Box>
        </Box>
      </>
    )
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