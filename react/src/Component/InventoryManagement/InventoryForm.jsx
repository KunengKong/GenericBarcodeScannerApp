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
  TableRow,
  TableCell,
  Stack,
  Table
} from "@mui/material"
import $ from "jquery"

export default (props) => {
  const { mainAppState, recountState, setRecountState } = props
  const [form, setForm] = useState(
    {
      form: 'recountform', //recountform, discrepancyprompt, discrepancyform
      action: 'recount',
      uomSelect: [],
      locationSelect: [],
      currentItem: {}
    }
  )

  useEffect(() => {
    if (!recountState.barcode) return
    const loadData = async () => {
      const objItemSearch = await $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          data: {
            barcode: recountState.barcode,
            location: recountState.location,
            subsidiary: mainAppState.subsidiary
          },
          action: 'search',
          page: recountState.page
        })
      })

      const itemData = JSON.parse(objItemSearch)

      const res1 = await $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          action: 'uomandlocation',
          page: 'general',
          data: {
            subsidiary: mainAppState.subsidiary,
            parentUom: itemData.data.item.uom_parent
          }
        })
      })
      const generalData = JSON.parse(res1)
      console.log('itemData, ', itemData)
      setForm(prev => ({
        ...prev,
        currentItem: { ...itemData.data.item },
        ...generalData,
      }))
      setRecountState(prev => ({
        ...prev,
        ...generalData
      }))
    }
    loadData()

  }, [recountState.barcode])

  useEffect(() => {

    console.log('recountState', recountState)

  }, [recountState])

  const handleAddToInventoryAdjustments = (e) => {
    e.preventDefault()
    if (form.action == 'recount') {
      setForm((prev, next) => ({
        ...prev,
        form: 'scanmoreform'
      }))
    }
  }
  const handleChange = (field, uniqueKey) => async (e) => {
    if (uniqueKey) {
      setRecountState(prev => {
        return {
          ...prev,
          items: prev.items.map(item =>
            item.uniqueKey === uniqueKey
              ? { ...item, [field]: Number(e.target.value) }
              : item
          )
        }
      })
    } else {
      setForm(prev => {
        if (field == 'location') {
          let intNewQuantity = 0
          try {
            intNewQuantity = prev
              .currentItem
              .itemPerLocation
              .filter(obj => obj.location == e.target.value)[0]
              .quantityonhand
          } catch (e) {
            console.log('location not found making new quantity for the location . . .')
          }
          prev.currentItem.oldquantityonhand = intNewQuantity
          prev.currentItem.quantityonhand = intNewQuantity
        }
        return {
          ...prev,
          currentItem: {
            ...prev.currentItem,
            [field]: e.target.value
          }
        }
      })
    }
  }

  const handleScanMoreForm = (value) => {
    setRecountState((prev) => {
      for (const item of prev.items) {
        if (item.id === form.currentItem.id && item.location === form.currentItem.location) {
          return prev
        }
      }
      form.currentItem.uniqueKey = new Date().getTime()
      return {
        ...prev,
        items: [...prev.items, form.currentItem]
      }
    })
    if (value) {
      setForm(prev => ({
        ...prev,
        form: 'recountform',
        action: 'recount',
        currentItem: {}
      }))
      setRecountState(prev => ({
        ...prev,
        barcode: null,
        step: 'scan'
      }))
    } else {
      setForm(prev => ({
        ...prev,
        form: 'confirmationform',
        action: 'confirm',
      }))
    }
  }
  const handleConfirmForm = async (value) => {
    if (value) {
      setForm(prev => ({
        ...prev,
        form: 'processingform',
        action: '',
      }))
      await $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          action: 'confirmRecount',
          page: 'recount',
          data: {
            items: recountState.items,
            location: recountState.location
          }
        })
      }).done(() => {
        setForm(prev => ({
          ...prev,
          form: 'processcompleteform',
        }))
        setTimeout(() => {
          setRecountState(prev => ({
            ...prev,
            items: [],
            barcode: null,
            step: 'scan'
          }))
        }, 3000)
      })
    } else {
      setRecountState(prev => ({
        ...prev,
        items: [],
        barcode: null,
        step: 'scan'
      }))
    }
  }

  if (form.form == 'recountform')
    return (
      <Box
        component="form"
        onSubmit={handleAddToInventoryAdjustments}
        sx={{
          width: "90%",
          mx: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <TextField
          label="Item Name"
          value={form.currentItem.itemid || ''}
          onChange={handleChange("itemid")}
          fullWidth
          size="small"
          disabled={form.currentItem.itemid ? true : false}
        />

        <TextField
          label="Item Description"
          value={form.currentItem.description || ''}
          onChange={handleChange("description")}
          multiline
          minRows={3}
          fullWidth
          size="small"
          disabled={form.currentItem.description ? true : false}
        />

        <Typography>Quantity On Hand: {form.currentItem.oldquantityonhand || form.currentItem.quantityonhand || 0}</Typography>

        <TextField
          label="Quantity"
          type="number"
          value={form.currentItem.quantityonhand || 0}
          onChange={handleChange("quantityonhand")}
          fullWidth
          size="small"
        />

        <FormControl fullWidth size="small" >
          <InputLabel>Location</InputLabel>
          <Select
            value={form.currentItem.location || ''}
            onChange={handleChange("location")}
            label="Location"
            required
          >
            {
              form.locationSelect.map((o, key) => {
                return <MenuItem value={o.id} key={key}>{o.name}</MenuItem>
              })
            }
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>UOM</InputLabel>
          <Select
            value={form.currentItem.uom || ''}
            onChange={handleChange("uom")}
            label="UOM"
            required
          >
            {
              form.uomSelect.map((o, key) => {
                return <MenuItem value={o.id} key={key}>{o.name}</MenuItem>
              })
            }
          </Select>
        </FormControl>
        {form.currentItem.oldquantityonhand != form.currentItem.quantityonhand && (
          <>
            <FormControl fullWidth size="small">
              <InputLabel>Reason</InputLabel>
              <Select
                value={form.currentItem.reason || ''}
                onChange={handleChange("reason")}
                label="Reason"
                required
              >
                {
                  form.invAdjReason.map((o, key) => {
                    return <MenuItem value={o.id} key={key}>{o.name}</MenuItem>
                  })
                }
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              value={form.currentItem.memo}
              onChange={handleChange("memo")}
              fullWidth
              required={form.currentItem.reason == 9}
              size="small"
            />
          </>)
        }
        <Button
          type="submit"
          variant="contained"
          size="large"
          sx={{ mt: 2, borderRadius: 2 }}
        >
          Next
        </Button>
      </Box >
    )
  else if (form.form == 'scanmoreform')
    return (
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
        <Typography>Do you need to scan more items?</Typography>
        <Button
          onClick={() => handleScanMoreForm(true)}
          variant="outlined"
          sx={{ width: '100%', height: '60px' }}
        >
          Yes
        </Button>
        <Button
          onClick={() => handleScanMoreForm(false)}
          variant="outlined"
          sx={{ width: '100%', height: '60px' }}
        >
          No
        </Button>
      </Box>)
  else if (form.form == 'confirmationform')
    return (
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
        {recountState.items?.length > 0 &&
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Quantity on Hand</TableCell>
                <TableCell>Counted Quantity</TableCell>
                <TableCell>UOM</TableCell>
              </TableRow>
              {recountState.items.map(row => (
                <TableRow key={row.uniqueKey}>
                  <TableCell>{row.itemid}</TableCell>
                  <TableCell>
                    <Select
                      value={row.location || ''}
                      onChange={handleChange("location", row.uniqueKey)}
                      label="Location"
                    >
                      {
                        row.itemPerLocation.map((o, key) => {
                          return <MenuItem value={o.location} key={key}>{o.name || o.name}</MenuItem>
                        })
                      }
                    </Select>
                  </TableCell>
                  <TableCell>{row.oldquantityonhand >= 0 ? row.oldquantityonhand : row.quantityonhand}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        value={parseInt(row.quantityonhand)}
                        onChange={handleChange("quantityonhand", row.uniqueKey)}
                        size="small"
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>{recountState.uomSelect.find(o => o.id == row.uom)?.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}

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
      </Box>
    )
  else if (form.form == 'processingform')
    return (<>
      <Box>
        <Typography>Processing . . .</Typography>
      </Box>
    </>)
  else if (form.form == 'processcompleteform')
    return (<>
      <Box>
        <Typography>Process Complete!</Typography>
      </Box>
    </>)
}