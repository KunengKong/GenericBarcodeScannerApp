/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/record'],
    (query, record) => {

        const PUBLIC = {

        }
        PUBLIC.search = (options) => {

            const strQuery = `SELECT
                    item.id,
                    item.itemid,
                    aggregateItemLocation.quantityOnHand,
                    aggregateItemLocation.location as location,
                    item.description,
                    unitsTypeUom.unitsType as uom,
                    unitsTypeUom.unitname as uom_name,

                FROM item
                JOIN aggregateItemLocation
                    ON item.id = aggregateItemLocation.item
                    AND aggregateItemLocation.location = ${options.location}
                JOIN unitsTypeUom 
                    ON item.stockUnit = unitsTypeUom.unitsType
                WHERE item.custitem_tc_barcode_ean_13 = '${options.barcode}'`
            const arrResult = query.runSuiteQL({ query: strQuery }).asMappedResults()
            log.debug('arrResult', arrResult)
            arrResult[0].oldquantityonhand = arrResult[0].quantityonhand
            return { data: { item: arrResult[0] } }
        }
        PUBLIC.confirmRecount = (options) => {
            log.debug('confirmRecount', options)
            // confirmRecount options - sample input data
            // a = {
            //     items: [
            //         {
            //             id: 323,
            //             itemid: '60" 4K Ultra HDTV',
            //             quantityonhand: 53,
            //             location: 31,
            //             description: '60" 4K Ultra HDTV',
            //             uom: 1,
            //             uom_name: "Each",
            //             oldquantityonhand: 53,
            //             requestedquantity: "20"
            //         }
            //     ],
            //     location: 31
            // }

            const objInventoryAdjustmentRec = record.create({
                type: record.Type.INVENTORY_ADJUSTMENT,
                isDynamic: true
            })
            const arrItems = []
            objInventoryAdjustmentRec.setValue('subsidiary', 2)
            objInventoryAdjustmentRec.setValue('account', 10)
            let line = 0
            for (const element of options.items) {
                arrItems.push(element.id)
                if (element.quantityonhand == element.oldquantityonhand) continue
                const intQuantity = element.quantityonhand - element.oldquantityonhand
                objInventoryAdjustmentRec.selectLine({ sublistId: 'inventory', line: line })
                objInventoryAdjustmentRec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: element.id })
                objInventoryAdjustmentRec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: options.location })
                objInventoryAdjustmentRec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: intQuantity })


                // ===== INVENTORY DETAIL =====
                const invDetail = objInventoryAdjustmentRec.getCurrentSublistSubrecord({ sublistId: 'inventory', fieldId: 'inventorydetail', line: line })
                invDetail.selectLine({ sublistId: 'inventoryassignment', line: 0 })
                invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus', value: 1, line: 0 })
                invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: intQuantity, line: 0 })
                invDetail.commitLine({ sublistId: 'inventoryassignment', line: 0 })

                objInventoryAdjustmentRec.commitLine({ sublistId: 'inventory', line: line })
                line++
            }
            const intId = objInventoryAdjustmentRec.save()
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
            // a = {
            //     "646": [
            //         {
            //             "id": 115,
            //             "itemid": `ASUS PG348Q RoG SWIFT 34" Curved 21: 9 QHD IPS G- Sync Monitor`,
            //             "quantityonhand": 19,
            //             "location": 31,
            //             "description": `ASUS PG348Q RoG SWIFT 34" Curved 21: 9 QHD IPS G - Sync Monitor`,
            //             "uom": 1,
            //             "uom_name": "Each",
            //             "oldquantityonhand": 19,
            //             "requestedquantity": "20",
            //             "vendor": 646
            //         }
            //     ]
            // }
            const strSubsidiaryQuery = `SELECT subsidiary FROM location where id = ${options.location}`
            const objSubsidiary = query.runSuiteQL({ query: strSubsidiaryQuery }).asMappedResults()[0]
            const arrPoIds = []
            for (const key in grouped) {

                const intVendorId = grouped[key][0].vendor
                const objPurchaseOrderRec = record.create({ type: record.Type.PURCHASE_ORDER, isDynamic: true })
                objPurchaseOrderRec.setValue('entity', intVendorId)
                objPurchaseOrderRec.setValue('subsidiary', objSubsidiary.subsidiary)
                objPurchaseOrderRec.setValue('location', options.location)

                for (const [line, item] of grouped[key].entries()) {
                    objPurchaseOrderRec.selectLine({ sublistId: 'item', line: line })
                    objPurchaseOrderRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.id })
                    objPurchaseOrderRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.requestedquantity })
                    objPurchaseOrderRec.commitLine({ sublistId: 'item', line: line })
                }
                const poid = objPurchaseOrderRec.save()
                arrPoIds.push(poid)
            }
            return { data: { item: options.items }, inventoryAdjustmentId: intId, purchaseOrderIds: arrPoIds }
        }


        PUBLIC.createPurchaseOrder = (options) => {
        }

        return PUBLIC

    });
