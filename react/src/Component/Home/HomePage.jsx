import { Box, Typography } from "@mui/material"

export const HomePage = () => {
  return (
    <>
      <Box textAlign={'center'} justifyContent={'center'} style={{margin:'50px 50px'}}>
        <img src="/ims-app.png" style={{width: '40%'}}/>
        <Typography variant="h4">Inventory Management System</Typography>
        <Typography>A smart logistics app that uses barcode scanning to track, receive, transfer, and ship items in real time. Improve accuracy, reduce errors, and gain full visibility of your inventory anytime, anywhere.</Typography>
      </Box>
    </>
  )
}