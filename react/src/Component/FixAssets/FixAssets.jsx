import Scanner from '../Scanner/Scan'
import React, { useState, useEffect } from 'react'
import { Box, Tabs, Tab, Typography, Grid, useTheme, useMediaQuery, Table, TableBody, TableRow, TableCell, TableContainer, Paper } from '@mui/material'
import $ from "jquery";


export const FixAssets = () => {
  const theme = useTheme()
  const objViewPort = {
    xs: useMediaQuery(theme.breakpoints.down("xs")),
    sm: useMediaQuery(theme.breakpoints.down("sm")),
    md: useMediaQuery(theme.breakpoints.down("md")),
    lg: useMediaQuery(theme.breakpoints.down("lg")),
    xl: useMediaQuery(theme.breakpoints.down("xl")),
  }
  const [fixAssetState, setFixAssetState] = useState({
    page: 'fixasset',
    tab: 0,
    currentItem: {},
    barcode: null,
    step: 'scan'
  })

  const processBarcode = async () => {
    await $.post(process.env.REACT_APP_NETSUITE_URL, {
      data: JSON.stringify({
        action: 'fixAssetLookUp',
        page: fixAssetState.page,
        data: {
          barcode: fixAssetState.barcode
        }
      })
    }).done((res) => {
      const objItemLookupResult = JSON.parse(res)
      console.log('objItemLookupResult | ', objItemLookupResult)
      if (!objItemLookupResult.fixAsset) {
        alert('Transaction not found.')
        return true
      }
      setFixAssetState(prev => ({
        ...prev,
        currentItem: objItemLookupResult.fixAsset
      }))
    })
  }
  const handleTabPage = (e, newValue) => {
    setFixAssetState(prev => ({
      ...prev,
      tab: newValue
    }))
  }
  useEffect(() => {
    if (fixAssetState.barcode) {
      processBarcode()
    }
  }, [fixAssetState.barcode])

  return (
    <>
      <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', height: 224 }}>
        {!fixAssetState.barcode && <Scanner page='FixAssets' state={fixAssetState} setState={setFixAssetState} />}
        <Box sx={{ display: 'flex', flexGrow: 1, margin: 'auto 20px' }} >
          {!!Object.keys(fixAssetState.currentItem).length &&
            <>
              <Tabs
                indicatorColor="secondary"
                orientation={objViewPort.md ? "horizontal" : "vertical"}
                textColor="inherit"
                variant="fullWidth"
                value={fixAssetState.tab}
                onChange={handleTabPage}
                sx={{
                  // borderRight: objViewPort.md ? 0 : 1,
                  // borderColor: "divider",
                  maxWidth: objViewPort.md ? "100%" : 200,
                  minWidth: objViewPort.md ? "100%" : 200,
                  position: objViewPort.md ? "fixed" : "relative",
                  bottom: objViewPort.md ? 65 : "auto",
                  left: objViewPort.md ? 0 : "auto",
                  width: objViewPort.md ? "100%" : "auto",
                  zIndex: 1200,
                  backgroundColor: "white"
                }}
              >
                {Object.keys(fixAssetState.currentItem).map((o, key) => { return <Tab label={o} key={key} /> })}
              </Tabs>
              {
                Object.keys(fixAssetState.currentItem).map((mainCategory, index) => {
                  const fields = Object.keys(fixAssetState.currentItem[mainCategory])
                  const cols = objViewPort.sm ? 4 : objViewPort.md ? 6 : 8
                  return (
                    <TabPanel
                      key={mainCategory}
                      value={fixAssetState.tab}
                      index={index}
                    >
                      <TableContainer
                        component={Paper}
                        elevation={0}
                      // sx={{ border: "1px solid #e0e0e0" }}
                      >
                        <Table size="small">
                          <TableBody>
                            {fields.map((field, i) => {
                              if (i % cols === 0)
                                return (<TableRow key={i}>
                                  {fields.slice(i, i + cols).map((f) => (
                                    <TableCell
                                      key={f}
                                      sx={{
                                        width: `${100 / cols}%`,
                                        verticalAlign: "top",
                                        // borderRight: "1px solid #e0e0e0"
                                      }}
                                    >
                                      {/* Label */}
                                      <Typography
                                        variant="subtitle2"
                                        sx={{
                                          fontWeight: 600,
                                          mb: 0.5
                                        }}
                                      >
                                        {formatFieldLabel(f)}
                                      </Typography>
                                      {/* Value */}
                                      <Typography
                                        variant="body2"
                                        sx={{ wordBreak: "break-word" }}
                                      >
                                        {fixAssetState.currentItem[mainCategory][f] ?? "-"}
                                      </Typography>
                                    </TableCell>
                                  ))}
                                </TableRow>)

                              return null
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </TabPanel>
                  )
                })
              }
            </>
          }
        </Box>
      </Box >
    </>
  )
}

const TabPanel = (props) => {
  const { children, value, index, } = props
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
    >
      {children}
    </Box>
  )

}
function formatFieldLabel(field) {
  return field
    .replace(/^asset_[^_]+_/, "") // remove asset_main_, asset_general_, etc.
    .split("_")
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1)
    )
    .join(" ");
}