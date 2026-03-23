/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/record', './lib/lib_inventory_detail.js'],
    (query, record, libInventoryDetail) => {

        const PUBLIC = {

        }
        PUBLIC.search = (options) => {
            log.debug('search', options)
            const strQuery = `SELECT
                    item.id,
                    item.itemid,
                    aggregateItemLocation.quantityOnHand,
                    aggregateItemLocation.location as location,
                    item.description,
                    item.unitstype as uom_parent,
                    unitsTypeUom.unitsType as uom,
                    item.islotitem,
                    item.isserialitem,
                FROM item
                LEFT JOIN aggregateItemLocation
                    ON item.id = aggregateItemLocation.item
                    AND aggregateItemLocation.location = ${options.location}
                LEFT JOIN unitsTypeUom 
                    ON item.stockUnit = unitsTypeUom.unitsType
                WHERE item.custitem_tc_ims_barcode = '${options.barcode}'`
            log.debug('strQuery', strQuery)

            const objItemResult = query.runSuiteQL({ query: strQuery }).asMappedResults()[0]
            log.debug('objItemResult', objItemResult)

            const strItemPerLocationQuery = `SELECT
                    item.id,
                    COALESCE(location_balance.quantityOnHand, 0) as quantityonhand,
                    location_balance.location,
                    BUILTIN.DF(location.id) as name,
                FROM item
                LEFT JOIN aggregateItemLocation as location_balance
                    ON item.id = location_balance.item
                    AND location_balance.quantityonhand > 0
                LEFT JOIN location
                    ON location.id = location_balance.location
                JOIN LocationSubsidiaryMap
                    ON location_balance.location = LocationSubsidiaryMap.location
                    AND LocationSubsidiaryMap.subsidiary = ${options.subsidiary}
                WHERE 
                    item.id = ${objItemResult.id}`
            const arrItemPerLocation = query.runSuiteQL({ query: strItemPerLocationQuery }).asMappedResults()

            const strSubsidiariesLocationQuery = `SELECT
                location.id as location,
                BUILTIN.DF(location.id) as name
                FROM location 
                JOIN LocationSubsidiaryMap
                    ON LocationSubsidiaryMap.location = location.id
                        AND LocationSubsidiaryMap.subsidiary = ${options.subsidiary}
                AND location.isinactive = 'F'`
            const arrSubsidiariesLocationResult = query.runSuiteQL({ query: strSubsidiariesLocationQuery }).asMappedResults()

            const objMainMap = {}
            for (const m of arrItemPerLocation) {
                objMainMap[m.location] = m
            }

            const combined = arrSubsidiariesLocationResult.map(s => ({
                id: objMainMap[s.location]?.id ?? null,
                location: s.location,
                name: s.name,
                quantityonhand: objMainMap[s.location]?.quantityonhand ?? 0
            }))
            objItemResult.oldquantityonhand = objItemResult.quantityonhand
            objItemResult.itemPerLocation = combined
            return { data: { item: objItemResult } }
        }

        PUBLIC.confirmRecount = (options) => {


            //     options = {
            //         items: [
            //             {
            //                 id: 120,
            //                 itemid: "WM00002",
            //                 quantityonhand: "6",
            //                 location: 25,
            //                 description: "LE MINERALE 600ML",
            //                 uom_parent: 2,
            //                 uom: 2,
            //                 islotitem: "T",
            //                 isserialitem: "F",
            //                 oldquantityonhand: 5,
            //                 itemPerLocation: [
            //                     {
            //                         id: 120,
            //                         location: 25,
            //                         name: "AMC",
            //                         quantityonhand: 5
            //                     }
            //                 ],
            //                 reason: 1,
            //                 inventoryDetail: [
            //                     {
            //                         lotnumber: "5139375164163",
            //                         expirationDate: "2026-03-19",
            //                         quantity: "3"
            //                     },
            //                     {
            //                         lotnumber: "2",
            //                         expirationDate: "2026-03-25",
            //                         quantity: "3"
            //                     }
            //                 ],
            //                 uniqueKey: 1773925386573
            //             }
            //         ],
            //         location: 100,
            //         subsidiary: 11,
            //         account: 130
            //     }
            // }
            const objInventoryAdjustmentRec = record.create({
                type: record.Type.INVENTORY_ADJUSTMENT,
                isDynamic: true
            })
            const arrItems = []
            objInventoryAdjustmentRec.setValue('subsidiary', options.subsidiary)
            objInventoryAdjustmentRec.setValue('account', options.account)
            let line = 0
            let hasChanges = false
            for (const element of options.items) {
                arrItems.push(element.id)
                if (element.quantityonhand == element.oldquantityonhand) continue
                const intQuantity = element.quantityonhand - element.oldquantityonhand
                objInventoryAdjustmentRec.selectLine({ sublistId: 'inventory', line: line })
                objInventoryAdjustmentRec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: element.id })
                objInventoryAdjustmentRec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: element.location })
                objInventoryAdjustmentRec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'units', value: element.uom })
                objInventoryAdjustmentRec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: intQuantity })
                objInventoryAdjustmentRec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'custcol_tc_ims_reason_to_adjust', value: element.reason })
                objInventoryAdjustmentRec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'memo', value: element.memo })

                // ===== INVENTORY DETAIL =====
                const invDetail = objInventoryAdjustmentRec.getCurrentSublistSubrecord({ sublistId: 'inventory', fieldId: 'inventorydetail', line: line })
                libInventoryDetail.setInventoryDetail({ inventoryDetails: element.inventoryDetail, subRecord: invDetail, isPositiveInvDetail: intQuantity > 0 })

                objInventoryAdjustmentRec.commitLine({ sublistId: 'inventory', line: line })
                line++
                hasChanges = true
            }
            const intId = hasChanges ? objInventoryAdjustmentRec.save() : -1
            const strQuery = `SELECT
                                itemvendor.vendor,
                                item.id as itemid
                            FROM item
                            JOIN itemvendor ON item.id = itemvendor.item
                            WHERE
                                    itemvendor.preferredvendor = 'T'
                                AND itemvendor.purchaseprice IS NOT NULL
                                AND itemvendor.item IN (${arrItems.join(',')})` // to change to auto generated barcode
            log.debug(strQuery)
            const arrPrefferedVendorResult = query.runSuiteQL({ query: strQuery }).asMappedResults()

            const vendorMap = {}
            for (const s of arrPrefferedVendorResult) {
                vendorMap[s.itemid] = s.vendor
            }
            const grouped = {}
            for (const item of options.items) {
                if (!item.hasOwnProperty('requestedquantity')) continue;
                const vendor = vendorMap[item.id]
                if (!vendor) continue;
                if (!grouped[vendor]) {
                    grouped[vendor] = []
                }
                grouped[vendor].push({
                    ...item,
                    vendor
                })
            }


            log.debug('grouped', grouped)
            const arrPoIds = []
            return { data: { item: options.items }, inventoryAdjustmentId: intId, purchaseOrderIds: arrPoIds }
        }

        return PUBLIC

    });
