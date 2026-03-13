import React, { useEffect, useState } from 'react'
import { Box, TextField, Button, Typography, TableBody, TableRow, TableCell, Stack, Table, FormControl, InputLabel, Select, MenuItem, Divider } from "@mui/material"
import Scanner from '../Scanner/Scan'
import $ from "jquery"


export default (props) => {
  const { mainAppState } = props
  const [outboundState, setOutboundState] = useState({
    page: 'outbound',
    items: process.env.REACT_APP_DEBUG_MODE === 'true' ? [] : [], //objSampleData
    barcode: null,
    fromLocation: 100, // TODO: default must be change to be dynamically set from netsuite user lcoation
    toLocation: null,
    step: 'menu',
    customer: 280
  })
  useEffect(() => {
    if (outboundState.barcode) {
      processBarcode()
    }
    console.log('outboundState', outboundState)
  }, [outboundState.barcode])
  const processBarcode = async () => {
    if (outboundState.step == 'outforcustomer' || outboundState.step == 'outforbranch') {
      await $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          action: 'outboundItemRecieptLookUp',
          page: outboundState.page,
          data: {
            barcode: outboundState.barcode,
            fromLocation: outboundState.fromLocation,
            step: outboundState.step
          }
        })
      }).done(async (res) => {
        const objItemLookupResult = JSON.parse(res)
        console.log('objItemLookupResult | ', objItemLookupResult)
        if (!objItemLookupResult.items.length) {
          alert('Transaction not found.')
          return true
        }
        for (const [key, _] of objItemLookupResult.items.entries()) {
          objItemLookupResult.items[key].uniqueKey = Math.floor(Math.random() * 1000)
          if (!objItemLookupResult.items[key].toLocation)
            objItemLookupResult.items[key].location = mainAppState.location
        }
        setOutboundState(prev => ({
          ...prev,
          fromLocation: objItemLookupResult.fromLocation || '',
          toLocation: objItemLookupResult.toLocation || '',
          items: [...prev.items, objItemLookupResult]
        }))
      })
    } else if (outboundState.step == 'pack' || outboundState.step == 'ship') {
      setOutboundState(prev => ({
        ...prev,
        step: 'processing',
        items: []
      }))
      await $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          action: 'outboundProcessIF',
          page: outboundState.page,
          data: {
            barcode: outboundState.barcode,
            step: outboundState.step
          }
        })
      }).done(async (res) => {
        const objItemLookupResult = JSON.parse(res)
        console.log('objItemLookupResult | ', objItemLookupResult)
        setOutboundState(prev => ({
          ...prev,
          step: 'complete',
          barcode: null
        }))
        setTimeout(() => {
          setOutboundState(prev => ({
            ...prev,
            step: objItemLookupResult.step,
            barcode: null
          }))
        }, 2000)
      })
    }

  }
  useEffect(() => {
    $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'uomandlocation',
        page: 'general'
      })
    }).done((res) => {
      const objUomAndLocationResult = JSON.parse(res)
      console.log('objUomAndLocationResult | ', objUomAndLocationResult)
      setOutboundState(prev => ({
        ...prev,
        locationSelect: [...objUomAndLocationResult.locationSelect]
      }))
    })
  }, [])
  const handleOutboundMenu = (step) => {
    setOutboundState(prev => ({
      ...prev,
      step: step
    }))
  }
  if (outboundState.step === 'menu')
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
        <Button onClick={() => handleOutboundMenu('outforcustomer')}>Out for Customer</Button>
        <Button onClick={() => handleOutboundMenu('outforbranch')}>Out for branch</Button>
        <Divider />
        <Button onClick={() => handleOutboundMenu('pack')}>Mark Pack</Button>
        <Button onClick={() => handleOutboundMenu('ship')}>Mark Ship</Button>
      </Box>
    </>)
  else if (outboundState.step === 'outforcustomer')
    return (<OutForCustomer
      outboundState={outboundState}
      setOutboundState={setOutboundState}
      mainAppState={mainAppState} />)
  else if (outboundState.step === 'outforbranch')
    return (<OutForBranch
      outboundState={outboundState}
      setOutboundState={setOutboundState}
      mainAppState={mainAppState} />)
  else if (outboundState.step === 'pack' || outboundState.step === 'ship')
    return (<Scanner state={outboundState} setState={setOutboundState} />)
  else if (outboundState.step == 'processing')
    return (<Processing />)
  else if (outboundState.step == 'complete')
    return (<ProcessComplete />)
}

const OutForCustomer = (props) => {
  const { outboundState, setOutboundState, mainAppState } = props
  const handleConfirmForm = async () => {
    setOutboundState(prev => ({
      ...prev,
      step: 'processing',
      items: []
    }))
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'processOutbound',
        page: outboundState.page,
        data: {
          items: outboundState.items,
          fromLocation: outboundState.fromLocation,
          barcode: outboundState.barcode,
          type: 'customer'
        }
      })
    }).done((res) => {
      setOutboundState(prev => ({
        ...prev,
        step: 'complete',
        barcode: null
      }))
      setTimeout(() => {
        setOutboundState(prev => ({
          ...prev,
          step: 'outforcustomer',
          barcode: null
        }))
      }, 2000)
    })
  }
  return (<>
    <Scanner state={outboundState} setState={setOutboundState} />
    <FormLocation
      outboundState={outboundState}
      setOutboundState={setOutboundState} />
    <FormOutbound
      mainAppState={mainAppState}
      outboundState={outboundState}
      setOutboundState={setOutboundState}
      handleConfirmForm={handleConfirmForm}
    />
  </>)
}

