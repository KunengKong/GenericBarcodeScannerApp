/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/record'],
    /**
     * @param{query} query
     */
    (query, record) => {

        const PUBLIC = {}
        PUBLIC.returnItemRecieptLookUp = (options) => {
            log.debug('returnItemRecieptLookUp', options)
            const objOutput = {}

            const strItemReceiptQuery = `SELECT
                    transaction.id,
                    BUILTIN.DF(transaction.id) as transaction_name,
                    transactionline.item as itemid,
                    BUILTIN.DF(transactionline.item) as itemname,
                    ABS(transactionline.quantity) as max_quantity,
                    quantity = 0,
                    ABS(transactionline.quantity) as quantityinitialized,
                    BUILTIN.DF(transactionline.units) as uomname,
                    transactionline.location,
                FROM transaction
                JOIN transactionline
                    ON transaction.id = transactionline.transaction
                WHERE transaction.type = '${options.returnFrom == 'customer' ? 'RtnAuth' : 'VendAuth'}'
                AND transaction.custbody_tc_barcode_ean_13  = '${options.barcode}'
                AND transactionline.mainline = 'F'
                AND transactionline.item > 0`
            const arrSOResult = query.runSuiteQL({ query: strItemReceiptQuery }).asMappedResults()
            log.debug('arrSOResult', arrSOResult)

            const strSubsidiariesLocationQuery = `SELECT
                    location.id as location,
                    BUILTIN.DF(location.id) as name
                FROM location 
                JOIN LocationSubsidiaryMap
                    ON LocationSubsidiaryMap.location = location.id
                    AND LocationSubsidiaryMap.subsidiary = ${options.subsidiary}
                    AND location.isinactive = 'F'`
            const arrSubsidiariesLocationResult = query.runSuiteQL({ query: strSubsidiariesLocationQuery }).asMappedResults()

            for (const [key, _] of arrSOResult.entries()) {
                arrSOResult[key].itemPerLocation = arrSubsidiariesLocationResult
            }

            if (!!arrSOResult.length) {
                objOutput.id = arrSOResult[0].id
                objOutput.name = arrSOResult[0].transaction_name
                objOutput.items = arrSOResult
                objOutput.type = options.returnFrom == 'customer' ? 'RtnAuth' : 'VendAuth'
                objOutput.quantity = 1
            } else if (!arrSOResult.length) {
                const strQuery = `SELECT
                        item.id,
                        item.itemid,
                        item.custitem_tc_barcode_ean_13 as barcode,
                    FROM item
                    WHERE
                        item.custitem_tc_barcode_ean_13 = '${options.barcode}'`
                const arrItemResult = query.runSuiteQL({ query: strQuery }).asMappedResults()
                log.debug('arrItemResult', arrItemResult)
                objOutput.quantity = 0
                objOutput.item = arrItemResult[0]
                objOutput.type = "item"
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }
        PUBLIC.processReturnAuthorization = (options) => {
            const objOutput = {
                arrInboundReturnIds: [],
                inboundReturnId: null
            }
            log.debug('processReturnAuthorization', options)
            if (options.items[0].type == 'RtnAuth') {
                const objReturnRec = record.transform({
                    fromType: record.Type.RETURN_AUTHORIZATION,
                    fromId: options.items[0].id,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                })
                const intLineReturnItem = objReturnRec.getLineCount({ sublistId: 'item' })
                for (let index = 0; index < objReturnRec; index++) {
                    objReturnRec.selectLine({ sublistId: 'item', line: intLineReturnItem })
                    objReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false })
                    objReturnRec.commitLine({ sublistId: 'item', line: intLineReturnItem })
                }
                for (const element of options.items[0].items) {
                    const intLineReturnItem = objReturnRec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: element.itemid })
                    if (intLineReturnItem < 0) continue
                    // if (!element.quantity) continue
                    objReturnRec.selectLine({ sublistId: 'item', line: intLineReturnItem })
                    objReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: !!element.quantity })
                    objReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: element.location })
                    if (!!element.quantity)
                        objReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                    objReturnRec.commitLine({ sublistId: 'item', line: intLineReturnItem })
                }

                objOutput.inboundReturnId = objReturnRec.save()
            } else if (options.items[0].type == 'VendAuth') {

                const objGroupedItems = options.items[0].items.reduce((acc, item) => {
                    const loc = item.location
                    if (!acc[loc]) acc[loc] = []
                    acc[loc].push(item)
                    return acc
                }, {})
                log.debug('objGroupedItems', objGroupedItems)

                for (const locationKey in objGroupedItems) {
                    log.debug('objGroupedItems[locationKey]', objGroupedItems[locationKey])
                    const objReturnRec = record.transform({
                        fromType: record.Type.VENDOR_RETURN_AUTHORIZATION,
                        fromId: options.items[0].id,
                        toType: record.Type.ITEM_FULFILLMENT,
                        isDynamic: true
                    })
                    const intLineReturnItem = objReturnRec.getLineCount({ sublistId: 'item' })
                    for (let index = 0; index < intLineReturnItem; index++) {
                        objReturnRec.selectLine({ sublistId: 'item', line: index })
                        objReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false })
                        let isItemReceive1 = objReturnRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive' })
                        log.debug('before | isItemReceive', isItemReceive1)
                        objReturnRec.commitLine({ sublistId: 'item', line: index })
                    }
                    for (const element of objGroupedItems[locationKey]) {
                        const intLineReturnItem = objReturnRec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: element.itemid })
                        log.debug(intLineReturnItem + ' | element', element)
                        log.debug('locationKey', locationKey)

                        objReturnRec.selectLine({ sublistId: 'item', line: intLineReturnItem })
                        objReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: element.location == locationKey })
                        let isItemReceive1 = objReturnRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive' })
                        let intLocation1 = objReturnRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'location' })
                        log.debug('before | isItemReceive', isItemReceive1)
                        log.debug('before | intLocation', intLocation1)
                        let intLocationSubrec = objReturnRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'location', })
                        if (intLocationSubrec != locationKey) {
                            const invDetail = objReturnRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: intLineReturnItem })
                            invDetail.selectLine({ sublistId: 'inventoryassignment', line: 0 })
                            invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus', value: 1, line: 0 })
                            invDetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: element.quantity, line: 0 })
                            invDetail.commitLine({ sublistId: 'inventoryassignment', line: 0 })
                        }
                        objReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: locationKey })
                        objReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })

                        let isItemReceive = objReturnRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive' })
                        let intLocation = objReturnRec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'location' })
                        log.debug('after | isItemReceive', isItemReceive)
                        log.debug('after | intLocation', intLocation)
                        objReturnRec.commitLine({ sublistId: 'item', line: intLineReturnItem })
                    }
                    objOutput.arrInboundReturnIds.push(objReturnRec.save())
                }
            }

            log.debug('objOutput ', objOutput)

            return objOutput
        }
        return PUBLIC

    });
