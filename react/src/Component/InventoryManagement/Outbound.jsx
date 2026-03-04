import React, { useEffect, useState } from 'react'
import { Box, TextField, Button, Typography, TableBody, TableRow, TableCell, Stack, Table, FormControl, InputLabel, Select, MenuItem, Divider } from "@mui/material"
import Scanner from '../Scanner/Scan'
import $ from "jquery"


export default () => {
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
    return (<OutForCustomer outboundState={outboundState} setOutboundState={setOutboundState} />)
  else if (outboundState.step === 'outforbranch')
    return (<OutForBranch outboundState={outboundState} setOutboundState={setOutboundState} />)
  else if (outboundState.step === 'pack' || outboundState.step === 'ship')
    return (<Scanner state={setOutboundState} />)
  else if (outboundState.step == 'processing')
    return (<Processing />)
  else if (outboundState.step == 'complete')
    return (<ProcessComplete />)
}

const OutForCustomer = (props) => {
  const { outboundState, setOutboundState } = props
  const handleConfirmForm = async () => {
    setOutboundState(prev => ({
      ...prev,
      step: 'processing',
      items: []
    }))
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'processOutboundForCustomer',
        page: outboundState.page,
        data: {
          items: outboundState.items,
          fromLocation: outboundState.fromLocation,
          barcode: outboundState.barcode
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
    <Scanner state={setOutboundState} />
    <FormLocation
      outboundState={outboundState}
      setOutboundState={setOutboundState} />
    <FormOutbound
      outboundState={outboundState}
      setOutboundState={setOutboundState}
      handleConfirmForm={handleConfirmForm}
    />
  </>)
}

const OutForBranch = (props) => {
  const { outboundState, setOutboundState } = props
  const handleConfirmForm = async () => {
    setOutboundState(prev => ({
      ...prev,
      step: 'processing',
      items: []
    }))
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'processOutboundForBranch',
        page: outboundState.page,
        data: {
          items: outboundState.items,
          fromLocation: outboundState.fromLocation,
          toLocation: outboundState.toLocation,
          barcode: outboundState.barcode
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
    <Scanner state={setOutboundState} />
    <FormLocation
      outboundState={outboundState}
      setOutboundState={setOutboundState} />
    <FormOutbound
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
  const { outboundState, setOutboundState, handleConfirmForm } = props
  const handleChange = (parentId, itemId, value) => {
    setOutboundState(prev => ({
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
            else return sub
          })
        }
      })
    }))
  }
  return (<>
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
                  <TableRow key={row.id} style={{ backgroundColor: 'rgb(233, 233, 233)', boxShadow: 'inset 0px 5px 5px #cfcfcf' }}>
                    <TableCell style={{ padding: '0px', margin: '0px' }} colSpan={2} >
                      {/* subitems */}
                      <Table style={{ padding: '0px', margin: '0px' }}>
                        <TableBody>
                          {row.items.map(item => (
                            <TableRow key={item.itemid}>
                              <TableCell>{item.itemname}</TableCell>
                              <TableCell>
                                <TextField
                                  value={item.quantity}
                                  onChange={(e) => handleChange(row.id, item.itemid, e.target.value)}
                                  style={{ width: 60, backgroundColor: '#fff' }}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
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
    </Box>
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
