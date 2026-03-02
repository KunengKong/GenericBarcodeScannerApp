import React, { useState, useEffect } from "react"
import { BrowserRouter } from 'react-router-dom'
import { Router, DrawerList } from './Router/Router'
import {
  Button,
  Drawer,
  AppBar,
  Toolbar,
  Container,
  Menu,
  IconButton,
  Box,
  Typography
} from '@mui/material'
import { Menu as MenuIcon } from '@mui/icons-material'

export default function App() {

  const [mainApp, setMainApp] = useState({ title: '' })

  useEffect(() => {
    // Code to run when the URL (location) changes
    console.log('The URL has changed to:', mainApp.title)
    // You can perform actions here, like logging a page view for analytics
  }, [mainApp.title])
  const [open, setOpen] = useState(false)
  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen)
  }

  const AppBarViewCompatibility = [
    { // xs & sm
      display: { xs: 'flex', sm: 'flex', md: 'none', lg: 'none', xl: 'none' },
      position: 'fixed',
      style: {
        top: "auto",
        bottom: 0
      }
    },
    { // xs & sm
      display: { xs: 'none', sm: 'none', md: 'flex', lg: 'flex', xl: 'flex' },
      position: 'static',
      style: {
        margin: 0,
        padding: 0
      }
    }

  ]
  return (
    <>
      <BrowserRouter>
        <Drawer open={open} anchor={'right'} onClose={toggleDrawer(false)} style={{}}>
          {AppBarViewCompatibility.map((obj, index) => (
            <>
              <Box sx={{ display: obj.display, }}>
                <DrawerList position={obj.position} setMainAppState={setMainApp} />
              </Box>
            </>
          ))
          }
        </Drawer >

        {
          AppBarViewCompatibility.map((obj, index) => (
            <Box sx={{ flexGrow: 1, display: obj.display }}>
              <AppBar position={obj.position} sx={obj.style}>

                <Container maxWidth="xl">
                  <Toolbar disableGutters>
                    {mainApp.title}
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton
                      size="large"
                      aria-label="account of current user"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      onClick={toggleDrawer(true)}
                      color="inherit"
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      <MenuIcon />
                      <Typography style={{fontSize:10}}>Menu</Typography>
                    </IconButton>
                  </Toolbar>
                </Container>
              </AppBar>
            </Box>))
        }


        < Router />
      </BrowserRouter>
    </>
  )
}