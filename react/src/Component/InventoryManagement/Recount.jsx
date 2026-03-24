import React, { useEffect, useState } from 'react'

import { Box, Typography, Grid, Button, TextField } from '@mui/material'
import Scanner from '../Scanner/Scan'
import InventoryForm from './InventoryForm'
import InventoryDetailForm from './InventoryDetailForm'

export default (props) => {
  const { mainAppState } = props
  const [recountState, setRecountState] = useState({
    page: 'recount',
    items: [],
    barcode: null,
    location: 100, // TODO: default must be change to be dynamically set from netsuite user lcoation
    step: 'scan'
  })

  // TODO: to be removed
  // return (<InventoryDetailForm />)
  if (recountState.barcode == null && recountState.step == 'scan') {
    return (<Scanner state={recountState} setState={setRecountState} />)
  } else if (recountState.step == 'recountItemForm') {
    return (
      <InventoryForm
        mainAppState={mainAppState}
        page='Recount'
        setRecountState={setRecountState}
        recountState={recountState}
      />
    )
  }

}