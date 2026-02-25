import React, { useEffect, useState } from 'react'
import { Box, TextField, Button, Typography, TableBody, TableRow, TableCell, Stack, Table } from "@mui/material"
import Scanner from '../Scanner/Scan'
import $ from "jquery"


export default () => {
  const objSampleData = [{
    "id": 31118,
    "name": "Item Receipt #IR422",
    "items": [
      {
        "id": 31118,
        "transaction_name": "Item Receipt #IR422",
        "barcode": "3803886779575",
        "itemid": 323,
        "itemname": '60" 4K Ultra HDTV',
        "quantity": 14
      },
      {
        "id": 31118,
        "transaction_name": "Item Receipt #IR422",
        "barcode": "3803886779575",
        "itemid": 325,
        "itemname": "3X HD Video Conferencing Camera",
        "quantity": 19
      }
    ],
    "type": "itemReceipt"
  }, {
    "item": {
      "id": 323,
      "itemid": '60" 4K Ultra HDTV',
      "barcode": "3498754542803"
    },
    "quantity": 17,
    "type": "item"
  }]
  const [outboundState, setOutboundState] = useState({
    page: 'outbound',
    items: process.env.REACT_APP_DEBUG_MODE === 'true' ? objSampleData : [],
    barcode: null,
    location: 100, // TODO: default must be change to be dynamically set from netsuite user lcoation
    step: 'scan',
    customer: 280
  })

  useEffect(() => {
    if (outboundState.barcode && outboundState.step === 'scan') {
      processBarcode()
    }
    console.log('outboundState', outboundState)
  }, [outboundState.barcode])
  const processBarcode = async () => {
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'outboundItemRecieptLookUp',
        page: outboundState.page,
        data: {
          barcode: outboundState.barcode,
          location: outboundState.location
        }
      })
    }).done((res) => {
      const objResult = JSON.parse(res)
      setOutboundState(prev => ({
        ...prev,
        barcode: null,
        items: [...prev.items, objResult]
      }))
    })
  }
  const handleConfirmForm = async () => {
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'processOutbound',
        page: outboundState.page,
        data: {
          items: outboundState.items,
          customer: outboundState.customer,
          location: outboundState.location
        }
      })
    }).done((res) => {
    })
  }
  const handleChange = (id, value) => {
    setOutboundState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id
          ? { ...item, quantity: Number(value) }
          : item
      )
    }))
  }
  if (outboundState.step === 'scan') {
    return (<>
      <Scanner state={setOutboundState} />
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
                                <TableCell>{item.quantity * row.quantity}</TableCell>
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