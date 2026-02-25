import Scanner from '../Scanner/Scan'
import { Box, Typography, Grid, Button } from '@mui/material'
import $ from "jquery";
export const FixAssets = () => {
  const callNetSuite = async () => {
    try {
      const response = await $.post(
        process.env.REACT_APP_NETSUITE_URL, {
        data: JSON.stringify({
          barcode: "123456789"
        })
      }).done(function (res) {
        console.log("Success:", res);
      })
    } catch (error) {
      console.error(error)
    }
  }
  return (
    <>
      <Scanner page='FixAssets' />
      <Button
        onClick={callNetSuite}>
        Call NetSuite
      </Button>
    </>
  )
}


