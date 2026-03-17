import React, { useEffect, useState } from 'react'
import { Box, TextField, Button, Typography, TableBody, TableRow, TableCell, Table, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import Scanner from '../Scanner/Scan'
import $ from "jquery"


export default (props) => {
  const { mainAppState } = props
  const [returnState, setReturnState] = useState({
    page: 'return',
    items: [],
    barcode: null,
    location: 100, // TODO: default must be change to be dynamically set from netsuite user lcoation
    step: 'returnItemFrom',
    returnFrom: ''
  })

  useEffect(() => {
    if (returnState.barcode && returnState.step === 'scan') {
      processBarcode()
    }
    console.log('returnState', returnState)
  }, [returnState.barcode])
  const processBarcode = async () => {
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'returnItemRecieptLookUp',
        page: returnState.page,
        data: {
          barcode: returnState.barcode,
          subsidiary: mainAppState.subsidiary,
          returnFrom: returnState.returnFrom
        }
      })
    }).done((res) => {
      const objItemLookupResult = JSON.parse(res)
      console.log('objResult | objItemLookupResult', objItemLookupResult)

      if (!objItemLookupResult.items.length) {
        alert('Transaction not found.')
        return true
      }
      for (const [key, _] of objItemLookupResult.items.entries()) {
        objItemLookupResult.items[key].uniqueKey = Math.floor(Math.random() * 1000)
        // objItemLookupResult.items[key].location = mainAppState.location
        if (!objItemLookupResult.items[key].location)
          objItemLookupResult.items[key].location = mainAppState.location

      }
      setReturnState(prev => ({
        ...prev,
        barcode: null,
        items: [...prev.items, objItemLookupResult]
      }))
    })
  }



  const handleChange = (options) => (e) => {
    const { field, rowId, itemId } = options
    const value = e.target.value
    setReturnState(prev => ({
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

  const handleConfirmForm = async () => {
    setReturnState(prev => ({
      ...prev,
      step: 'processing',
      items: []
    }))
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'processReturnAuthorization',
        page: returnState.page,
        data: {
          items: returnState.items,
          customer: returnState.customer,
          location: returnState.location
        }
      })
    }).done((res) => {
      setReturnState(prev => ({
        ...prev,
        step: 'complete',
        barcode: null
      }))
      setTimeout(() => {
        setReturnState(prev => ({
          ...prev,
          step: 'scan',
          barcode: null
        }))
      }, 2000)
    })
  }
  const handleReturnFrom = (fromLocation) =>
    setReturnState(prev => ({
      ...prev,
      step: 'scan',
      returnFrom: fromLocation
    }))


  useEffect(() => {
    console.log('returnState items', returnState)
  }, [returnState.barcode])

  if (returnState.step === 'returnItemFrom') {
    return (<>
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
        <Typography style={{ textAlign: 'center' }}>Return items from which location?</Typography>

        <Button
          onClick={() => handleReturnFrom('vendor')}
          variant="outlined"
          sx={{ width: '100%', height: '60px' }}
        >
          Vendor Return
        </Button>
        <Button
          onClick={() => handleReturnFrom('customer')}
          variant="outlined"
          sx={{ width: '100%', height: '60px' }}
        >
          Customer Return
        </Button>
      </Box>
    </>)
  } else if (returnState.step === 'scan') {
    return (<>
      <Scanner state={returnState} setState={setReturnState} />
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
          {returnState.items.length ?
            <>
              <Table>
                <TableBody>
                  {returnState.items.map(row => row.type == "RtnAuth" || row.type == "VendAuth" ? (<>
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
                            <TableRow>
                              <TableCell>Item Name</TableCell>
                              <TableCell>Location</TableCell>
                              <TableCell>Quantity</TableCell>
                              <TableCell>Quantity to Return</TableCell>
                              <TableCell>UOM</TableCell>
                            </TableRow>
                            {row.items.map(item => (
                              <TableRow key={item.id}>
                                <TableCell>{item.itemname}</TableCell>
                                <TableCell>
                                  <Select
                                    value={item.location || mainAppState.location}
                                    onChange={handleChange({
                                      field: 'location',
                                      rowId: row.id,
                                      itemId: item.uniqueKey,
                                    })}
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
                                <TableCell>{item.uomname}</TableCell>
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
                          style={{ width: 60 }}
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
  } else if (returnState.step == 'processing')
    return (<>
      <Box>
        <Typography>Processing . . .</Typography>
      </Box>
    </>)
  else if (returnState.step == 'complete')
    return (<>
      <Box>
        <Typography>Process Complete!</Typography>
      </Box>
    </>)
}