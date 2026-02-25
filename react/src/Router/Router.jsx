import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material'
import { Mail as InboxIcon, MoveToInbox as MailIcon } from '@mui/icons-material'
import { FixAssets } from '../Component/FixAssets/FixAssets'
import { HomePage } from '../Component/Home/HomePage'
import Recount from '../Component/InventoryManagement/Recount'
import Inbound from '../Component/InventoryManagement/Inbound'
import Outbound from '../Component/InventoryManagement/Outbound'

const HomeMenuList = {
  Home: [
    { label: 'Home', href: '/', element: <HomePage /> }
  ],
  InventoryManagement: [
    { label: 'Recount', href: '/item/recount/scan', element: <Recount /> },
    { label: 'In', href: '/item/inbound/scan', element: <Inbound /> },
    { label: 'Out', href: '/item/outbound/scan', element: <Outbound /> },
    { label: 'Return Item', href: '/item/return/' },
  ],
  FixAssets: [
    { label: 'Fix Assets', href: '/fixasset/scan', element: <FixAssets /> },
  ],
}

const HomeMenuListEntries = Object.entries(HomeMenuList)
export const Router = (prop) => {
  return (<>
    <div style={{ paddingTop: '25px' }}></div>
    <Routes>
      {HomeMenuListEntries.map((objName, menus) => {
        return (
          <>
            {
              objName[1].map((menus, index) =>
                <Route key={index} path={menus.href} element={menus.element} />)
            }
          </>)
      }
      )}
    </Routes>
  </>
  )
}

export const DrawerList = (props) => (
  <>
    <Box sx={{ flexGrow: 1 }} />
    <Box>
      <List style={{ width: 250 }} sx={{ width: '100%' }}>
        {
          HomeMenuListEntries.map((segment, groupIndex) => (
            <>{
              segment[1].map((obj, index) => {
                return (
                  <ListItem key={index} disablePadding>
                    <Link to={obj.href} style={{ color: 'black', textDecoration: 'none', width: '100%' }}>
                      <ListItemButton >
                        <ListItemIcon>
                          {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
                        </ListItemIcon>
                        <ListItemText primary={obj.label} />
                      </ListItemButton>
                    </Link>
                  </ListItem>
                )
              })
            }
              {
                groupIndex !== HomeMenuListEntries.length - 1 && <Divider />
              }
            </>
          ))
        }
      </List>
    </Box>
  </>
)
