import React, { useEffect, useState } from 'react'

import { Box, Typography, Grid, Button, TextField } from '@mui/material'
import Scanner from '../Scanner/Scan'
import InventoryForm from './InventoryForm'

export default () => {
  const [recountState, setRecountState] = useState({
    page: 'recount',
    items: [],
    barcode: null,
    location: 100, // TODO: default must be change to be dynamically set from netsuite user lcoation
    step: 'scan'
  })

  if (recountState.barcode == null && recountState.step == 'scan') {
    return (<Scanner state={setRecountState} />)
  } else if (recountState.step == 'recountItemForm') {
    return (<InventoryForm page='Recount' setRecountState={setRecountState} recountState={recountState} />)
  }

}