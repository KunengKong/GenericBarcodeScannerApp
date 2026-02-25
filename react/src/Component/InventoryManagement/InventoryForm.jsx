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
  const { recountState, setRecountState } = props
  const [form, setForm] = useState({
    form: 'recountform', //recountform, discrepancyprompt, discrepancyform
    action: 'recount',
    uomSelect: [],
    locationSelect: [],
    currentItem: {}
  })

  useEffect(() => {
    console.log('recountState updated:', recountState)
  }, [recountState.items])
  useEffect(() => {
    if (!recountState.barcode) return
    const loadData = async () => {
      const res1 = await $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          action: 'uomandlocation',
          page: 'general'
        })
      })
      const generalData = JSON.parse(res1)

      const res2 = await $.post(process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          data: {
            barcode: recountState.barcode,
            location: recountState.location
          },
          action: 'search',
          page: recountState.page
        })
      })

      const itemData = JSON.parse(res2)
      setForm(prev => ({
        ...prev,
        currentItem: { ...itemData.data.item },
        ...generalData,
      }))

    }
    loadData()

  }, [recountState.barcode])

  const handleAddToInventoryAdjustments = (e) => {
    e.preventDefault()
    if (form.action == 'recount') {
      setForm((prev, next) => {
        return ({
          ...prev,
          form: 'discrepancyprompt',
          currentItem: {
            ...prev.currentItem
          }
        })
      })
    }
    if (form.action == 'request') {
      setForm(prev => ({
        ...prev,
        form: 'scanmoreform'
      }))
      setRecountState((prev) => {
        for (const item of prev.items) {
          if (item.id === form.currentItem.id) {
            return prev
          }
        }

        return {
          ...prev,
          items: [...prev.items, form.currentItem]
        }
      })
    }
  }
  const handleItemRequisitionForm = (value) => {
    setForm(prev => ({
      ...prev,
      form: value ? 'recountform' : 'scanmoreform',
      action: value ? 'request' : 'recount'
    }))
    if (!value) {
      setRecountState((prev) => {
        for (const item of prev.items) {
          if (item.id === form.currentItem.id) {
            return prev
          }
        }

        return {
          ...prev,
          items: [...prev.items, form.currentItem]
        }
      })
    }
  }
  const handleChange = (field) => (e) => {
    if (field == 'editQuantity') {
      const newQty = Number(e.target.value)
      setRecountState(function (prev) {
        const updatedItems = []

        for (const item of prev.items) {
          let tmp = item
          if (item.id === form.currentItem.id) {
            tmp = { ...item, quantityonhand: newQty }
          }
          updatedItems.push(tmp)
        }

        return {
          ...prev,
          items: updatedItems
        }
      })
    } else {
      setForm(prev => ({
        ...prev,
        currentItem: {
          ...prev.currentItem,
          [field]: e.target.value
        }
      }))
    }
  }

  const handleScanMoreForm = (value) => {
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
      console.log('Show Complete Form')
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
  useEffect(() => {
    console.log('form updated:', form)
  }, [form])



  if (form.form == 'recountform')
    return (
      <Box
        component="form"
        onSubmit={handleAddToInventoryAdjustments}
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

        <TextField
          label="Quantity"
          type="number"
          value={form.action == 'request' ? form.currentItem.requestedquantity : form.currentItem.quantityonhand || ''}
          onChange={handleChange(form.action == 'request' ? "requestedquantity" : "quantityonhand")}
          fullWidth
          size="small"
        />

        <FormControl fullWidth size="small" >
          <InputLabel>Location</InputLabel>
          <Select
            value={form.currentItem.location || ''}
            onChange={handleChange("location")}
            label="Location"
            disabled={!!form.currentItem.location}
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
            disabled={!!form.currentItem.uom}
          >
            {
              form.uomSelect.map((o, key) => {
                return <MenuItem value={o.id} key={key}>{o.name}</MenuItem>
              })
            }
          </Select>
        </FormControl>
        {
          form.form_inventory_discrepancy_form == true && <TextField
            label="Notes"
            value={form.currentItem.memo}
            onChange={handleChange("memo")}
            fullWidth
            size="small"
          />
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
  else if (form.form == 'discrepancyprompt')
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
        <Typography>Do you need to make an item requisition?</Typography>
        <Button
          onClick={() => handleItemRequisitionForm(true)}
          variant="outlined"
          sx={{ width: '100%', height: '60px' }}
        >
          Yes
        </Button>
        <Button
          onClick={() => handleItemRequisitionForm(false)}
          variant="outlined"
          sx={{ width: '100%', height: '60px' }}
        >
          No
        </Button>
      </Box>)
  else if (form.form == 'scanmoreform')
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
          width: "100%",
          maxWidth: 400,
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
              {recountState.items.map(row => (
                <TableRow key={row.id}>
                  <TableCell>{row.itemid}</TableCell>
                  <TableCell>{row.itemid}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">

                      <Typography sx={{ minWidth: 30, textAlign: "center" }}>
                        { }
                      </Typography>
                      <TextField
                        value={parseInt(row.requestedquantity || row.quantityonhand)}
                        onChange={handleChange("editQuantity", row.id)}
                        fullWidth
                        size="small"
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>{row.uom_name}</TableCell>
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