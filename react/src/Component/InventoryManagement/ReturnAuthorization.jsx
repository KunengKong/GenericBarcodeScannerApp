import React, { useEffect, useState } from 'react'

import { Box, TextField, Button, Typography, TableBody, TableRow, TableCell, Stack, Table } from "@mui/material"
import Scanner from '../Scanner/Scan'
import $ from "jquery"


export default () => {
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
          location: returnState.location,
          returnFrom: returnState.returnFrom
        }
      })
    }).done((res) => {
      const objResult = JSON.parse(res)
      console.log('objResult | v', objResult)
      setReturnState(prev => ({
        ...prev,
        barcode: null,
        items: [...prev.items, objResult]
      }))
    })
  }

  const handleChange = (id, value, type) => {
    let qty = Number(value) || 0
    setReturnState(prev => ({
      ...prev,
      items: prev.items.map(row => {
        if (type === 'line') {
          return {
            ...row,
            items: row.items.map(sub => {
              if (sub.id !== id) return sub
              if (qty < 0) qty = 0
              if (qty > sub.max_quantity) qty = sub.max_quantity
              return { ...sub, quantity: qty }
            })
          }
        }
        if (row.id === id) {
          if (qty < 0) qty = 0
          return { ...row, quantity: qty }
        }

        return row
      })
    }))
  }

  const handleConfirmForm = async () => {
    // setReturnState(prev => ({
    //   ...prev,
    //   step: 'processing',
    //   items: []
    // }))
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
      // setReturnState(prev => ({
      //   ...prev,
      //   step: 'complete',
      //   barcode: null
      // }))
      // setTimeout(() => {
      //   setReturnState(prev => ({
      //     ...prev,
      //     step: 'scan',
      //     barcode: null
      //   }))
      // }, 2000)
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
          width: "100%",
          maxWidth: 400,
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
      <Scanner state={setReturnState} />
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
          {returnState.items.length ?
            <>
              <Table>
                <TableBody>
                  {returnState.items.map(row => row.type == "salesOrder" ? (<>
                    <TableRow key={row.id} >
                      <TableCell >
                        <Typography variant="h6" style={{ textAlign: 'top' }}>{row.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={row.quantity}
                          onChange={(e) => handleChange(row.id, e.target.value)}
                          style={{ width: 60 }}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow key={row.id} style={{ backgroundColor: 'rgb(233, 233, 233)', boxShadow: 'inset 0px 5px 5px #cfcfcf' }}>
                      <TableCell style={{ padding: '0px', margin: '0px' }} colSpan={2} >
                        {/* subitems */}
                        <Table style={{ padding: '0px', margin: '0px' }}>
                          <TableBody>
                            {row.items.map(item => (
                              <TableRow key={item.id}>
                                <TableCell>{item.itemname}</TableCell>
                                <TableCell>
                                  <TextField
                                    value={item.quantity}
                                    onChange={(e) => handleChange(item.id, e.target.value, 'line')}
                                    style={{ width: 60 }}
                                    size="small"
                                  /></TableCell>
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
  }

}