const OutForBranch = (props) => {
  const { outboundState, setOutboundState, mainAppState } = props
  const handleConfirmForm = async () => {
    setOutboundState(prev => ({
      ...prev,
      step: 'processing',
      items: []
    }))
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'processOutbound',
        page: outboundState.page,
        data: {
          items: outboundState.items,
          fromLocation: outboundState.fromLocation,
          toLocation: outboundState.toLocation,
          barcode: outboundState.barcode,
          type: 'branch'
        }
      })
    }).done((res) => {
      setOutboundState(prev => ({
        ...prev,
        step: 'complete',
        barcode: null
      }))
      setTimeout(() => {
        setOutboundState(prev => ({
          ...prev,
          step: 'outforbranch',
          barcode: null
        }))
      }, 2000)
    })
  }
  return (<>
    <Scanner state={outboundState} setState={setOutboundState} />
    <FormLocation
      outboundState={outboundState}
      setOutboundState={setOutboundState} />
    <FormOutbound
      mainAppState={mainAppState}
      outboundState={outboundState}
      setOutboundState={setOutboundState}
      handleConfirmForm={handleConfirmForm}
    />
  </>)
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

const FormOutbound = (props) => {
  const { mainAppState, outboundState, setOutboundState, handleConfirmForm } = props
  const handleChange = (options) => (e) => {
    const { field, rowId, itemId } = options
    const value = e.target.value
    setOutboundState(prev => ({
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
  return (<>
    <Box>
      <Box
        component="form"
        sx={{
          width: "90%",
          mx: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >

        {outboundState.items.length ?
          <>
            <Table>
              <TableBody>
                {outboundState.items.map(row => row.type == "itemReceipt" ? (<>
                  <TableRow key={row.id} >
                    <TableCell >
                      <Typography variant="h6" style={{ textAlign: 'top' }}>{row.name}</Typography>
                    </TableCell>
                    <TableCell>
                    </TableCell>
                  </TableRow>
                  <TableRow style={{ backgroundColor: 'rgb(233, 233, 233)', boxShadow: 'inset 0px 5px 5px #cfcfcf' }}>
                    <TableCell style={{ padding: '0px', margin: '0px' }} colSpan={2} >
                      {/* subitems */}
                      <Table style={{ padding: '0px', margin: '0px' }}>
                        <TableBody>
                          <TableRow>
                            <TableCell>Item Name</TableCell>
                            {!row.toLocation && <TableCell>Location</TableCell>}
                            <TableCell>Qty Ordered</TableCell>
                            {/* <TableCell>Qty Picked</TableCell> */}
                            {/* <TableCell>Qty Packed</TableCell> */}
                            {/* <TableCell>Qty Shipped</TableCell> */}
                            <TableCell>Qty to Fulfill</TableCell>
                            <TableCell>UOM</TableCell>
                          </TableRow>
                          {row.items.map(item => (
                            <TableRow key={item.itemid}>
                              <TableCell>{item.itemname}</TableCell>
                              {
                                !row.toLocation && <TableCell>
                                  <Select
                                    value={item.location}
                                    onChange={handleChange({
                                      field: 'location',
                                      rowId: row.id,
                                      itemId: item.uniqueKey,
                                    })}
                                    label="Loc1ation"
                                  >
                                    {
                                      item.itemPerLocation.map((o, key) => {
                                        return <MenuItem value={o.location} key={key}>{o.name || o.name}</MenuItem>
                                      })
                                    }
                                  </Select>
                                </TableCell>
                              }
                              <TableCell>{item.quantityinitialized || 0}</TableCell>
                              {/* <TableCell>{item.quantitypicked || 0}</TableCell> */}
                              {/* <TableCell>{item.quantitypacked || 0}</TableCell> */}
                              {/* <TableCell>{item.quantityshiprecv || 0}</TableCell> */}

                              <TableCell>
                                <TextField
                                  value={item.quantity}
                                  onChange={handleChange({
                                    field: 'quantity',
                                    rowId: row.id,
                                    itemId: item.uniqueKey,
                                  })}
                                  style={{ width: 60, backgroundColor: '#fff' }}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{item.uomname}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {/* subitems */}
                    </TableCell >
                  </TableRow >
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
                )}
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
    </Box >
  </>)
}

const FormLocation = (props) => {
  const { outboundState, setOutboundState } = props
  const handleLocationChange = (field) => (e) => {
    setOutboundState(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }
  return (

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
      <FormControl fullWidth size="small">
        <InputLabel>From Location</InputLabel>
        <Select
          value={outboundState.fromLocation || ''}
          onChange={handleLocationChange('fromLocation')}
          label="From Location"
          disabled
        >
          {outboundState.locationSelect?.map((o) => (
            <MenuItem value={o.id} key={o.id}>
              {o.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {outboundState.step == 'outforbranch' &&
        <FormControl fullWidth size="small">
          <InputLabel>To Location</InputLabel>
          <Select
            value={outboundState.toLocation || ''}
            onChange={handleLocationChange('toLocation')}
            label="To Location"
            disabled
          >
            {outboundState.locationSelect?.map((o) => (
              <MenuItem value={o.id} key={o.id}>
                {o.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>}
    </Box>
  )

}
