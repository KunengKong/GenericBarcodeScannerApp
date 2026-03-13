import React, { useEffect, useState } from 'react'
import Scanner from '../Scanner/Scan'
import { Box, TextField, Button, Typography, TableBody, TableRow, TableCell, Table, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import $ from "jquery"

export default (props) => {
  const { mainAppState } = props
  const [inboundState, setInboundState] = useState({
    page: 'inbound',
    items: [],
    location: 100, // TODO: default must be change to be dynamically set from netsuite user lcoation
    step: 'menu',
    locationSelect: []
  })

  useEffect(() => {
    console.log('inboundState', inboundState)
    if (inboundState.barcode) {// && (inboundState.step == 'inFromSupplier' || inboundState.step == 'inFromBranch')) {
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
          location: mainAppState.location,
          step: inboundState.step
        }
      })
    }).done(async (res) => {
      console.log('objItemLookupResult | res', res)
      const objItemLookupResult = JSON.parse(res)
      console.log('objItemLookupResult | ', objItemLookupResult)
      if (!objItemLookupResult.items.length) {
        alert('Transaction not found.')
        return true
      }
      for (const [key, _] of objItemLookupResult.items.entries()) {
        objItemLookupResult.items[key].uniqueKey = Math.floor(Math.random() * 1000)
        objItemLookupResult.items[key].location = objItemLookupResult.items[key].location || inboundState.location
      }
      await $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          action: 'uomandlocation',
          page: 'general',
          data: {
            subsidiary: mainAppState.subsidiary,
          }
        })
      }).done((res) => {
        const objUomAndLocationResult = JSON.parse(res)
        console.log('objUomAndLocationResult | ', objUomAndLocationResult)
        setInboundState(prev => ({
          ...prev,
          ...objUomAndLocationResult,
          location: objItemLookupResult.location || prev.location,
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
          step: inboundState.step
        }
      })
    }).done((res) => {
      console.log('res', res)
      const objResponse = JSON.parse(res)
      setInboundState(prev => ({
        ...prev,
        step: 'complete',
      }))
      setTimeout(() => {
        setInboundState(prev => ({
          ...prev,
          step: objResponse.step,
          barcode: null,
          items: []
        }))
      }, 2000)
    })
  }
  const handleChange = (options) => (e) => {
    const { field, rowId, itemId } = options
    const value = e.target.value
    setInboundState(prev => ({
      ...prev,
      items: prev.items.map(row => {
        if (row.id !== rowId) return row
        return {
          ...row,
          items: row.items.map(sub => {
            if (field == 'quantity') {
              let qty = Number(value)
              // if (qty > sub.max_quantity) qty = sub.max_quantity
              if (sub.uniqueKey === itemId)
                return { ...sub, quantity: qty }
              else
                return sub
            } else {
              if (sub.uniqueKey === itemId)
                return { ...sub, [field]: value }
              else
                return sub
            }
          }
          )
        }
      })
    }))
  }
  const handleLocationChange = (e) => {
    const newLocation = Number(e.target.value)

    setInboundState(prev => ({
      ...prev,
      location: newLocation,
      items: prev.items.map(row => ({
        ...row,
        items: row.items.map(item => ({
          ...item,
          location: newLocation
        }))
      }))
    }))
  }

  const handleInboundMenu = (step) => {
    setInboundState(prev => ({
      ...prev,
      step: step
    }))
  }
  if (inboundState.step == 'inFromSupplier' || inboundState.step == 'inFromBranch') {
    return (
      <>
        <Scanner page='Inbound' state={inboundState} setState={setInboundState} />
        <Box
          component="form"
          sx={{
            width: "90%",
            mx: "auto",
            p: 2,
            maxWidth: '96%',
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
                  disabled={inboundState.step == 'inFromBranch'}
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
                    console.log('row', row)
                    return (row.type == "itemReceipt" ? (<>
                      <TableRow key={row.id} >
                        <TableCell >
                          <Typography variant="h6" style={{ textAlign: 'top' }}>{row.name}</Typography>
                        </TableCell>
                        <TableCell>
                        </TableCell>
                      </TableRow>
                      <TableRow style={{ backgroundColor: 'rgb(245, 245, 245)', boxShadow: 'inset 0px 5px 5px #cfcfcf' }}>
                        <TableCell style={{ padding: '0px', margin: '0px' }} colSpan={2} >
                          {/* subitems */}
                          <Table style={{ padding: '0px', margin: '0px' }}>
                            <TableBody>
                              <TableRow>
                                <TableCell>Item Name</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Quantity Ordered</TableCell>
                                <TableCell>Quantity Received</TableCell>
                                <TableCell>Quantity to Recieve</TableCell>
                                <TableCell>UOM</TableCell>
                              </TableRow>
                              {row.items.map(item => {
                                return (
                                  <TableRow key={item.uniqueKey}>
                                    <TableCell>{item.itemname}</TableCell>
                                    <TableCell>
                                      <Select
                                        value={item.location || inboundState.location}
                                        onChange={handleChange({
                                          field: 'location',
                                          rowId: row.id,
                                          itemId: item.uniqueKey,
                                        })}
                                        disabled={inboundState.step == 'inFromBranch'}
                                        label="Location"
                                      >
                                        {
                                          item.itemPerLocation.map((o, key) => {
                                            return <MenuItem value={o.location} key={key}>{o.name || o.name}</MenuItem>
                                          })
                                        }
                                      </Select>
                                    </TableCell>
                                    <TableCell>{item.quantityinitialized}</TableCell>
                                    <TableCell>{item.quantityreceived}</TableCell>
                                    <TableCell>
                                      <TextField
                                        value={item.quantity}
                                        onChange={handleChange({
                                          field: 'quantity',
                                          rowId: row.id,
                                          itemId: item.uniqueKey,
                                        })}
                                        style={{ width: 60 }}
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {item.uomname}
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
                            onChange={handleChange(row.id)}
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
      </>
    )
  } else if (inboundState.step == 'processing') {
    return (<Processing />)
  } else if (inboundState.step == 'complete') {
    return (<ProcessComplete />)
  } else if (inboundState.step == 'menu') {
    return (<>
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
        <Button onClick={() => handleInboundMenu('inFromSupplier')}>In from Supplier</Button>
        <Button onClick={() => handleInboundMenu('inFromBranch')}>In from Branch</Button>
      </Box>
    </>)

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