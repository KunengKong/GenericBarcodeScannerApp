import React, { useState, useEffect } from "react"
import {
  Box,
  TextField,
  Select, MenuItem,
  InputLabel,
  FormControl,
  Button,
  Typography,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Stack,
  Table,
  IconButton
} from "@mui/material"
import $ from "jquery"
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'

export default (props) => {
  const { mainAppState, itemForm, setItemForm, nextForm } = props
  const isPositiveInventory = parseFloat(itemForm.currentItem.quantityonhand) > itemForm.currentItem.oldquantityonhand
  const [availableLots, setAvailableLots] = useState([])
  const [inventoryDetail, setInventoryDetail] = useState(!isPositiveInventory ? [] : [
    { lotnumber: '', expirationDate: '', quantity: '' }
  ])

  useEffect(() => {
    if (!isPositiveInventory)
      $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          data: {
            item: itemForm.currentItem.id,
            location: itemForm.currentItem.location
          },
          action: 'getInventoryDetail',
          page: 'general'
        })
      }).done((res) => {
        const itemData = JSON.parse(res)
        console.log('itemData, ', itemData)
        setAvailableLots(itemData.inventoryDetails)
        setInventoryDetail([]) // start empty, user selects
      })
  }, [])

  useEffect(() => {
    console.log(inventoryDetail)
  }, [inventoryDetail])

  const handleRowChange = (index, field) => (event) => {
    const value = event.target.value
    const updated = [...inventoryDetail]

    if (field === 'quantity') {
      const max = updated[index].max_quantity

      if (Number(value) > max) {
        alert(`Max available is ${max}`)
        return
      }

      if (Number(value) <= 0) {
        updated[index][field] = ''
        setInventoryDetail(updated)
        return
      }
    }

    updated[index][field] = value
    setInventoryDetail(updated)
  }
  const handleNegativeInventoryDetail = (e) => {
    e.preventDefault()

    let total = 0

    for (const row of inventoryDetail) {
      if (!row.quantity) {
        alert('All rows must have quantity')
        return
      }
      total += Number(row.quantity)
    }

    const diff =
      itemForm.currentItem.oldquantityonhand -
      parseFloat(itemForm.currentItem.quantityonhand)

    if (total !== diff) {
      alert(`Total must equal ${diff}`)
      return
    }

    console.log('VALID NEGATIVE INVENTORY:', inventoryDetail)

    setItemForm(prev => ({
      ...prev,
      form: nextForm,
      currentItem: {
        ...prev.currentItem,
        inventoryDetail
      },
    }))
  }
  const handlePositiveInventoryDetail = (e) => {
    e.preventDefault()
    let intInventoryDetailQuantity = 0
    inventoryDetail.map(row => intInventoryDetailQuantity += parseFloat(row.quantity))
    console.log('intInventoryDetailQuantity', intInventoryDetailQuantity)
    if (intInventoryDetailQuantity > parseFloat(itemForm.currentItem.quantityonhand - itemForm.currentItem.oldquantityonhand)) {
      alert('Quantity exceeds the quantity on hand')
      return false
    } else if (intInventoryDetailQuantity < parseFloat(itemForm.currentItem.quantityonhand - itemForm.currentItem.oldquantityonhand)) {
      alert('Quantity is less than the quantity on hand')
      return false
    }
    setItemForm(prev => ({
      ...prev,
      form: nextForm,
      currentItem: {
        ...prev.currentItem,
        inventoryDetail
      },
    }))

  }


  const returnToRecord = () => {
    console.log('return to record')
  }
  const handleAddRow = () => {
    const lastRow = inventoryDetail[inventoryDetail.length - 1]
    const isEmpty =
      !lastRow.lotnumber ||
      !lastRow.expirationDate ||
      !lastRow.quantity

    if (isEmpty) {
      alert('Please fill up the current row first')
      return
    }
    setInventoryDetail(prev => [
      ...prev,
      { lotnumber: '', expirationDate: '', quantity: '' }
    ])
  }
  const handleDeleteRow = (index) => {
    const updated = inventoryDetail.filter((_, i) => i !== index)
    setInventoryDetail(updated)
  }
  const handleSelectLot = (lotNumberId) => {
    const selected = availableLots.find(l => l.id === lotNumberId)

    if (!selected) return

    setInventoryDetail(prev => [
      ...prev,
      {
        id: selected.id,
        lotnumber: selected.lotnumber,
        expirationdate: selected.expirationdate,
        max_quantity: selected.max_quantity,
        quantity: ''
      }
    ])
  }
  //Positive Inventory
  if (isPositiveInventory)
    return (
      <Box
        component="form"
        onSubmit={handlePositiveInventoryDetail}
        margin={'0px 20px'}
      >
        <Typography align="center" variant="h5" >Inventory Details</Typography>
        <Typography align="right" variant="h6">Quantity: {itemForm.currentItem.quantityonhand - itemForm.currentItem.oldquantityonhand}</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Lot Number</TableCell>
              <TableCell align="center">Expiration Date</TableCell>
              <TableCell align="center">Quantity</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventoryDetail.map((row, index) => (
              <TableRow key={index}>
                <TableCell>
                  <TextField
                    label="Lot Number"
                    value={row.lotnumber}
                    onChange={handleRowChange(index, 'lotnumber')}
                    fullWidth
                    size="small"
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    label="Expiration Date"
                    type="date"
                    value={row.expirationDate}
                    onChange={handleRowChange(index, 'expirationDate')}
                    fullWidth
                    format="MM/DD/YYYY"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={row.quantity}
                    onChange={handleRowChange(index, 'quantity')}
                    fullWidth
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {index === inventoryDetail.length - 1 && (
                    <IconButton onClick={handleAddRow}>
                      <AddIcon />
                    </IconButton>
                  )}
                </TableCell>

                <TableCell>
                  <IconButton onClick={() => handleDeleteRow(index)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          sx={{ mt: 2, borderRadius: 2 }}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={() => returnToRecord()}
          sx={{ mt: 2, borderRadius: 2 }}
        >
          Cancel
        </Button>
      </Box >
    )
  //Negative Inventory
  else
    return (
      <Box
        component="form"
        onSubmit={handleNegativeInventoryDetail}
        margin={'0px 20px'}
      >
        < Typography align="center" variant="h5" style={{ paddingBottom: 20 }} >Inventory Details</Typography>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Select Lot</InputLabel>
          <Select
            label="Select Lot"
            value=""
            onChange={(e) => handleSelectLot(e.target.value)}
          >
            {availableLots
              .filter(lot => !inventoryDetail.some(d => d.lotnumber === lot.lotnumber))
              .map((lot, index) => (
                <MenuItem key={index} value={lot.id}>
                  {lot.lotnumber} (Avail: {lot.max_quantity})
                </MenuItem>
              ))}
          </Select>
        </FormControl>
        <Typography align="right" variant="h6">Quantity: {itemForm.currentItem.quantityonhand - itemForm.currentItem.oldquantityonhand}</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Lot Number</TableCell>
              <TableCell align="center">Expiration Date</TableCell>
              <TableCell align="center">Available Quantity</TableCell>
              <TableCell align="center">Quantity</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventoryDetail.map((row, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography align="center">{row.lotnumber}</Typography>
                </TableCell>

                <TableCell>
                  <Typography align="center">{row.expirationdate}</Typography>
                </TableCell>

                <TableCell>
                  <Typography align="center">{row.max_quantity}</Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={row.quantity}
                    onChange={handleRowChange(index, 'quantity')}
                    fullWidth
                    size="small"
                  />
                </TableCell>
                <TableCell>
                </TableCell>

                <TableCell>
                  <IconButton onClick={() => handleDeleteRow(index)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          sx={{ mt: 2, borderRadius: 2 }}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={() => returnToRecord()}
          sx={{ mt: 2, borderRadius: 2 }}
        >
          Cancel
        </Button>
      </Box>)
}