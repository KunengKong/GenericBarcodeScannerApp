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
import $ from "jquery"

export default function App() {

  const [mainAppState, setMainAppState] = useState({ title: '', subsidiary: 2, location: 100 })

  useEffect(() => {
    $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'getUser',
        page: 'general',
        data: {
          currentUserId: 9 // Cornello Engreso | https://12255891.app.netsuite.com/app/common/entity/employee.nl?id=9
        }
      })
    }).done((res) => {
      const objUser = JSON.parse(res)
      console.log('objUser', objUser)
      setMainAppState((prev) => {
        return {
          ...prev,
          subsidiary: objUser.currentUser.subsidiary,
          location: objUser.currentUser.location
        }
      })
    })
  }, [mainAppState.subsidiary])
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
                <DrawerList position={obj.position} setMainAppState={setMainAppState} />
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
                    {mainAppState.title}
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
                      <Typography style={{ fontSize: 10 }}>Menu</Typography>
                    </IconButton>
                  </Toolbar>
                </Container>
              </AppBar>
            </Box>))
        }


        < Router mainAppState={mainAppState} />
      </BrowserRouter>
    </>
  )
}